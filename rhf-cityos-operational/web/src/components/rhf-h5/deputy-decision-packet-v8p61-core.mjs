// V8P6.1 leadership decision packets. Pure read-only projection; no synthetic evidence masquerades as municipal fact.
import {SOURCE_DEMO,SOURCE_MISSION} from './deputy-leader-v8p60-core.mjs';
import {selectedPlaybook} from './deputy-org-operations-v8p57-core.mjs';
export const DECISION61_VERSION='RHF-LEADERSHIP-DECISION-PACKET-V8P6.1';
export const MISSING='NOT_VERIFIED';
export const PRESENT='REGISTERED_ONLY';
export const ESTIMATE_UNKNOWN='برآورد معتبر دریافت نشده';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const statusText=Object.freeze({PROPOSED:'پیشنهاد ثبت‌شده',AUTHORIZED:'مجوز ثبت‌شده؛ اجرا احراز نشده',REJECTED:'ردشده',WITHDRAWN:'پس‌گرفته‌شده',APPROVED:'تأیید ثبت‌شده؛ اجرا احراز نشده',COMPLETED:'اتمام نرم‌افزاری؛ ارزش عمومی احراز نشده',FAILED:'شکست ثبت‌شده'});
const nextByStatus=Object.freeze({
 PROPOSED:'درخواست شواهد قابل انتساب و بررسی صلاحیت تصمیم‌گیرنده',
 AUTHORIZED:'بررسی حدود مجوز و پیگیری اجرای کنترل‌شده، بدون فرض وقوع عملیات',
 APPROVED:'بررسی سند تأیید و وضعیت واقعی مأموریت پیش از تصمیم جدید',
 COMPLETED:'درخواست گزارش نتیجه و راستی‌آزمایی مستقل در برابر خط مبنا',
 FAILED:'بررسی رویداد شکست، علت فنی و مسیر بازیابی مجاز',
 REJECTED:'مطالعه دلایل رد و تعیین نیاز به پرونده یا پیشنهاد جدید',
 WITHDRAWN:'ثبت دلیل انصراف و بستن مسیر تصمیم با حسابرسی'
});
const clean=(x,max=220)=>typeof x==='string'?x.replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,max):'';
const EVIDENCE_REQUIREMENTS=Object.freeze([
 {key:'location',name:'مکان قابل انتساب',prompt:'شناسه منطقه، مختصات یا دارایی را از GIS و پرونده معتبر تطبیق دهید'},
 {key:'observations',name:'شواهد و زمان مشاهده',prompt:'گزارش بازدید، حسگر یا درخواست دارای زمان و منشأ را بازیابی کنید'},
 {key:'baseline',name:'خط مبنا و شاخص سنجش',prompt:'وضعیت قبل از اقدام، واحد سنجش و روش مقایسه را مستند کنید'},
 {key:'authority',name:'صلاحیت و مجوز قانونی',prompt:'نقش تصمیم‌گیرنده و اختیار واحد مربوطه را بررسی کنید'},
 {key:'impact',name:'ارزیابی مستقل پیامد',prompt:'برای بررسی پس از اقدام، ارزیاب مستقل و منبع نتیجه تعیین کنید'}
]);
const defaultOptions=Object.freeze([
 'گردآوری شواهد و ارجاع به کارشناس مرتبط',
 'تحلیل محدود در حدود مجوز نقش و داده موجود',
 'تهیه پیشنهاد اصلاحی برای تصمیم مستقل انسانی'
]);
export function createDecisionPacket(brief,{cityName=''}={}){
 if(!brief||typeof brief!=='object'||![SOURCE_DEMO,SOURCE_MISSION].includes(brief.source)||brief.verified!==false||brief.modelExecuted!==false||brief.actionExecuted!==false)return null;
 const synthetic=brief.source===SOURCE_DEMO;
 if(!synthetic&&(!uuid.test(brief.id)||!uuid.test(brief.caseId)||!Object.hasOwn(statusText,brief.status)))return null;
 const where=clean(brief.where,200)||'مکان در داده معتبر ارائه نشده';
 const title=clean(brief.title,180)||'پرونده نیازمند بررسی';
 const play=synthetic?selectedPlaybook(brief.orgKey):null;
 const hasModelRun=brief.modelExecuted===true;
 const sourceLabel=synthetic?'SYNTHETIC_PRESENTATION · مثال آموزشی':'RUVOS_SCOPED_AGENT_LEDGER · ثبت نرم‌افزاری';
 const evidence=EVIDENCE_REQUIREMENTS.map(x=>Object.freeze({...x,state:MISSING}));
 const register=Object.freeze({name:'ثبت مأموریت در دفتر',state:synthetic?MISSING:PRESENT,description:synthetic?'هیچ مأموریت واقعی از این سناریو ایجاد نشده':'وجود رکورد در پاسخ هم‌دامنه تأیید شده؛ شواهد میدانی جداگانه لازم است'});
 const candidateSolutions=Array.isArray(brief.solutions)&&brief.solutions.length===3?brief.solutions:defaultOptions;
 const options=candidateSolutions.map((raw,i)=>Object.freeze({
  id:`SAFE-${i+1}`,title:clean(raw,180)||defaultOptions[i],type:i===0?'EVIDENCE':i===1?'REVIEW':'PROPOSAL',
  cost:ESTIMATE_UNKNOWN,time:ESTIMATE_UNKNOWN,publicValue:ESTIMATE_UNKNOWN,
  risk:'نیازمند ارزیابی حقوقی و عملیاتی',
  action:'پیشنهاد برای بررسی انسانی، نه دستور اجرایی',authorization:'باید در گردش‌کار مجاز احراز شود'
 }));
 const domainAgents=synthetic&&play?play.agents.slice(0,2).map(name=>({name:clean(name,120),readiness:'NOT_OPERATIONALLY_VERIFIED'})):[];
 const approvedStatus=!synthetic?statusText[brief.status]||'وضعیت نامشخص':'سناریوی آموزشی، بدون پرونده و مجوز واقعی';
 const next=synthetic?'ابتدا داده و مسئله را در یک پرونده معتبر ثبت کنید؛ سپس مجوز تحلیل را بررسی کنید':nextByStatus[brief.status]||'بررسی پرونده توسط مقام مجاز';
 return Object.freeze({
  id:synthetic?clean(brief.id,80):brief.id,caseId:synthetic?null:brief.caseId,
  title,where,cityName:clean(cityName,80),source:brief.source,sourceLabel,synthetic,missionStatus:approvedStatus,
  evidence,register,options,domainAgents,readiness:{confirmedEvidence:0,totalEvidence:EVIDENCE_REQUIREMENTS.length},
  authorityGate:clean(brief.gate,350)||'هر اقدام نیازمند احراز نقش و مجوز است',nextAction:next,
  why:clean(brief.why,320),agentName:clean(brief.agent,150),expectedImpact:clean(brief.impact,200),
  modelExecuted:hasModelRun,municipalActionExecuted:brief.actionExecuted===true,publicValueVerified:false,
  canApproveHere:false,canDispatchHere:false,canRecordEvidenceHere:false
 });
}
export function decisionMemoText(packet,optionId=null){
 if(!packet||!Array.isArray(packet.options)||!packet.sourceLabel)return '';
 const selected=packet.options.find(o=>o.id===optionId);
 const lines=[
  'RHF City OS | برگه آماده‌سازی تصمیم مدیریتی',
  `نوع داده: ${clean(packet.sourceLabel,100)}`,
  `موضوع: ${clean(packet.title,180)}`,
  `مکان: ${clean(packet.where,200)}`,
  `علت بررسی: ${clean(packet.why,320)}`,
  `وضعیت مأموریت: ${clean(packet.missionStatus,160)}`,
  `ایجنت پیشنهادی: ${clean(packet.agentName,150)} (اجرای مستقل تأیید نشده)`,
  `وضعیت شواهد: ${packet.readiness.confirmedEvidence} از ${packet.readiness.totalEvidence} معیار دارای شاهد تأییدشده`,
  `اقدام بعدی: ${clean(packet.nextAction,300)}`,
  `خطر و مرز اختیار: ${clean(packet.authorityGate,350)}`,
  ...(packet.caseId?[`شناسه پرونده: ${packet.caseId}`,`شناسه مأموریت: ${packet.id}`]:[]),
  `گزینه منتخب برای مقایسه: ${selected?selected.title:'انتخاب نشده'}`,
  `هزینه/زمان/اثر: ${ESTIMATE_UNKNOWN}`,
  'توجه: این برگه هیچ مأموریت، مجوز، نتیجه میدانی یا ارزش عمومی را تأیید نمی‌کند.',
  'نسخه: '+DECISION61_VERSION
 ];
 return lines.join('\n');
}
export function packetCounts(packets){const xs=Array.isArray(packets)?packets.filter(Boolean):[];return Object.freeze({total:xs.length,verified:xs.filter(x=>x.publicValueVerified===true).length,actionable:xs.filter(x=>x.canDispatchHere===true).length});}
