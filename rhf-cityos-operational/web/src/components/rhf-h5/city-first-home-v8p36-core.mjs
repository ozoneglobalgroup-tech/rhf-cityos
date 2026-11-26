// RHF City OS | V8P3.6 | City-first operational projection.
// Grounded exclusively in already authorized, synthetic city-scoped dossier projections.
// This module does not infer service outcomes, severity, legal entities or verified value.
import {PORTFOLIO_VERSION} from './deputy-portfolio-v8p3-core.mjs';
export const CITY_FIRST_HOME_VERSION='RHF-CITY-FIRST-AI-HOME-V8P3.6';
export const CITY_MISSIONS=Object.freeze([
 {id:'ENVIRONMENT',name:'محیط‌زیست و تاب‌آوری',caption:'پایش زیست‌محیطی و پیشگیری',orgKeys:['ENV']},
 {id:'PUBLIC_SERVICE',name:'خدمات عمومی و ایمنی',caption:'خدمت روزمره، پاسخ و پیشگیری',orgKeys:['PUBLIC','FIRE','FLEET']},
 {id:'URBAN_SPACE',name:'فضای سبز و سیمای شهر',caption:'بوستان، باغات و منظر شهری',orgKeys:['GREEN','BEAUTIFICATION']},
 {id:'CITY_ECONOMY',name:'اقتصاد و خدمات شهری',caption:'بازار، آرامستان و پیمانکاران',orgKeys:['MARKETS','CEMETERY','CONTRACT']},
 {id:'PEOPLE',name:'مشارکت و توان سازمانی',caption:'آموزش، شهروندان و پشتیبانی',orgKeys:['CITIZEN','STAFF']}
]);
const safeTime=x=>{const d=Date.parse(x);return Number.isFinite(d)?d:0;};
const allowedRow=x=>x&&typeof x.id==='string'&&typeof x.orgKey==='string'&&typeof x.title==='string'&&typeof x.code==='string';
export function cityFirstProjection(board){
 if(!board||board.mode!==PORTFOLIO_VERSION||board.synthetic!==true||board.verifiedPublicValue!==false||board.autonomousDispatch!==false||!Array.isArray(board.rows)||!Array.isArray(board.pending)||!Array.isArray(board.indicators)||!Array.isArray(board.organizations)||board.rows.some(x=>!allowedRow(x)))
  return {mode:'UNAVAILABLE',verifiedPublicValue:false,autonomousDispatch:false,partial:false,coverage:[],queue:[],insights:[],topOrgs:[],total:null,pending:null,signals:null,domainCount:null};
 const orgSet=new Set(board.organizations.map(o=>o.orgKey));
 const coverage=CITY_MISSIONS.map(m=>{
  const subset=board.rows.filter(r=>m.orgKeys.includes(r.orgKey));
  return {...m,records:subset.length,pending:subset.filter(r=>r.status==='SUBMITTED').length,signals:board.indicators.filter(i=>m.orgKeys.includes(i.orgKey)).length,domains:m.orgKeys.filter(k=>orgSet.has(k)&&board.organizations.some(o=>o.orgKey===k&&o.records>0)).length};
 });
 const queue=board.pending.filter(allowedRow).slice().sort((a,b)=>safeTime(b.createdAt)-safeTime(a.createdAt)||a.code.localeCompare(b.code)).slice(0,6);
 const insights=board.indicators.filter(x=>x&&typeof x.id==='string'&&typeof x.orgKey==='string'&&typeof x.proposal==='string').slice(0,5);
 const topOrgs=board.organizations.filter(x=>Number.isSafeInteger(x.records)&&x.records>=0).slice().sort((a,b)=>b.records-a.records||a.orgKey.localeCompare(b.orgKey)).slice(0,7);
 return {mode:'SCOPED_SYNTHETIC',synthetic:true,verifiedPublicValue:false,autonomousDispatch:false,partial:board.partial===true,
  total:board.total,pending:board.pending.length,signals:board.indicators.length,domainCount:board.coverage,coverage,queue,insights,topOrgs,
  canCreate:board.canCreate===true,canReview:board.canReview===true};
}
export function cityFirstAnswer(mode,projection){
 if(!projection||projection.mode!=='SCOPED_SYNTHETIC')return {title:'شواهد قابل اتکا هنوز دریافت نشده است',description:'برای تولید توصیه، ابتدا اتصال دفتر پرونده‌های مجاز را بررسی کنید. داده نمونه را به‌عنوان واقعیت شهری جایگزین نمی‌کنیم.',action:'portfolio'};
 if(mode==='CAPACITY')return {title:'سرنخ ظرفیت، مجوز تخصیص نیست',description:'برای بررسی منابع بین‌سازمانی به تبادل فرصت‌ها بروید؛ مالک منبع، زمان آزاد، تناسب مکانی و اختیار قانونی باید جداگانه احراز شود.',action:'portfolio'};
 if(mode==='VALUE')return {title:'قیف ارزش شهری نیازمند شواهد مستقل است',description:'در وضعیت فعلی ارزش عمومی تأیید نشده است. فرضیه‌ها را با خط مبنا، مجوز اقدام و نتیجه مستقل ارزیابی کنید.',action:'value'};
 if(mode==='WORK')return {title:projection.pending>0?`${projection.pending} پرونده آزمایشی در صف بررسی داخلی`:'پرونده SUBMITTED در پاسخ فعلی یافت نشد',description:projection.partial?'پاسخ API محدود است؛ این عدد آمار کل شهرداری نیست.':'بررسی باید با حق دسترسی سازمانی، شواهد پرونده و تصمیم مستقل انجام شود.',action:'portfolio'};
 if(mode==='SCENARIO')return {title:'آزمایشگاه برای آزمون ۹ وضعیت طراحی شده است',description:'سناریوها محلی و مصنوعی‌اند؛ ثبت در PostgreSQL تنها با عمل صریح کاربر دارای مجوز انجام می‌شود.',action:'portfolio'};
 return {title:projection.signals>0?`${projection.signals} سیگنال قابل بررسی از فرم‌های تخصصی`:'سیگنالی در پرونده‌های دریافتی یافت نشد',description:'این سیگنال‌ها قاعده‌محور و مصنوعی‌اند؛ لزوماً خطر واقعی یا اولویت قطعی نیستند. برای هر پیشنهاد باید پرونده منبع باز شود.',action:'portfolio'};
}
export const CITY_FIRST_NO_AUTONOMOUS_DISPATCH=true;
export const CITY_FIRST_NO_VERIFIED_VALUE=true;
export const CITY_FIRST_NO_FAKE_CITY_KPI=true;
