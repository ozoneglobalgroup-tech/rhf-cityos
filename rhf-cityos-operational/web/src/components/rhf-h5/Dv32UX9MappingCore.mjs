// Visible only in the authorized Deputy OS, sourced from the server's city scope.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=s=>{throw Error(s)};
export function context({desk,tab,cityId,tenantId,orgId}){
 if(desk!=='deputy'||tab!=='mission-references'||!UUID.test(cityId)||!UUID.test(tenantId)||orgId)fail('UNAUTHORIZED_MAPPING_WORKSPACE');
 return {cityId,tenantId};
}
export const url=c=>`/api/v1/cities/${encodeURIComponent(c.cityId)}/dv32ux9-mission-mapping`;
export function safeReport(r,c){
 if(r?.schema!=='RHF-DV32UX9-MISSION-MAPPING-v1'||r.cityId!==c.cityId||r.tenantId!==c.tenantId||r.finalGo!=='NO_GO'||r.officiallyCertified!==false||r.executionAuthority!==false||r.verifiedUrbanValue!==false||!Array.isArray(r.slots)||r.slots.length!==17||!Array.isArray(r.units)||r.units.length>200||!Array.isArray(r.services)||r.services.length>200||!Array.isArray(r.proposals)||r.proposals.length>100||typeof r.truncated!=='boolean'||typeof r.canWrite!=='boolean')fail('UNTRUSTED_MAPPING_RESPONSE');
 return r;
}
function clean(x,min,max){if(typeof x!=='string'||x.trim().length<min||x.trim().length>max||/[<>\u0000-\u001f]/.test(x))fail('TEXT_INVALID');return x.trim()}
export function propose(v){
 if(!Number.isInteger(v.slot)||v.slot<1||v.slot>17||![v.ownerUnitId,v.serviceId,v.requestId].every(x=>UUID.test(x))||!/^[0-9a-f]{64}$/.test(v.sourceSha256))fail('BAD_REFERENCE_INPUT');
 return {action:'PROPOSE',confirm:'I_ATTEST_SOURCE_PROPOSAL_NOT_OFFICIAL_CERTIFICATION',requestId:v.requestId,slot:v.slot,
  ownerUnitId:v.ownerUnitId,serviceId:v.serviceId,titleFa:clean(v.titleFa,8,220),sourceReference:clean(v.sourceReference,8,180),sourceSha256:v.sourceSha256,reason:clean(v.reason,16,500)};
}
export function attest(proposalId,note){if(!UUID.test(proposalId))fail('PROPOSAL_REQUIRED');return {action:'ATTEST',proposalId,note:clean(note,16,500),confirm:'I_INDEPENDENTLY_CHECKED_SOURCE_REFERENCE'}}
export function actionCheck(r,c){if(r?.schema!=='RHF-DV32UX9-MAPPING-ACTION-v1'||r.cityId!==c.cityId||r.tenantId!==c.tenantId||!UUID.test(r.proposalId)||!['PROPOSED','SECOND_HUMAN_ATTESTED'].includes(r.action)||r.officiallyCertified!==false||r.executionAuthority!==false||r.finalGo!=='NO_GO')fail('UNTRUSTED_MAPPING_ACTION');return r}
