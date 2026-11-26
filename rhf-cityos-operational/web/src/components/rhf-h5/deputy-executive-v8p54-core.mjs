// V8P5.4: pure, deterministic presentation projection. No API call or persistence.
// Never equate synthetic performance records with RUVOS evidence or verified public value.
import {syntheticPortfolio,summarize,PERIODS,BRAND} from './deputy-performance-v8p53-core.mjs';
export const UX54_VERSION='RHF-DEPUTY-EXECUTIVE-UX-V8P5.4';
export const UX54_BRAND=BRAND;
export const UX54_COMMANDS=Object.freeze([
 {id:'dashboard',title:'صفحه نخست معاونت',desc:'نبض مدیریت شهری',icon:'home'},
 {id:'performance',title:'ارزیابی عملکرد PUC+',desc:'مقایسه ۱۲ حوزه و ۳۶ واحد نمونه',icon:'chart'},
 {id:'operations',title:'میزکار سازمان‌ها',desc:'فرم‌ها و پرونده‌های تخصصی',icon:'building'},
 {id:'portfolio',title:'پرونده‌ها و شواهد',desc:'پایش بین‌سازمانی RUVOS',icon:'folder'},
 {id:'agents',title:'مرکز ایجنت‌ها',desc:'تحلیل محدود و قابل بازبینی',icon:'bot'},
 {id:'bpms',title:'صف تصمیم انسانی',desc:'مأموریت و بررسی مستقل',icon:'decision'},
 {id:'value',title:'فرصت‌های خلق ارزش',desc:'شواهد و سنجش مستقل',icon:'target'},
 {id:'reports',title:'گزارش‌های مدیریتی',desc:'خروجی‌های دامنه‌دار',icon:'file'},
 {id:'governance',title:'اختیارات و حسابرسی',desc:'مرز دسترسی شهرداری',icon:'shield'},
]);
export const cleanSearch=x=>String(x??'').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[‌‏‎]/g,' ').trim().toLocaleLowerCase('fa-IR');
export function demoView(){const rows=syntheticPortfolio();const totals=summarize(rows);return Object.freeze({source:'SYNTHETIC_PRESENTATION',rows,totals,periodCount:PERIODS.length,veto:rows.filter(x=>x.veto),unitCount:totals.unitCount});}
export function filterDemoOrgs(rows,query='',riskOnly=false){const q=cleanSearch(query);return rows.filter(r=>(!riskOnly||r.veto)&&(!q||cleanSearch([r.name,r.mission,...r.units.map(u=>u.title)].join(' ')).includes(q)));}
export function filterCommands(query=''){const q=cleanSearch(query);return UX54_COMMANDS.filter(c=>!q||cleanSearch(`${c.title} ${c.desc}`).includes(q));}
const allowedOrgs=new Set(syntheticPortfolio().map(x=>x.id));
export function scopedDecisionQueue(projection){
 if(!projection||projection.mode!=='SCOPED_SYNTHETIC'||!Array.isArray(projection.queue))return [];
 return projection.queue.filter(r=>r&&typeof r.id==='string'&&r.id.length>0&&r.id.length<=128&&allowedOrgs.has(r.orgKey)&&typeof r.title==='string'&&r.title.trim().length>0).slice(0,12).map(r=>Object.freeze({id:r.id,orgKey:r.orgKey,title:r.title.slice(0,180),code:typeof r.code==='string'?r.code.slice(0,80):'',source:'RUVOS_SCOPED_TRAINING',status:'SUBMITTED'}));
}
export function executiveReadiness(projection){
 const available=projection?.mode==='SCOPED_SYNTHETIC';
 return Object.freeze({source:available?'RUVOS_SCOPED_TRAINING':'UNAVAILABLE',sampleCount:available&&Number.isSafeInteger(projection.total)?projection.total:null,needsReview:available&&Number.isSafeInteger(projection.pending)?projection.pending:null,partial:available&&projection.partial===true,queue:scopedDecisionQueue(projection)});
}
