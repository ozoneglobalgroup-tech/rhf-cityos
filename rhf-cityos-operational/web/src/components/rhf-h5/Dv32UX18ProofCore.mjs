export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=s=>{throw Error(s)};
export function endpoint(city,hand=''){
 if(!UUID.test(city)||(hand&&!UUID.test(hand)))fail('INVALID_ROUTE_ID');
 return `/api/v1/cities/${encodeURIComponent(city)}/dv32ux18-temporal-operator${hand?'/'+encodeURIComponent(hand):''}`;
}
export function safeReport(v,{cityId,tenantId}){
 if(v?.schema!=='RHF-UX18-TEMPORAL-PROOF-v1'||v.cityId!==cityId||v.tenantId!==tenantId||
 v.finalGo!=='NO_GO'||v.fieldDispatch!==false||v.executionAuthorized!==false||v.verifiedUrbanValue!==false||
 !Array.isArray(v.items)||v.items.length>40||typeof v.canStart!=='boolean'||typeof v.truncated!=='boolean')fail('UNTRUSTED_TEMPORAL_PROOF_REPORT');
 const seen=new Set();return {...v,items:v.items.map(x=>{
  if(!UUID.test(x.handoffId)||!UUID.test(x.workOrderId)||!UUID.test(x.caseId)||seen.has(x.handoffId)||
   typeof x.eligibleByIdentity!=='boolean'||x.temporal!=='NOT_QUERIED'||typeof x.summary!=='string'||
   x.summary.length>150||x.fieldDispatch!==false||x.executionAuthorized!==false||x.verifiedUrbanValue!==false)fail('UNTRUSTED_TEMPORAL_PROOF_ITEM');
  seen.add(x.handoffId);return x;
 })};
}
export function safeDetail(v,{cityId,tenantId,handoffId}){
 if(v?.schema!=='RHF-UX18-TEMPORAL-PROOF-v1'||v.cityId!==cityId||v.tenantId!==tenantId||
 v.handoffId!==handoffId||v.finalGo!=='NO_GO'||v.fieldDispatch!==false||v.executionAuthorized!==false||
 v.verifiedUrbanValue!==false||!/^rhf-ux18-[0-9a-f-]{36}-[0-9a-f-]{36}$/.test(v.workflowId||'')||
 !['RUNNING','COMPLETED','FAILED','CANCELED','TERMINATED','TIMED_OUT','NOT_STARTED','TEMPORAL_UNAVAILABLE','UNKNOWN','UNKNOWN_UNVERIFIED'].includes(v.temporal))fail('UNTRUSTED_TEMPORAL_DETAIL');
 return v;
}
export function safeStart(v,{cityId,tenantId,handoffId}){
 if(v?.schema!=='RHF-UX18-TEMPORAL-PROOF-v1'||v.cityId!==cityId||v.tenantId!==tenantId||v.handoffId!==handoffId||
 v.temporal!=='START_REQUEST_ACCEPTED_NON_EXECUTING'||v.executionAuthorized!==false||v.fieldDispatch!==false||
 v.verifiedUrbanValue!==false||v.finalGo!=='NO_GO'||typeof v.alreadyStarted!=='boolean'||
 !/^rhf-ux18-[0-9a-f-]{36}-[0-9a-f-]{36}$/.test(v.workflowId||''))fail('UNTRUSTED_TEMPORAL_START');
 return v;
}
