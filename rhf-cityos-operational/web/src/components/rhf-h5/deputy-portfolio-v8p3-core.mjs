// RHF City OS V8P3.1 — strictly read-only synthetic deputy dossier portfolio.
// No AI execution, operational dispatch, value verification or cross-tenant aggregation.
import {DOSSIER_KEYS,safeDossierResponse} from './deputy-dossier-schema.mjs';
import {NON_WASTE} from './deputy-multi-core.mjs';

export const PORTFOLIO_VERSION='RHF-DEPUTY-PORTFOLIO-V8P3.1';
export const STATUS_LABELS=Object.freeze({DRAFT:'پیش‌نویس',SUBMITTED:'در انتظار بررسی',REVIEWED:'بررسی داخلی',REJECTED:'رد آزمایشی',FIXTURE:'نمونه آموزشی'});

// Indicators derive only from the stored domain-specific synthetic form.
// A positive indicator is NOT a real-world hazard, completed action or measured value.
const RULES=Object.freeze({
 GREEN:['irrigationIssues','موارد فرضی آبیاری','بررسی کارشناسی فرم آبیاری و ارجاع شواهد'],
 CEMETERY:['pending','درخواست‌های فرضی در انتظار','بازبینی صف درخواست‌های نمونه'],
 MARKETS:['findings','یافته‌های فرضی بازرسی','بازبینی مستندات نمونه میادین'],
 BEAUTIFICATION:['damaged','نقص‌های فرضی','بررسی کارشناسی وضعیت نمونه مبلمان شهری'],
 PUBLIC:['overdue','موارد فرضی معوق','بازبینی برنامه خدمات و درخواست‌های نمونه'],
 ENV:['abnormal','مقادیر غیرعادی فرضی','بازبینی گزارش پایش مصنوعی'],
 FIRE:['issues','موارد فرضی عدم انطباق','بررسی مدارک آموزشی ایمنی؛ وابستگی حقوقی باید احراز شود'],
 FLEET:['stopped','خودروهای متوقف در سناریو','بررسی فرم نمونه وضعیت ناوگان'],
 CONTRACT:['planned','تعهد انجام‌نشده فرضی','بررسی اختلاف برنامه و عملکرد نمونه'],
 STAFF:['pending','درخواست‌های نمونه در انتظار','بررسی پیگیری‌های ستادی آزمایشی']
});

export function syntheticIndicator(row){
 if(!row||!DOSSIER_KEYS.includes(row.orgKey))return null;
 const cfg=RULES[row.orgKey];if(!cfg)return null; // CITIZEN: no adverse conclusion from attendance alone
 const [field,label,proposal]=cfg;
 const n=row.orgKey==='CONTRACT' ? row.fields?.planned-row.fields?.performed : row.fields?.[field];
 if(!Number.isSafeInteger(n)||n<=0)return null;
 return {id:row.id,orgKey:row.orgKey,code:row.code,label,quantity:n,
   proposal,source:'فرم تخصصی SYNTHETIC در PostgreSQL',status:row.status};
}

export function buildPortfolio(response,cityId){
 const data=safeDossierResponse(response,cityId);
 if(!data)throw new Error('پاسخ پرونده‌های معاونت از سرور معتبر، مجاز یا هم‌دامنه نیست');
 // The 200-row API limit is deliberate. Never call subset counts citywide totals.
 const rows=data.rows;
 const indicators=rows.map(syntheticIndicator).filter(Boolean);
 const counts=Object.fromEntries(Object.keys(STATUS_LABELS).map(k=>[k,rows.filter(r=>r.status===k).length]));
 const organizations=NON_WASTE.map(o=>({orgKey:o.id,name:o.name,
   records:rows.filter(r=>r.orgKey===o.id).length,
   pending:rows.filter(r=>r.orgKey===o.id&&r.status==='SUBMITTED').length,
   signals:indicators.filter(r=>r.orgKey===o.id).length,
   legalOrganizationVerified:false}));
 const pending=rows.filter(r=>r.status==='SUBMITTED');
 return {mode:PORTFOLIO_VERSION,synthetic:true,verifiedPublicValue:false,autonomousDispatch:false,
   cityId,rows,indicators,pending,counts,organizations,
   coverage:organizations.filter(o=>o.records>0).length,
   total:rows.length,partial:data.partial===true,canCreate:data.canCreate===true,
   canReview:data.canReview===true,canSeed:data.canSeed===true};
}

export function filterPortfolio(rows,{org='ALL',status='ALL',query=''}={}){
 const q=String(query||'').trim().toLocaleLowerCase('fa');
 return rows.filter(r=>(org==='ALL'||r.orgKey===org)&&(status==='ALL'||r.status===status)&&
  (!q||[r.title,r.code,r.description].some(x=>String(x||'').toLocaleLowerCase('fa').includes(q))));
}
