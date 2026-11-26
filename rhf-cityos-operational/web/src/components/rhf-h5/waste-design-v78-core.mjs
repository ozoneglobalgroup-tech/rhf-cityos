/** Read-only demo projection. Persisted metrics MUST originate from validated scoped RUVOS responses. */
import {BOARD_DOMAINS,SCENARIO,executiveBoard,instructionalOverview,readExecutiveRows} from './waste-ceo-core.mjs';
import {AGENTS,FLOWS} from './waste-lab-ui-core.mjs';
export const DESIGN_VERSION='RHF-WASTE-CEO-DESIGN-V7.8';
export const NAV_SECTIONS=[
 ['dashboard','داشبورد مدیرعامل','home'],['command','فرماندهی سازمان','flag'],['operations','عملیات و خدمات','truck'],['domains','حوزه‌ها و واحدها','layers'],['agents','عامل‌های تخصصی','bot'],['value','فرصت‌های خلق ارزش','target'],['bpms','فرایندها و BPMS','workflow'],['reports','گزارش‌ها و داشبوردها','chart'],['access','کاربران و دسترسی‌ها','users'],['audit','حسابرسی و انطباق','shield']
];
export const DOMAINS=BOARD_DOMAINS;
export const AGENT_MENU=AGENTS;
export const FLOW_MENU=FLOWS;
export const PREVIEW_METRICS=Object.freeze({
 COLLECTION:{value:500,unit:'کیلوگرم',detail:'۱۳۰۰ − ۸۰۰ کیلوگرم'},
 MAINTENANCE:{value:7,unit:'ساعت',detail:'توقف فرضی یک خودرو'},
 CONTRACT_EVAL:{value:78,unit:'درصد',detail:'۷۸ خدمت از ۱۰۰ خدمت'},
 QUALITY:{value:76.7,unit:'درصد',detail:'۲۳ قبولی از ۳۰ بازرسی'},
 SHIFT:{value:4,unit:'نفر',detail:'کمبود فرضی ۴ نفر'},
 VALUE_OPPORTUNITY:{value:33.3,unit:'درصد هدف',detail:'کاهش فرضی توقف ۱۲ به ۸ ساعت'}
});
export function resolveExecutiveResponse(response,city){const snapshot=readExecutiveRows(response,city);return {...executiveBoard(snapshot),canSeed:snapshot.canSeed===true,canWrite:snapshot.canWrite===true};}
export function projectBoard(board){
 const persisted=board?.source==='SERVER_SYNTHETIC'&&(Number(board?.counts?.records||0)>0||Number(board?.counts?.flows||0)>0);const safe=persisted?board:instructionalOverview();
 const kpis=Object.fromEntries((persisted?board.kpis||[]:[]).filter(x=>x&&typeof x.domain==='string').map(x=>[x.domain,{value:x.value,unit:x.unit,detail:x.label}]));
 const domainCounts=Object.fromEntries((persisted?board.areas||[]:[]).map(x=>[x.id,x.locked?null:x.count]));
 return {persisted,mode:persisted?'SERVER_SYNTHETIC':'UNPERSISTED_EXAMPLE',
  counts:persisted?{...board.counts}:null,domainCounts,kpis:persisted?kpis:PREVIEW_METRICS,
  findings:persisted?board.findings||[]:SCENARIO,opportunities:persisted?board.opportunities||[]:instructionalOverview().opportunities,
  areas:safe.areas||[],partial:persisted?board.partial===true:false};
}
export function canExport(projected){return projected?.persisted===true&&projected?.mode==='SERVER_SYNTHETIC';}
export function scopePublicDomains(areas){return (areas||[]).filter(x=>x&&!x.locked&&x.id!=='LEGAL'&&x.id!=='VIOLATION');}
export function safeValue(x){return typeof x==='number'&&Number.isFinite(x)?x:null;}
export function demoLabel(p){return p?.persisted?'SYNTHETIC — ذخیره‌شده در آزمایشگاه':'سناریوی آموزشی — هنوز ذخیره نشده';}
export function navigationTarget(section){return NAV_SECTIONS.some(x=>x[0]===section)?section:'dashboard';}
export function domainById(id){return DOMAINS.find(d=>d.id===id)||null;}
