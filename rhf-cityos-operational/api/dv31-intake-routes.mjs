/** DV3.1: existing service_cases/definitions, with scoped appointment and idempotent intake. */
import {ClientError} from './domain.mjs';
import {WASTE_CODE} from './waste-pilot-core.mjs';
import {wastePermissions} from './waste-authorization.mjs';
import {DV31_SCHEMA,DV31_UUID,IntakeError,validateIntake,fingerprint,operationalWriter,verifyIntakeRow,presentCase} from './dv31-intake-core.mjs';
export const DV31_PARTS=Object.freeze(['dv31-operational-intake']);
const deny=(x,s=403)=>{throw new ClientError(x,s)};
function origin(req){let o;try{o=new URL(req.headers?.origin||'')}catch{deny('DV31_ORIGIN_REQUIRED')}
 const h=req.headers?.host;if(o.host!==h||!['http:','https:'].includes(o.protocol)||o.protocol!==(process.env.PUBLIC_HTTPS==='true'?'https:':'http:'))deny('DV31_ORIGIN_MISMATCH');
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type']||''))deny('DV31_JSON_REQUIRED',415);
}
function subtree(rows,roots){const seen=new Set(roots),queue=[...roots];for(let i=0;i<queue.length;i++){if(i>500)deny('DV31_ORG_DEPTH_LIMIT',409);for(const v of rows){if(v.parent_id===queue[i]&&!seen.has(v.id)){seen.add(v.id);queue.push(v.id);}}}return [...seen];}
async function authorized(client,city,user,role,surface){
 if(!['MUNICIPAL_ADMIN','AUDITOR','DEPUTY','DIRECTOR'].includes(role))deny('DV31_ROLE_DENIED');
 const data=await client.query(`SELECT id,tenant_id,municipality_id,parent_id,code,kind,name_fa,active
   FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY created_at,id LIMIT 501`,[city.tenant_id,city.id]);
 if(data.rows.length>500)deny('DV31_ORG_LIMIT',409);
 const orgs=data.rows.filter(x=>x.active===true&&x.tenant_id===city.tenant_id&&x.municipality_id===city.id);
 const deputy=orgs.find(x=>x.code==='DEP_URBAN_ENV'&&x.kind==='DEPUTY');
 const waste=orgs.find(x=>x.code===WASTE_CODE&&x.kind==='ORGANIZATION'&&x.parent_id===deputy?.id);
 const oversight=user.is_system_admin===true||['MUNICIPAL_ADMIN','AUDITOR'].includes(role);
 const ap=await client.query(`SELECT org_unit_id,position_code FROM rhf_organization_appointments
  WHERE tenant_id=$1 AND municipality_id=$2 AND user_id=$3 AND status='APPROVED'
  AND valid_from<=now() AND (valid_to IS NULL OR valid_to>now())`,[city.tenant_id,city.id,user.id]);
 const approved=ap.rows.filter(x=>orgs.some(o=>o.id===x.org_unit_id));
 let rootIds=[],permissions=null;
 if(surface==='deputy'){
  if(oversight){rootIds=deputy?[deputy.id]:[];}
  else if(role==='DEPUTY'){rootIds=approved.filter(x=>x.position_code==='DEPUTY_HEAD'&&x.org_unit_id===deputy?.id).map(x=>x.org_unit_id);}
  else if(role==='DIRECTOR'){
   const descendants=new Set(deputy?subtree(orgs,[deputy.id]):[]);
   rootIds=approved.filter(x=>x.position_code==='ORG_CEO'&&descendants.has(x.org_unit_id)&&orgs.some(o=>o.id===x.org_unit_id&&o.kind==='ORGANIZATION')).map(x=>x.org_unit_id);
  }
  if(!oversight&&!rootIds.length)deny('DV31_APPOINTMENT_REQUIRED');
 }else if(surface==='waste'){
  if(!waste)deny('DV31_WASTE_NOT_READY',409);
  if(!oversight)permissions=await wastePermissions(client,city,user,role,waste);
  rootIds=[waste.id];
  if(!oversight&&!(role==='DIRECTOR'&&approved.some(x=>x.org_unit_id===waste.id&&x.position_code==='ORG_CEO')))deny('DV31_WASTE_CEO_APPOINTMENT_REQUIRED');
 }else deny('DV31_SURFACE_INVALID',400);
 const ids=subtree(orgs,rootIds),within=orgs.filter(x=>ids.includes(x.id));
 const codes=approved.filter(x=>rootIds.includes(x.org_unit_id)).map(x=>x.position_code);
 const canCreate=!oversight&&operationalWriter({role,systemAdmin:user.is_system_admin===true,positionCodes:codes})&&
  (surface!=='waste'||permissions?.create===true);
 return {ids,within,canCreate};
}
async function services(client,city,ids){
 if(!ids.length)return [];
 const r=await client.query(`SELECT s.id,s.owner_unit_id,s.module_code,s.name_fa,s.sla_hours
   FROM service_definitions s JOIN module_activations m
     ON m.tenant_id=s.tenant_id AND m.municipality_id=s.municipality_id AND m.code=s.module_code
   WHERE s.tenant_id=$1 AND s.municipality_id=$2 AND s.owner_unit_id=ANY($3::uuid[])
     AND s.active=true AND m.active=true ORDER BY s.name_fa,s.id LIMIT 501`,[city.tenant_id,city.id,ids]);
 if(r.rows.length>500)deny('DV31_SERVICE_LIMIT',409);return r.rows;
}
async function ready(client){const r=await client.query("SELECT to_regclass('public.rhf_dv31_intake_requests') IS NOT NULL AS ready");if(r.rows[0]?.ready!==true)deny('DV31_MIGRATION_REQUIRED',409);}
export async function dv31IntakeRoute({part,method,resourceId,url,req,cityId,user,withScope,readBody,json,audit}){
 if(part!=='dv31-operational-intake'||resourceId)deny('NOT_FOUND',404);
 if(!['GET','POST'].includes(method))deny('METHOD_NOT_ALLOWED',405);
 if(url.searchParams.getAll('surface').length!==1||[...url.searchParams.keys()].some(k=>k!=='surface'))deny('DV31_QUERY_INVALID',400);
 const surface=url.searchParams.get('surface');if(!['deputy','waste'].includes(surface))deny('DV31_SURFACE_INVALID',400);
 let input=null;if(method==='POST'){origin(req);try{input=validateIntake(await readBody(req));}catch(e){if(e instanceof IntakeError)deny(e.message,e.status);throw e;}}
 const output=await withScope(cityId,user,'read',async(client,city,role)=>{
  const auth=await authorized(client,city,user,role,surface);await ready(client);
  const opts=await services(client,city,auth.ids);
  if(method==='GET'){
   const r=auth.ids.length?await client.query(`SELECT c.id,c.tenant_id,c.municipality_id,c.unit_id,c.service_id,c.summary,c.description,c.priority,c.status,c.created_at,c.due_at,
    u.name_fa AS owner_name,s.name_fa AS service_name FROM service_cases c
    JOIN org_units u ON u.id=c.unit_id AND u.tenant_id=c.tenant_id AND u.municipality_id=c.municipality_id
    LEFT JOIN service_definitions s ON s.id=c.service_id AND s.tenant_id=c.tenant_id AND s.municipality_id=c.municipality_id
    WHERE c.tenant_id=$1 AND c.municipality_id=$2 AND c.unit_id=ANY($3::uuid[])
    ORDER BY c.created_at DESC,c.id DESC LIMIT 101`,[city.tenant_id,city.id,auth.ids]):{rows:[]};
   const rows=r.rows.slice(0,100).map(x=>presentCase(verifyIntakeRow(x,city,auth.ids)));
   const statusCounts={};for(const c of rows)statusCounts[c.status]=(statusCounts[c.status]||0)+1;
   return {schema:DV31_SCHEMA,cityId:city.id,tenantId:city.tenant_id,viewerId:user.id,surface,
    access:{canCreate:auth.canCreate&&opts.length>0,appointmentVerified:auth.canCreate,
      ownerOptions:auth.within.map(x=>({id:x.id,name:x.name_fa,kind:x.kind,code:x.code})),
      serviceOptions:opts.map(x=>({id:x.id,ownerOrgId:x.owner_unit_id,moduleCode:x.module_code,name:x.name_fa,slaHours:x.sla_hours}))},
    rows,metrics:{visible:rows.length,hasMore:r.rows.length>100,statusCounts,scope:'VISIBLE_APPROVED_ORGANIZATIONS'},
    governance:{noAutoDispatch:true,noAutoPayment:true,operationalApproval:'HUMAN_REQUIRED',verifiedPublicValue:false,tenantIsolationUat:'NOT_ATTESTED'}};
  }
  if(!auth.canCreate)deny('DV31_VALID_APPOINTMENT_REQUIRED');
  if(!auth.ids.includes(input.ownerOrgId))deny('DV31_OWNER_OUTSIDE_APPOINTED_SCOPE');
  const service=opts.find(x=>x.id===input.serviceId&&x.owner_unit_id===input.ownerOrgId);
  if(!service)deny('DV31_SERVICE_NOT_ACTIVE_FOR_OWNER',409);
  const hash=fingerprint(input);
  const prev=await client.query(`SELECT service_case_id,created_by,owner_org_id,input_hash
   FROM rhf_dv31_intake_requests WHERE tenant_id=$1 AND municipality_id=$2 AND request_key=$3`,[city.tenant_id,city.id,input.requestKey]);
  if(prev.rows.length){const v=prev.rows[0];if(v.created_by!==user.id||v.owner_org_id!==input.ownerOrgId||v.input_hash!==hash)deny('DV31_IDEMPOTENCY_KEY_CONFLICT',409);
   const old=await client.query(`SELECT id,tenant_id,municipality_id,unit_id,service_id,summary,description,priority,status,created_at,due_at
    FROM service_cases WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND unit_id=$4`,[city.tenant_id,city.id,v.service_case_id,input.ownerOrgId]);
   if(!old.rows.length)deny('DV31_RECEIPT_CASE_MISSING',409);
   return {schema:DV31_SCHEMA,cityId:city.id,tenantId:city.tenant_id,duplicate:true,row:presentCase(verifyIntakeRow(old.rows[0],city,auth.ids)),governance:{noAutoDispatch:true,verifiedPublicValue:false}};
  }
  const created=await client.query(`INSERT INTO service_cases(tenant_id,municipality_id,module_code,unit_id,service_id,due_at,summary,description,priority,created_by)
   VALUES($1,$2,$3,$4,$5,CASE WHEN $6::integer IS NULL THEN NULL ELSE now()+($6::integer*interval '1 hour') END,$7,$8,$9,$10) RETURNING *`,
   [city.tenant_id,city.id,service.module_code,input.ownerOrgId,service.id,service.sla_hours,input.summary,input.description,input.priority,user.id]);
  const record=verifyIntakeRow(created.rows[0],city,auth.ids);
  try{await client.query(`INSERT INTO rhf_dv31_intake_requests(tenant_id,municipality_id,owner_org_id,service_case_id,request_key,input_hash,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7)`,[city.tenant_id,city.id,input.ownerOrgId,record.id,input.requestKey,hash,user.id]);}
  catch(e){if(e?.code==='23505')deny('DV31_CONCURRENT_DUPLICATE_RETRY',409);throw e;}
  await audit(client,city,user,'CASE',record.id,'DV31_INTAKE',{ownerOrgId:input.ownerOrgId,serviceId:service.id,requestKey:input.requestKey,source:'DV31',automatedDispatch:false});
  return {schema:DV31_SCHEMA,cityId:city.id,tenantId:city.tenant_id,duplicate:false,row:presentCase(record),governance:{noAutoDispatch:true,verifiedPublicValue:false}};
 });
 return json(method==='POST'?(output.duplicate?200:201):200,output);
}

// DV3.2A reuses the exact existing organization and appointment gate.
export {authorized as dv31Authorized, services as dv31ActiveServices};
