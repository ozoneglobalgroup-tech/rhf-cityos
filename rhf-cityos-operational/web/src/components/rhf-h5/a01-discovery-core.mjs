/** RHF A01 / Discovery candidate selection. Read-only, no claimed public value. */
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPEN=new Set(['RECEIVED','TRIAGED','ASSIGNED','IN_PROGRESS','AWAITING_ACCEPTANCE']);
const MAX=12;
export function isShirazSyntheticDemo(name){
  return typeof name==='string'&&/شیراز/.test(name)&&/دمو\s*آزمایشی/.test(name);
}
export function prepareA01Candidates({city,cityName,cases,now=Date.now()}={}){
  const demo=isShirazSyntheticDemo(cityName);
  if(!demo||typeof city!=='string'||!ID.test(city))return {ready:false,reason:'DEMO_SCOPE_NOT_CONFIRMED',rows:[],scanned:null};
  if(!Array.isArray(cases))return {ready:false,reason:'DATA_NOT_LOADED',rows:[],scanned:null};
  const t=Number.isFinite(now)?now:Date.now();
  const rows=cases.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)&&
    ID.test(x.id||'')&&OPEN.has(x.status)&&
    (!x.municipality_id||x.municipality_id===city)&&
    (!x.municipalityId||x.municipalityId===city));
  const opportunities=rows.map(x=>{
    const val=x.due_at??x.dueAt;
    const due=(typeof val==='string'&&val.trim())?Date.parse(val):NaN;
    const overdue=Number.isFinite(due)&&due<t;
    const urgent=x.priority==='HIGH'||x.priority==='CRITICAL';
    const acceptance=x.status==='AWAITING_ACCEPTANCE';
    const hasSignal=overdue||urgent||acceptance;
    const weight=(overdue?100:0)+(x.priority==='CRITICAL'?55:x.priority==='HIGH'?35:0)+(acceptance?18:0);
    const reason=hasSignal?[overdue?'موعد پرونده سپری شده':null,urgent?'اولویت ثبت‌شده بالا/بحرانی':null,
      acceptance?'در انتظار پذیرش':null].filter(Boolean):['نامزد بررسی ظرفیت و زنجیره شواهد'];
    const safe=(s,max=120)=>typeof s==='string'?s.trim().slice(0,max):'';
    return {id:x.id,title:safe(x.summary)||'پرونده بدون عنوان',status:x.status,priority:x.priority||'UNSPECIFIED',
      reason,hasSignal,overdue,urgent,acceptance,dueAt:Number.isFinite(due)?new Date(due).toISOString():null,
      unitId:ID.test(x.unit_id||'')?x.unit_id:null,rank:weight,
      evidence:[{source:'service_cases',recordId:x.id,field:'status',value:x.status},
        ...(urgent?[{source:'service_cases',recordId:x.id,field:'priority',value:x.priority}]:[]),
        ...(overdue?[{source:'service_cases',recordId:x.id,field:'due_at',value:new Date(due).toISOString()}]:[])]};
  }).filter(Boolean).sort((a,b)=>b.rank-a.rank||a.id.localeCompare(b.id)).slice(0,MAX);
  return {ready:true,scope:'AUTHENTICATED_LOADED_ROWS_ONLY',demo:true,scanned:rows.length,rows:opportunities,
    notes:['سرنخ‌های دارای ریسک در اولویت‌اند؛ سایر پرونده‌های باز صرفاً نامزد تحلیل‌اند.',
      'شاخص‌ها فقط از ردیف‌های دریافت‌شده همان شهرداری محاسبه شده‌اند.',
      'ارزش تحقق‌یافته یا صرفه‌جویی مالی محاسبه یا تأیید نشده است.']};
}
export function safeAgentResult(result,caseId){
  if(!result||result.caseId!==caseId||result.autoWrites!==0||
     !Array.isArray(result.steps)||!Array.isArray(result.facts)||!Array.isArray(result.toolTrace))throw Error('UNTRUSTED_AGENT_RESPONSE');
  return {caseId,steps:result.steps.slice(0,6),facts:result.facts.slice(0,14),
    toolTrace:result.toolTrace.slice(0,8),next:result.next||null,
    hasVerifiedPublicValue:result.hasVerifiedPublicValue===true,modelUsed:result.modelUsed===true,
    autoWrites:0};
}
export function proposalNote({candidate,result}){
  if(!candidate||!result||candidate.id!==result.caseId)throw Error('CASE_MISMATCH');
  const label=typeof result.next?.label==='string'?result.next.label:'بررسی شواهد و اقدام مجاز بعدی';
  const reason=typeof result.next?.reason==='string'?result.next.reason:'تکمیل شواهد و ارجاع به مسئول';
  return `A01 | شهرداری دمو | ${label}: ${reason}. ارجاع برای بررسی مستقل؛ هیچ تخصیص، پرداخت یا منفعت تأییدشده‌ای ثبت نشده است.`.slice(0,600);
}
