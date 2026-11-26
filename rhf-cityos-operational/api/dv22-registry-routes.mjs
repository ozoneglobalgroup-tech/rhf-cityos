/** DV2.2 — cross-workspace, city-scoped needs/capacities with human review. */
import {ClientError} from './domain.mjs';
import {WASTE_CODE} from './waste-pilot-core.mjs';
import {wastePermissions} from './waste-authorization.mjs';
import {DV22_SCHEMA,DV22_UUID,DV22Error,validateSubmission,validateDecision,maySubmit,mayReview,validateReceipt,present} from './dv22-registry-core.mjs';
export const DV22_PARTS=Object.freeze(['need-capacity-ledger']);
const deny=(msg,status=403)=>{throw new ClientError(msg,status)};
function checkOrigin(req){
 const origin=req.headers?.origin;if(!origin)deny('DV22_ORIGIN_REQUIRED',403);
 let parsed;try{parsed=new URL(origin)}catch{deny('DV22_ORIGIN_INVALID',403)}
 if(parsed.host!==req.headers.host||parsed.protocol!==(process.env.PUBLIC_HTTPS==='true'?'https:':'http:'))deny('DV22_ORIGIN_MISMATCH',403);
}
function descendants(orgs,roots){
 const seen=new Set(roots),children=new Map();
 for(const org of orgs){if(!children.has(org.parent_id))children.set(org.parent_id,[]);children.get(org.parent_id).push(org.id)}
 let queue=[...roots],step=0;
 while(queue.length){const id=queue.shift();if(++step>300)deny('DV22_ORG_GRAPH_OVERSIZE',409);for(const c of children.get(id)||[])if(!seen.has(c)){seen.add(c);queue.push(c)}}
 return [...seen];
}
async function access(client,city,user,role,surface){
 if(!['MUNICIPAL_ADMIN','AUDITOR','DEPUTY','DIRECTOR'].includes(role))deny('DV22_MEMBERSHIP_ROLE_DENIED');
 const query=await client.query(`SELECT id,code,kind,parent_id,name_fa,active FROM org_units
  WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY created_at,id LIMIT 301`,[city.tenant_id,city.id]);
 if(query.rows.length>300)deny('DV22_ORG_INVENTORY_LIMIT',409);
 const orgs=query.rows.filter(x=>x.active===true),oversight=user.is_system_admin===true||['MUNICIPAL_ADMIN','AUDITOR'].includes(role);
 const appointments=await client.query(`SELECT a.org_unit_id,a.position_code FROM rhf_organization_appointments a
   WHERE a.tenant_id=$1 AND a.municipality_id=$2 AND a.user_id=$3
   AND a.status='APPROVED' AND a.valid_from<=now() AND (a.valid_to IS NULL OR a.valid_to>now())`,[city.tenant_id,city.id,user.id]);
 const deputyRoots=orgs.filter(x=>x.kind==='DEPUTY').map(x=>x.id);
 const myDeputies=appointments.rows.filter(x=>x.position_code==='DEPUTY_HEAD'&&deputyRoots.includes(x.org_unit_id)).map(x=>x.org_unit_id);
 let scoped=[];let permissions=null;
 if(surface==='deputy'){
  if(!oversight&&!(role==='DEPUTY'&&myDeputies.length))deny('DV22_DEPUTY_APPOINTMENT_REQUIRED');
  scoped=descendants(orgs,oversight?deputyRoots:myDeputies);
 }else if(surface==='waste'){
  const candidates=orgs.filter(x=>x.code===WASTE_CODE&&x.kind==='ORGANIZATION'&&deputyRoots.includes(x.parent_id));
  if(candidates.length!==1)deny('DV22_WASTE_STRUCTURE_NOT_READY',409);
  const w=candidates[0];permissions=await wastePermissions(client,city,user,role,w);
  scoped=descendants(orgs,[w.id]);
 }else deny('DV22_INVALID_SURFACE',400);
 const allowedCreate=maySubmit({surface,role,systemAdmin:user.is_system_admin===true,
  approvedDeputy:myDeputies.length>0,approvedWaste:permissions?.appointmentVerified===true,
  operationalWaste:permissions?.create===true});
 const allowedReview=!user.is_system_admin&&['MUNICIPAL_ADMIN','AUDITOR'].includes(role);
 return {scoped,owners:orgs.filter(x=>scoped.includes(x.id)).map(x=>({id:x.id,name:x.name_fa,kind:x.kind})),allowedCreate,allowedReview,oversight};
}
async function tableReady(client){const t=await client.query("SELECT to_regclass('public.rhf_urban_need_capacity') IS NOT NULL AS present");
 if(t.rows[0]?.present!==true)deny('DV22_MIGRATION_REQUIRED',409);}
export async function dv22RegistryRoute({part,method,resourceId,url,req,cityId,user,withScope,readBody,json,audit}){
 if(part!=='need-capacity-ledger'||!['GET','POST','PATCH'].includes(method))deny('NOT_FOUND',404);
 if(method==='GET'&&resourceId||method==='POST'&&resourceId||method==='PATCH'&&!DV22_UUID.test(resourceId||''))deny('DV22_RESOURCE_INVALID',400);
 const surface=url.searchParams.get('surface');if(!['deputy','waste'].includes(surface))deny('DV22_INVALID_SURFACE',400);
 if(method!=='GET')checkOrigin(req);
 const body=method==='POST'?validateSubmission(await readBody(req)):method==='PATCH'?validateDecision(await readBody(req)):null;
 const result=await withScope(cityId,user,'read',async(client,city,role)=>{
  const scopedAccess=await access(client,city,user,role,surface);await tableReady(client);
  const {scoped,owners,allowedCreate,allowedReview}=scopedAccess;
  if(method==='GET'){
   const r=await client.query(`SELECT id,tenant_id,municipality_id,owner_org_id,kind,sector,title,description,quantity,unit,
      evidence_ref,status,created_by,review_note,created_at,reviewed_at
      FROM rhf_urban_need_capacity WHERE tenant_id=$1 AND municipality_id=$2 AND owner_org_id=ANY($3::uuid[])
      ORDER BY created_at DESC,id DESC LIMIT 101`,[city.tenant_id,city.id,scoped]);
   const rows=r.rows.slice(0,100).map(x=>present(validateReceipt(x,city)));
   return {schema:DV22_SCHEMA,cityId:city.id,tenantId:city.tenant_id,viewerId:user.id,surface,
    access:{canSubmit:allowedCreate,canReview:allowedReview,visibleOwnerCount:scoped.length,ownerOptions:owners},rows,
    coverage:{bounded:true,hasMore:r.rows.length>100,source:'MANUAL_SUBMISSIONS',verifiedValueCount:0},
    governance:{noAutoExecution:true,decision:'HUMAN_REQUIRED',agentExecution:'NOT_ATTESTED',
      valueVerification:'NOT_ATTESTED',capacityAvailability:'NOT_CERTIFIED',productionReady:false}};
  }
  if(method==='POST'){
   if(!allowedCreate)deny('DV22_APPROVED_OPERATING_APPOINTMENT_REQUIRED');
   if(!scoped.includes(body.ownerOrgId))deny('DV22_OWNER_OUTSIDE_APPOINTED_ORGANIZATION');
   let row;
   try{
    const r=await client.query(`INSERT INTO rhf_urban_need_capacity
      (tenant_id,municipality_id,owner_org_id,kind,sector,title,description,quantity,unit,evidence_ref,request_key,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [city.tenant_id,city.id,body.ownerOrgId,body.kind,body.sector,body.title,body.description,
        body.quantity,body.unit,body.evidenceRef,body.requestKey,user.id]);row=r.rows[0];
   }catch(e){if(e.code==='23505')deny('DV22_DUPLICATE_REQUEST',409);throw e;}
   validateReceipt(row,city);
   await audit(client,city,user,'DV22_REGISTER',row.id,'SUBMITTED',
    {kind:body.kind,sector:body.sector,ownerOrgId:body.ownerOrgId,requestKey:body.requestKey,realizedValue:false});
   return {schema:DV22_SCHEMA,cityId:city.id,tenantId:city.tenant_id,row:present(row),governance:{valueVerification:'NOT_ATTESTED'}};
  }
  if(!allowedReview)deny('DV22_INDEPENDENT_REVIEW_ROLE_REQUIRED');
  const existing=await client.query(`SELECT * FROM rhf_urban_need_capacity
     WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND owner_org_id=ANY($4::uuid[]) FOR UPDATE`,
    [resourceId,city.tenant_id,city.id,scoped]);
  if(!existing.rows.length)deny('DV22_RECORD_NOT_VISIBLE',404);
  const record=validateReceipt(existing.rows[0],city);
  if(record.status!=='SUBMITTED')deny('DV22_ALREADY_REVIEWED',409);
  if(!mayReview({role,systemAdmin:user.is_system_admin===true,createdBy:record.created_by,reviewerId:user.id}))deny('DV22_SELF_REVIEW_FORBIDDEN');
  const updated=await client.query(`UPDATE rhf_urban_need_capacity
    SET status=$2,reviewed_by=$3,review_note=$4,reviewed_at=now() WHERE id=$1 RETURNING *`,
    [resourceId,body.decision,user.id,body.note]);
  const row=validateReceipt(updated.rows[0],city);
  await audit(client,city,user,'DV22_REGISTER',row.id,body.decision,{evidenceReviewed:true,realizedValue:false});
  return {schema:DV22_SCHEMA,cityId:city.id,tenantId:city.tenant_id,row:present(row),governance:{valueVerification:'NOT_ATTESTED'}};
 });
 return json(method==='GET'?200:method==='POST'?201:200,result);
}

// Reuse the exact existing DV2.2 permission boundary for read-only DV2.3 discovery.
export {access as dv22ScopedAccess};
