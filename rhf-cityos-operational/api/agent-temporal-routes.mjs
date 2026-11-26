// Tenant-scoped API that talks to the Temporal service. No anonymous or unverified workflow access.
import {Connection,WorkflowClient} from '@temporalio/client';
import {ClientError} from './domain.mjs';
import {GRAPH_ACTORS,isUuid} from './agent-graph-core.mjs';
import {TEMPORAL_PARTS,TEMPORAL_VERSION,TEMPORAL_QUEUE,TEMPORAL_ROLES,TEMPORAL_OPERATORS,temporalWorkflowId,validateTemporalStart,validateTemporalRelease,canStartTemporalMission,assertTemporalRelease,publicTemporalState} from './agent-temporal-core.mjs';
export {TEMPORAL_PARTS};
const fail=(msg,status=403)=>{throw new ClientError(msg,status);};
let shared=null;
async function temporalClient(){
 if(process.env.RHF_TEMPORAL_ENABLED!=='YES')fail('Temporal هنوز توسط مسئول سامانه فعال نشده است',503);
 if(shared)return shared;
 const address=process.env.RHF_TEMPORAL_ADDRESS||'temporal:7233';
 try{const conn=await Promise.race([Connection.connect({address}),new Promise((_,reject)=>setTimeout(()=>reject(Error('TEMPORAL_CONNECT_TIMEOUT')),6000))]);shared=new WorkflowClient({connection:conn,namespace:process.env.RHF_TEMPORAL_NAMESPACE||'default'});return shared;}
 catch{fail('سرویس Temporal در دسترس نیست',503);}
}
const bounded=(city,user,withScope,mode,fn)=>withScope(city,user,mode,async(c,scope,role)=>{
 if(!TEMPORAL_ROLES.includes(role))fail('اجازه مشاهده گردش‌کار Temporal وجود ندارد');
 return fn(c,scope,role);
});
async function readMission(c,scope,missionId){
 const m=(await c.query('SELECT * FROM rhf_agent_missions WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3',[scope.tenant_id,scope.id,missionId])).rows[0];
 if(!m)fail('مأموریت در شهرداری جاری یافت نشد',404);return m;
}
async function getHandleData(client,id,city,missionId){
 try{
  const h=client.getHandle(id);
  const d=await h.describe();
  let phase='UNAVAILABLE';
  if(d.status?.name==='COMPLETED')phase='COMPLETED';
  else if(d.status?.name==='FAILED'||d.status?.name==='TERMINATED'||d.status?.name==='CANCELLED')phase='FAILED';
  else{try{phase=await Promise.race([h.query('phase'),new Promise((_,rej)=>setTimeout(()=>rej(Error('QUERY_TIMEOUT')),5000))]);}catch{phase='UNAVAILABLE';}}
  return publicTemporalState({cityId:city,missionId,workflowId:id,phase,temporalStatus:d.status?.name||'UNKNOWN'});
 }catch(e){if(e?.name==='WorkflowNotFoundError')fail('گردش‌کار برای این مأموریت ثبت نشده است',404);fail('وضعیت گردش‌کار در دسترس نیست',503);}
}
export async function agentTemporalRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json,audit}){
 if(part==='agent-temporal-runtime'&&method==='GET'&&!resourceId){
  return json(200,await bounded(cityId,user,withScope,'read',async(c,scope,role)=>{
   const enabled=process.env.RHF_TEMPORAL_ENABLED==='YES';
   if(!enabled)return {version:TEMPORAL_VERSION,scope:scope.id,role,engine:'TEMPORAL_TS_1_25_0',state:'DISABLED',taskQueue:TEMPORAL_QUEUE,municipalDispatch:false};
   await temporalClient();return {version:TEMPORAL_VERSION,scope:scope.id,role,engine:'TEMPORAL_TS_1_25_0',state:'SERVICE_CONNECTED',taskQueue:TEMPORAL_QUEUE,municipalDispatch:false};
  }));
 }
 if(part!=='agent-temporal-workflows'||!resourceId&&method==='GET')fail('مسیر Temporal معتبر نیست',404);
 if(method==='POST'&&!resourceId){
  let body;try{body=validateTemporalStart(await readBody(req));}catch{fail('درخواست ایجاد گردش‌کار معتبر نیست',400);}
  const claim=await bounded(cityId,user,withScope,'write',async(c,scope,role)=>{
   const m=await readMission(c,scope,body.missionId);
   if(!canStartTemporalMission(m,role))fail('نقش یا وضعیت مأموریت برای ایجاد گردش‌کار مجاز نیست');
   await audit(c,scope,user,'AGENT_TEMPORAL',m.id,'START_REQUESTED',{readOnly:true,municipalDispatch:false});
   return {scope:scope.id,tenantId:scope.tenant_id,missionId:m.id,actorId:user.id,workflowId:temporalWorkflowId(scope.tenant_id,scope.id,m.id)};
  });
  const client=await temporalClient();let created=true;
  try{await client.start('governedUrbanWorkflow',{workflowId:claim.workflowId,taskQueue:TEMPORAL_QUEUE,args:[{tenantId:claim.tenantId,cityId:claim.scope,missionId:claim.missionId,actorId:claim.actorId,requestKey:claim.missionId}],workflowExecutionTimeout:'8 days'});}
  catch(e){if(/already started|already exists|already completed/i.test(e?.message||''))created=false;else fail('شروع گردش‌کار Temporal ناموفق بود',503);}
  const state=await getHandleData(client,claim.workflowId,claim.scope,claim.missionId);
  return json(created?201:200,{...state,idempotent:!created});
 }
 if(!isUuid(resourceId))fail('شناسه مأموریت معتبر نیست',400);
 if(method==='GET'){
  const context=await bounded(cityId,user,withScope,'read',async(c,scope)=>{const m=await readMission(c,scope,resourceId);return {missionId:m.id,scope:scope.id,workflowId:temporalWorkflowId(scope.tenant_id,scope.id,m.id)};});
  const client=await temporalClient();return json(200,await getHandleData(client,context.workflowId,context.scope,context.missionId));
 }
 if(method==='POST'){
  let body;try{body=validateTemporalRelease(await readBody(req));}catch{fail('دستور آزادسازی گردش‌کار نامعتبر است',400);}
  const context=await bounded(cityId,user,withScope,'write',async(c,scope,role)=>{
   const m=await readMission(c,scope,resourceId);
   try{assertTemporalRelease(m,role);}catch{fail('مأموریت مجوز مستقل معتبر ندارد',409);}
   await audit(c,scope,user,'AGENT_TEMPORAL',m.id,'RELEASE_REQUESTED',{missionVersion:m.version,readOnly:true,municipalDispatch:false});
   return {missionId:m.id,scope:scope.id,workflowId:temporalWorkflowId(scope.tenant_id,scope.id,m.id)};
  });
  const client=await temporalClient();
  try{await client.getHandle(context.workflowId).signal('releaseReadOnly',{release:'INDEPENDENTLY_AUTHORIZED',missionVersion:2,acknowledgeReadOnly:true});}
  catch{fail('آزادسازی گردش‌کار ثبت نشد؛ ممکن است گردش‌کار پایان یافته باشد',409);}
  return json(202,{...publicTemporalState({cityId:context.scope,missionId:context.missionId,workflowId:context.workflowId,phase:'AUTHORIZED_FOR_READ_ONLY',temporalStatus:'SIGNAL_ACCEPTED'}),signalAccepted:true,executionCompleted:false});
 }
 fail('روش درخواست Temporal مجاز نیست',405);
}
