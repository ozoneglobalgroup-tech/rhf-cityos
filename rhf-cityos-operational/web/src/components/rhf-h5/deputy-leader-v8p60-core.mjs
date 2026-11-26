// V8P6.0 — executive decision intelligence. No municipal action, synthetic alerts, or inferred evidence.
import {syntheticPortfolio} from './deputy-performance-v8p53-core.mjs';
import {selectedPlaybook} from './deputy-org-operations-v8p57-core.mjs';
export const LEADER60_VERSION='RHF-LEADER-DECISION-INTELLIGENCE-V8P6.0';
export const SOURCE_DEMO='SYNTHETIC_PRESENTATION';
export const SOURCE_MISSION='RUVOS_SCOPED_AGENT_LEDGER';
export const MAX_MISSIONS=100;
const safe=(v,max=180)=>typeof v==='string'?v.replace(/[<>\\u0000-\\u001f]/g,'').trim().slice(0,max):'';
const id=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const STATES=new Set(['PROPOSED','AUTHORIZED','REJECTED','WITHDRAWN','APPROVED','COMPLETED','FAILED']);
const byId=Object.fromEntries(syntheticPortfolio().map(x=>[x.id,x]));
export const themes=Object.freeze([
 {key:'CONTRACT',title:'ریسک انطباق پیمانکار',context:'تفاوت سطح انطباق و عملکرد نمونه',why:'مؤلفه انطباق C در نمونه کمتر از ۵۰ است؛ قاعده PUC+ وتو را فعال می‌کند.',agent:'دستیار بررسی مغایرت SLA',solutions:['بررسی مدارک خدمت و صورت‌وضعیت در پرونده مجاز','بازبینی انطباق توسط واحد نظارت و امور حقوقی','تدوین اقدام اصلاحی و تأیید مقام مجاز'],impact:'کاهش ریسک تصمیم بدون مدرک',severity:'CRITICAL'},
 {key:'GREEN',title:'فرصت اصلاح برنامه آبیاری',context:'نیاز به سنجش ظرفیت مجاز آب و نگهداشت',why:'امتیاز آموزشی U به تنهایی اثبات‌کننده اتلاف آب یا نیاز واقعی به آبیاری نیست.',agent:'دستیار تحلیل مصرف آب',solutions:['دریافت داده معتبر کنتورها و برنامه نگهداشت','تطبیق الگوی مصرف با اقلیم و مجوز برداشت','پیشنهاد برنامه اصلاحی برای تأیید کارشناس'],impact:'مصرف آب قابل اندازه‌گیری، پس از راستی‌آزمایی',severity:'ATTENTION'},
 {key:'FLEET',title:'بهبود آماده‌به‌کاری ناوگان',context:'نیاز به مقایسه ظرفیت قابل استفاده و تقاضا',why:'شاخص‌های نمونه تنها نشانه طراحی‌اند؛ توقف یک ماشین یا ظرفیت آزاد آن در سیستم واقعی احراز نشده است.',agent:'دستیار تحلیل نگهداشت و سوخت',solutions:['خواندن گزارش‌های معتبر کارکرد و تعمیرات','مقایسه تقاضای مأموریت با ظرفیت مجاز','ثبت پیشنهاد برای تصمیم مسئول ناوگان'],impact:'کاهش توقف و سوخت، مشروط به شواهد',severity:'ATTENTION'},
 {key:'MARKETS',title:'پیشگیری از مغایرت خدمات میادین',context:'اولویت بازرسی و کیفیت ارائه خدمت',why:'در این سناریو هنوز صورت‌جلسه معتبر بازرسی و دامنه قانونی اقدام دریافت نشده است.',agent:'دستیار اولویت‌بندی بازرسی',solutions:['جمع‌آوری چک‌لیست‌های بازدید معتبر','تطبیق نتیجه با مقررات مربوط','ارسال پیشنهاد به بازرس و مقام مسئول'],impact:'کاهش زمان رسیدگی پس از سنجش واقعی',severity:'OPPORTUNITY'}
]);
export function demoBriefs(cityName=''){
 const shiraz=typeof cityName==='string'&&/شیراز|shiraz/i.test(cityName);
 return themes.map((t,i)=>{
  const org=byId[t.key];const plan=selectedPlaybook(t.key);
  return Object.freeze({id:`DEMO-${t.key}`,orgKey:t.key,title:t.title,where:`${shiraz?org.region:'محدوده نمونه '+(i+1)} · فقط سناریوی آموزشی`,orgName:org.name,context:t.context,why:t.why,agent:t.agent,solutions:t.solutions,impact:t.impact,severity:t.severity,score:org.score,conformity:org.dimensions.C,veto:org.veto,gate:plan.gate,source:SOURCE_DEMO,evidence:'داده PUC+ ساختگی؛ بدون حسگر، بازدید یا سند واقعی',verified:false,modelExecuted:false,actionExecuted:false});
 });
}
export function validateAgentRuntime(response,city,type){
 if(!response||typeof response!=='object'||response.scope!==city||typeof city!=='string'||!city)return null;
 if(type==='missions'&&response.mode==='PERSISTENT_HUMAN_GOVERNED_PROPOSALS'&&response.postgresLedger===true&&response.autoDispatch===false){
  const counts=response.counts&&typeof response.counts==='object'?response.counts:{};
  const pending=counts.PROPOSED;
  return {state:'LEDGER_CONNECTED',label:'دفتر مأموریت متصل',pending:Number.isSafeInteger(pending)&&pending>=0?pending:null};
 }
 if(type==='graph'&&response.mode==='AUTHORIZED_READ_ONLY_IN_PROCESS'&&response.noMunicipalWrites===true&&response.autoDispatch===false&&typeof response.graphEngine==='string')return {state:'READ_ONLY_READY',label:'تحلیل کنترل‌شده LangGraph'};
 if(type==='temporal'&&['SERVICE_CONNECTED','DISABLED'].includes(response.state)&&response.municipalDispatch===false)return {state:response.state,label:response.state==='SERVICE_CONNECTED'?'Temporal متصل':'Temporal غیرفعال'};
 return null;
}
export function validateScopedMissions(response,city){
 if(!response||response.scope!==city||!Array.isArray(response.rows)||response.rows.length>MAX_MISSIONS)return null;
 const used=new Set(),result=[];
 for(const x of response.rows){
  if(!x||typeof x.id!=='string'||!id.test(x.id)||used.has(x.id)||typeof x.caseId!=='string'||!id.test(x.caseId)||!STATES.has(x.status)||x.dispatched!==false||x.modelInvoked!==false||x.verifiedPublicValue!==false)return null;
  used.add(x.id);
  result.push(Object.freeze({id:x.id,caseId:x.caseId,title:safe(x.caseSummary||x.objective,180)||'مأموریت ثبت‌شده',objective:safe(x.objective,120),status:x.status,why:'در دفتر مأموریت هم‌دامنه ثبت شده است؛ ضرورت، مکان و اثر واقعی نیازمند بررسی پرونده و شواهد است.',where:'محل دقیق در فهرست مأموریت ارائه نشده',agent:'مأموریت کنترل‌شده RUVOS',solutions:['بازکردن پرونده و بررسی شواهد قابل انتساب','راستی‌آزمایی تازگی داده و اختیارات قانونی','تصمیم مستقل انسانی پیش از هر مرحله تحلیلی'],impact:'ارزش شهری هنوز تأیید نشده',source:SOURCE_MISSION,verified:false,evidence:'هش شواهد در دفتر مأموریت؛ جزئیات مستلزم ورود به پرونده',severity:x.status==='PROPOSED'?'ATTENTION':'INFO',modelExecuted:false,actionExecuted:false}));
 }
 return Object.freeze({rows:result,partial:response.partial===true,scope:city,source:SOURCE_MISSION});
}
export function summarizeAgentHealth(runtime,missions){
 const statuses=['missions','graph','temporal'].map(k=>runtime?.[k]?.state||'UNAVAILABLE');
 const connected=statuses.filter(x=>['LEDGER_CONNECTED','READ_ONLY_READY','SERVICE_CONNECTED'].includes(x)).length;
 return Object.freeze({connected,total:3,pending:missions?.rows.filter(x=>x.status==='PROPOSED').length??null,partial:missions?.partial===true,noVerifiedValue:true,autoDispatch:false});
}
export function filterLeaderBriefs(rows,{query='',risk='ALL'}={}){const q=safe(query,80).toLocaleLowerCase('fa-IR');return (Array.isArray(rows)?rows:[]).filter(x=>(risk==='ALL'||x.severity===risk)&&(!q||[x.title,x.where,x.orgName||'',x.agent,x.why].join(' ').toLocaleLowerCase('fa-IR').includes(q)));}
