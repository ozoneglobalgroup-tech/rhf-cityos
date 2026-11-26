// RHF City OS V8P3.8 | Bounded city agent mission control.
// Deterministic, user-initiated and read-only projections from the authorized V8P2 dossier snapshot.
// An agent card is a skill/workflow definition, NOT an independently running or autonomous agent.
import {decisionRoomProjection,decisionGate} from './deputy-decision-room-v8p37-core.mjs';
import {syntheticIndicator} from './deputy-portfolio-v8p3-core.mjs';
import {validateFields} from './deputy-dossier-schema.mjs';

export const CITY_AGENT_COMMAND_VERSION='RHF-CITY-AGENT-COMMAND-V8P3.8';
export const CITY_AGENT_CATALOG=Object.freeze([
 {id:'EVIDENCE',name:'ممیز کیفیت شواهد',domain:'تمام حوزه‌ها',goal:'آشکارسازی شکاف ارجاع مستندات آموزشی پیش از تصمیم'},
 {id:'NEEDS',name:'کاشف نیازهای شهری',domain:'۱۰ حوزه دارای قاعده',goal:'استخراج سیگنال از فرم‌های تخصصی تأییدنشده'},
 {id:'CAPACITY',name:'هماهنگ‌کننده نیاز و ناوگان',domain:'فضای سبز، خدمات عمومی، زیباسازی و ناوگان',goal:'نمایش زوج‌های احتمالی، بدون ادعای ظرفیت آزاد'},
 {id:'REVIEW',name:'نگهبان تصمیم مستقل',domain:'صف ارجاع معاونت',goal:'شناسایی پرونده‌های قابل ارجاع بدون خودبازبینی'}
]);
export const NO_AUTONOMOUS_ACTION=true;
export const NO_VERIFIED_PUBLIC_VALUE=true;
export const NO_REAL_WORLD_ALERTS=true;
export const NO_DIRECT_WRITE=true;
const statuses=new Set(['SUBMITTED','REVIEWED','FIXTURE']);
const needRules=Object.freeze({GREEN:'irrigationIssues',PUBLIC:'overdue',BEAUTIFICATION:'damaged'});
const nullProjection=()=>({mode:'UNAVAILABLE',synthetic:true,partial:false,runAllowed:false,sourceCount:null,findings:[],catalog:CITY_AGENT_CATALOG,autonomousDispatch:false,verifiedPublicValue:false,writeAllowed:false});
const dateString=x=>typeof x==='string'?x:'';
const order=(a,b)=>dateString(b.updatedAt).localeCompare(dateString(a.updatedAt))||a.code.localeCompare(b.code)||a.id.localeCompare(b.id);
const safeRef=r=>Array.isArray(r.evidenceRefs)?r.evidenceRefs.filter(e=>e&&typeof e.label==='string'&&/^DEMO-[A-Z0-9_-]{4,40}$/.test(e.referenceCode)).map(e=>e.referenceCode):[];
function finding(id,agentId,title,recordIds,records,explanation,unknowns,action){return {id,agentId,title,recordIds,sourceCodes:records.map(r=>r.code),sourceOrgKeys:records.map(r=>r.orgKey),evidenceRefs:records.flatMap(safeRef),explanation,unknowns,action,status:'HUMAN_REVIEW_REQUIRED',method:'DETERMINISTIC_SYNTHETIC_RULE',verifiedPublicValue:false,capacityVerified:false,autonomousDispatch:false,benefitEstimate:null};}
export function cityAgentProjection(board){
 const d=decisionRoomProjection(board);
 if(d.mode!=='SCOPED_SYNTHETIC'||!board||board.synthetic!==true||board.autonomousDispatch!==false||board.verifiedPublicValue!==false)return nullProjection();
 const rows=d.all.slice().sort(order);
 const map=new Map(rows.map(r=>[r.id,r]));
 if(map.size!==rows.length)return nullProjection();
 try{for(const r of rows)validateFields(r.orgKey,r.fields);}catch{return nullProjection();}
 const findings=[];
 // Evidence quality is a data-entry observation, never a finding that real evidence is missing.
 for(const r of d.submitted.filter(r=>safeRef(r).length===0).slice(0,12))findings.push(finding(`EVIDENCE:${r.id}`,'EVIDENCE',`بررسی ارجاع سند آزمایشی: ${r.title}`,[r.id],[r],
  'فرم ارسالی فاقد کد DEMO است. این موضوع به‌تنهایی نبود سند واقعی یا نقص اجرای خدمت را اثبات نمی‌کند.',
  ['موجودبودن مستندات خارج از فرم','اصالت و کفایت شواهد واقعی'], 'OPEN_DOSSIER'));
 // Use the existing V8P3.1 rule engine instead of invented AI scoring or risk grades.
 for(const r of rows.filter(r=>statuses.has(r.status))){const signal=syntheticIndicator(r);if(!signal)continue;
  findings.push(finding(`NEEDS:${r.id}`,'NEEDS',`${signal.label}: ${r.title}`,[r.id],[r],
   `مقدار فرم نمونه: ${signal.quantity}؛ قاعده: ${signal.proposal}. این عدد شاخص عملکرد واقعی شهر نیست.`,
   ['صحت داده میدانی','محدوده مکانی و زمانی','صلاحیت مقام تصمیم‌گیر'], 'OPEN_DOSSIER'));
  if(findings.filter(f=>f.agentId==='NEEDS').length>=15)break;
 }
 const eligible=rows.filter(r=>statuses.has(r.status));
 const fleet=eligible.filter(r=>r.orgKey==='FLEET'&&r.fields.vehicles>r.fields.stopped).slice(0,3);
 const needs=eligible.filter(r=>needRules[r.orgKey]&&Number.isSafeInteger(r.fields[needRules[r.orgKey]])&&r.fields[needRules[r.orgKey]]>0).slice(0,5);
 for(const need of needs){for(const asset of fleet){
  if(findings.filter(f=>f.agentId==='CAPACITY').length>=9)break;
  findings.push(finding(`CAPACITY:${need.id}:${asset.id}`,'CAPACITY',`بررسی امکان همکاری ${need.orgKey} و ناوگان`,[need.id,asset.id],[need,asset],
   `در یک فرم نیاز آموزشی ثبت شده و فرم ناوگان ${asset.fields.vehicles-asset.fields.stopped} خودرو غیرمتوقف گزارش کرده است. غیرمتوقف به معنی آزاد یا مناسب نیست.`,
   ['ظرفیت آزاد واقعی','تناسب نوع خودرو با مأموریت','زمان و موقعیت مکانی','مالک منبع و اختیار قانونی','هزینه و شواهد نتیجه'], 'VALIDATE_CAPACITY'));
 }if(findings.filter(f=>f.agentId==='CAPACITY').length>=9)break;}
 // Authorization in the source API is a necessary but not sufficient gate for review.
 for(const r of d.reviewable.slice(0,12))if(decisionGate(r,d).action==='OPEN_FOR_REVIEW')findings.push(finding(`REVIEW:${r.id}`,'REVIEW',`بازبینی مستقل: ${r.title}`,[r.id],[r],
  'پرونده SUBMITTED است، ثبت‌کننده آن کاربر فعلی نیست و پاسخ API مجوز بازبینی دارد. سرور هنگام اقدام مجدداً اختیار را بررسی می‌کند.',
  ['کفایت شواهد','بررسی تعارض منافع خارج از محدودیت خودبازبینی','صدور یادداشت تصمیم انسانی'], 'OPEN_FOR_REVIEW'));
 return {mode:'SCOPED_SYNTHETIC',synthetic:true,partial:d.partial,runAllowed:true,sourceCount:rows.length,
  catalog:CITY_AGENT_CATALOG,findings,canReview:d.canReview,canCreate:d.canCreate,
  autonomousDispatch:false,verifiedPublicValue:false,writeAllowed:false,method:'BOUNDED_LOCAL_ANALYSIS',
  caveat:'تمام خروجی‌ها تحلیل قاعده‌محور از داده SYNTHETIC هستند؛ شواهد واقعی، ظرفیت آزاد و ارزش عمومی اثبات نشده است.'};
}
export function runCityAgent(project,agentId){
 if(!project||project.mode!=='SCOPED_SYNTHETIC'||project.runAllowed!==true||!CITY_AGENT_CATALOG.some(a=>a.id===agentId))return null;
 const agent=CITY_AGENT_CATALOG.find(a=>a.id===agentId);
 const rows=project.findings.filter(f=>f.agentId===agentId);
 return {agentId,title:agent.name,mode:'LOCAL_RULE_EVALUATION',method:'DETERMINISTIC_SYNTHETIC_RULE',sourceCount:project.sourceCount,
  findings:rows,partial:project.partial,executedRemotely:false,modelUsed:false,dbWrite:false,dispatchAllowed:false,verifiedPublicValue:false,
  note:rows.length?'صرفاً پیشنهاد بررسی؛ هیچ مجوز، تخصیص یا تصمیمی صادر نشده است.':'در مجموعه رکوردهای بازگشتی نشانه‌ای مطابق این قاعده یافت نشد؛ فقدان مسئله در شهر قابل نتیجه‌گیری نیست.'};
}
export function verifyBoundedRuntimeStatus(x){
 if(!x||x.mode!=='BOUNDED_READ_ONLY'||x.autoWrite!==false||x.externalConsentRequired!==true||x.maxTools!==4||typeof x.modelEnabled!=='boolean')return null;
 return {mode:'BOUNDED_READ_ONLY',modelEnabled:x.modelEnabled,externalConsentRequired:true,autoWrite:false,maxTools:4};
}
