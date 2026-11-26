// DV32UX42: presentation content only. Never grants, infers, or impersonates a server role.
export const DEMO_DESKS = Object.freeze({
  mayor: Object.freeze({icon:'🏛️',caption:'حکمرانی شهری',mission:'چه ارزشی برای شهر ایجاد شد؟',story:'شهردار مسئله‌های راهبردی، تخصیص منابع و نتایج قابل‌سنجش را در یک تصویر می‌بیند.',actions:['دیدن تصویر کلان شهر و اولویت‌ها','بررسی برنامه‌ها و مصوبات','پیگیری تحقق ارزش عمومی'],account:'حساب شهردار با انتصاب معتبر MAYOR'}),
  deputy: Object.freeze({icon:'🌳',caption:'راهبری خدمات شهری',mission:'چه مشکلی، کجا، چرا و اقدام بعدی چیست؟',story:'معاون، سازمان‌های تابع و مأموریت‌ها را به‌صورت یک زنجیره تصمیم و پیگیری هدایت می‌کند.',actions:['پایش ۱۲ حوزه خدمات شهری','ارجاع مأموریت و نظارت بر پیشرفت','تحلیل ایجنت و سنجش نتیجه'],account:'uat_deputy_01 · DEPUTY_HEAD'}),
  waste: Object.freeze({icon:'♻️',caption:'اجرای هوشمند پسماند',mission:'چگونه از جمع‌آوری به بازیافت ارزش برسیم؟',story:'مدیرعامل پسماند عملیات، منابع، حوادث و فرصت‌های ارزش‌آفرینی را در حوزه سازمان خود مدیریت می‌کند.',actions:['پایش عملیات جمع‌آوری و تفکیک','هماهنگی ناوگان، پیمانکار و منابع','تأیید اقدامات مجاز و گزارش شواهد'],account:'shiraz.waste.ceo · ORG_CEO'}),
});
export const DEMO_SEQUENCE = Object.freeze([
  Object.freeze({number:1,title:'مسئله شهر',description:'مسئله و نیاز قابل انتساب ثبت می‌شود'}),
  Object.freeze({number:2,title:'تصمیم معاونت',description:'سازمان مسئول، ظرفیت و اقدام مجاز مشخص می‌شود'}),
  Object.freeze({number:3,title:'اجرای سازمان',description:'عملیات با مجوز انسانی، شواهد و حسابرسی انجام می‌شود'}),
  Object.freeze({number:4,title:'ارزش شهری',description:'نتیجه مستقل سنجیده و به شهردار گزارش می‌شود'}),
]);
export const DEMO_ACCOUNTS = Object.freeze([
  Object.freeze({username:'admin',purpose:'راهبری معرفی و تنظیمات فنی',status:'نمایش همه سناریوها؛ بدون اختیار اجرایی خودکار'}),
  Object.freeze({username:'uat_reviewer_02',purpose:'مدیر/بازبین شهرداری',status:'MUNICIPAL_ADMIN، نه شهردار منصوب'}),
  Object.freeze({username:'uat_deputy_01',purpose:'معاون خدمات شهری',status:'DEPUTY / DEPUTY_HEAD'}),
  Object.freeze({username:'shiraz.waste.ceo',purpose:'مدیرعامل پسماند',status:'DIRECTOR / ORG_CEO؛ اعتبار مجوز در API'}),
  Object.freeze({username:'uat_real_04',purpose:'کاربر بدون سمت تأییدشده',status:'میزکار مدیریتی مسدود'}),
]);
export function deskInfo(key){return DEMO_DESKS[key] || {icon:'🏙️',caption:'سیستم‌عامل شهری',mission:'از مأموریت تا خلق ارزش',story:'شرح نقش این میزکار',actions:[],account:'نیازمند حساب مستقل'};}
export function presentationStatus({evaluated,citySelected,authorized}){
 if(!citySelected)return 'SELECT_CITY';
 if(!evaluated)return 'UNVERIFIED';
 return authorized===true?'AUTHORIZED':'DENIED';
}
// Server matrix decisions MUST be the sole source of enter permission.
export function canEnterDesk({evaluated,citySelected,authorized,loading}){
 return !loading && presentationStatus({evaluated,citySelected,authorized})==='AUTHORIZED';
}
