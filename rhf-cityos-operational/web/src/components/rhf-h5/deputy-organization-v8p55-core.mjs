// V8P5.5 — city-aware presentation only; no city record or server permission is inferred.
import {ORGS,syntheticPortfolio,PERIODS} from './deputy-performance-v8p53-core.mjs';
export const UX55_VERSION='RHF-ORG-OPERATIONS-UX-V8P5.5';
export const UX55_IMAGE='/images/shiraz-eram-concept-v55.webp';
export const UX55_IMAGE_STATUS='ARTISTIC_RECREATION_NOT_DOCUMENTARY';
export const UX55_PERIODS=PERIODS;
export function isShirazCity(name){
 const s=String(name??'').normalize('NFKC').trim().toLocaleLowerCase('fa-IR');
 return /(?:شیراز|shiraz)/i.test(s);
}
export function findDemoOrganization(rows,id){
 if(typeof id!=='string'||!Array.isArray(rows))return null;
 const allowed=new Set(ORGS.map(o=>o[0]));
 return allowed.has(id)?rows.find(r=>r?.id===id&&r.source==='SYNTHETIC_PRESENTATION')??null:null;
}
export function scopedDemoUnits(org){
 if(!org||org.source!=='SYNTHETIC_PRESENTATION'||!ORGS.some(x=>x[0]===org.id)||!Array.isArray(org.units))return [];
 return org.units.filter(u=>typeof u?.id==='string'&&u.id.startsWith(org.id+'-')&&typeof u.title==='string'&&Number.isFinite(u.score)&&u.score>=0&&u.score<=100).slice(0,3).map(u=>Object.freeze({id:u.id,title:u.title,score:u.score,sampleCount:Number.isSafeInteger(u.sampleCount)?u.sampleCount:0,source:'SYNTHETIC_PRESENTATION'}));
}
export const areaSampleTasks=Object.freeze({
 WASTE:['پایش آموزشی برنامه جمع‌آوری','نمونه بررسی ظرفیت بازیافت','کنترل نمایشی شواهد پردازش'],
 GREEN:['بازبینی آموزشی نگهداشت باغات','نمونه اولویت هرس درختان','تحلیل نمایشی مصرف آب'],
 CEMETERY:['رسیدگی نمایشی خدمات مراجعان','نمونه نگهداشت معابر آرامستان','بررسی آموزشی توسعه خدمات'],
 MARKETS:['پایش آموزشی بهداشت غرفه‌ها','نمونه هماهنگی بازرسی بازار','تحلیل نمایشی ساماندهی مشاغل'],
 BEAUTIFICATION:['بررسی آموزشی روشنایی','نمونه ارزیابی مبلمان شهری','طرح نمایشی بهسازی منظر'],
 PUBLIC:['نمونه کنترل نظافت معابر','تمرین هماهنگی رسیدگی ۱۳۷','پایش نمایشی خدمات عمومی'],
 ENV:['پایش نمایشی شاخص‌های آلودگی','تمرین ارزیابی شکایات محیطی','نمونه شواهد نظارت محیطی'],
 FIRE:['تمرین آموزشی آمادگی ناوگان امداد','بازبینی نمایشی برنامه پیشگیری','سناریوی نمونه آموزش ایمنی'],
 FLEET:['ارزیابی نمونه نگهداشت تجهیزات','تحلیل نمایشی تخصیص ناوگان','پایش آموزشی مصرف سوخت'],
 CONTRACT:['بررسی آموزشی SLA پیمانکاران','تمرین تشخیص عدم انطباق','نمونه رسیدگی به صورت‌وضعیت'],
 CITIZEN:['نمونه برنامه آموزش شهروندی','تحلیل نمایشی درخواست‌های ۱۳۷','تمرین مشارکت محله‌ای'],
 STAFF:['پایش آموزشی برنامه و بودجه','نمونه برنامه توانمندسازی کارکنان','تمرین ارزیابی گزارش واحدها']
});
export function sampleTaskRows(org){
 if(!org||org.source!=='SYNTHETIC_PRESENTATION')return [];
 return (areaSampleTasks[org.id]??[]).slice(0,3).map((title,i)=>Object.freeze({id:`${org.id}-TASK-${i+1}`,title,state:i===0?'NEEDS_REVIEW':i===1?'DEMO_ANALYSIS':'EXAMPLE',source:'SYNTHETIC_PRESENTATION'}));
}
export function organizationPulse(org){
 const units=scopedDemoUnits(org);if(!units.length)return null;
 const trend=Array.isArray(org.trend)&&org.trend.length===6&&org.trend.every(Number.isFinite)?org.trend:[];
 return Object.freeze({name:org.name,score:org.score,veto:org.veto,units,trend,needsReview:sampleTaskRows(org).length,source:'SYNTHETIC_PRESENTATION',publicValueVerified:false});
}
