/** RHF ACOS V5: fail-closed presentation of scoped, *synthetic* waste records and independent review.
 * This module is read-only, performs no network, grants no authority, and never verifies public value.
 * The existing RUVOS server enforces roles, tenant/RLS, municipality, review transitions and audit.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KNOWN_STATES = new Set(['SUBMITTED','VERIFIED','REJECTED']);
const ALLOWED_KIND = 'COLLECTION';
const KNOWN_RECEIPT = 'DEMO-WASTE-TEST-001';
const safeString=(v,n=140)=>typeof v==='string'?v.slice(0,n):'';
const eligibleRecord=r=>r&&typeof r==='object'&&!Array.isArray(r)&&UUID.test(r.id||'')&&r.record_kind===ALLOWED_KIND&&KNOWN_STATES.has(r.review_state)&&typeof r.record_code==='string';
export function safeFact(f){
 if(typeof f==='string')return {label:'شاهد',value:f.slice(0,500)};
 if(!f||typeof f!=='object'||Array.isArray(f))return {label:'شاهد',value:'نامعتبر'};
 const v=f.value;
 return {label:safeString(f.label,120)||'شاهد', value:(typeof v==='string'||typeof v==='number'||typeof v==='boolean'?String(v).slice(0,500):'مقدار قابل نمایش ندارد')};
}
export function safeStep(v){
 if(typeof v==='string')return v.slice(0,500);
 if(!v||typeof v!=='object'||Array.isArray(v))return 'پیشنهاد نامعتبر';
 return safeString(v.label||v.title||v.action||v.reason||v.description,500)||'جزئیات پیشنهاد در پاسخ موجود نیست';
}
/** Only a case_id that equals the selected case proves an explicit software linkage.
 * A receipt that resembles the demo reference is *never* automatically linked to a case.
 * VERIFIED means internal review of a synthetic record, NOT independent field validation.
 */
export function reconcileWasteEvidence(payload,cityId,caseId){
 const empty={state:'NOT_LOADED',linked:[],unlinkedDemo:[],partial:false,message:'داده معتبر هنوز دریافت نشده است.'};
 if(!payload)return empty;
 if(!UUID.test(cityId||'')||!UUID.test(caseId||'')||payload.mode!=='SYNTHETIC_WASTE_SUITE_V2'||payload.cityId!==cityId||!UUID.test(payload.organizationId||'')||!Array.isArray(payload.rows))return {...empty,state:'INVALID_SCOPE',message:'پاسخ پسماند با محدوده شهرداری یا قرارداد داده تطبیق ندارد.'};
 const linked=[],unlinkedDemo=[];
 for(const r of payload.rows.slice(0,1000)){
   if(!eligibleRecord(r))continue;
   const item={id:r.id,code:safeString(r.record_code,120),state:r.review_state,
      netKg:Number.isFinite(r.payload?.netKg)?r.payload.netKg:null,
      evidenceRef:safeString(r.evidence_ref,140),sourceKind:safeString(r.source_kind,40),
      synthetic:/SYNTHETIC|DEMO|TEST/i.test(String(r.evidence_ref||'')+' '+String(r.record_code||'')),
      reviewNote:safeString(r.review_note,250),caseId:r.case_id||null};
   if(r.case_id===caseId)linked.push(item);
   else if((r.case_id===null||r.case_id===undefined)&&r.record_code===KNOWN_RECEIPT)unlinkedDemo.push(item);
 }
 return {state:'READY',linked:linked.slice(0,20),unlinkedDemo:unlinkedDemo.slice(0,5),partial:payload.partial===true||payload.rows.length>=1000,
  totalLinked:linked.length,totalUnlinkedDemo:unlinkedDemo.length,
  message:'رکورد VERIFIED صرفاً بررسی داخلی داده آزمایشی است؛ سند میدانی یا منفعت شهری تأییدشده نیست.'};
}
/** Only show an editable reviewer decision when the account is independent.
 * Backend always re-checks role + actor and state transactionally.
 */
export function canReviewFollowup(action,access,actorId,caseId){
 return !!action&&action.status==='PROPOSED'&&action.case_id===caseId&&access?.role==='MUNICIPAL_ADMIN'&&access?.canWrite===true&&UUID.test(actorId||'')&&UUID.test(action.created_by||'')&&actorId!==action.created_by;
}
export function actionsForCase(rows,caseId){
 if(!UUID.test(caseId||'')||!Array.isArray(rows))return [];
 return rows.filter(x=>x&&UUID.test(x.id||'')&&x.case_id===caseId).slice(0,30);
}
export function safeReviewNote(note){return typeof note==='string'&&note.trim().length>=30&&note.length<=500&&!/[\u0000-\u001f]/.test(note)}
