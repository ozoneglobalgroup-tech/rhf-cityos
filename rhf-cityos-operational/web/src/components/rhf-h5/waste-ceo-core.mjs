/** RHF V7.6 — read-only executive projections over server-scoped synthetic waste lab. */
import {LAB_VERSION,LAB_DOMAINS,FLOWS,AGENTS,validateLabResponse,domainTool,deriveAgents,summarize} from './waste-lab-ui-core.mjs';
export const CEO_VERSION='RHF-WASTE-CEO-V7.6';
export const BOARD_DOMAINS=LAB_DOMAINS.map(x=>({id:x.id,label:x.name,restricted:!!x.restricted}));
export const SCENARIO=[
 {id:'sample-scale',domain:'COLLECTION',title:'کنترل سند توزین',detail:'قبض نمونه: وزن ناخالص ۱۳۰۰، وزن خالی ۸۰۰، وزن خالص ۵۰۰ کیلوگرم',kind:'WEIGHBRIDGE_REVIEW'},
 {id:'sample-fleet',domain:'MAINTENANCE',title:'کاهش توقف ناوگان',detail:'توقف فرضی ۷ ساعت؛ نیازمند علت‌یابی تعمیرات',kind:'FLEET_MAINTENANCE'},
 {id:'sample-contract',domain:'CONTRACT_EVAL',title:'پایش پیمانکار',detail:'۷۸ خدمت از ۱۰۰ خدمت برنامه‌ریزی‌شده؛ تحقق نمونه ۷۸٪',kind:'CONTRACTOR_REVIEW'},
 {id:'sample-quality',domain:'QUALITY',title:'بازرسی کیفیت',detail:'۲۳ بازرسی پذیرفته‌شده از ۳۰ بازرسی؛ قبولی نمونه ۷۶٫۷٪',kind:'INSPECTION_REVIEW'},
 {id:'sample-shift',domain:'SHIFT',title:'پوشش شیفت',detail:'۲۲ نفر موردنیاز، ۱۸ حاضر و ۴ غایب در سناریوی آموزشی',kind:'STAFFING_REVIEW'}
];
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function readExecutiveRows(response,city){
 if(!response)return {phase:'NOT_LOADED',rows:[],message:'داده آزمایشگاه هنوز بارگذاری نشده است.'};
 const x=validateLabResponse(response,city);
 if(x.scope!=='ADMIN'&&x.rows.some(r=>r.domain==='LEGAL'||r.domain==='VIOLATION'||(r.kind==='FLOW'&&r.payload?.processKind==='LEGAL_REVIEW')))throw Error('پاسخ محدود شده دارای داده محرمانه است');
 return {phase:'LOADED',rows:x.rows,canWrite:x.canWrite===true,canSeed:x.scope==='ADMIN'&&x.canWrite===true,restricted:x.canRestricted===true,partial:x.partial===true,scope:x.scope};
}
export function executiveBoard(snapshot){
 if(snapshot.phase!=='LOADED')return {source:'UNAVAILABLE',counts:null,areas:[],findings:[],alerts:[],opportunities:[],kpis:[]};
 const rows=snapshot.rows;
 const rec=rows.filter(r=>r.kind==='RECORD'),flow=rows.filter(r=>r.kind==='FLOW');
 const areas=BOARD_DOMAINS.map(d=>({ ...d, count:d.restricted&&!snapshot.restricted?null:rec.filter(r=>r.domain===d.id).length, locked:d.restricted&&!snapshot.restricted }));
 const findings=deriveAgents(rows);
 const metrics=['COLLECTION','MAINTENANCE','CONTRACT_EVAL','QUALITY','SHIFT'].map(domain=>({domain,...domainTool(domain,rows)}));
 const opportunities=flow.filter(r=>r.payload?.processKind==='VALUE_OPPORTUNITY').map(r=>({id:r.id,title:r.title,status:r.status,metric:r.payload.metric||null,unit:r.payload.unit||null,baseline:finite(r.payload.baseline)?r.payload.baseline:null,target:finite(r.payload.target)?r.payload.target:null}));
 const counts={records:rec.length,flows:flow.length,pending:rows.filter(r=>r.status==='SUBMITTED').length,domains:new Set(rec.map(r=>r.domain)).size,agents:findings.length};
 return {source:'SERVER_SYNTHETIC',counts,areas,findings,alerts:findings.slice(0,6),opportunities,kpis:metrics,partial:snapshot.partial};
}
export function instructionalOverview(){return {source:'UNPERSISTED_EXAMPLE',areas:BOARD_DOMAINS.map(d=>({...d,count:null,locked:!!d.restricted})),alerts:SCENARIO,counts:null,opportunities:[{id:'sample-value',title:'فرضیه کاهش توقف تعمیرات',baseline:12,target:8,metric:'مدت توقف ناوگان',unit:'ساعت',status:'EXAMPLE'}]};}
export function describeSource(board){return board.source==='SERVER_SYNTHETIC'?'داده آزمایشگاهی ذخیره‌شده در RUVOS؛ هیچ کدام میدانی نیستند':board.source==='UNPERSISTED_EXAMPLE'?'پیش‌نمایش آموزشی؛ این اعداد هنوز در پایگاه داده ثبت نشده‌اند':'عدم دریافت داده؛ هیچ آمار فرضی به‌عنوان داده سامانه نمایش داده نمی‌شود';}
export function kpiValue(board,key){return board.counts&&Number.isInteger(board.counts[key])?board.counts[key]:null;}
export function canPropose(board){return board.source==='SERVER_SYNTHETIC';}
export function openTargetForScenario(item){const domain=BOARD_DOMAINS.find(d=>d.id===item.domain);return domain&&!domain.restricted?{tab:'domains',domain:domain.id}:{tab:'flows',kind:FLOWS.find(f=>f[0]===item.kind)?.[0]||'WEIGHBRIDGE_REVIEW'};}
export function agentToDomain(agentId){return AGENTS.find(a=>a[0]===agentId)?.[2]||null;}

export function executiveReportCsv(board){
 if(board?.source!=='SERVER_SYNTHETIC')throw Error('گزارش قابل دریافت فقط از پاسخ معتبر آزمایشگاه ساخته می‌شود');
 const fields=[['گزارش','RHF City OS V7.6'],['ماهیت داده','SYNTHETIC; NOT FIELD VERIFIED'],['ارزش عمومی','NOT VERIFIED'],['رکوردهای آزمایشی',board.counts.records],['فرایندهای نمونه',board.counts.flows],['در انتظار بررسی',board.counts.pending],['هشدارهای قاعده‌محور',board.counts.agents],...board.areas.filter(x=>!x.locked).map(x=>['حوزه '+x.label,x.count])];
 const esc=x=>'"'+String(x??'').replaceAll('"','""')+'"';
 return '\ufeff'+['شاخص,مقدار',...fields.map(([a,b])=>esc(a)+','+esc(b))].join('\r\n')+'\r\n';
}
