// DV32UX8.1: one immutable human-created planning draft per independently approved real case.
// NEVER an execution, mission, resource allocation, dispatch, payment or Temporal authorization.
import {UUID,SHIRAZ} from './dv32ux7-review-core.mjs';
const fail=s=>{throw Error(s)};
const statuses=new Set(['PLANNING_DRAFT']);
export function boundary({method,resourceId,url,headers={}}){
 if(!['GET','POST'].includes(method))fail('METHOD_NOT_ALLOWED');
 if(resourceId||[...url.searchParams].length)fail('RESOURCE_AND_QUERY_FORBIDDEN');
 if(method==='POST'){
  let o;try{o=new URL(headers.origin)}catch{fail('SAME_ORIGIN_REQUIRED')}
  if(!headers.host||o.host!==headers.host||!['http:','https:'].includes(o.protocol)||
    headers['x-rhf-dv32ux8-intent']!=='EXPLICIT_PLANNING_DRAFT_ONLY'||
    !/^application\/json(?:\s*;.*)?$/i.test(String(headers['content-type']||'')))fail('SAME_ORIGIN_AND_INTENT_REQUIRED');
 }
}
export function scope(city,role,user,method){
 if(!UUID.test(city?.id)||!UUID.test(city?.tenant_id)||!SHIRAZ.has(String(city.name||'').trim().toLowerCase()))fail('SHIRAZ_SCOPE_REQUIRED');
 if(!['MUNICIPAL_ADMIN','DEPUTY'].includes(role))fail('PLANNING_READ_FORBIDDEN');
 if(method==='POST'&&role!=='MUNICIPAL_ADMIN')fail('PLANNING_WRITE_FORBIDDEN');
 if(!UUID.test(user?.id))fail('ACTOR_REQUIRED');
}
export function bodyCheck(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join('|')!==['action','caseId','confirm','note','requestId','resourceId','reviewId'].join('|'))fail('BAD_PLANNING_CONTRACT');
 if(x.action!=='PREPARE'||x.confirm!=='I_CONFIRM_PLANNING_ONLY_NO_DISPATCH'||!UUID.test(x.requestId)||!UUID.test(x.caseId)||!UUID.test(x.reviewId)||!(x.resourceId===null||UUID.test(x.resourceId)))fail('BAD_PLANNING_IDENTIFIERS');
 if(typeof x.note!=='string'||x.note.trim().length<16||x.note.trim().length>550||/[<>\u0000-\u001f]/.test(x.note)||/https?:\/\//i.test(x.note))fail('BAD_PLANNING_NOTE');
 return {requestId:x.requestId,caseId:x.caseId,reviewId:x.reviewId,resourceId:x.resourceId,note:x.note.trim()};
}
export function currentApproval(review,c,fingerprint){
 if(!c||!review||!UUID.test(review.id)||!UUID.test(review.case_id)||!UUID.test(review.submitted_by)||!UUID.test(review.reviewed_by)||!UUID.test(c.created_by)||review.case_id!==c.id||review.status!=='APPROVED_FOR_PLANNING'||review.reviewed_by===review.submitted_by||review.reviewed_by===c.created_by||!review.reviewed_at||review.case_fingerprint!==fingerprint)fail('INDEPENDENT_CURRENT_APPROVAL_REQUIRED');
 return true;
}
export function resourceSnapshot(resource,c){
 if(!resource||!UUID.test(resource.id)||resource.owner_unit_id!==c.unit_id||resource.authorized!==true||typeof resource.unit!=='string'||resource.unit.length>50||!/^\d+(?:\.\d+)?$/.test(String(resource.total_quantity))||!/^\d+(?:\.\d+)?$/.test(String(resource.reserve_quantity))||!(Number(resource.total_quantity)>Number(resource.reserve_quantity))||!Number.isInteger(resource.allocatable_bps)||resource.allocatable_bps<0||resource.allocatable_bps>10000)fail('RESOURCE_NOT_AUTHORIZED_FOR_PLANNING');
 return {resourceId:resource.id,unit:resource.unit,totalQuantityObserved:String(resource.total_quantity),reserveQuantityObserved:String(resource.reserve_quantity),allocatableBpsObserved:resource.allocatable_bps,observationOnly:true,reservationQuantity:0};
}
export function readCheck(r,city,role){
 if(r?.schema!=='RHF-DV32UX8-CASE-PLANNING-v1'||r.cityId!==city.id||r.tenantId!==city.tenant_id||r.finalGo!=='NO_GO'||r.executionAuthority!==false||r.automaticFieldDispatch!==false||r.temporalStarted!==false||r.resourceReserved!==false||r.verifiedUrbanValue!==false||r.canWrite!==(role==='MUNICIPAL_ADMIN')||typeof r.truncated!=='boolean'||!Array.isArray(r.candidates)||!Array.isArray(r.resources)||!Array.isArray(r.plans)||r.candidates.length>60||r.resources.length>60||r.plans.length>100)fail('UNTRUSTED_PLANNING_REPORT');
 const cs=new Set(),rs=new Set(),ps=new Set();
 for(const c of r.candidates){if(!UUID.test(c.caseId)||!UUID.test(c.reviewId)||!UUID.test(c.unitId)||typeof c.summary!=='string'||c.summary.length>180||typeof c.currentEvidence!=='boolean'||cs.has(c.caseId))fail('INVALID_APPROVED_CANDIDATE');cs.add(c.caseId)}
 for(const v of r.resources){if(!UUID.test(v.id)||!UUID.test(v.ownerUnitId)||typeof v.name!=='string'||v.name.length>180||rs.has(v.id))fail('INVALID_PLANNING_RESOURCE');rs.add(v.id)}
 for(const p of r.plans){if(!UUID.test(p.id)||!UUID.test(p.caseId)||!statuses.has(p.status)||typeof p.currentEvidence!=='boolean'||typeof p.resourceLinked!=='boolean'||ps.has(p.id))fail('INVALID_PLANNING_DRAFT');ps.add(p.id)}
 return r;
}
export function actionCheck(r,city){if(r?.schema!=='RHF-DV32UX8-PLANNING-ACTION-v1'||r.cityId!==city.id||r.tenantId!==city.tenant_id||!UUID.test(r.planId)||r.status!=='PLANNING_DRAFT'||r.executionAuthority!==false||r.resourceReserved!==false||r.temporalStarted!==false||r.finalGo!=='NO_GO')fail('UNTRUSTED_PLANNING_ACTION');return r}
