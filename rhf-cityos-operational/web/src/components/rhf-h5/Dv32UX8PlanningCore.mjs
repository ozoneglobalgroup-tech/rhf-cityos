// Client validation is defense in depth; only server withScope/RLS grants actual permissions.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=s=>{throw Error(s)};
export function context({desk,tab,cityId,tenantId,orgId}){if(desk!=='deputy'||tab!=='case-planning'||!UUID.test(cityId)||!UUID.test(tenantId)||orgId)fail('BAD_PLANNING_CONTEXT');return {cityId,tenantId}}
export const url=c=>`/api/v1/cities/${encodeURIComponent(c.cityId)}/dv32ux8-case-planning`;
export function safeReport(r,c){
 if(r?.schema!=='RHF-DV32UX8-CASE-PLANNING-v1'||r.cityId!==c.cityId||r.tenantId!==c.tenantId||r.finalGo!=='NO_GO'||r.executionAuthority!==false||r.resourceReserved!==false||r.temporalStarted!==false||r.automaticFieldDispatch!==false||r.verifiedUrbanValue!==false||typeof r.truncated!=='boolean'||typeof r.canWrite!=='boolean'||!Array.isArray(r.candidates)||!Array.isArray(r.plans)||!Array.isArray(r.resources)||r.candidates.length>60||r.plans.length>100||r.resources.length>60)fail('UNTRUSTED_PLANNING_READ');
 const cs=new Set(),ps=new Set(),rs=new Set();
 for(const x of r.candidates){if(!UUID.test(x.caseId)||!UUID.test(x.reviewId)||!UUID.test(x.unitId)||typeof x.summary!=='string'||x.summary.length>180||typeof x.currentEvidence!=='boolean'||cs.has(x.caseId))fail('BAD_PLANNING_CANDIDATE');cs.add(x.caseId)}
 for(const x of r.plans){if(!UUID.test(x.id)||!UUID.test(x.caseId)||x.status!=='PLANNING_DRAFT'||typeof x.currentEvidence!=='boolean'||typeof x.resourceLinked!=='boolean'||ps.has(x.id))fail('BAD_PLANNING_PACKET');ps.add(x.id)}
 for(const x of r.resources){if(!UUID.test(x.id)||!UUID.test(x.ownerUnitId)||typeof x.name!=='string'||x.name.length>180||rs.has(x.id))fail('BAD_PLANNING_RESOURCE');rs.add(x.id)}
 return r;
}
function validNote(v){if(typeof v!=='string'||v.trim().length<16||v.trim().length>550||/[<>\u0000-\u001f]/.test(v)||/https?:\/\//i.test(v))fail('BAD_PLANNING_NOTE');return v.trim()}
export function prepare(caseId,reviewId,resourceId,note,requestId){if(!UUID.test(caseId)||!UUID.test(reviewId)||!UUID.test(requestId)||!(resourceId===null||UUID.test(resourceId)))fail('BAD_PLANNING_IDENTIFIERS');return {action:'PREPARE',caseId,reviewId,resourceId,note:validNote(note),requestId,confirm:'I_CONFIRM_PLANNING_ONLY_NO_DISPATCH'}}
export function checkAction(r,c){if(r?.schema!=='RHF-DV32UX8-PLANNING-ACTION-v1'||r.cityId!==c.cityId||r.tenantId!==c.tenantId||!UUID.test(r.planId)||r.status!=='PLANNING_DRAFT'||r.executionAuthority!==false||r.resourceReserved!==false||r.temporalStarted!==false||r.finalGo!=='NO_GO')fail('UNTRUSTED_PLANNING_RESULT');return r}
