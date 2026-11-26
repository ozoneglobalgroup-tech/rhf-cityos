// DV32UX11–12: explicit human work-order proposal, independent clearance,
// and append-only Temporal OPERATOR handoff intent. No actual Temporal start.
import {UUID,SHIRAZ} from './dv32ux7-review-core.mjs';
const fail = s => { throw Error(s); };
const DEMO=/(?:\bdemo\b|\bsynthetic\b|سناریوی ساختگی|آزمایشی)/i;
const KEYS=(v,expect)=>Object.keys(v).sort().join('|')===expect.slice().sort().join('|');
const note=(v,min,max)=>{
 if(typeof v!=='string'||v.trim().length<min||v.trim().length>max||/[<>\u0000-\u001f]/.test(v)||DEMO.test(v)||/https?:\/\//i.test(v))fail('UNSAFE_TEXT');
 return v.trim();
};
export function boundary({method,resourceId,url,headers={}}){
 if(!['GET','POST'].includes(method))fail('METHOD_NOT_ALLOWED');
 if(resourceId||[...url.searchParams].length)fail('RESOURCE_OR_QUERY_FORBIDDEN');
 if(method==='POST'){
  let origin;try{origin=new URL(headers.origin)}catch{fail('ORIGIN_REQUIRED')}
  if(!headers.host||origin.host!==headers.host||!['https:','http:'].includes(origin.protocol)||
    headers['x-rhf-dv32ux11-intent']!=='EXPLICIT_TWO_PERSON_WORKFLOW_NO_DISPATCH'||
    !/^application\/json(?:\s*;.*)?$/i.test(String(headers['content-type']||'')))fail('CSRF_OR_INTENT_REJECTED');
 }
}
export function scope(city,role,user,method){
 if(!UUID.test(city?.id)||!UUID.test(city?.tenant_id)||!SHIRAZ.has(String(city.name||'').trim().toLowerCase()))fail('SHIRAZ_ONLY');
 if(!UUID.test(user?.id)||!['DEPUTY','MUNICIPAL_ADMIN'].includes(role))fail('ROLE_DENIED');
 if(method==='POST'&&role!=='MUNICIPAL_ADMIN')fail('ADMIN_REQUIRED');
}
export function validate(v,endpoint){
 if(!v||Array.isArray(v)||typeof v!=='object')fail('BODY_REQUIRED');
 if(endpoint==='ux11'&&v.action==='PREPARE'){
  if(!KEYS(v,['action','confirm','requestId','planId','title','instructions'])||v.confirm!=='I_CONFIRM_DRAFT_WORK_ORDER_NO_FIELD_DISPATCH'||!UUID.test(v.requestId)||!UUID.test(v.planId))fail('PREPARE_CONTRACT_INVALID');
  return {action:v.action,requestId:v.requestId,planId:v.planId,title:note(v.title,8,160),instructions:note(v.instructions,16,500)};
 }
 if(endpoint==='ux11'&&v.action==='DECIDE'){
  if(!KEYS(v,['action','confirm','proposalId','decision','reason'])||v.confirm!=='I_INDEPENDENTLY_REVIEWED_CURRENT_EVIDENCE'||!UUID.test(v.proposalId)||!['CLEARED_FOR_HANDOFF_REQUEST','RETURNED_FOR_REVISION','REJECTED'].includes(v.decision))fail('DECIDE_CONTRACT_INVALID');
  return {action:v.action,proposalId:v.proposalId,decision:v.decision,reason:note(v.reason,16,500)};
 }
 if(endpoint==='ux12'&&v.action==='REQUEST_HANDOFF'){
  if(!KEYS(v,['action','confirm','requestId','proposalId','reason'])||v.confirm!=='I_REQUEST_OPERATOR_HANDOFF_NOT_WORKFLOW_START'||!UUID.test(v.requestId)||!UUID.test(v.proposalId))fail('HANDOFF_CONTRACT_INVALID');
  return {action:v.action,requestId:v.requestId,proposalId:v.proposalId,reason:note(v.reason,16,500)};
 }
 fail('UNKNOWN_ACTION');
}
export function currentEvidence({plan,review,caseRow,fingerprint,latestReviewId}){
 if(!plan||!review||!caseRow||!UUID.test(plan.id)||plan.status!=='PLANNING_DRAFT'||plan.case_id!==caseRow.id||plan.review_id!==review.id||
    plan.case_fingerprint!==fingerprint||review.id!==latestReviewId||review.status!=='APPROVED_FOR_PLANNING'||
    review.case_fingerprint!==fingerprint||review.submitted_by===review.reviewed_by||review.reviewed_by===caseRow.created_by||
    caseRow.status!=='DRAFT'||caseRow.service_active!==true||caseRow.unit_active!==true||
    plan.execution_authority!==false||plan.temporal_started!==false)fail('STALE_OR_UNAPPROVED_PLAN');
 return true;
}
export function independentDecision(p,actor){
 if(!p||!UUID.test(actor)||p.prepared_by===actor||p.created_by===actor||p.reviewed_by===actor)fail('INDEPENDENT_REVIEWER_REQUIRED');
 return true;
}
export function handoffReady(p,actor){
 if(!p||p.decision!=='CLEARED_FOR_HANDOFF_REQUEST'||!UUID.test(actor)||actor===p.prepared_by||actor===p.decided_by||actor===p.created_by)fail('THIRD_HUMAN_OPERATOR_REQUIRED');
 return true;
}
export function reportCheck(r,city,role,endpoint){
 const schema=endpoint==='ux11'?'RHF-DV32UX11-WORK-ORDERS-v1':'RHF-DV32UX12-TEMPORAL-HANDOFF-INTENTS-v1';
 if(r?.schema!==schema||r.cityId!==city.id||r.tenantId!==city.tenant_id||r.canWrite!==(role==='MUNICIPAL_ADMIN')||
 r.finalGo!=='NO_GO'||r.temporalStarted!==false||r.dispatchAuthorized!==false||!Array.isArray(r.items)||r.items.length>100||typeof r.truncated!=='boolean')fail('UNTRUSTED_WORK_ORDER_REPORT');
 return r;
}
