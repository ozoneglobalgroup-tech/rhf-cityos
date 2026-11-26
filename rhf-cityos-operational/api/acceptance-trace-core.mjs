// Pure acceptance aggregation helpers shared with the API tests.
export const ACCEPTANCE_ROLES=Object.freeze(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR']);
export const TRACE_KEYS=Object.freeze(['service_linked','mission_done','order_accepted','inspection_pass','cost_approved','approved_contract','certified_chain','closed_cases']);
export function isComplete(r){return Boolean(r.service_linked&&r.mission_done&&r.order_accepted&&r.latest_inspection==='PASS'&&r.cost_approved&&r.approved_contract&&r.certified_chain&&r.status==='CLOSED');}
export function normalizeTrace(r){
 const out={...r,inspection_pass:r.latest_inspection==='PASS'};
 out.full_trace=isComplete(out);
 out.complete_count=TRACE_KEYS.filter(k=>k==='closed_cases'?out.status==='CLOSED':out[k]).length;
 return out;
}
export function traceSummary(r){
 const out={};
 for(const k of ['cases','service_linked','mission_started','mission_done','order_issued','order_accepted','inspection_pass','cost_approved','approved_contract','certified_chain','closed_cases','capacity_reserved','outcome_verified','full_trace']){
  const value=Number(r?.[k]??0);
  if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid acceptance metric '+k);
  out[k]=value;
 }
 if(out.full_trace>out.cases)throw Error('Invalid acceptance aggregate');
 return out;
}
