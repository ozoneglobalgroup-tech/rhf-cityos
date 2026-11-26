// V7.4 pure, deterministic view logic. Distinguishes unknown from zero and all synthetic data from field truth.
export const WASTE_EXECUTIVE_V74='RHF-WASTE-EXECUTIVE-V7.4';
export const DOMAINS=Object.freeze([
 {id:'COLLECTION',name:'جمع‌آوری، تفکیک و باسکول',area:'عملیات'},
 {id:'FLEET',name:'ناوگان و ماشین‌آلات',area:'عملیات'},
 {id:'MAINTENANCE',name:'تعمیرات و توقف',area:'عملیات'},
 {id:'SHIFT',name:'نیروی انسانی و شیفت',area:'عملیات'},
 {id:'CONTRACTOR',name:'پیمانکاران و قراردادها',area:'قرارداد'},
 {id:'CONTRACT_EVAL',name:'ارزیابی عملکرد پیمانکار',area:'قرارداد'},
 {id:'QUALITY',name:'کیفیت، بازرسی و شکایات',area:'کیفیت'},
 {id:'FACILITY',name:'تأسیسات، پردازش و بازیافت',area:'تأسیسات'},
 {id:'EDUCATION',name:'آموزش و مشارکت شهروندی',area:'مشارکت'},
 {id:'VIOLATION',name:'تخلفات',area:'محرمانه',restricted:true},
 {id:'LEGAL',name:'حقوقی',area:'محرمانه',restricted:true}
]);
export const PROCESS_TEMPLATES=Object.freeze([
 {id:'WEIGHBRIDGE_REVIEW',name:'رفع مغایرت باسکول',domain:'COLLECTION',stages:['ثبت و شواهد','بررسی مستقل','پیگیری مجاز','راستی‌آزمایی جداگانه']},
 {id:'FLEET_EXCEPTION',name:'اختلال ناوگان',domain:'FLEET',stages:['اعلام اختلال','بررسی مستقل','برنامه پیگیری','ثبت نتیجه مستقل']},
 {id:'CONTRACTOR_REVIEW',name:'بازنگری عملکرد پیمانکار',domain:'CONTRACT_EVAL',stages:['ثبت مغایرت','بررسی مستقل','پیگیری قراردادی مجاز','نتیجه مستند']},
 {id:'QUALITY_REMEDIATION',name:'رفع نقص کیفیت خدمت',domain:'QUALITY',stages:['ثبت نقص','بررسی مستقل','اصلاح با مجوز','بازرسی مجدد']},
 {id:'VALUE_OPPORTUNITY',name:'مطالعه فرصت خلق ارزش',domain:null,stages:['شناسایی فرصت','بررسی مستقل','تأمین خط مبنا','اندازه‌گیری مستقل ارزش']}
]);
export const AGENT_CATALOG=Object.freeze([
 {id:'WASTE_EVIDENCE',name:'عامل کنترل شواهد و باسکول',domains:['COLLECTION'],description:'کشف قبض بدون انتساب یا در انتظار بازبینی'},
 {id:'FLEET_RISK',name:'عامل ریسک ناوگان و تعمیرات',domains:['FLEET','MAINTENANCE'],description:'پایش سوابق خرابی و زمان توقف'},
 {id:'SERVICE_QUALITY',name:'عامل کیفیت خدمات',domains:['QUALITY'],description:'کشف تفاوت تعداد بازرسی‌های قبول‌شده و کل'},
 {id:'CONTRACT_GOVERNANCE',name:'عامل نظارت پیمانکار',domains:['CONTRACT_EVAL'],description:'بررسی اختلاف خدمت برنامه‌ریزی‌شده و انجام‌شده'},
 {id:'SHIFT_CAPACITY',name:'عامل پوشش شیفت',domains:['SHIFT'],description:'شناسایی کمبود تجمیعی نیروی حاضر'},
 {id:'VALUE_DISCOVERY',name:'عامل کشف فرصت ارزش',domains:['COLLECTION','QUALITY','CONTRACT_EVAL'],description:'ارائه مسئله برای بررسی ارزش؛ بدون ادعای منفعت محقق‌شده'}
]);
export function validateDomainSnapshot(s,{cityId,assignmentId,domain}){
 if(!s||s.mode!=='RHF-ORG-WASTE-READ-V7.3'||s.cityId!==cityId||s.assignmentId!==assignmentId||s.domain!==domain||s.readOnly!==true||!Array.isArray(s.rows)||s.rows.length>100||s.rows.some(x=>x.kind!==domain))throw Error('پاسخ حوزه خارج از حدود انتصاب یا قرارداد API است');
 return s;
}
export function validateWorkflowSnapshot(s,{cityId,assignmentId,reviewQueue=false}){
 if(!s||s.mode!=='RHF-ORG-BPMS-V7.4'||s.cityId!==cityId||!Array.isArray(s.rows)||s.rows.length>100||!!s.reviewQueue!==reviewQueue||(!reviewQueue&&s.assignmentId!==assignmentId))throw Error('پاسخ گردش‌کار خارج از حدود دسترسی است');
 return s;
}
export function summarizeModules(snapshots){
 const valid=DOMAINS.filter(x=>!x.restricted&&snapshots?.[x.id]?.ok);
 const unknown=DOMAINS.filter(x=>!x.restricted&&!snapshots?.[x.id]?.ok);
 return {loadedDomains:valid.length,unknownDomains:unknown.map(x=>x.id),visibleRecords:valid.reduce((a,d)=>a+snapshots[d.id].rows.length,0),partial:valid.some(x=>snapshots[x.id]?.partial)};
}
const numeric=(x)=>typeof x==='number'&&Number.isFinite(x)?x:null;
export function deriveFindings(snapshots){
 const findings=[];
 const add=(domain,row,issue,kind,detail)=>{
  if(!row?.id||findings.length>=40)return;
  findings.push({id:`${domain}:${row.id}:${issue}`,domain,recordId:row.id,recordCode:row.code||'فاقد کد',caseId:row.caseId||null,evidenceRef:row.evidenceRef||null,kind,issue,detail,verifiedPublicValue:false,autonomousExecution:false});
 };
 for(const d of DOMAINS){if(d.restricted||!snapshots?.[d.id]?.ok)continue;
  for(const r of snapshots[d.id].rows){
   if(r.reviewState==='SUBMITTED'){const taskKind=['COLLECTION'].includes(d.id)?'WEIGHBRIDGE_REVIEW':['FLEET','MAINTENANCE'].includes(d.id)?'FLEET_EXCEPTION':['CONTRACTOR','CONTRACT_EVAL'].includes(d.id)?'CONTRACTOR_REVIEW':'QUALITY_REMEDIATION';add(d.id,r,'سابقه در انتظار بازبینی داخلی',taskKind,'وضعیت SUBMITTED؛ نتیجه میدانی تأیید نشده است');}
   if(d.id==='COLLECTION'&&!r.caseId)add(d.id,r,'عدم انتساب صریح قبض به پرونده','WEIGHBRIDGE_REVIEW','ارتباط پرونده بدون case_id اثبات نشده است');
   if(d.id==='QUALITY'&&numeric(r.payload?.inspectedCount)!==null&&numeric(r.payload?.passedCount)!==null&&r.payload.passedCount<r.payload.inspectedCount)add(d.id,r,'تفاوت نتیجه بازرسی‌ها','QUALITY_REMEDIATION','نیازمند بررسی منبع و اصلاح انسانی');
   if(d.id==='CONTRACT_EVAL'&&numeric(r.payload?.completedServices)!==null&&numeric(r.payload?.plannedServices)!==null&&r.payload.completedServices<r.payload.plannedServices)add(d.id,r,'کاهش تحقق خدمت قراردادی','CONTRACTOR_REVIEW','صرفاً علامت تحلیل؛ تعیین جریمه ممنوع');
   if(d.id==='SHIFT'&&numeric(r.payload?.absentStaff)>0)add(d.id,r,'غیبت تجمیعی در شیفت','QUALITY_REMEDIATION','بدون دسترسی به هویت یا پرونده پرسنلی');
   if(d.id==='MAINTENANCE'&&numeric(r.payload?.downtimeHours)>0)add(d.id,r,'ساعات توقف ثبت‌شده','FLEET_EXCEPTION','نیازمند بررسی علت و نوع توقف');
  }
 }
 return findings;
}
export function processStats(snapshot){if(!snapshot)return {known:false,pending:null,authorized:null,rejected:null};const rows=snapshot.rows||[];return {known:true,pending:rows.filter(x=>x.status==='SUBMITTED').length,authorized:rows.filter(x=>x.status==='AUTHORIZED').length,rejected:rows.filter(x=>x.status==='REJECTED').length,partial:!!snapshot.partial}}
export function opportunityPipeline(snapshot){if(!snapshot)return null;return snapshot.rows.filter(x=>x.kind==='VALUE_OPPORTUNITY').map(x=>({...x,independentlyVerified:false,verifiedBenefit:null}))}
