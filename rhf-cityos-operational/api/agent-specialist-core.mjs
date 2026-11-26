// V8P6.2 — evidence-grounded deterministic specialist triage.
// Bounded and advisory. Never equate missing records with proof of misconduct.
export const SPECIALIST_VERSION='RHF-AGENT-SPECIALISTS-V8P6.2';
export const SPECIALIST_PARTS=Object.freeze(['agent-specialist-scan']);
export const SCAN_LIMIT=12;
export const CASE_SCAN_LIMIT=13;
export const SOURCE='RUVOS_SCOPED_CASE_EVIDENCE';
export const SPECIALISTS=Object.freeze([
 {key:'OPERATIONS',label:'ایجنت بررسی زنجیره اجرای خدمت',domain:'عملیات و مأموریت'},
 {key:'CONTRACT',label:'ایجنت کنترل ارتباط قرارداد',domain:'قراردادها و پیمانکاران'},
 {key:'INSPECTION',label:'ایجنت بازبینی شواهد بازرسی',domain:'کنترل کیفیت و نظارت'},
 {key:'VALUE',label:'ایجنت شکاف شواهد ارزش شهری',domain:'خلق و سنجش ارزش'}
]);
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const isInt=n=>Number.isSafeInteger(n)&&n>=0;
const clean=(s,max=180)=>typeof s==='string'?s.replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,max):'';
const count=(obj,key)=>isInt(obj?.[key])?obj[key]:null;
const rule=(caseId,key,code,label,why,observation,steps,metric)=>({id:`${caseId}:${code}`,caseId,specialist:key,code,title:label,why,observation,steps,metric,requiresHuman:true,authorization:'REQUIRED',municipalActionExecuted:false,modelInvoked:false,publicValueVerified:false,source:SOURCE});
export function classifyEvidence(caseId,evidence){
 if(!uuid.test(caseId)||!evidence||!evidence.case||!evidence.execution||!evidence.finance||!evidence.value||evidence.case.id!==caseId)return [];
 const e=evidence.execution,f=evidence.finance,v=evidence.value;
 const needed=[['execution','done_missions'],['execution','work_orders'],['execution','delivered_or_accepted'],['execution','accepted_orders'],['finance','linked_active_contracts'],['value','verified_outcomes']];
 if(needed.some(([area,key])=>count(evidence[area],key)===null))return [];
 const out=[];
 if(e.done_missions>0&&e.work_orders===0)out.push(rule(caseId,'OPERATIONS','NO_WORK_ORDER_LINK','مأموریت انجام‌شده بدون دستورکار مرتبط در پرونده','حداقل یک مأموریت تکمیل‌شده ثبت است، اما هیچ دستورکار مرتبط در شواهد این پرونده دیده نشد.','عدم مشاهده دستورکار در داده مجاز به معنی عدم اجرای عملیات نیست.', ['بررسی ارتباط مأموریت و دستورکار با مسئول اجرا','درخواست مستندات تکمیلی از واحد عملیات','ارجاع برای تصمیم مجاز و ثبت شواهد'],{doneMissions:e.done_missions,workOrders:e.work_orders}));
 if(e.work_orders>0&&f.linked_active_contracts===0)out.push(rule(caseId,'CONTRACT','ACTIVE_CONTRACT_LINK_GAP','نیاز به بررسی ارتباط دستورکار و قرارداد فعال','دستورکار ثبت شده است اما اتصال قرارداد فعال در داده قابل مشاهده این پرونده یافت نشد.','این نتیجه اثبات نبود قرارداد، تخلف پیمانکار یا تعهد مالی نیست.', ['کنترل شناسه قرارداد و اعتبار آن','بررسی محدوده تعهد و پیمانکار توسط مسئول قرارداد','ثبت نتیجه کنترل در مسیر رسمی'],{workOrders:e.work_orders,linkedActiveContracts:f.linked_active_contracts}));
 if(e.delivered_or_accepted>0&&e.latest_inspection_result!=='PASS')out.push(rule(caseId,'INSPECTION','INSPECTION_PASS_NOT_CURRENT','بازبینی آخرین شواهد بازرسی','دستورکار تحویل‌شده یا پذیرفته‌شده وجود دارد؛ آخرین نتیجه بازرسی PASS نیست.','نبود نتیجه PASS به‌تنهایی اثبات نقص خدمت یا خطر ایمنی نیست.', ['خواندن گزارش آخرین بازرسی و تاریخ آن','در صورت ضرورت برنامه‌ریزی بازدید مجاز','اخذ تصمیم مستقل کارشناس نظارت'],{deliveredOrAccepted:e.delivered_or_accepted,latestInspectionResult:clean(e.latest_inspection_result||'ثبت نشده',40)}));
 if(e.accepted_orders>0&&v.verified_outcomes===0)out.push(rule(caseId,'VALUE','VALUE_VERIFICATION_GAP','شکاف شواهد نتیجه و ارزش عمومی','دستورکار پذیرفته‌شده ثبت شده اما پیامد تأییدشده مرتبط با پرونده مشاهده نشد.','پذیرش دستورکار به معنای تحقق منفعت عمومی یا اقتصادی نیست.', ['تعریف شاخص و خط مبنای قابل انتساب','دریافت مشاهده پس از اقدام با منشأ معتبر','درخواست راستی‌آزمایی مستقل پیامد'],{acceptedOrders:e.accepted_orders,verifiedOutcomes:v.verified_outcomes}));
 return out;
}
export function publicSpecialistResponse({cityId,cases,scanned,partial,findings}){
 if(!uuid.test(cityId)||!Number.isSafeInteger(scanned)||scanned<0||scanned>SCAN_LIMIT||!Array.isArray(findings)||findings.length>SCAN_LIMIT*4)throw Error('INVALID_SPECIALIST_RESPONSE');
 const safeCases=Array.isArray(cases)?cases:[];
 const valid=new Set(safeCases.map(c=>c.id).filter(x=>uuid.test(x)));
 if(findings.some(f=>!valid.has(f.caseId)||f.source!==SOURCE||f.municipalActionExecuted!==false||f.publicValueVerified!==false||!SPECIALISTS.some(x=>x.key===f.specialist)))throw Error('SCOPE_OR_FINDING_INVALID');
 return Object.freeze({version:SPECIALIST_VERSION,scope:cityId,source:SOURCE,mode:'DETERMINISTIC_READ_ONLY',specialists:SPECIALISTS,scanned,limit:SCAN_LIMIT,partial:partial===true,findings,findingsCount:findings.length,insufficientEvidence:scanned===0,analysisScope:'RECENT_CASE_SAMPLE_ONLY',modelInvoked:false,autoWrites:0,municipalActionExecuted:false,verifiedPublicValue:false,notices:['فقط پرونده‌های اخیر همین شهرداری بررسی شده‌اند؛ نبود یافته به معنی نبود مشکل در شهر نیست.','یافته‌ها شکاف شواهد هستند، نه اثبات تخلف یا خسارت.','هیچ اقدام میدانی، پرداخت، تأیید، اعزام یا اجرای Temporal در این خوانش رخ نمی‌دهد.']});
}
export function validSpecialistResponse(x,city){
 if(!x||x.version!==SPECIALIST_VERSION||x.scope!==city||x.source!==SOURCE||x.mode!=='DETERMINISTIC_READ_ONLY'||x.modelInvoked!==false||x.autoWrites!==0||x.municipalActionExecuted!==false||x.verifiedPublicValue!==false||!isInt(x.scanned)||x.scanned>SCAN_LIMIT||!Array.isArray(x.findings)||x.findings.length>SCAN_LIMIT*4||typeof x.partial!=='boolean')return false;
 const names=new Set(SPECIALISTS.map(s=>s.key)),uniq=new Set();
 return x.findings.every(f=>f&&typeof f.id==='string'&&!uniq.has(f.id)&&uniq.add(f.id)&&uuid.test(f.caseId)&&names.has(f.specialist)&&f.source===SOURCE&&f.modelInvoked===false&&f.municipalActionExecuted===false&&f.publicValueVerified===false&&f.requiresHuman===true&&Array.isArray(f.steps)&&f.steps.length===3&&f.steps.every(s=>typeof s==='string'&&s.length<=180)&&typeof f.why==='string'&&f.why.length<=450);
}
