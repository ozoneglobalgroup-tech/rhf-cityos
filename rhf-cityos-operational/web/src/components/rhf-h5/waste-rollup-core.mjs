export const ROLLUP_VERSION='RHF-WASTE-ROLE-ROLLUP-V7.7';
export const ROLLUP_DOMAINS=Object.freeze([['COLLECTION','جمع‌آوری و باسکول'],['FLEET','ناوگان'],['MAINTENANCE','تعمیرات'],['CONTRACTOR','پیمانکاران'],['CONTRACT_EVAL','عملکرد پیمانکاران'],['SHIFT','شیفت و تنظیف'],['QUALITY','بازرسی و کیفیت'],['FACILITY','تأسیسات'],['EDUCATION','آموزش']]);
export function validatedRollup(x,assignment,city){
 if(!x||x.mode!==ROLLUP_VERSION||x.synthetic!==true||x.isolated!==true||x.verifiedPublicValue!==false||x.autonomousDispatch!==false||x.independentlyVerified!==false)throw Error('پاسخ گزارش فاقد امضای معتبر آزمایشگاهی است');
 if(x.scope?.municipalityId!==city||x.scope?.positionCode!==assignment?.positionCode)throw Error('محدوده گزارش با سمت مجاز تطابق ندارد');
 if(!['MAYOR','DEPUTY_HEAD','ORG_CEO'].includes(x.scope.positionCode))throw Error('سمت مشاهده‌کننده گزارش مجاز نیست');
 const c=x.counts;
 if(!c||!c.domains||Object.keys(c.domains).sort().join('|')!==ROLLUP_DOMAINS.map(d=>d[0]).sort().join('|'))throw Error('ماتریس حوزه‌ها ناقص یا آلوده به حوزه محرمانه است');
 for(const k of ['records','flows','pending','internallyReviewed',...ROLLUP_DOMAINS.map(d=>d[0])]){
  const n=k in c?c[k]:c.domains[k];if(!Number.isSafeInteger(n)||n<0)throw Error('آمار تجمیعی معتبر نیست');
 }
 if(Object.values(c.domains).reduce((a,b)=>a+b,0)!==c.records)throw Error('تعداد تجمیعی با دفاتر سازگار نیست');
 return x;
}
export function reportCsv(x){
 if(!x||x.mode!==ROLLUP_VERSION||x.synthetic!==true)throw Error('خروجی بدون داده مجاز ممکن نیست');
 const lines=[['گزارش','RHF City OS / V7.7'],['منبع','SYNTHETIC; NOT FIELD VERIFIED'],['سمت',x.scope.positionCode],['محدوده','فقط داده آزمایشگاهی در حوزه مجاز'],['ارزش عمومی','NOT VERIFIED'],['سوابق',x.counts.records],['فرایندها',x.counts.flows],['در انتظار بررسی',x.counts.pending],...ROLLUP_DOMAINS.map(([id,n])=>[n,x.counts.domains[id]])];
 const esc=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 return '\ufeff'+['شاخص,مقدار',...lines.map(l=>l.map(esc).join(','))].join('\r\n')+'\r\n';
}
