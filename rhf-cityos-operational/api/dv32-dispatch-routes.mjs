/** DV3.2A: scoped, audited human referral decisions; no service_case or missions mutations. */
import {ClientError} from './domain.mjs';
import {dv31Authorized,dv31ActiveServices} from './dv31-intake-routes.mjs';
import {DV31_UUID} from './dv31-intake-core.mjs';
import {DV32_SCHEMA,DV32_GOVERNANCE,DispatchError,validateRequest,validateDecision,requestHash,isDescendant,validCase,validIntent,mayReview,present} from './dv32-dispatch-core.mjs';
export const DV32_PARTS=Object.freeze(['dv32-governed-dispatch']);
const deny=(m,s=403)=>{throw new ClientError(m,s)};
function requireOrigin(req){
 let url;try{url=new URL(req.headers?.origin||'')}catch{deny('DV32_ORIGIN_REQUIRED',403)}
 if(url.host!==req.headers?.host||!['http:','https:'].includes(url.protocol)||
  url.protocol!==(process.env.PUBLIC_HTTPS==='true'?'https:':'http:'))deny('DV32_ORIGIN_MISMATCH');
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type']||''))deny('DV32_JSON_REQUIRED',415);
}
async function requireTable(client){
 const r=await client.query("SELECT to_regclass('public.rhf_dv32_dispatch_intents') IS NOT NULL AS ready");
 if(r.rows[0]?.ready!==true)deny('DV32_MIGRATION_REQUIRED',409);
}
async function loadCase(client,city,id,orgIds){
 const res=await client.query(`SELECT id,tenant_id,municipality_id,unit_id,service_id,status,summary,created_at
  FROM service_cases WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND unit_id=ANY($4::uuid[])
  FOR SHARE`,[id,city.tenant_id,city.id,orgIds]);
 try{return validCase(res.rows[0],city,orgIds)}catch(e){if(e instanceof DispatchError)deny(e.message,e.status);throw e;}
}
function scopeIntent(row,city,auth){
 try{return validIntent(row,city,auth.ids)}catch(e){if(e instanceof DispatchError)deny(e.message,e.status);throw e;}
}
async function targetCheck(client,city,auth,caseRow,targetId){
 if(!auth.ids.includes(targetId)||!isDescendant(caseRow.unit_id,targetId,auth.within))deny('DV32_TARGET_NOT_UNDER_CASE_OWNER');
 const target=auth.within.find(o=>o.id===targetId&&o.active===true);
 if(!target)deny('DV32_INACTIVE_TARGET',409);
 const active=await dv31ActiveServices(client,city,auth.ids);
 if(!active.some(s=>s.id===caseRow.service_id&&s.owner_unit_id===caseRow.unit_id))deny('DV32_SERVICE_INACTIVE_OR_FOREIGN',409);
}
export async function dv32DispatchRoute({part,method,resourceId,url,req,cityId,user,withScope,readBody,json,audit}){
 if(part!=='dv32-governed-dispatch'||!['GET','POST','PATCH'].includes(method))deny('METHOD_NOT_ALLOWED',405);
 if(method==='PATCH'&&!DV31_UUID.test(resourceId||''))deny('DV32_INTENT_ID_REQUIRED',400);
 if(method!=='PATCH'&&resourceId)deny('DV32_PATH_INVALID',404);
 if(url.searchParams.getAll('surface').length!==1||[...url.searchParams.keys()].some(x=>x!=='surface'))deny('DV32_QUERY_INVALID',400);
 const surface=url.searchParams.get('surface');if(!['deputy','waste'].includes(surface))deny('DV32_SURFACE_INVALID',400);
 let body=null;
 if(method!=='GET'){
  requireOrigin(req);
  try{body=method==='POST'?validateRequest(await readBody(req)):validateDecision(await readBody(req))}
  catch(e){if(e instanceof DispatchError)deny(e.message,e.status);throw e;}
 }
 const result=await withScope(cityId,user,'read',async(client,city,role)=>{
  const auth=await dv31Authorized(client,city,user,role,surface);
  await requireTable(client);
  const prefix={schema:DV32_SCHEMA,cityId:city.id,tenantId:city.tenant_id,viewerId:user.id,surface,governance:DV32_GOVERNANCE};
  if(method==='GET'){
   const [requests,cases]=auth.ids.length?await Promise.all([
    client.query(`SELECT d.*,c.summary AS case_summary,o.name_fa AS target_name
     FROM rhf_dv32_dispatch_intents d JOIN service_cases c ON c.id=d.service_case_id
      AND c.tenant_id=d.tenant_id AND c.municipality_id=d.municipality_id AND c.unit_id=d.owner_org_id
     JOIN org_units o ON o.id=d.target_org_id AND o.tenant_id=d.tenant_id AND o.municipality_id=d.municipality_id
     WHERE d.tenant_id=$1 AND d.municipality_id=$2 AND d.owner_org_id=ANY($3::uuid[]) AND d.target_org_id=ANY($3::uuid[])
     ORDER BY d.created_at DESC,d.id DESC LIMIT 101`,[city.tenant_id,city.id,auth.ids]),
    client.query(`SELECT id,tenant_id,municipality_id,unit_id,service_id,status,summary FROM service_cases
     WHERE tenant_id=$1 AND municipality_id=$2 AND unit_id=ANY($3::uuid[]) AND status='RECEIVED'
     ORDER BY created_at DESC,id DESC LIMIT 101`,[city.tenant_id,city.id,auth.ids])]):[{rows:[]},{rows:[]}];
   const rows=requests.rows.slice(0,100).map(x=>present(scopeIntent(x,city,auth)));
   const active=await dv31ActiveServices(client,city,auth.ids);
   const options=cases.rows.slice(0,100).filter(x=>{
    try{validCase(x,city,auth.ids);return active.some(s=>s.id===x.service_id&&s.owner_unit_id===x.unit_id)}catch{return false;}
   }).map(x=>({id:x.id,ownerOrgId:x.unit_id,summary:x.summary,status:x.status}));
   return {...prefix,access:{canSubmit:auth.canCreate,canReview:auth.canCreate,
    targetOrgs:auth.within.map(x=>({id:x.id,parentId:x.parent_id,name:x.name_fa,kind:x.kind})),
    candidateCases:options},rows,metrics:{visible:rows.length,hasMore:requests.rows.length>100,pending:rows.filter(x=>x.status==='SUBMITTED').length}};
  }
  if(!auth.canCreate)deny('DV32_OPERATIONAL_APPOINTMENT_REQUIRED');
  if(method==='POST'){
   const caseRow=await loadCase(client,city,body.caseId,auth.ids);await targetCheck(client,city,auth,caseRow,body.targetOrgId);
   const hash=requestHash(body);
   let r;
   try{r=await client.query(`INSERT INTO rhf_dv32_dispatch_intents
    (tenant_id,municipality_id,service_case_id,owner_org_id,target_org_id,request_key,input_hash,justification,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT(tenant_id,municipality_id,request_key) DO NOTHING RETURNING *`,
    [city.tenant_id,city.id,caseRow.id,caseRow.unit_id,body.targetOrgId,body.requestKey,hash,body.justification,user.id]);}
   catch(e){if(e.code==='23505')deny('DV32_ACTIVE_REQUEST_FOR_CASE_EXISTS',409);throw e;}
   if(!r.rows.length){
    const old=(await client.query(`SELECT * FROM rhf_dv32_dispatch_intents WHERE tenant_id=$1 AND municipality_id=$2 AND request_key=$3`,
      [city.tenant_id,city.id,body.requestKey])).rows[0];
    if(!old||old.created_by!==user.id||old.input_hash!==hash||old.service_case_id!==caseRow.id||old.target_org_id!==body.targetOrgId)deny('DV32_KEY_REUSE_MISMATCH',409);
    return {...prefix,duplicate:true,row:present(scopeIntent(old,city,auth))};
   }
   const row=scopeIntent(r.rows[0],city,auth);
   await audit(client,city,user,'CASE_DISPATCH_INTENT',row.id,'DV32_SUBMITTED',{
    caseId:row.service_case_id,ownerOrgId:row.owner_org_id,targetOrgId:row.target_org_id,
    requestKey:body.requestKey,approvedForPlanning:false,fieldDispatch:false});
   return {...prefix,duplicate:false,row:present(row)};
  }
  const current=(await client.query(`SELECT * FROM rhf_dv32_dispatch_intents
   WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 FOR UPDATE`,[city.tenant_id,city.id,resourceId])).rows[0];
  const item=scopeIntent(current,city,auth);
  if(!mayReview({canCreate:auth.canCreate,actorId:user.id,row:item}))deny('DV32_INDEPENDENT_REVIEW_REQUIRED',403);
  if(item.version!==body.version)deny('DV32_VERSION_CONFLICT',409);
  const row=await loadCase(client,city,item.service_case_id,auth.ids);
  if(row.unit_id!==item.owner_org_id)deny('DV32_OWNER_DRIFT',409);
  await targetCheck(client,city,auth,row,item.target_org_id);
  const status=body.action==='APPROVE_PLANNING'?'APPROVED_FOR_PLANNING':'REJECTED';
  const updated=await client.query(`UPDATE rhf_dv32_dispatch_intents
   SET status=$4,version=version+1,reviewed_by=$5,review_note=$6,reviewed_at=now()
   WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND status='SUBMITTED'
    AND version=$7 AND owner_org_id=$8 AND target_org_id=$9 AND created_by<>$5 RETURNING *`,
    [city.tenant_id,city.id,item.id,status,user.id,body.note,body.version,item.owner_org_id,item.target_org_id]);
  if(updated.rows.length!==1)deny('DV32_CONCURRENT_DECISION',409);
  await audit(client,city,user,'CASE_DISPATCH_INTENT',item.id,status,{
   caseId:item.service_case_id,targetOrgId:item.target_org_id,reviewOnly:true,missionCreated:false});
  return {...prefix,row:present(scopeIntent(updated.rows[0],city,auth))};
 });
 return json(method==='POST'?(result.duplicate?200:201):200,result);
}
