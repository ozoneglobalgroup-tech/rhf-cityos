// UI validation for independent case review, never execution approval.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=s=>{throw Error(s)};
export function context({desk,tab,cityId,tenantId,orgId}){
 if(desk!=='deputy'||tab!=='case-review'||!UUID.test(cityId)||!UUID.test(tenantId)||orgId)fail('INVALID_REVIEW_WORKSPACE');
 return {cityId,tenantId};
}
export const url=c=>`/api/v1/cities/${encodeURIComponent(c.cityId)}/dv32ux7-real-case-review`;
export function safeReport(r,c){
 if(r?.schema!=='RHF-DV32UX7-CASE-REVIEW-v1'||r.cityId!==c.cityId||r.tenantId!==c.tenantId||r.finalGo!=='NO_GO'||r.executionAuthority!==false||r.workflowStarted!==false||r.automaticDispatch!==false||r.verifiedUrbanValue!==false||!Array.isArray(r.cases)||!Array.isArray(r.reviews)||r.cases.length>60||r.reviews.length>100||typeof r.canWrite!=='boolean'||typeof r.truncated!=='boolean')fail('UNTRUSTED_CASE_REVIEW_RESPONSE');
 const cs=new Set();for(const x of r.cases){if(!UUID.test(x.id)||x.status!=='DRAFT'||typeof x.summary!=='string'||x.summary.length>180||cs.has(x.id))fail('INVALID_CASE');cs.add(x.id)}
 const rs=new Set();for(const x of r.reviews){if(!UUID.test(x.id)||!UUID.test(x.caseId)||rs.has(x.id)||!['SUBMITTED','APPROVED_FOR_PLANNING','RETURNED_FOR_EVIDENCE','REJECTED'].includes(x.status)||typeof x.canDecide!=='boolean'||typeof x.submitterIsCurrentUser!=='boolean'||typeof x.caseCreatorIsCurrentUser!=='boolean'||x.canDecide!==Boolean(r.canWrite&&x.status==='SUBMITTED'&&!x.submitterIsCurrentUser&&!x.caseCreatorIsCurrentUser))fail('INVALID_REVIEW_ROW');rs.add(x.id)}
 return r;
}
function cleanNote(x){if(typeof x!=='string'||x.trim().length<16||x.trim().length>550||/[<>\r\n\u0000-\u001f]/.test(x))fail('REVIEW_NOTE_INVALID');return x.trim()}
export function submit(caseId,note,requestId){if(!UUID.test(caseId)||!UUID.test(requestId))fail('BAD_IDENTIFIERS');return {action:'SUBMIT',caseId,requestId,note:cleanNote(note),confirm:'I_CONFIRM_REAL_CASE_EVIDENCE_REVIEW'}}
export function decide(reviewId,decision,note){if(!UUID.test(reviewId)||!['APPROVED_FOR_PLANNING','RETURNED_FOR_EVIDENCE','REJECTED'].includes(decision))fail('BAD_DECISION');return {action:'DECIDE',reviewId,decision,note:cleanNote(note),confirm:'I_CONFIRM_INDEPENDENT_REVIEW_ONLY'}}
export function checkAction(r,c){if(r?.schema!=='RHF-DV32UX7-CASE-REVIEW-ACTION-v1'||r.cityId!==c.cityId||r.tenantId!==c.tenantId||!UUID.test(r.reviewId)||!UUID.test(r.caseId)||r.executionAuthority!==false||r.workflowStarted!==false||r.finalGo!=='NO_GO'||!['SUBMITTED','APPROVED_FOR_PLANNING','RETURNED_FOR_EVIDENCE','REJECTED'].includes(r.status))fail('UNTRUSTED_ACTION_RESULT');return r}
