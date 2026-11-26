// RHF City OS | V8P4.0 | Operational acceptance, evidence-first/read-only.
// This is not a municipal performance score, security certification or verified public-value claim.
import {PORTFOLIO_VERSION} from './deputy-portfolio-v8p3-core.mjs';
import {DOSSIER_KEYS} from './deputy-dossier-schema.mjs';
import {verifyServerStatus,verifyFollowups,verifyAudit} from './governed-agent-bridge-v8p39-core.mjs';

export const ACCEPTANCE_VERSION='RHF-OPERATIONAL-ACCEPTANCE-V8P4.0';
export const EXPECTED_TRAINING_RECORDS=28;
export const EXPECTED_TRAINING_SCENARIOS=9;
export const ACCEPTANCE_MANUAL_CASES=Object.freeze([
 {id:'NAVIGATION',label:'صفحه نخست، بازگشت، مسیرهای سازمان‌ها و Drill-down در مرورگر باز شوند',evidence:'ثبت تصویر و نشانی صفحه'},
 {id:'SCENARIOS',label:'سناریوهای ۹گانه و فرم‌های ۱۱ حوزه از دید نقش مجاز دیده شوند',evidence:'ثبت فهرست سناریوها و تعداد پرونده‌های ذخیره‌شده'},
 {id:'REVIEW_TWO_USERS',label:'دو حساب متمایز ثبت‌کننده و بازبین به ترتیب ثبت/بررسی را اجرا کنند',evidence:'کد پرونده، دو نقش و خروجی تصمیم بدون اطلاعات شخصی'},
 {id:'SELF_APPROVAL',label:'تأیید پرونده توسط ثبت‌کننده در سرور رد شود',evidence:'کد وضعیت HTTP و شناسه درخواست بدون توکن'},
 {id:'RESTART',label:'پس از Refresh و راه‌اندازی مجدد، پرونده و رویدادها باقی بمانند',evidence:'قبل/بعد و تاریخچه رویداد'},
 {id:'TENANT_ISOLATION',label:'کاربر شهرداری دیگر نتواند پرونده یا ایجنت این شهرداری را ببیند',evidence:'HTTP 403/404 و بررسی در دو دامنه؛ بدون داده شخصی'},
 {id:'AGENT_GOVERNANCE',label:'پیشنهاد ایجنت بدون مدل خارجی، با رضایت اختیاری و تأیید مستقل آزمون شود',evidence:'خروجی ابزارها، شناسه پیگیری و تصمیم بازبین'},
 {id:'NEGATIVE_VALUE',label:'سناریوی S09 و نبود ظرفیت آزاد یا ارزش احرازشده درست نشان داده شود',evidence:'تصویر گزارش منفی و نبود اعزام خودکار'},
 {id:'ACCESSIBILITY',label:'نمای RTL، صفحه باریک، صفحه‌کلید و برچسب‌های قابل دسترس کنترل شوند',evidence:'گزارش ارزیابی دستی و مرورگر'},
 {id:'RECOVERY',label:'بازیابی از پشتیبان و عدم تغییر داده در --check در محیط ایزوله تمرین شود',evidence:'گزارش Drill بازیابی، بدون دستکاری تولید'}
]);
const scenarioRef=/^DEMO-V8P35-(S0[1-9])-[A-Z0-9]{2,8}$/;
const validRow=r=>r&&typeof r.id==='string'&&typeof r.orgKey==='string'&&DOSSIER_KEYS.includes(r.orgKey)&&Array.isArray(r.evidenceRefs)&&typeof r.status==='string';
export function acceptanceProjection(board,city){
 const unavailable={mode:'UNAVAILABLE',cityId:city||null,synthetic:true,verifiedPublicValue:false,autonomousDispatch:false,records:null,domains:0,scenarioRecords:0,scenarios:0,scenarioComplete:false,partial:false,canCreate:false,canReview:false,reviewQueue:0,claims:[]};
 if(!board||board.mode!==PORTFOLIO_VERSION||board.cityId!==city||board.synthetic!==true||board.verifiedPublicValue!==false||board.autonomousDispatch!==false||!Array.isArray(board.rows)||board.rows.length>200||board.rows.some(r=>!validRow(r)))return unavailable;
 const keys=new Set(),scenarioIds=new Set(),domains=new Set();
 for(const row of board.rows){domains.add(row.orgKey);for(const ref of row.evidenceRefs){const m=typeof ref?.referenceCode==='string'?ref.referenceCode.match(scenarioRef):null;if(m){keys.add(ref.referenceCode);scenarioIds.add(m[1]);}}}
 const partial=board.partial===true;
 // The API returns only 200 rows. Under pagination cap, a full coverage assertion is not possible.
 const complete=!partial&&keys.size===EXPECTED_TRAINING_RECORDS&&scenarioIds.size===EXPECTED_TRAINING_SCENARIOS&&DOSSIER_KEYS.every(k=>domains.has(k));
 return {mode:'SCOPED_SYNTHETIC',cityId:city,synthetic:true,verifiedPublicValue:false,autonomousDispatch:false,records:board.rows.length,domains:domains.size,
  scenarioRecords:keys.size,scenarios:scenarioIds.size,scenarioComplete:complete,partial,canCreate:board.canCreate===true,canReview:board.canReview===true,
  reviewQueue:board.rows.filter(r=>r.status==='SUBMITTED').length,
  claims:[{id:'SCOPE',status:'CONTRACT',name:'قرارداد داده آموزشی و مرز شهر'},
   {id:'SEED',status:complete?'PRESENT':'NEEDS_ACTION',name:'وجود پرونده‌های ۹ سناریو در داده دریافتی'},
   {id:'COVERAGE',status:domains.size===11&&!partial?'OBSERVED':'NEEDS_ACTION',name:'پوشش ۱۱ حوزه در پاسخ داده'},
   {id:'PARTIAL',status:partial?'LIMITED':'OBSERVED',name:'وضعیت سقف ۲۰۰ پرونده API'},
   {id:'SOD',status:'MANUAL_REQUIRED',name:'آزمون واقعی تفکیک وظایف با دو حساب'},
   {id:'TENANT',status:'MANUAL_REQUIRED',name:'آزمون مستقل جداسازی دو شهرداری'},
   {id:'VALUE',status:'NOT_VERIFIED',name:'اثبات ارزش عمومی'},
   {id:'BROWSER',status:'MANUAL_REQUIRED',name:'پذیرش مرورگر و دسترس‌پذیری'}]};
}
export function verifyReadOnlyProbes({status,followups,history},city){
 const s=verifyServerStatus(status),f=verifyFollowups(followups),h=verifyAudit(history);
 if(!s||!f||!h||!followups||followups.scope!==city)return {ok:false,reason:'CONTRACT_OR_CITY_SCOPE_INVALID',role:null,followups:null,history:null,modelEnabled:false};
 return {ok:true,reason:null,role:s.role,followups:f.length,history:h.length,modelEnabled:s.modelEnabled===true};
}
export function acceptanceReport(projection,probes,checkedIds=[],timestamp=''){
 const checked=new Set(Array.isArray(checkedIds)?checkedIds:[]),manual=ACCEPTANCE_MANUAL_CASES.map(x=>({id:x.id,reportedByOperator:checked.has(x.id),requiresExternalEvidence:true}));
 const valid=projection?.mode==='SCOPED_SYNTHETIC'&&probes?.ok===true;
 // A self-attested browser checklist is never treated as independently certified UAT.
 return {version:ACCEPTANCE_VERSION,createdAt:typeof timestamp==='string'?timestamp:'',cityId:projection?.cityId||null,mode:'SELF_REPORTED_ACCEPTANCE_EVIDENCE',gate:'PENDING_INDEPENDENT_REVIEW',
  dataContract:projection?.mode||'UNAVAILABLE',sourceRows:projection?.records??null,partial:projection?.partial===true,scenarioRecords:projection?.scenarioRecords??0,
  scenarios:projection?.scenarios??0,scenarioImported:projection?.scenarioComplete===true,agentApiContract:probes?.ok===true,agentRole:probes?.role||null,
  manual,manualReported:manual.filter(x=>x.reportedByOperator).length,readyForIndependentReview:valid&&projection.scenarioComplete&&manual.every(x=>x.reportedByOperator),
  publicValueVerified:false,autonomousDispatch:false,crossTenantIsolationIndependentlyVerified:false,realWorldOperationsCertified:false};
}
export const ACCEPTANCE_IS_READ_ONLY=true;
export const ACCEPTANCE_DOES_NOT_SELF_CERTIFY=true;
