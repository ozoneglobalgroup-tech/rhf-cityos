// Authenticated server withScope() enforces RLS. UX18 proves only a NON-EXECUTING Temporal workflow.
import {ClientError} from './domain.mjs';
import {Connection,WorkflowClient,WorkflowExecutionAlreadyStartedError} from '@temporalio/client';
import {boundary,scope,body,eligible,publicStatus,UUID,WORKFLOW_TYPE,TEMPORAL_QUEUE} from './dv32ux18-proof-core.mjs';
const fail=(n,s)=>{throw new ClientError(s,n)};
const QUERY=`SELECT h.id AS handoff_id,h.work_order_id AS handoff_work_order_id,h.case_fingerprint AS handoff_fingerprint,
 h.requested_by,h.state AS handoff_state,h.temporal_started,h.dispatch_authorized,h.created_at AS handoff_at,
 w.id AS work_order_id,w.plan_id AS work_plan_id,w.review_id AS work_review_id,w.case_fingerprint AS work_fingerprint,w.prepared_by,
 d.decision,d.decided_by,p.id AS plan_id,p.case_fingerprint AS plan_fingerprint,p.review_id AS plan_review_id,
 p.status AS plan_status,p.execution_authority,p.temporal_started AS plan_temporal_started,
 r.id AS review_id,r.status AS review_status,r.case_fingerprint AS review_fingerprint,r.submitted_by,r.reviewed_by,
 last_review.id AS latest_review_id,c.id,c.created_by,c.status,c.module_code,c.summary,c.description,c.evidence,c.acceptance_note,
 c.unit_id,c.service_id,s.active AS service_active,u.active AS unit_active,c.tenant_id,c.municipality_id
 FROM public.rhf_dv32ux12_handoff_intents h
 JOIN public.rhf_dv32ux11_work_orders w ON w.id=h.work_order_id AND w.tenant_id=h.tenant_id AND w.municipality_id=h.municipality_id
 JOIN public.rhf_dv32ux11_work_decisions d ON d.work_order_id=w.id AND d.tenant_id=h.tenant_id AND d.municipality_id=h.municipality_id
 JOIN public.rhf_dv32ux8_case_planning p ON p.id=w.plan_id AND p.tenant_id=h.tenant_id AND p.municipality_id=h.municipality_id
 JOIN public.rhf_dv32ux7_case_reviews r ON r.id=p.review_id AND r.tenant_id=h.tenant_id AND r.municipality_id=h.municipality_id
 JOIN public.service_cases c ON c.id=w.case_id AND c.id=p.case_id AND c.id=r.case_id AND c.tenant_id=h.tenant_id AND c.municipality_id=h.municipality_id
 JOIN public.org_units u ON u.id=c.unit_id AND u.tenant_id=h.tenant_id AND u.municipality_id=h.municipality_id
 JOIN public.service_definitions s ON s.id=c.service_id AND s.owner_unit_id=u.id AND s.tenant_id=h.tenant_id AND s.municipality_id=h.municipality_id
 LEFT JOIN LATERAL (SELECT id FROM public.rhf_dv32ux7_case_reviews WHERE case_id=c.id AND tenant_id=h.tenant_id AND municipality_id=h.municipality_id ORDER BY submitted_at DESC,id DESC LIMIT 1) last_review ON TRUE
 WHERE h.tenant_id=$1 AND h.municipality_id=$2`;
const ADDRESS='rhf-cityos-operational-temporal-1:7233';
async function temporal(fn){
 const conn=await Connection.connect({address:ADDRESS,connectTimeout:'5s'});
 try{return await fn(new WorkflowClient({connection:conn,namespace:'default'}));}finally{await conn.close()}
}
function workflowState(desc){
 const raw=String(desc?.status?.name||desc?.status||'UNKNOWN');
 return ['RUNNING','COMPLETED','FAILED','CANCELED','TERMINATED','TIMED_OUT'].includes(raw)?raw:'UNKNOWN';
}
function notFound(e){return /not found|not exist/i.test(String(e?.message||''))}
export async function dv32ux18ProofRoute({method,resourceId,url,headers,client,city,user,role,readBody,audit}){
 try{boundary({method,resourceId,url,headers});scope({city,user,role,method})}catch(e){fail(method==='POST'?403:405,e.message)}
 const q=QUERY+(resourceId?' AND h.id=$3':'')+' ORDER BY h.created_at DESC,h.id DESC LIMIT '+(resourceId?'2':'41');
 const rows=(await client.query(q,resourceId?[city.tenant_id,city.id,resourceId]:[city.tenant_id,city.id])).rows;
 if(resourceId&&rows.length!==1)fail(404,'HANDOFF_NOT_FOUND_IN_CITY_SCOPE');
 if(rows.length>40&&!resourceId)rows.length=40;
 const validated=rows.map(row=>{
  let auth=null;
  try{auth=eligible(row,user.id)}catch{/* invalid/obsolete chain fails closed */}
  return {row,auth,item:{...publicStatus({city,row,operatorId:role==='MUNICIPAL_ADMIN'?auth?.workflowId:null,temporal:'NOT_QUERIED'}),
   summary:String(row.summary||'').slice(0,150),eligibleByIdentity:!!auth&&role==='MUNICIPAL_ADMIN'}};
 });
 if(method==='GET'){
  if(!resourceId)return {schema:'RHF-UX18-TEMPORAL-PROOF-v1',cityId:city.id,tenantId:city.tenant_id,
   canStart:role==='MUNICIPAL_ADMIN',items:validated.map(x=>x.item),truncated:rows.length===40,
   fieldDispatch:false,executionAuthorized:false,verifiedUrbanValue:false,finalGo:'NO_GO'};
  const x=validated[0],id=`rhf-ux18-${city.id}-${x.row.handoff_id}`;
  let status='UNKNOWN_UNVERIFIED';
  try{status=await temporal(async cli=>workflowState(await cli.getHandle(id).describe()))}catch(e){status=notFound(e)?'NOT_STARTED':'TEMPORAL_UNAVAILABLE'}
  return {schema:'RHF-UX18-TEMPORAL-PROOF-v1',cityId:city.id,tenantId:city.tenant_id,
   ...x.item,temporal:status,workflowId:id,finalGo:'NO_GO'};
 }
 if(!validated[0].auth)fail(403,'INDEPENDENT_OPERATOR_OR_CURRENT_CHAIN_REQUIRED');
 let confirmation;try{confirmation=body(await readBody())}catch(e){fail(400,e.message)}
 const {row,auth}=validated[0];
 let run;
 try{run=await temporal(async cli=>{
   try{
    const handle=await cli.workflow.start(WORKFLOW_TYPE,{taskQueue:TEMPORAL_QUEUE,workflowId:auth.workflowId,
     workflowIdReusePolicy:'REJECT_DUPLICATE',workflowExecutionTimeout:'7 days',
     args:[{schema:'RHF-UX18-OPERATOR-PROOF-v1',handoffId:row.handoff_id,
       caseFingerprint:auth.fingerprint,operatorId:user.id,
       executionAuthorized:false,fieldDispatch:false,verifiedUrbanValue:false}]});
    return {workflowId:handle.workflowId,runId:handle.firstExecutionRunId||null,alreadyStarted:false};
   }catch(e){if(e instanceof WorkflowExecutionAlreadyStartedError||e?.name==='WorkflowExecutionAlreadyStartedError')
    return {workflowId:auth.workflowId,runId:null,alreadyStarted:true};throw e}
  })}catch(e){fail(503,'TEMPORAL_PROOF_WORKER_UNAVAILABLE')}
 // An independent identity proof is auditable. Temporal start is irreversible by DB rollback.
 await audit(client,city,user,'DV32UX18_NON_EXECUTING_TEMPORAL_PROOF',row.handoff_id,
  'EXPLICIT_INDEPENDENT_OPERATOR_NON_EXECUTING_WORKFLOW',
  {workflowId:auth.workflowId,caseId:row.id,caseFingerprint:auth.fingerprint,reason:confirmation.reason,
   existing:run.alreadyStarted,fieldDispatch:false,executionAuthorized:false,verifiedUrbanValue:false});
 return {schema:'RHF-UX18-TEMPORAL-PROOF-v1',cityId:city.id,tenantId:city.tenant_id,
  handoffId:row.handoff_id,...run,temporal:'START_REQUEST_ACCEPTED_NON_EXECUTING',
  executionAuthorized:false,fieldDispatch:false,verifiedUrbanValue:false,finalGo:'NO_GO'};
}
