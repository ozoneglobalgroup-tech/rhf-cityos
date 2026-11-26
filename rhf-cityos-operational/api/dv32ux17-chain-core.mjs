// DV32UX17: limited, strictly city-scoped REAL case-chain evidence. NOT a workflow permission.
import {createHash} from 'node:crypto';
// Canonical fields exactly match DV32UX7 caseFingerprint; test locks parity.
export function caseFingerprint(c){
 if(!UUID.test(c?.id)||!UUID.test(c?.service_id)||!UUID.test(c?.unit_id)||!UUID.test(c?.created_by)||
 c?.status!=='DRAFT'||c?.service_active!==true||c?.unit_active!==true||
 !String(c?.acceptance_note||'').startsWith('INTAKE_SOURCE:')||
 typeof c?.summary!=='string'||typeof c?.description!=='string'||typeof c?.evidence!=='string'||
 typeof c?.module_code!=='string')throw Error('NOT_CURRENT_REAL_DRAFT');
 return createHash('sha256').update(JSON.stringify([c.id,c.service_id,c.unit_id,c.created_by,c.status,
 c.module_code,c.summary,c.description,c.evidence,c.acceptance_note]),'utf8').digest('hex');
}
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=(code)=>{throw Error(code)};
export function boundary({method,resourceId,url}) {
 if(method!=='GET'||resourceId||[...url.searchParams].length)fail('READ_ONLY_NO_PARAMS');
}
export function identity(city,role,user){
 if(!UUID.test(city?.id)||!UUID.test(city?.tenant_id)||!UUID.test(user?.id)||
 !['MAYOR','DEPUTY','MUNICIPAL_ADMIN'].includes(role))fail('CITY_SCOPE_DENIED');
}
const isId=x=>typeof x==='string'&&UUID.test(x);
const has=x=>isId(x);
const neq=(a,b)=>has(a)&&has(b)&&a!==b;
const same=(a,b)=>has(a)&&has(b)&&a===b;
const maybe=(x,name)=>{if(x!=null&&!isId(x))fail('BAD_ID_'+name);};
function trace(row){
 if(!isId(row?.id)||typeof row.summary!=='string'||row.summary.length>10000||row.status!=='DRAFT'||
 typeof row.acceptance_note!=='string'||!row.acceptance_note.startsWith('INTAKE_SOURCE:')||
 !isId(row.created_by)||!isId(row.service_id)||!isId(row.unit_id))fail('INVALID_REAL_CASE');
 for(const field of ['review_id','reviewed_by','submitted_by','plan_id','plan_review_id','work_order_id','prepared_by','decided_by','handoff_id','requested_by'])maybe(row[field],field);
 const details={id:row.id,created_by:row.created_by,service_id:row.service_id,unit_id:row.unit_id,
  status:row.status,module_code:row.module_code,summary:row.summary,description:row.description,
  evidence:row.evidence,acceptance_note:row.acceptance_note,
  service_active:row.service_active,unit_active:row.unit_active};
 let fp=null;try{fp=caseFingerprint(details)}catch{/* Inactive/mutated upstream references are stale, never valid authorization. */}
 const approved=Boolean(fp)&&has(row.review_id)&&row.review_status==='APPROVED_FOR_PLANNING'&&
  neq(row.submitted_by,row.reviewed_by)&&neq(row.created_by,row.reviewed_by)&&row.review_fingerprint===fp;
 const planned=approved&&has(row.plan_id)&&same(row.plan_review_id,row.review_id)&&row.plan_fingerprint===fp&&
  row.plan_status==='PLANNING_DRAFT'&&row.execution_authority===false&&row.temporal_started===false;
 const ordered=planned&&has(row.work_order_id)&&row.work_fingerprint===fp&&has(row.prepared_by);
 const cleared=ordered&&row.decision==='CLEARED_FOR_HANDOFF_REQUEST'&&
  neq(row.decided_by,row.prepared_by)&&neq(row.decided_by,row.created_by)&&neq(row.decided_by,row.reviewed_by);
 const handoff=cleared&&has(row.handoff_id)&&row.handoff_fingerprint===fp&&
  row.handoff_state==='AWAITING_OPERATOR_REVIEW'&&row.handoff_temporal_started===false&&row.handoff_dispatch_authorized===false&&
  neq(row.requested_by,row.prepared_by)&&neq(row.requested_by,row.decided_by)&&
  neq(row.requested_by,row.created_by)&&neq(row.requested_by,row.reviewed_by);
 const stage=handoff?'HANDOFF_INTENT_ONLY':cleared?'INDEPENDENT_CLEARANCE':ordered?'WORK_ORDER_PROPOSAL':
  planned?'PLANNING_DRAFT':approved?'INDEPENDENT_REVIEW':'DRAFT_OR_STALE';
 const stale=!fp||(has(row.review_id)&&row.review_fingerprint!==fp)||
  (has(row.plan_id)&&row.plan_fingerprint!==fp)||
  (has(row.work_order_id)&&row.work_fingerprint!==fp)||
  (has(row.handoff_id)&&row.handoff_fingerprint!==fp);
 return {caseId:row.id,summary:row.summary.slice(0,180),stage,staleEvidence:stale,
  reviewId:row.review_id||null,planId:row.plan_id||null,workOrderId:row.work_order_id||null,
  handoffIntentId:row.handoff_id||null,independentReview:approved,planningCurrent:planned,
  workOrderCleared:cleared,operatorIntentCurrent:handoff,temporalExecuted:false,
  dispatchAuthorized:false,verifiedUrbanValue:false};
}
export function compose(city,role,rows){
 if(!Array.isArray(rows)||rows.length>41)fail('UNBOUNDED_CHAIN_ROWS');
 const seen=new Set();const entries=rows.slice(0,40).map(r=>{
  if(seen.has(r.id))fail('DUPLICATE_CASE');seen.add(r.id);return trace(r);
 });
 const stats={sampled:entries.length,stale:entries.filter(x=>x.staleEvidence).length,
  reviewed:entries.filter(x=>x.independentReview).length,
  planning:entries.filter(x=>x.planningCurrent).length,
  cleared:entries.filter(x=>x.workOrderCleared).length,
  handoffIntents:entries.filter(x=>x.operatorIntentCurrent).length};
 return {schema:'RHF-DV32UX17-CHAIN-ASSURANCE-v1',cityId:city.id,tenantId:city.tenant_id,role,
  asOf:new Date().toISOString(),sampleLimit:40,truncated:rows.length>40,stats,entries,
  currentEvidenceValidated:true,readOnly:true,source:'ACTUAL_AUTHENTICATED_RLS_DB_READ',
  temporalExecuted:false,dispatchAuthorized:false,officialMissionMappingCertified:false,
  verifiedUrbanValue:false,authenticatedUat:'NOT_RUN',finalGo:'NO_GO'};
}
export function validateReport(report,{cityId,tenantId}){
 if(report?.schema!=='RHF-DV32UX17-CHAIN-ASSURANCE-v1'||report.cityId!==cityId||report.tenantId!==tenantId||
 !Array.isArray(report.entries)||report.entries.length>40||report.sampleLimit!==40||
 typeof report.truncated!=='boolean'||report.readOnly!==true||report.currentEvidenceValidated!==true||
 report.temporalExecuted!==false||report.dispatchAuthorized!==false||report.verifiedUrbanValue!==false||
 report.officialMissionMappingCertified!==false||report.authenticatedUat!=='NOT_RUN'||report.finalGo!=='NO_GO')fail('UNTRUSTED_CHAIN_REPORT');
 for(const x of report.entries){
  if(!isId(x.caseId)||typeof x.summary!=='string'||x.summary.length>180||
  !['DRAFT_OR_STALE','INDEPENDENT_REVIEW','PLANNING_DRAFT','WORK_ORDER_PROPOSAL','INDEPENDENT_CLEARANCE','HANDOFF_INTENT_ONLY'].includes(x.stage)||
  x.temporalExecuted!==false||x.dispatchAuthorized!==false||x.verifiedUrbanValue!==false||
  !['boolean'].includes(typeof x.staleEvidence)||typeof x.operatorIntentCurrent!=='boolean')fail('BAD_CHAIN_ENTRY');
 }
 const st=report.stats;
 for(const key of ['sampled','stale','reviewed','planning','cleared','handoffIntents']){
  if(!Number.isSafeInteger(st?.[key])||st[key]<0||st[key]>40)fail('BAD_STATS');
 }
 if(st.sampled!==report.entries.length||st.handoffIntents>st.cleared||st.cleared>st.planning||
 st.planning>st.reviewed||st.reviewed>st.sampled)fail('INCONSISTENT_CHAIN_COUNTS');
 return report;
}
