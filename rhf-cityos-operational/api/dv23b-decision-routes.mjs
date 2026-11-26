/** DV2.3B1 persistent human feasibility decision ledger, scoped to DV22 identity/appointments. */
import {ClientError} from './domain.mjs';
import {dv22ScopedAccess} from './dv22-registry-routes.mjs';
import {DV23B_SCHEMA,UUID,DV23BError,validatedSubmit,validatedDecision,validatePair,digestPair,presentDecision,noExecution} from './dv23b-decision-core.mjs';
export const DV23B_PARTS=Object.freeze(['dv23-feasibility']);
const deny=(message,status=403)=>{throw new ClientError(message,status)};
function origin(req){
 const val=req?.headers?.origin;if(!val)deny('DV23B_ORIGIN_REQUIRED');
 let u;try{u=new URL(val)}catch{deny('DV23B_ORIGIN_INVALID')}
 if(u.host!==req.headers.host||u.protocol!==(process.env.PUBLIC_HTTPS==='true'?'https:':'http:'))deny('DV23B_ORIGIN_MISMATCH');
}
async function ready(client){const r=await client.query("SELECT to_regclass('public.rhf_urban_opportunity_decisions') IS NOT NULL AS present");if(r.rows[0]?.present!==true)deny('DV23B_MIGRATION_REQUIRED',409)}
async function sources(client,city,scoped,needId,capacityId){
 const r=await client.query(`SELECT id,tenant_id,municipality_id,owner_org_id,kind,sector,title,quantity,unit,evidence_ref,
   status,created_by,reviewed_by,review_note FROM rhf_urban_need_capacity
   WHERE tenant_id=$1 AND municipality_id=$2 AND owner_org_id=ANY($3::uuid[]) AND id=ANY($4::uuid[])
   FOR SHARE`,[city.tenant_id,city.id,scoped,[needId,capacityId]]);
 return [r.rows.find(x=>x.id===needId),r.rows.find(x=>x.id===capacityId)];
}
export async function dv23bDecisionRoute({part,method,resourceId,url,req,cityId,user,withScope,readBody,json,audit}){
 if(part!=='dv23-feasibility'||!['GET','POST','PATCH'].includes(method))deny('NOT_FOUND',404);
 if(method==='GET'&&resourceId||method==='POST'&&resourceId||method==='PATCH'&&!UUID.test(resourceId||''))deny('DV23B_RESOURCE_INVALID',400);
 const surface=url.searchParams.get('surface');if(!['deputy','waste'].includes(surface))deny('DV23B_INVALID_SURFACE',400);
 if(method!=='GET')origin(req);
 let body;
 try{body=method==='POST'?validatedSubmit(await readBody(req)):method==='PATCH'?validatedDecision(await readBody(req)):null}
 catch(e){if(e instanceof DV23BError)deny(e.message,400);throw e}
 const result=await withScope(cityId,user,'read',async(client,city,role)=>{
  const access=await dv22ScopedAccess(client,city,user,role,surface);await ready(client);
  const {scoped,allowedCreate,allowedReview}=access;
  if(method==='GET'){
   const r=await client.query(`SELECT id,tenant_id,municipality_id,owner_org_id,need_id,capacity_id,sector,status,
     justification,created_by,created_at,decided_by,decision_note,decided_at
     FROM rhf_urban_opportunity_decisions WHERE tenant_id=$1 AND municipality_id=$2 AND owner_org_id=ANY($3::uuid[])
     ORDER BY created_at DESC,id DESC LIMIT 101`,[city.tenant_id,city.id,scoped]);
   return {schema:DV23B_SCHEMA,cityId:city.id,tenantId:city.tenant_id,viewerId:user.id,surface,
      access:{canSubmit:allowedCreate,canReview:allowedReview},rows:r.rows.slice(0,100).map(presentDecision),
      coverage:{hasMore:r.rows.length>100},governance:noExecution};
  }
  if(method==='POST'){
   if(!allowedCreate)deny('DV23B_OPERATIONAL_APPOINTMENT_REQUIRED');
   const [need,capacity]=await sources(client,city,scoped,body.needId,body.capacityId);
   let proposal;try{proposal=validatePair(need,capacity,city,scoped)}catch(e){if(e instanceof DV23BError)deny(e.message,409);throw e}
   const orgId=need.owner_org_id;
   let r;
   try{r=await client.query(`INSERT INTO rhf_urban_opportunity_decisions
     (tenant_id,municipality_id,owner_org_id,need_id,capacity_id,sector,source_digest,justification,request_key,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
     [city.tenant_id,city.id,orgId,need.id,capacity.id,need.sector,proposal.digest,body.note,body.requestKey,user.id]);}
   catch(e){if(e.code==='23505')deny('DV23B_DUPLICATE_REQUEST',409);throw e}
   const row=r.rows[0];
   await audit(client,city,user,'DV23B_FEASIBILITY',row.id,'PROPOSED',{needId:need.id,capacityId:capacity.id,sourceDigest:proposal.digest,autoExecuted:false});
   return {schema:DV23B_SCHEMA,cityId:city.id,tenantId:city.tenant_id,row:presentDecision(row),governance:noExecution};
  }
  if(!allowedReview)deny('DV23B_INDEPENDENT_AUDITOR_REQUIRED');
  const r=await client.query(`SELECT * FROM rhf_urban_opportunity_decisions WHERE id=$1 AND tenant_id=$2
    AND municipality_id=$3 AND owner_org_id=ANY($4::uuid[]) FOR UPDATE`,[resourceId,city.tenant_id,city.id,scoped]);
  if(!r.rows.length)deny('DV23B_NOT_VISIBLE',404);
  const current=r.rows[0];
  if(current.status!=='PROPOSED')deny('DV23B_DECISION_FINAL',409);
  if(current.created_by===user.id)deny('DV23B_SELF_APPROVAL_DENIED');
  const [need,capacity]=await sources(client,city,scoped,current.need_id,current.capacity_id);
  let pair;try{pair=validatePair(need,capacity,city,scoped)}catch(e){if(e instanceof DV23BError)deny('DV23B_SOURCE_EVIDENCE_INVALID',409);throw e}
  if(pair.digest!==current.source_digest)deny('DV23B_SOURCE_EVIDENCE_CHANGED',409);
  const updated=await client.query(`UPDATE rhf_urban_opportunity_decisions SET status=$2,decided_by=$3,
    decision_note=$4,decided_at=now() WHERE id=$1 AND tenant_id=$5 AND municipality_id=$6
    AND owner_org_id=ANY($7::uuid[]) AND status='PROPOSED' RETURNING *`,
    [resourceId,body.decision,user.id,body.note,city.tenant_id,city.id,scoped]);
  if(!updated.rows.length)deny('DV23B_STATE_CHANGED',409);
  const row=updated.rows[0];
  await audit(client,city,user,'DV23B_FEASIBILITY',row.id,body.decision,{feasibilityOnly:true,autoExecuted:false});
  return {schema:DV23B_SCHEMA,cityId:city.id,tenantId:city.tenant_id,row:presentDecision(row),governance:noExecution};
 });
 return json(method==='GET'?200:method==='POST'?201:200,result);
}
