// Inside authenticated withScope() transaction; do not accept browser-supplied evidence or tenant scope.
import {ClientError} from './domain.mjs';
import {dv32hAgentRoute} from './dv32h-agent-routes.mjs';
import {validReview,validateAction,mustBeReviewer,validateReport,planningOnlyRecord,workflowId,QUEUE} from './dv32j-core.mjs';
import {UUID,candidateFingerprint} from './dv32i-review-core.mjs';
import {Connection,WorkflowClient,WorkflowExecutionAlreadyStartedError} from '@temporalio/client';
const fail=(n,m)=>{throw new ClientError(m,n);};
const ADDR='rhf-cityos-operational-temporal-1:7233';
async function temporalCall(callback){
 const connection=await Connection.connect({address:ADDR,connectTimeout:'5s'});
 try{return await callback(new WorkflowClient({connection,namespace:'default'}));}
 finally{await connection.close();}
}
function boundary({method,resourceId,url,headers}){
 if(!['GET','POST'].includes(method))fail(405,'METHOD_NOT_ALLOWED');
 if(!UUID.test(resourceId||''))fail(400,'REVIEW_ID_REQUIRED');
 if(!['mayor','deputy','waste'].includes(url.searchParams.get('desk')))fail(400,'EXPLICIT_DESK_REQUIRED');
 if(url.searchParams.getAll('desk').length!==1||url.searchParams.getAll('orgId').length>1)fail(400,'DUPLICATE_QUERY_PARAMETER');
 if([...url.searchParams.keys()].some(k=>!['desk','orgId'].includes(k)))fail(400,'UNKNOWN_QUERY_PARAMETER');
 if(url.searchParams.get('desk')!=='waste'&&url.searchParams.has('orgId'))fail(400,'CROSS_DESK_ORG_BLOCKED');
 if(method==='POST'){
  const host=headers.host,origin=headers.origin;let parsed;
  try{parsed=new URL(origin);}catch{fail(403,'SAME_ORIGIN_REQUIRED');}
  if(!host||parsed.host!==host||!['http:','https:'].includes(parsed.protocol)||
   headers['x-rhf-dv32j-intent']!=='HUMAN_PLANNING_HANDOFF_ONLY'||
   !String(headers['content-type']||'').toLowerCase().startsWith('application/json'))
   fail(403,'CSRF_OR_CONTENT_TYPE_GATE');
 }
}
export async function dv32jHandoffRoute({method,resourceId,client,city,user,role,url,readBody,audit,headers}){
 boundary({method,resourceId,url,headers});
 try{mustBeReviewer(role,user);}catch(e){fail(403,e.message);}
 const desk=url.searchParams.get('desk');
 const report=await dv32hAgentRoute({method:'GET',resourceId:undefined,client,city,user,role,url});
 let scope;try{scope=validateReport(desk,report,city);}catch(e){fail(403,e.message);}
 const row=(await client.query(`SELECT id,desk,organization_id,status,submitted_by,decided_by,candidate_id,evidence_sha256
  FROM public.rhf_dv32i_evidence_reviews
  WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND desk=$4
   AND organization_id IS NOT DISTINCT FROM $5::uuid`,
  [city.tenant_id,city.id,resourceId,desk,scope.organizationId])).rows[0];
 try{validReview(row,scope);}catch(e){fail(404,'ELIGIBLE_REVIEW_NOT_FOUND_IN_SCOPE');}
 const id=workflowId(row.id);
 if(method==='GET'){
  try{return await temporalCall(async temporal=>{
   const handle=temporal.getHandle(id);
   const data=await handle.query('dv32jStatus');
   return {schema:'RHF-DV32J-v1',reviewId:row.id,workflowId:id,status:data,
    executionAuthorization:false,verifiedUrbanValue:false};
  });}catch(e){
   if(/not found|not exist/i.test(String(e?.message||'')))return {schema:'RHF-DV32J-v1',reviewId:row.id,status:'NOT_STARTED',executionAuthorization:false};
   fail(503,'TEMPORAL_STATUS_UNAVAILABLE');
  }
 }
 // A planning handoff cannot rely on stale, no-longer-authorized evidence.
 const candidate=report.candidates.find(x=>x.id===row.candidate_id);
 if(!candidate||candidateFingerprint({desk,scope:{tenantId:scope.tenantId,municipalityId:scope.municipalityId,organizationId:scope.organizationId},candidate})!==row.evidence_sha256)
  fail(409,'EVIDENCE_CHANGED_AFTER_REVIEW');
 let body;try{body=validateAction(await readBody());}catch(e){fail(400,e.message);}
 if(user.id===row.submitted_by)fail(403,'SUBMITTER_CANNOT_HANDOFF');
 try{
  if(body.action==='START'){
   const record=planningOnlyRecord({city,scope,row,user});
   const result=await temporalCall(async temporal=>{
    try{const handle=await temporal.workflow.start('dv32jPlanningHandoff',{
     taskQueue:QUEUE,workflowId:id,args:[record],workflowIdReusePolicy:'REJECT_DUPLICATE',
     workflowExecutionTimeout:'35 days',workflowRunTimeout:'35 days'});
     return {workflowId:handle.workflowId,runId:handle.firstExecutionRunId||null,alreadyStarted:false};
    }catch(e){if(e instanceof WorkflowExecutionAlreadyStartedError||e.name==='WorkflowExecutionAlreadyStartedError')
      return {workflowId:id,runId:null,alreadyStarted:true};throw e;}
   });
   await audit(client,city,user,'DV32J_PLANNING_HANDOFF',row.id,'TEMPORAL_START_REQUESTED',
    {workflowId:id,desk,organizationId:scope.organizationId,reason:body.reason,existing:result.alreadyStarted});
   return {schema:'RHF-DV32J-v1',...result,executionAuthorization:false,fieldDispatch:false,payment:false,verifiedUrbanValue:false};
  }
  const ack=await temporalCall(async temporal=>{
   const handle=temporal.workflow.getHandle(id);
   const current=await handle.query('dv32jStatus');
   if(current?.phase==='ACKNOWLEDGED_NON_EXECUTING')return {alreadyAcknowledged:true};
   if(current?.phase!=='WAITING_FOR_PLANNING_ACK')fail(409,'WORKFLOW_NOT_WAITING');
   await handle.signal('dv32jPlanningAcknowledged',{reviewId:row.id,actorId:user.id,reason:body.reason});
   return {alreadyAcknowledged:false};
  });
  await audit(client,city,user,'DV32J_PLANNING_HANDOFF',row.id,'TEMPORAL_PLANNING_ACK_REQUESTED',
   {workflowId:id,desk,organizationId:scope.organizationId,reason:body.reason,existing:ack.alreadyAcknowledged});
  return {schema:'RHF-DV32J-v1',reviewId:row.id,workflowId:id,...ack,
   executionAuthorization:false,fieldDispatch:false,payment:false,verifiedUrbanValue:false};
 }catch(e){if(e instanceof ClientError)throw e;fail(503,'TEMPORAL_SERVICE_UNAVAILABLE_OR_WORKFLOW_NOT_READY');}
}
