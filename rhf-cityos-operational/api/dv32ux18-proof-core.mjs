// RHF DV32UX18: tightly scoped manual Temporal proof. No field work or operations.
import {createHash} from 'node:crypto';
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const TEMPORAL_QUEUE='rhf-dv32ux18-operator-proof-v1';
export const WORKFLOW_TYPE='dv32ux18NonExecutingProof';
const fail=(s)=>{throw Error(s)};
export function boundary({method,resourceId,url,headers={}}){
 if(!['GET','POST'].includes(method)||[...url.searchParams].length)fail('METHOD_OR_QUERY_FORBIDDEN');
 if(resourceId&&!UUID.test(resourceId))fail('INVALID_HANDOFF_ID');
 if(method==='POST'){
  if(!UUID.test(resourceId))fail('HANDOFF_ID_REQUIRED');
  let u;try{u=new URL(headers.origin)}catch{fail('ORIGIN_REQUIRED')}
  if(!headers.host||headers.host!==u.host||!['http:','https:'].includes(u.protocol)||
   headers['x-rhf-ux18-intent']!=='I_AUTHORIZE_NON_EXECUTING_TEMPORAL_PROOF'||
   !/^application\/json(?:\s*;.*)?$/i.test(String(headers['content-type']||'')))fail('EXPLICIT_SAME_ORIGIN_INTENT_REQUIRED');
 }
}
export function scope({city,user,role,method}){
 if(!UUID.test(city?.tenant_id)||!UUID.test(city?.id)||!UUID.test(user?.id)||
  !['MAYOR','DEPUTY','MUNICIPAL_ADMIN'].includes(role))fail('CITY_ROLE_SCOPE_DENIED');
 if(method==='POST'&&role!=='MUNICIPAL_ADMIN')fail('INDEPENDENT_ADMIN_OPERATOR_REQUIRED');
}
export function body(v){
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!=='confirm,reason')fail('INVALID_BODY');
 if(v.confirm!=='I_ACKNOWLEDGE_NON_EXECUTING_TEMPORAL_PROOF'||typeof v.reason!=='string'||
  v.reason.trim().length<20||v.reason.trim().length>500||/[<>\u0000-\u001f]/.test(v.reason)||
  /demo|synthetic|آزمایشی|https?:\/\//i.test(v.reason))fail('INVALID_OPERATOR_ATTESTATION');
 return {reason:v.reason.trim()};
}
export function fingerprint(c){
 if(!UUID.test(c?.id)||!UUID.test(c?.service_id)||!UUID.test(c?.unit_id)||!UUID.test(c?.created_by)||
  c?.status!=='DRAFT'||c?.service_active!==true||c?.unit_active!==true||
  !String(c?.acceptance_note||'').startsWith('INTAKE_SOURCE:'))fail('CASE_NOT_CURRENT');
 return createHash('sha256').update(JSON.stringify([c.id,c.service_id,c.unit_id,c.created_by,c.status,
  c.module_code,c.summary,c.description,c.evidence,c.acceptance_note]),'utf8').digest('hex');
}
export function eligible(row,actor){
 if(!row||!UUID.test(actor)||!UUID.test(row.handoff_id)||row.handoff_state!=='AWAITING_OPERATOR_REVIEW'||
  row.temporal_started!==false||row.dispatch_authorized!==false||row.plan_temporal_started!==false||
  row.execution_authority!==false||row.plan_status!=='PLANNING_DRAFT'||
  row.review_status!=='APPROVED_FOR_PLANNING'||row.decision!=='CLEARED_FOR_HANDOFF_REQUEST'||
  row.review_id!==row.latest_review_id||row.review_id!==row.plan_review_id||
  row.review_id!==row.work_review_id||row.plan_id!==row.work_plan_id||
  row.work_order_id!==row.handoff_work_order_id)fail('CHAIN_NOT_CURRENT');
 const fp=fingerprint(row);
 if([row.review_fingerprint,row.plan_fingerprint,row.work_fingerprint,row.handoff_fingerprint]
  .some(x=>x!==fp))fail('STALE_CHAIN_EVIDENCE');
 const people=[row.created_by,row.submitted_by,row.reviewed_by,row.prepared_by,row.decided_by,row.requested_by];
 if(!people.every(x=>UUID.test(x))||people.includes(actor)||row.submitted_by===row.reviewed_by||row.created_by===row.reviewed_by||
  row.decided_by===row.prepared_by||row.decided_by===row.created_by||row.decided_by===row.reviewed_by||
  [row.prepared_by,row.decided_by,row.created_by,row.reviewed_by].includes(row.requested_by))fail('SEPARATE_OPERATOR_REQUIRED');
 return {fingerprint:fp,workflowId:`rhf-ux18-${row.municipality_id}-${row.handoff_id}`};
}
export function publicStatus({city,row,operatorId,temporal}){
 if(!UUID.test(row?.handoff_id)||row.municipality_id!==city.id||row.tenant_id!==city.tenant_id)fail('WRONG_SCOPE');
 return {handoffId:row.handoff_id,workOrderId:row.work_order_id,caseId:row.id,
  eligibleByIdentity:!!operatorId,temporal:temporal||'NOT_CHECKED',
  fieldDispatch:false,executionAuthorized:false,verifiedUrbanValue:false};
}
