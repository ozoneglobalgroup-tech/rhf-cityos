// RHF V7.10: explicitly synthetic, logical catalog. It is NOT a registry of actual Shiraz entities.
export const VERSION='RHF-DEPUTY-MULTIORG-V7.10';
export const ORGANIZATIONS=Object.freeze([
 ['WASTE','سازمان مدیریت پسماند','جمع‌آوری، بازیافت، باسکول و عملیات پسماند','باسکول و ناوگان',500,'کیلوگرم','سند نمونه توزین'],
 ['GREEN','فضای سبز و باغات','نگهداشت درختان، آبیاری و باغات','درختان نیازمند رسیدگی',9,'درخت','بازدید فرضی فضای سبز'],
 ['CEMETERY','سازمان مدیریت آرامستان‌ها','خدمات آرامستان، زیرساخت و نگهداشت','درخواست خدمات',7,'درخواست','بازدید فرضی آرامستان'],
 ['MARKETS','سازمان میادین و ساماندهی مشاغل','میادین میوه و تره‌بار و نظارت بر مشاغل','موارد نیازمند اصلاح',6,'مورد','بازرسی فرضی میدان'],
 ['BEAUTIFICATION','زیباسازی و منظر شهری','نورپردازی، مبلمان و نمای شهری','نقایص منظر',4,'مورد','بازدید فرضی مبلمان شهری'],
 ['PUBLIC','خدمات عمومی و نظافت','پاکسازی معابر و خدمات روزانه','درخواست باز',12,'مورد','درخواست فرضی پاکسازی'],
 ['ENV','محیط‌زیست شهری','کنترل آلودگی، پایش محیطی و شکایات','گزارش پایش',8,'گزارش','پایش فرضی محیط‌زیست'],
 ['FIRE','ایمنی و آتش‌نشانی مشروط','ایمنی، پیشگیری و آمادگی؛ در صورت تابعه بودن','نقص ایمنی',3,'مورد','بازرسی فرضی ایمنی'],
 ['FLEET','ناوگان و ماشین‌آلات','آمادگی خودرو و تعمیرات خدمات شهری','ساعت توقف',7,'ساعت','توقف فرضی ناوگان'],
 ['CONTRACT','نظارت پیمانکاران','تعهدات، سطح خدمت و ارزیابی عملکرد','تعهد انجام‌نشده',22,'درصد','نظارت فرضی قرارداد'],
 ['CITIZEN','آموزش و مشارکت شهروندی','آموزش، مشارکت و گزارش شهروندان','مشارکت‌کننده',65,'نفر','نشست فرضی آموزشی'],
 ['STAFF','برنامه‌ریزی و پشتیبانی ستادی','منابع، بودجه، طرح‌ها و تصمیم‌های مشترک','مورد پیگیری',5,'مورد','درخواست فرضی پشتیبانی']
].map(([id,name,mission,metric,example,unit,form])=>Object.freeze({id,name,mission,metric,example,unit,form,logical:true})));
export const NON_WASTE=Object.freeze(ORGANIZATIONS.filter(o=>o.id!=='WASTE'));
export const NAV=Object.freeze([['dashboard','میزکار معاون'],['organizations','سازمان‌ها و واحدها'],['operations','خدمات و فرم‌ها'],['agents','عامل‌های نظارتی'],['bpms','فرایندها و تصمیم‌ها'],['value','فرصت‌های خلق ارزش'],['reports','گزارش‌ها و خروجی‌ها'],['governance','حاکمیت و دسترسی']]);
export const CATALOG_IDS=Object.freeze(ORGANIZATIONS.map(o=>o.id));
export const AGENTS=Object.freeze(NON_WASTE.map(o=>({id:`AGENT_${o.id}`,org:o.id,title:`عامل پایش ${o.name}`,description:`بررسی رکوردهای آزمایشی «${o.metric}» و پیشنهاد بازبینی انسانی`})));
export const demoSeeds=()=>NON_WASTE.flatMap((o,i)=>[
 {code:`RHF710-${o.id}-A`,orgKey:o.id,kind:'RECORD',title:o.form,description:`سناریوی مصنوعی ${o.name}؛ نیازمند کنترل مسئول واحد، نه رخداد میدانی.`,value:o.example,unit:o.unit},
 {code:`RHF710-${o.id}-V`,orgKey:o.id,kind:'VALUE',title:`فرصت بررسی ${o.metric}`,description:`فرضیه آزمایشی با خط مبنای ${o.example} ${o.unit} و هدف کاهش یا بهبود؛ فاقد شواهد مستقل.`,value:o.example,unit:o.unit}
 ]);
const isNum=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e9;
export function validateItem(b){
 if(!b||typeof b!=='object'||Array.isArray(b))throw Error('درخواست معتبر نیست');
 if(!NON_WASTE.some(o=>o.id===b.orgKey))throw Error('سازمان در کاتالوگ آزمایشی نیست');
 if(!['RECORD','FLOW','VALUE'].includes(b.kind))throw Error('نوع درخواست معتبر نیست');
 if(typeof b.title!=='string'||b.title.trim().length<8||b.title.length>140)throw Error('عنوان باید ۸ تا ۱۴۰ نویسه باشد');
 if(typeof b.description!=='string'||b.description.trim().length<30||b.description.length>1500)throw Error('شرح باید ۳۰ تا ۱۵۰۰ نویسه باشد');
 if(!isNum(b.value))throw Error('عدد نمونه نامعتبر است');
 const o=NON_WASTE.find(x=>x.id===b.orgKey);
 if(b.unit!==o.unit)throw Error('واحد شاخص با حوزه سازگار نیست');
 return {orgKey:o.id,kind:b.kind,title:b.title.trim(),description:b.description.trim(),value:b.value,unit:o.unit};
}
export function validateResponse(raw){
 if(!raw||raw.mode!=='DEPUTY_SYNTHETIC_V710'||raw.synthetic!==true||raw.isolated!==true||raw.verifiedPublicValue!==false||raw.autonomousDispatch!==false||!Array.isArray(raw.rows)||raw.rows.length>250)return null;
 if(raw.rows.some(r=>!NON_WASTE.some(o=>o.id===r.orgKey)||!['RECORD','FLOW','VALUE'].includes(r.kind)||!['FIXTURE','SUBMITTED','REVIEWED','REJECTED'].includes(r.status)||typeof r.title!=='string'||!isNum(r.value)))return null;
 return raw;
}
export function summary(rows){const valid=Array.isArray(rows)?rows:[];return {records:valid.filter(r=>r.kind==='RECORD').length,flows:valid.filter(r=>r.kind==='FLOW').length,values:valid.filter(r=>r.kind==='VALUE').length,pending:valid.filter(r=>r.status==='SUBMITTED').length,organizations:new Set(valid.map(r=>r.orgKey)).size};}
export function findings(rows){const valid=Array.isArray(rows)?rows:[];return NON_WASTE.map(o=>{const selected=valid.filter(r=>r.orgKey===o.id&&r.kind==='RECORD');const flagged=selected.filter(r=>r.value>0);return {org:o.id,title:`بررسی ${o.metric}`,count:flagged.length,sourceIds:flagged.map(r=>r.id).filter(Boolean),action:'پیشنهاد پیگیری کارشناسی',description:flagged.length?`${flagged.length} رکورد آزمایشی دارای عدد بیشتر از صفر؛ نشانه وقوع میدانی نیست.`:'رکورد معتبر برای تحلیل این حوزه دریافت نشده است.'};});}
export function valueCandidates(rows){return Array.isArray(rows)?rows.filter(r=>r.kind==='VALUE').map(r=>({id:r.id,orgKey:r.orgKey,title:r.title,baseline:r.value,unit:r.unit,verified:false,status:r.status})):[];}
export function csv(rows){const safe=Array.isArray(rows)?rows:[];const quote=x=>'"'+String(x??'').replaceAll('"','""').replace(/^[=+@\-\t\r]/,'\u200b$&')+'"';return '\ufeff'+[['نوع','حوزه','عنوان','عدد آزمایشی','واحد','وضعیت','تأیید ارزش'],...safe.map(r=>[r.kind,NON_WASTE.find(o=>o.id===r.orgKey)?.name||'',r.title,r.value,r.unit,r.status,'خیر'])].map(a=>a.map(quote).join(',')).join('\r\n');}
