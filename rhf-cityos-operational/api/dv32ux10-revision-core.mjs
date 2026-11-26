// DV32UX10: amend only evidence of RETURNED_FOR_EVIDENCE DRAFT real cases.
import {UUID,SHIRAZ,caseFingerprint} from './dv32ux7-review-core.mjs';
const fail=s=>{throw Error(s)};
const noDemo=/\b(?:SYN[-_]?\d+|demo|synthetic)\b|سناریوی ساختگی|آزمایشی/i;
function safe(x,min,max,label){if(typeof x!=='string'||x.trim().length<min||x.trim().length>max||/[<>\u0000-\u001f]/.test(x)||/https?:\/\//i.test(x)||noDemo.test(x))fail(label+'_INVALID');return x.trim()}
export function boundary({method,resourceId,url,headers={}}){
 if(!['GET','POST'].includes(method))fail('METHOD_NOT_ALLOWED');
 if(resourceId||[...url.searchParams].length)fail('RESOURCE_OR_QUERY_FORBIDDEN');
 if(method==='POST'){
  let o;try{o=new URL(headers.origin)}catch{fail('ORIGIN_REQUIRED')}
  if(!headers.host||o.host!==headers.host||!['http:','https:'].includes(o.protocol)||headers['x-rhf-dv32ux10-intent']!=='EXPLICIT_RETURNED_CASE_REVISION_ONLY'||!/^application\/json(?:\s*;.*)?$/i.test(String(headers['content-type']||'')))fail('ORIGIN_AND_INTENT_REQUIRED');
 }
}
export function scope(city,role,user,method){
 if(!UUID.test(city?.id)||!UUID.test(city?.tenant_id)||!SHIRAZ.has(String(city.name||'').trim().toLowerCase()))fail('SHIRAZ_SCOPE_REQUIRED');
 if(!['DEPUTY','MUNICIPAL_ADMIN'].includes(role)||!UUID.test(user?.id))fail('ROLE_OR_ACTOR_DENIED');
 if(method==='POST'&&role!=='MUNICIPAL_ADMIN')fail('CITY_ADMIN_ONLY');
}
export function validate(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join('|')!==['action','caseId','confirm','description','evidenceNote','note','priorReviewId','requestId'].join('|')||x.action!=='REVISE_RETURNED_DRAFT'||x.confirm!=='I_CONFIRM_REAL_CASE_EVIDENCE_REVISION_ONLY'||![x.requestId,x.caseId,x.priorReviewId].every(v=>UUID.test(v)))fail('INVALID_REVISION_BODY');
 return {requestId:x.requestId,caseId:x.caseId,priorReviewId:x.priorReviewId,
  description:safe(x.description,15,800,'DESCRIPTION'),evidenceNote:safe(x.evidenceNote,12,300,'EVIDENCE'),note:safe(x.note,16,550,'REASON')};
}
export function canRevise(review,c,actor,oldFingerprint,hasPlan){
 if(!review||!c||review.case_id!==c.id||review.status!=='RETURNED_FOR_EVIDENCE'||!UUID.test(review.reviewed_by)||review.reviewed_by===actor||hasPlan||review.case_fingerprint!==oldFingerprint)fail('REVISION_NOT_ELIGIBLE_OR_STALE');
 return true;
}
export function beforeAfter(c,description,evidence){
 const before=caseFingerprint(c);
 const updated={...c,description,evidence};
 const after=caseFingerprint(updated);
 if(before===after)fail('REVISION_MUST_CHANGE_EVIDENCE');
 return {before,after};
}
export function validateReport(x,city,role){
 if(x?.schema!=='RHF-DV32UX10-REVISION-QUEUE-v1'||x.cityId!==city.id||x.tenantId!==city.tenant_id||x.canWrite!==(role==='MUNICIPAL_ADMIN')||x.finalGo!=='NO_GO'||x.executionAuthority!==false||x.temporalStarted!==false||x.autoDispatch!==false||!Array.isArray(x.eligible)||!Array.isArray(x.revisions)||x.eligible.length>60||x.revisions.length>100||typeof x.truncated!=='boolean')fail('INVALID_REVISION_REPORT');
 if(x.eligible.some(v=>!UUID.test(v.caseId)||!UUID.test(v.priorReviewId)||typeof v.summary!=='string'||v.summary.length>180))fail('INVALID_REVISION_CANDIDATE');
 if(x.revisions.some(v=>!UUID.test(v.id)||!UUID.test(v.caseId)))fail('INVALID_REVISION_HISTORY');
 return x;
}
