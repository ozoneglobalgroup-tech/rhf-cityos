/** RHF Waste OS V6 — deterministic, read-only analytics over governed Waste Suite V2. */
export const WASTE_OS_VERSION='WASTE-OS-V6';
export const DOMAINS=Object.freeze([
 {id:'FLEET',title:'ناوگان و ماشین‌آلات',area:'عملیات',owner:'مدیریت ناوگان',metric:'تجهیزات ثبت‌شده'},
 {id:'MAINTENANCE',title:'تعمیرات و توقف',area:'عملیات',owner:'مدیریت ناوگان',metric:'ساعات توقف ثبت‌شده'},
 {id:'COLLECTION',title:'جمع‌آوری و باسکول',area:'عملیات',owner:'مدیریت جمع‌آوری',metric:'وزن باسکولی بررسی‌شده'},
 {id:'CONTRACTOR',title:'پیمانکاران و قراردادها',area:'قرارداد',owner:'امور پیمان‌ها',metric:'پیمانکاران ثبت‌شده'},
 {id:'CONTRACT_EVAL',title:'عملکرد پیمانکاران',area:'قرارداد',owner:'نظارت قرارداد',metric:'درصد تحقق گزارش‌شده'},
 {id:'SHIFT',title:'شیفت، تنظیف و غیبت',area:'نیروی انسانی',owner:'عملیات و منابع انسانی',metric:'غیبت تجمیعی'},
 {id:'EDUCATION',title:'آموزش و مشارکت',area:'مشارکت',owner:'آموزش شهروندی',metric:'شرکت‌کنندگان ثبت‌شده'},
 {id:'FACILITY',title:'تأسیسات و پردازش',area:'عملیات',owner:'مدیریت تأسیسات',metric:'ظرفیت اسمی ثبت‌شده'},
 {id:'QUALITY',title:'کیفیت و شکایات',area:'نظارت',owner:'بازرسی و ارزیابی',metric:'درصد قبولی نمونه‌ها'},
 {id:'VIOLATION',title:'تخلفات و اخطارها',area:'حقوقی',owner:'بازرسی تخلفات',metric:'سوابق تخلف بررسی‌شده',restricted:true},
 {id:'LEGAL',title:'پرونده‌های حقوقی',area:'حقوقی',owner:'حقوقی سازمان',metric:'پرونده‌های ثبت‌شده',restricted:true},
]);
export const SCOPED_ROLES=new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR']);
export const LEGAL_ROLES=new Set(['MUNICIPAL_ADMIN','AUDITOR']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MUNICIPAL_STREAMS=new Set(['WET','DRY','MIXED','GREEN','BULKY']);
const KINDS=new Set(DOMAINS.map(x=>x.id));
const STATES=new Set(['SUBMITTED','VERIFIED','REJECTED']);
const finite=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const add=(arr,f)=>arr.reduce((n,x)=>n+(finite(f(x))??0),0);
const rounded=x=>Number.isFinite(x)?Math.round(x*100)/100:null;
const ratio=(num,den)=>den>0?rounded(100*num/den):null;
const clean=x=>String(x??'').slice(0,250);
const onlyLegal=role=>LEGAL_ROLES.has(role);
export function caseLink(record,caseId){
 return UUID.test(caseId||'')&&record?.case_id===caseId;
}
export function validateWasteSnapshot(snapshot,city,organizationId,role){
 if(!SCOPED_ROLES.has(role))return {state:'ROLE_DENIED',message:'نقش مجاز برای این دفتر شناسایی نشد'};
 if(!UUID.test(city||'')||!UUID.test(organizationId||''))return {state:'INVALID_SCOPE',message:'شناسه شهرداری یا سازمان نامعتبر است'};
 if(!snapshot)return {state:'NOT_LOADED',message:'پاسخ شواهد هنوز دریافت نشده است'};
 if(snapshot.mode!=='SYNTHETIC_WASTE_SUITE_V2'||snapshot.cityId!==city||snapshot.organizationId!==organizationId||!Array.isArray(snapshot.rows))return {state:'INVALID_SCOPE',message:'قرارداد یا محدوده پاسخ شواهد معتبر نیست'};
 if(snapshot.rows.length>1000||typeof snapshot.partial!=='boolean')return {state:'INVALID_SCOPE',message:'فهرست شواهد یا وضعیت ناقص‌بودن آن معتبر نیست'};
 if(snapshot.rows.some(r=>!r||!KINDS.has(r.record_kind)||!STATES.has(r.review_state)||typeof r.id!=='string'||!UUID.test(r.id)||r.payload===null||typeof r.payload!=='object'||Array.isArray(r.payload)||(!onlyLegal(role)&&['LEGAL','VIOLATION'].includes(r.record_kind))))return {state:'INVALID_SCOPE',message:'پاسخ دارای داده خارج از مجوز یا ساختار نامعتبر است'};
 return {state:'READY',message:'داده‌های محدوده مجاز بارگذاری شدند'};
}
function verifiedMetric(kind,verified){
 const list=verified.filter(r=>r.record_kind===kind),n=list.length;
 if(!n)return {value:null,unit:'',detail:'داده بررسی‌شده موجود نیست',sampleCount:0};
 const p=r=>r.payload||{};
 switch(kind){
 case 'MAINTENANCE':return {value:rounded(add(list,r=>p(r).downtimeHours)),unit:'ساعت',detail:'ساعات توقف ثبت‌شده؛ نه زمان‌سنجی میدانی',sampleCount:n};
 case 'COLLECTION':{
  const weighed=list.filter(r=>p(r).sourceMethod==='WEIGHBRIDGE'&&MUNICIPAL_STREAMS.has(p(r).stream)&&finite(p(r).netKg)!==null&&finite(p(r).grossKg)!==null&&finite(p(r).tareKg)!==null&&Math.abs(p(r).grossKg-p(r).tareKg-p(r).netKg)<0.01);
  if(!weighed.length)return {value:null,unit:'kg',detail:'هیچ وزن باسکولی شهری با جمع جرم سازگار بررسی نشده است',sampleCount:0};
  return {value:rounded(add(weighed,r=>p(r).netKg)),unit:'kg',detail:'بررسی داخلی باسکول آزمایشی؛ نه وزن میدانی احرازشده',sampleCount:weighed.length};
 }
 case 'CONTRACT_EVAL':{
  const total=add(list,r=>p(r).plannedServices),actual=add(list,r=>p(r).completedServices);
  return {value:ratio(actual,total),unit:'٪',detail:'نسبت تحقق تجمیعی گزارش‌شده، نه پرداخت یا کسور نهایی',sampleCount:n};
 }
 case 'SHIFT':return {value:add(list,r=>p(r).absentStaff),unit:'نفر-شیفت',detail:'جمع غیبت‌های تجمیعی ثبت‌شده؛ فاقد اطلاعات هویتی کارکنان',sampleCount:n};
 case 'EDUCATION':return {value:add(list,r=>p(r).participants),unit:'نفر',detail:'حضور ثبت‌شده؛ بدون اثبات تأثیر آموزشی',sampleCount:n};
 case 'FACILITY':return {value:rounded(add(list,r=>p(r).capacityTonsPerDay)),unit:'تن/روز',detail:'مجموع ظرفیت اسمی ردیف‌ها؛ نه ظرفیت آزاد یا قابل تخصیص',sampleCount:n};
 case 'QUALITY':return {value:ratio(add(list,r=>p(r).passedCount),add(list,r=>p(r).inspectedCount)),unit:'٪',detail:'نرخ قبولی داخلی نمونه‌ها؛ نه اثبات کیفیت کل شهر',sampleCount:n};
 default:return {value:n,unit:'رکورد',detail:'تعداد ردیف‌های بررسی‌شده داخلی',sampleCount:n};
 }
}
export function buildWasteOSOverview(snapshot,{city,organizationId,role,caseId=null,followups=null}={}){
 const status=validateWasteSnapshot(snapshot,city,organizationId,role);
 if(status.state!=='READY')return {state:status.state,message:status.message,domains:[],findings:[],linked:[],unlinked:[],partial:true};
 if(caseId!==null&&!UUID.test(caseId))return {state:'INVALID_SCOPE',message:'شناسه پرونده نامعتبر است',domains:[],findings:[],linked:[],unlinked:[],partial:true};
 const rows=snapshot.rows,verified=rows.filter(r=>r.review_state==='VERIFIED'),pending=rows.filter(r=>r.review_state==='SUBMITTED');
 const domains=DOMAINS.map(d=>{
   if(d.restricted&&!onlyLegal(role))return {...d,locked:true,count:null,verified:null,pending:null,rejected:null,caseLinked:null,metric:{value:null,unit:'',detail:'محدود به نقش مجاز؛ هیچ مقدار یا جزئیات افشا نمی‌شود',sampleCount:0}};
   const group=rows.filter(r=>r.record_kind===d.id),groupVerified=group.filter(r=>r.review_state==='VERIFIED');
   return {...d,count:group.length,verified:groupVerified.length,pending:group.filter(r=>r.review_state==='SUBMITTED').length,rejected:group.filter(r=>r.review_state==='REJECTED').length,caseLinked:caseId?group.filter(r=>caseLink(r,caseId)).length:0,metric:verifiedMetric(d.id,verified)};
 });
 const linked=caseId?rows.filter(r=>caseLink(r,caseId)):[];
 const unlinked=rows.filter(r=>r.record_kind==='COLLECTION'&&!r.case_id&&(/DEMO|SYNTHETIC/i.test(clean(r.record_code))||/SYNTHETIC/i.test(clean(r.evidence_ref))));
 const findings=[];
 const push=(code,level,domain,title,description,record=null)=>findings.push({code,level,domain,title,description,recordId:record?.id||null,caseId:caseLink(record,caseId)?caseId:null,verifiedBasis:record?.review_state==='VERIFIED',requiresHuman:true,autoWrite:false});
 if(snapshot.partial)push('PARTIAL_RESULT','REVIEW','ALL','نتیجه محدود شده است','داده‌ها در حد ۱۰۰۰ رکورد دریافت شده‌اند؛ نبود رکورد یا مقدار، قابل استنتاج نیست.');
 if(unlinked.length)push('UNLINKED_EVIDENCE','REVIEW','COLLECTION','باسکول آزمایشی بدون انتساب','رکوردهای بدون case_id را نمی‌توان با شباهت عنوان به پرونده متصل کرد.');
 if(pending.length)push('PENDING_INDEPENDENT_REVIEW','REVIEW','ALL','صف بررسی مستقل','رکوردهای SUBMITTED نباید در شاخص تأییدشده وارد شوند.');
 if(caseId&&linked.length===0)push('CASE_LINK_NOT_EVIDENCED','INFO','ALL','فقدان پیوند صریح پرونده','برای پرونده منتخب رکورد صریحاً منتسب در فهرست مجاز مشاهده نشد؛ این ادعای نبود داده در کل سامانه نیست.');
 for(const r of verified){const p=r.payload||{};
  if(r.record_kind==='CONTRACT_EVAL'&&finite(p.plannedServices)>0&&finite(p.completedServices)!==null&&p.completedServices/p.plannedServices<0.9)push('CONTRACT_COVERAGE_REVIEW','REVIEW','CONTRACT_EVAL','بررسی تحقق تعهد پیمانکار','نسبت خدمات ثبت‌شده کمتر از ۹۰٪ است؛ نیازمند بررسی مستند قرارداد.',r);
  if(r.record_kind==='SHIFT'&&finite(p.requiredStaff)>0&&finite(p.absentStaff)!==null&&p.absentStaff/p.requiredStaff>0.1)push('SHIFT_COVERAGE_REVIEW','REVIEW','SHIFT','ریسک پوشش شیفت','غیبت تجمیعی نسبت به نیاز برنامه بیش از ۱۰٪ ثبت شده است.',r);
  if(r.record_kind==='QUALITY'&&finite(p.inspectedCount)>0&&finite(p.passedCount)!==null&&p.passedCount/p.inspectedCount<0.9)push('QUALITY_REVIEW','REVIEW','QUALITY','نیاز به بررسی کیفیت','قبولی نمونه‌های بازرسی کمتر از ۹۰٪ گزارش شده است.',r);
  if(r.record_kind==='EDUCATION'&&finite(p.preScore)!==null&&finite(p.postScore)!==null&&p.postScore<=p.preScore)push('EDUCATION_EFFECT_REVIEW','INFO','EDUCATION','ابهام در اثربخشی آموزش','امتیاز پس‌آزمون بهتر از پیش‌آزمون نیست؛ روش ارزیابی را بازبینی کنید.',r);
  if(r.record_kind==='COLLECTION'&&p.sourceMethod==='ESTIMATE')push('ESTIMATED_WEIGHT_REVIEW','REVIEW','COLLECTION','وزن برآوردی','رکورد برآوردی از شاخص وزن باسکولی حذف شده و نیازمند سند مستقل است.',r);
 }
 const allCaseFollowups=Array.isArray(followups)?followups.filter(a=>a&&a.case_id===caseId):null;
 return {state:'READY',message:'اطلاعات آزمایشی و صرفاً در محدوده مجاز',partial:snapshot.partial,domains,findings:findings.slice(0,100),linked,unlinked:unlinked.slice(0,100),counts:{all:rows.length,verified:verified.length,pending:pending.length,rejected:rows.filter(r=>r.review_state==='REJECTED').length,linked:linked.length,unlinked:unlinked.length},caseFollowups:allCaseFollowups,followupsAvailable:Array.isArray(followups),safety:{dataSynthetic:true,verifiedPublicValue:false,dispatchAllowed:false,financeWriteAllowed:false,temporalLiveConnected:false,langGraphLiveConnected:false}};
}
export function canReviewWasteRecord(record,{role,canWrite,actorId}={}){
 return !!record&&UUID.test(record.id||'')&&UUID.test(record.created_by||'')&&record.review_state==='SUBMITTED'&&SCOPED_ROLES.has(role)&&['MUNICIPAL_ADMIN','AUDITOR'].includes(role)&&(!!canWrite||role==='AUDITOR')&&UUID.test(actorId||'')&&actorId!==record.created_by&&(!['LEGAL','VIOLATION'].includes(record.record_kind)||role==='MUNICIPAL_ADMIN');
}
export function canReviewWasteFollowup(action,{role,canWrite,actorId,caseId}={}){
 return !!action&&UUID.test(action.id||'')&&UUID.test(action.created_by||'')&&role==='MUNICIPAL_ADMIN'&&!!canWrite&&UUID.test(actorId||'')&&action.created_by!==actorId&&action.status==='PROPOSED'&&caseLink({case_id:action.case_id},caseId);
}
export function findingAppliesToCase(finding,caseId){
 return UUID.test(caseId||'')&&!!finding&&(finding.caseId===caseId||(finding.recordId===null&&finding.code==='CASE_LINK_NOT_EVIDENCED'));
}
export function validReviewNote(note,min=30){return typeof note==='string'&&note.trim().length>=min&&note.trim().length<=500&&!/[\u0000-\u001f\u007f]/.test(note);}
export function safeProposeNote(finding,caseId){
 if(!UUID.test(caseId||'')||!finding||!/^[-A-Z_]{3,60}$/.test(finding.code))throw Error('INVALID_PROPOSAL_SCOPE');
 return `RHF WASTE OS V6 | ${finding.code} | پرونده ${caseId} | ${clean(finding.title)}. درخواست صرفاً بررسی و تکمیل شواهد توسط مسئول مجاز است؛ هیچ تأیید عملیات میدانی، وزن واقعی، پرداخت یا ارزش شهری صادر نمی‌شود.`.slice(0,600);
}
export function finalUATDefinitions(){return Object.freeze([
 {id:'scope',label:'انتخاب شهرداری آزمایشی، سازمان و کنترل محدوده'},
 {id:'fleet',label:'ناوگان، ماشین‌آلات و وضعیت سرویس'},
 {id:'maintenance',label:'تعمیرات، هزینه مرجع و توقف ناوگان'},
 {id:'collection',label:'پسماند تر، خشک، باسکول و وزن خالص'},
 {id:'contractor',label:'قرارداد و شناسنامه پیمانکار'},
 {id:'contract_eval',label:'عملکرد پیمانکار، شکایات و کسورات پیشنهادی'},
 {id:'shift',label:'شیفت، تنظیف و غیبت تجمیعی با حفظ حریم خصوصی'},
 {id:'education',label:'آموزش، مشارکت شهروندی و ارزیابی برنامه'},
 {id:'facility',label:'مراکز پردازش، بازیافت و دفع و ظرفیت اسمی'},
 {id:'quality',label:'کیفیت خدمت، بازرسی، پذیرش و شکایت'},
 {id:'violation',label:'تخلفات، اخطاریه و کنترل نقش'},
 {id:'legal',label:'پرونده حقوقی، مراحل رسیدگی و کنترل نقش'},
 {id:'case_link',label:'ارتباط صریح سوابق با DEMO-06 و منع انتساب حدسی'},
 {id:'review',label:'ممنوعیت خودتأییدی و ثبت بازبینی مجاز'},
 {id:'agent',label:'پیشنهاد عامل، صف تصمیم انسانی و عدم اجرای خودکار'},
 {id:'value',label:'عدم اعلام ارزش واقعی بدون خط مبنا و شواهد مستقل'},
 {id:'auth',label:'کنترل نشست نامعتبر، محدوده شهر و محدودیت منابع'},
 {id:'persistence',label:'پایداری اطلاعات پس از بازخوانی و حفظ حسابرسی'},
 {id:'rollback',label:'وجود نسخه پشتیبان و برنامه بازگشت'},
 ]);
}
