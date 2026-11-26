/** City-scoped human-initiated Temporal LangGraph analysis; NO municipal execution. */
import {Connection,WorkflowClient} from '@temporalio/client';
import {ClientError} from './domain.mjs';
import {dv22ScopedAccess} from './dv22-registry-routes.mjs';
import {planHandoff} from './dv23b2a-agent-handoff-core.mjs';
import {SPECIALIST_SCHEMA,parseStart,workflowId,readOnlyAttestation,isId,SPECIALIST_QUEUE} from './dv23b2b-specialist-core.mjs';
export const DV23B2B_PARTS=Object.freeze(['dv23-specialist-analysis']);
const deny=(m,s=403)=>{throw new ClientError(m,s)};
function checkOrigin(req){
 let u;try{u=new URL(req.headers?.origin||'')}catch{deny('DV23B2B_ORIGIN_REQUIRED')}
 if(u.host!==req.headers.host||u.protocol!==(process.env.PUBLIC_HTTPS==='true'?'https:':'http:'))deny('DV23B2B_ORIGIN_MISMATCH');
}
async function getClient(){
 if(process.env.RHF_TEMPORAL_ENABLED!=='YES')deny('DV23B2B_TEMPORAL_DISABLED',503);
 try{const c=await Promise.race([Connection.connect({address:process.env.RHF_TEMPORAL_ADDRESS||'temporal:7233'}),new Promise((_,r)=>setTimeout(()=>r(Error('TIMEOUT')),5000))]);return new WorkflowClient({connection:c,namespace:process.env.RHF_TEMPORAL_NAMESPACE||'default'});}catch{deny('DV23B2B_TEMPORAL_UNAVAILABLE',503)}
}
async function readCase(client,city,scoped,decisionId){
 const d=(await client.query(`SELECT id,tenant_id,municipality_id,owner_org_id,need_id,capacity_id,sector,source_digest,status,created_by,decided_by
 FROM rhf_urban_opportunity_decisions WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND owner_org_id=ANY($4::uuid[])`,[decisionId,city.tenant_id,city.id,scoped])).rows[0];
 if(!d)deny('DV23B2B_DECISION_NOT_VISIBLE',404);
 const sources=(await client.query(`SELECT id,tenant_id,municipality_id,owner_org_id,kind,sector,title,quantity,unit,evidence_ref,status,created_by,reviewed_by,review_note
 FROM rhf_urban_need_capacity WHERE tenant_id=$1 AND municipality_id=$2 AND owner_org_id=ANY($3::uuid[]) AND id=ANY($4::uuid[])`,[city.tenant_id,city.id,scoped,[d.need_id,d.capacity_id]])).rows;
 const r=planHandoff(d,sources.find(x=>x.id===d.need_id),sources.find(x=>x.id===d.capacity_id),city,scoped);
 if(!r.eligible)deny('DV23B2B_CASE_NOT_ELIGIBLE_OR_EVIDENCE_STALE',409);
 return r.packet;
}
export async function dv23b2bSpecialistRoute({part,method,resourceId,url,req,cityId,user,withScope,readBody,json,audit}){
 if(part!=='dv23-specialist-analysis'||!['GET','POST'].includes(method)||(resourceId&&!isId(resourceId))||(method==='POST'&&resourceId))deny('DV23B2B_ROUTE_INVALID',405);
 const surface=url.searchParams.get('surface');
 if(!['deputy','waste'].includes(surface)||url.searchParams.getAll('surface').length!==1||[...url.searchParams.keys()].some(k=>k!=='surface'))deny('DV23B2B_SURFACE_INVALID',400);
 if(method==='POST')checkOrigin(req);
 let input=null;
 if(method==='POST')try{input=parseStart(await readBody(req));}catch{deny('DV23B2B_BODY_INVALID',400)}
 if(method==='GET'&&!resourceId){return json(200,await withScope(cityId,user,'read',async(c,city,role)=>{
  const access=await dv22ScopedAccess(c,city,user,role,surface);
  return {schema:SPECIALIST_SCHEMA,cityId:city.id,tenantId:city.tenant_id,viewerId:user.id,surface,enabled:process.env.RHF_TEMPORAL_ENABLED==='YES',canStart:access.allowedCreate===true&&user.is_system_admin!==true,queue:SPECIALIST_QUEUE,workerReadiness:'NOT_ATTESTED',governance:readOnlyAttestation};
 }));}
 const context=await withScope(cityId,user,'read',async(c,city,role)=>{
  const {scoped,allowedCreate}=await dv22ScopedAccess(c,city,user,role,surface);
  if(method==='POST'&&!allowedCreate)deny('DV23B2B_OPERATING_APPOINTMENT_REQUIRED');
  if(method==='POST'&&user.is_system_admin)deny('DV23B2B_ADMIN_CANNOT_START');
  const packet=await readCase(c,city,scoped,method==='POST'?input.decisionId:resourceId);
  if(method==='POST'&&packet.handoffFingerprint!==input.handoffFingerprint)deny('DV23B2B_CLIENT_EVIDENCE_CHANGED',409);
  if(method==='POST')await audit(c,city,user,'DV23B2B_SPECIALIST',packet.decisionId,'REQUESTED',{fingerprint:packet.handoffFingerprint,analysisOnly:true,noDispatch:true});
  return {packet,tenantId:city.tenant_id,cityId:city.id,actorId:user.id};
 });
 const client=await getClient();
 const wid=workflowId(context.tenantId,context.cityId,context.packet.decisionId);
 const handle=client.getHandle(wid);
 if(method==='POST'){
  let created=true;
  try{await client.start('dv23SpecialistWorkflow',{workflowId:wid,taskQueue:SPECIALIST_QUEUE,args:[{
    tenantId:context.tenantId,cityId:context.cityId,actorId:context.actorId,decisionId:context.packet.decisionId,handoffFingerprint:context.packet.handoffFingerprint
   }],workflowExecutionTimeout:'20 minutes'});}
  catch(e){if(/already started|already exists|already completed/i.test(e?.message||''))created=false;else deny('DV23B2B_WORKFLOW_START_FAILED',503)}
  return json(created?202:200,{schema:SPECIALIST_SCHEMA,cityId:context.cityId,tenantId:context.tenantId,decisionId:context.packet.decisionId,status:created?'QUEUED':'ALREADY_REQUESTED',idempotent:!created,governance:readOnlyAttestation});
 }
 try{
  const d=await handle.describe();const status=d.status?.name||'UNKNOWN';
  let result=null;
  if(status==='COMPLETED'){
   const r=await Promise.race([handle.result(),new Promise((_,reject)=>setTimeout(()=>reject(Error('RESULT_TIMEOUT')),5000))]);
   if(r?.decisionId!==context.packet.decisionId||r?.handoffFingerprint!==context.packet.handoffFingerprint||r?.municipalActionExecuted!==false||r?.verifiedPublicValue!==false)deny('DV23B2B_RESULT_SCOPE_INVALID',409);
   result=r;
  }
  return json(200,{schema:SPECIALIST_SCHEMA,cityId:context.cityId,tenantId:context.tenantId,viewerId:user.id,decisionId:context.packet.decisionId,status,result,governance:readOnlyAttestation});
 }catch(e){if(e instanceof ClientError)throw e;if(e?.name==='WorkflowNotFoundError'||/not found/i.test(e?.message||''))return json(200,{schema:SPECIALIST_SCHEMA,cityId:context.cityId,tenantId:context.tenantId,viewerId:user.id,decisionId:context.packet.decisionId,status:'NOT_STARTED',result:null,governance:readOnlyAttestation});deny('DV23B2B_TEMPORAL_STATE_UNAVAILABLE',503)}
}
