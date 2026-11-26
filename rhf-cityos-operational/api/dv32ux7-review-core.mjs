// RHF City OS DV32UX7 — independent case evidence review, NOT an execution approval.
import {createHash} from 'node:crypto';
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const SHIRAZ=new Set(['شیراز','شهرداری شیراز','shiraz','shiraz municipality']);
const fail=s=>{throw Error(s)};
export function boundary({method,resourceId,url,headers={}}){
 if(!['GET','POST'].includes(method))fail('METHOD_NOT_ALLOWED');
 if(resourceId||[...url.searchParams].length)fail('RESOURCE_OR_QUERY_DENIED');
 if(method==='POST'){
  let o;try{o=new URL(headers.origin)}catch{fail('SAME_ORIGIN_REQUIRED')}
  if(!headers.host||o.host!==headers.host||!['http:','https:'].includes(o.protocol)||
     headers['x-rhf-dv32ux7-intent']!=='EXPLICIT_INDEPENDENT_CASE_REVIEW'||
     !/^application\/json(?:\s*;.*)?$/i.test(String(headers['content-type']||'')))fail('REVIEW_ORIGIN_AND_INTENT_REQUIRED');
 }
}
export function scopeCheck(city,role,user,method){
 if(!UUID.test(city?.id)||!UUID.test(city?.tenant_id)||!SHIRAZ.has(String(city.name||'').trim().toLowerCase()))fail('SHIRAZ_SCOPE_REQUIRED');
 if(!['MUNICIPAL_ADMIN','DEPUTY'].includes(role)&&user?.is_system_admin!==true)fail('CASE_REVIEW_READ_FORBIDDEN');
 if(method==='POST'&&role!=='MUNICIPAL_ADMIN'&&user?.is_system_admin!==true)fail('CASE_REVIEW_WRITE_FORBIDDEN');
 if(method==='POST'&&!UUID.test(user?.id||''))fail('ACTOR_ID_REQUIRED');
}
function note(v){if(typeof v!=='string'||v.trim().length<16||v.trim().length>550||/[<>\u0000-\u001f]/.test(v)||/https?:\/\//i.test(v))fail('REVIEW_NOTE_INVALID');return v.trim()}
export function bodyCheck(v){
 if(!v||typeof v!=='object'||Array.isArray(v))fail('REVIEW_BODY_INVALID');
 const keys=Object.keys(v).sort().join('|');
 if(v.action==='SUBMIT'){
  if(keys!==['action','caseId','confirm','note','requestId'].join('|')||v.confirm!=='I_CONFIRM_REAL_CASE_EVIDENCE_REVIEW'||!UUID.test(v.requestId)||!UUID.test(v.caseId))fail('SUBMIT_CONTRACT_INVALID');
  return {action:'SUBMIT',requestId:v.requestId,caseId:v.caseId,note:note(v.note)};
 }
 if(v.action==='DECIDE'){
  if(keys!==['action','confirm','decision','note','reviewId'].join('|')||v.confirm!=='I_CONFIRM_INDEPENDENT_REVIEW_ONLY'||!UUID.test(v.reviewId)||!['APPROVED_FOR_PLANNING','RETURNED_FOR_EVIDENCE','REJECTED'].includes(v.decision))fail('DECISION_CONTRACT_INVALID');
  return {action:'DECIDE',reviewId:v.reviewId,decision:v.decision,note:note(v.note)};
 }
 fail('UNKNOWN_CASE_REVIEW_ACTION');
}
export function caseFingerprint(c){
 if(!UUID.test(c?.id)||!UUID.test(c?.service_id)||!UUID.test(c?.unit_id)||!UUID.test(c?.created_by)||c?.status!=='DRAFT'||c?.service_active!==true||c?.unit_active!==true||!String(c?.acceptance_note||'').startsWith('INTAKE_SOURCE:')||typeof c?.summary!=='string'||typeof c?.description!=='string'||typeof c?.evidence!=='string'||typeof c?.module_code!=='string')fail('NOT_CURRENT_REAL_DRAFT');
 return createHash('sha256').update(JSON.stringify([c.id,c.service_id,c.unit_id,c.created_by,c.status,c.module_code,c.summary,c.description,c.evidence,c.acceptance_note]),'utf8').digest('hex');
}
export function independent(r,actor,caseCreator){
 if(!UUID.test(actor)||!UUID.test(r?.submitted_by)||!UUID.test(caseCreator)||r.submitted_by===actor||caseCreator===actor)fail('INDEPENDENT_REVIEW_REQUIRED');
 if(r.status!=='SUBMITTED')fail('REVIEW_ALREADY_FINISHED');
}
export function readCheck(x,city,role,actor){
 if(x?.schema!=='RHF-DV32UX7-CASE-REVIEW-v1'||x.cityId!==city?.id||x.tenantId!==city?.tenant_id||x.finalGo!=='NO_GO'||x.executionAuthority!==false||x.workflowStarted!==false||x.verifiedUrbanValue!==false||x.automaticDispatch!==false||!Array.isArray(x.cases)||!Array.isArray(x.reviews)||x.cases.length>60||x.reviews.length>100||typeof x.truncated!=='boolean'||x.canWrite!==Boolean(role==='MUNICIPAL_ADMIN'))fail('UNTRUSTED_REVIEW_REPORT');
 const seen=new Set();for(const c of x.cases){if(!UUID.test(c.id)||c.status!=='DRAFT'||typeof c.summary!=='string'||c.summary.length>180||seen.has(c.id))fail('INVALID_VISIBLE_CASE');seen.add(c.id)}
 const ids=new Set();for(const r of x.reviews){if(!UUID.test(r.id)||!UUID.test(r.caseId)||!['SUBMITTED','APPROVED_FOR_PLANNING','RETURNED_FOR_EVIDENCE','REJECTED'].includes(r.status)||typeof r.canDecide!=='boolean'||ids.has(r.id))fail('INVALID_VISIBLE_REVIEW');ids.add(r.id);
  if(r.canDecide!==Boolean(x.canWrite&&r.status==='SUBMITTED'&&r.submitterIsCurrentUser===false&&r.caseCreatorIsCurrentUser===false))fail('UNTRUSTED_INDEPENDENCE_FLAG');}
 return x;
}
