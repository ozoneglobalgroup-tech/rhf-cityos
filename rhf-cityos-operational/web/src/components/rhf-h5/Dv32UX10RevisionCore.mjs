const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=s=>{throw Error(s)};
export function context({desk,tab,cityId,tenantId,orgId}){
 if(desk!=='deputy'||tab!=='case-revisions'||!UUID.test(cityId)||!UUID.test(tenantId)||orgId)fail('UNAUTHORIZED_REVISION_WORKSPACE');return {cityId,tenantId};
}
export const url=c=>`/api/v1/cities/${encodeURIComponent(c.cityId)}/dv32ux10-case-revisions`;
export function safeReport(r,c){if(r?.schema!=='RHF-DV32UX10-REVISION-QUEUE-v1'||r.cityId!==c.cityId||r.tenantId!==c.tenantId||r.executionAuthority!==false||r.temporalStarted!==false||r.autoDispatch!==false||r.finalGo!=='NO_GO'||!Array.isArray(r.eligible)||!Array.isArray(r.revisions)||r.eligible.length>60||r.revisions.length>100||typeof r.truncated!=='boolean'||typeof r.canWrite!=='boolean')fail('UNTRUSTED_REVISION_RESPONSE');return r}
function clean(v,min,max){if(typeof v!=='string'||v.trim().length<min||v.trim().length>max||/[<>\u0000-\u001f]/.test(v))fail('REVISION_TEXT_INVALID');return v.trim()}
export function revise(x){if(![x.requestId,x.caseId,x.priorReviewId].every(v=>UUID.test(v)))fail('BAD_REVISION_IDS');return {action:'REVISE_RETURNED_DRAFT',confirm:'I_CONFIRM_REAL_CASE_EVIDENCE_REVISION_ONLY',requestId:x.requestId,caseId:x.caseId,priorReviewId:x.priorReviewId,
 description:clean(x.description,15,800),evidenceNote:clean(x.evidenceNote,12,300),note:clean(x.note,16,550)};}
export function actionCheck(r,c){if(r?.schema!=='RHF-DV32UX10-REVISION-ACTION-v1'||r.cityId!==c.cityId||r.tenantId!==c.tenantId||!UUID.test(r.revisionId)||r.requiresNewIndependentReview!==true||r.executionAuthority!==false||r.temporalStarted!==false||r.finalGo!=='NO_GO')fail('UNTRUSTED_REVISION_ACTION');return r}
