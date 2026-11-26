// RHF V7.9: pure, read-only summary projections for two independent presentation shells.
// Never interpret example data as persisted, verified, or public value.
export const DEPUTY_VERSION='RHF-DEPUTY-INDEPENDENT-V7.9';
export const DEPUTY_DOMAINS=Object.freeze([
 ['COLLECTION','جمع‌آوری و باسکول'],['FLEET','ناوگان و ماشین‌آلات'],['MAINTENANCE','تعمیرات و توقف'],
 ['CONTRACTOR','پیمانکاران و قراردادها'],['CONTRACT_EVAL','عملکرد پیمانکاران'],
 ['SHIFT','نظافت، شیفت و منابع انسانی'],['QUALITY','کیفیت و شکایات'],
 ['FACILITY','تأسیسات و پردازش'],['EDUCATION','آموزش و مشارکت']
]);
export const DEPUTY_NAV=Object.freeze([
 ['dashboard','داشبورد معاونت'],['organizations','سازمان‌ها و واحدهای تابعه'],
 ['operations','عملیات و خدمات'],['decisions','تصمیم‌ها و پیگیری'],
 ['agents','عامل‌های نظارتی'],['bpms','فرایندها و BPMS'],
 ['value','خلق و حکمرانی ارزش'],['reports','گزارش‌های مدیریتی'],['governance','دسترسی‌ها و حاکمیت']
]);
const count=n=>Number.isSafeInteger(n)&&n>=0?n:null;
export function previewFromLab(projected){
 if(!projected||projected.persisted!==true||projected.mode!=='SERVER_SYNTHETIC')return null;
 const domains=Object.fromEntries(DEPUTY_DOMAINS.map(([id])=>[id,count(projected.domainCounts?.[id])]));
 if(Object.values(domains).some(v=>v===null))return null;
 const records=Object.values(domains).reduce((a,b)=>a+b,0);
 return Object.freeze({source:'ADMIN_SYNTHETIC_PREVIEW',persisted:true,records,flows:count(projected.counts?.flows),pending:count(projected.counts?.pending),domains,verifiedValue:false});
}
export function appointedFromRollup(response){
 if(!response||response.synthetic!==true||response.isolated!==true||response.verifiedPublicValue!==false||response.scope?.positionCode!=='DEPUTY_HEAD')return null;
 const c=response.counts;
 if(!c||!DEPUTY_DOMAINS.every(([id])=>count(c.domains?.[id])!==null))return null;
 const records=DEPUTY_DOMAINS.reduce((n,[id])=>n+c.domains[id],0);
 if(records!==c.records)return null;
 const flows=count(c.flows),pending=count(c.pending);
 if(flows===null||pending===null)return null;
 return Object.freeze({source:'APPOINTMENT_SCOPED_SYNTHETIC',persisted:true,records,flows,pending,domains:Object.fromEntries(DEPUTY_DOMAINS.map(([id])=>[id,c.domains[id]])),verifiedValue:false});
}
export function canOpenDeputy(isSystemAdmin,assignment){return isSystemAdmin===true||assignment?.positionCode==='DEPUTY_HEAD'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assignment.assignmentId||'')}
export function safeDeputyCsv(board){
 if(!board?.persisted||!['ADMIN_SYNTHETIC_PREVIEW','APPOINTMENT_SCOPED_SYNTHETIC'].includes(board.source))throw Error('خروجی فقط از داده محدود و تأییدشده سرور مجاز است');
 if(!DEPUTY_DOMAINS.every(([id])=>count(board.domains?.[id])!==null)||count(board.records)===null||count(board.flows)===null||count(board.pending)===null||DEPUTY_DOMAINS.reduce((n,[id])=>n+board.domains[id],0)!==board.records)throw Error('گزارش تجمیعی ناقص یا ناسازگار است');
 if(board.verifiedValue!==false)throw Error('ادعای تحقق ارزش عمومی نامعتبر است');
 const rows=[['منبع','SYNTHETIC / NOT FIELD VERIFIED'],['حوزه','معاونت خدمات شهری و محیط‌زیست'],['تعداد سوابق مجاز',board.records],['فرایندهای آزمایشی',board.flows??'نامشخص'],['در انتظار بررسی',board.pending??'نامشخص'],['ارزش عمومی','NOT VERIFIED'],...DEPUTY_DOMAINS.map(([id,label])=>[label,board.domains[id]])];
 const q=x=>'"'+String(x??'').replaceAll('"','""')+'"';
 return '\ufeff'+[['شاخص','مقدار'],...rows].map(r=>r.map(q).join(',')).join('\r\n')+'\r\n';
}
