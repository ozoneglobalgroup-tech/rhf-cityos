/** RHF Waste Organization v9 navigation contract.
 * Status classification is descriptive, not a grant of authority.
 * 'record' -> read only existing waste-suite, subject to server access.
 * 'route' -> navigate to existing City OS module; server retains permission checks.
 * 'planned' -> specification only; no synthetic data or fake actions.
 */
export const BRAND_COPY=Object.freeze({
 platform:'RHF City OS | سیستم‌عامل مدیریت و خلق ارزش شهری',
 municipalityMotto:'حکمرانی داده‌محور، خدمات شهری هوشمند، ارزش پایدار',
 wasteMotto:'مدیریت هوشمند پسماند؛ از جمع‌آوری تا بازیافت ارزش',
 ceoMotto:'تصمیم‌سازی مستند، عملیات پاسخ‌گو، خلق ارزش قابل سنجش',
 demoNotice:'محیط آزمایشی — اطلاعات ساختگی، به معنای عملکرد واقعی یا ارزش عمومی تأییدشده نیست',
 noAccess:'برای مشاهده داده‌های این سازمان، انتصاب و مجوز معتبر لازم است.',
 noValue:'ارزش عمومی تأییدشده: هنوز احراز نشده'
});
const record=(id,title,domain)=>({id,title,kind:'record',domain});
const route=(id,title,target)=>({id,title,kind:'route',target});
const planned=(id,title)=>({id,title,kind:'planned'});
export const WASTE_OS_NAV=Object.freeze([
 {id:'command',title:'فرماندهی مدیرعامل',short:'فرماندهی',icon:'dashboard',items:[
  route('overview','داشبورد تصمیم‌سازی','waste-executive'),planned('ceo-alerts','هشدارها و اولویت‌های بحرانی'),route('ceo-tasks','پیگیری مأموریت‌ها','work'),route('ceo-decisions','فرایندها و تصمیم‌ها','org-portal'),planned('ceo-calendar','تقویم مدیریتی و مصوبات'),planned('ceo-reports','گزارش عملکرد مدیرعامل')]},
 {id:'organization',title:'ساختار و حکمرانی سازمان',short:'سازمان',icon:'building',items:[
  route('org-tree','ساختار معاونت و سازمان پسماند','org'),route('org-appointments','انتصاب مدیرعامل و مدیران','org-iam'),route('org-users','کاربران و دسترسی‌ها','users'),route('org-modules','ماژول‌ها و خدمت‌ها','modules'),planned('org-regions','مناطق، نواحی، سایت‌ها و سرپرستان'),planned('org-approvals','تفویض اختیار و امضای دیجیتال')]},
 {id:'collection',title:'عملیات جمع‌آوری و تنظیف',short:'عملیات',icon:'truck',items:[
  record('collect-wet','جمع‌آوری پسماند تر','COLLECTION'),record('collect-dry','جمع‌آوری خشک و تفکیک در مبدأ','COLLECTION'),record('street-sweep','رفت‌وروب، شست‌وشو و پاکسازی','SHIFT'),record('shift','شیفت‌ها و فعالیت تیم‌های عملیاتی','SHIFT'),planned('collection-routing','مسیریابی و زمان‌بندی جمع‌آوری'),planned('collection-bins','مدیریت مخازن و سرریز'),planned('collection-bulky','پسماند حجیم و ویژه'),route('collection-cases','پرونده‌های خدمات شهری','cases')]},
 {id:'facilities',title:'تأسیسات، پردازش و بازیافت',short:'تأسیسات',icon:'recycle',items:[
  record('weighbridge','باسکول و انطباق وزن','COLLECTION'),record('facility','مراکز و تأسیسات پسماند','FACILITY'),planned('facility-transfer','ایستگاه‌های انتقال و حمل'),planned('facility-sorting','تفکیک، پردازش و بازیافت'),planned('facility-landfill','دفع، دفن و کنترل شیرابه'),planned('facility-market','فروش مواد بازیافتی و ارزش افزوده')]},
 {id:'fleet',title:'ناوگان و نگهداری',short:'ناوگان',icon:'truck',items:[
  record('fleet-assets','سوابق ناوگان و ماشین‌آلات','FLEET'),record('fleet-maintenance','تعمیر و نگهداری','MAINTENANCE'),planned('fleet-fuel','سوخت و انرژی'),planned('fleet-gps','GPS و ردیابی لحظه‌ای'),planned('fleet-availability','آمادگی، خواب و بهره‌وری خودرو'),planned('fleet-inspection','بازرسی فنی تجهیزات')]},
 {id:'hr-hse',title:'سرمایه انسانی، آموزش و HSE',short:'منابع انسانی',icon:'people',items:[
  record('hr-shifts','سوابق شیفت و فعالیت پرسنل','SHIFT'),record('hr-training','آموزش کارکنان و ایمنی','EDUCATION'),planned('hr-attendance','حضور، غیاب و کارکرد'),planned('hr-ppe','تجهیزات حفاظت فردی و HSE'),planned('hr-incidents','حوادث و شبه‌حوادث'),planned('hr-payroll','حقوق، بیمه و ارزیابی عملکرد')]},
 {id:'contractors',title:'قراردادها و پیمانکاران',short:'پیمانکاران',icon:'briefcase',items:[
  record('contract-register','سوابق پیمانکاران','CONTRACTOR'),record('contract-eval','ارزیابی عملکرد پیمانکار','CONTRACT_EVAL'),route('contract-finance','قرارداد و صورت‌وضعیت','finance'),planned('contract-guarantee','ضمانت‌نامه و تعهدات'),planned('contract-sla','SLA و جریمه عملکرد'),planned('contract-tender','مناقصه و رقابت شفاف')]},
 {id:'finance',title:'مالی و اقتصاد پسماند',short:'مالی',icon:'finance',items:[
  route('fin-dashboard','مرکز کنترل مالی','finance-control'),route('fin-work','هزینه عملیات','execution'),planned('fin-budget','بودجه و انحراف هزینه'),planned('fin-income','درآمد فروش مواد و بازیافت'),planned('fin-cost','بهای تمام‌شده هر تن'),planned('fin-payable','مطالبات و صورت‌وضعیت‌ها')]},
 {id:'quality',title:'کنترل کیفیت و نظارت',short:'کیفیت',icon:'shield',items:[
  record('quality-records','سوابق کنترل کیفیت','QUALITY'),record('quality-violations','تخلفات و گزارش‌ها (مجوز ویژه)','VIOLATION'),route('quality-inspections','بازرسی خدمات شهری','inspections'),route('quality-sla','پایش کیفیت و SLA','quality'),planned('quality-audit','ممیزی استاندارد و انطباق')]},
 {id:'citizen',title:'شهروندان و ارتباطات',short:'شهروندی',icon:'people',items:[
  route('citizen137','شکایات و درخواست‌های شهروندی','cases'),record('citizen-education','آموزش و مشارکت شهروندی','EDUCATION'),planned('citizen-campaign','کمپین‌های کاهش تولید پسماند'),planned('citizen-reward','مشوق تفکیک از مبدأ'),planned('citizen-survey','رضایت‌سنجی و ارتباطات عمومی')]},
 {id:'bpms',title:'گردش‌کار و اتوماسیون',short:'BPMS',icon:'workflow',items:[
  route('bpms-org','گردش‌کار سازمانی موجود','org-portal'),route('bpms-appointments','تأیید انتصاب و مجوز','org-iam'),planned('bpms-approval','تصمیم و تأیید مستقل مدیران'),planned('bpms-escalation','ارجاع، مهلت و تصعید'),planned('bpms-temporal','گردش‌کار پایدار Temporal')]},
 {id:'agents',title:'عامل‌های هوشمند تخصصی',short:'ایجنت‌ها',icon:'agent',items:[
  route('agent-operations','عامل راهبری شهری موجود','urban-agent'),route('agent-knowledge','دستیار دانشی و تحلیل شهری','ai-native'),planned('agent-route','عامل بهینه‌سازی مسیر و ناوگان'),planned('agent-anomaly','عامل کشف مغایرت باسکول'),planned('agent-contract','عامل ارزیابی قرارداد'),planned('agent-supervision','نظارت انسانی و حسابرسی تصمیم عامل')]},
 {id:'value',title:'خلق و حکمرانی ارزش',short:'خلق ارزش',icon:'target',items:[
  route('value-discover','فرصت‌های خلق ارزش','urban-value'),route('value-outcomes','پیامدهای ارزش عمومی','outcomes'),planned('value-baseline','خط مبنا و سنجه‌های مستقل'),planned('value-verify','راستی‌آزمایی و تأیید مستقل'),planned('value-share','تسهیم و پایداری ارزش')]},
 {id:'analytics',title:'هوش مدیریتی، نقشه و گزارش',short:'تحلیل',icon:'chart',items:[
  route('analytics-quality','شاخص‌های کیفیت','quality'),route('analytics-map','دوقلوی دیجیتال شهری','digital-twins'),route('analytics-dashboard','داشبورد شهری موجود','dashboard'),planned('analytics-gis','GIS، نقشه مسیر و پراکنش'),planned('analytics-kpi','KPIهای عملیاتی مبتنی بر داده معتبر'),planned('analytics-period','گزارش دوره‌ای و مقایسه مناطق')]},
 {id:'compliance',title:'حقوقی، امنیت و حسابرسی',short:'انطباق',icon:'shield',items:[
  record('legal-cases','سوابق حقوقی (مجوز ویژه)','LEGAL'),route('audit-trail','حسابرسی سامانه','audit'),route('iam','دسترسی و انتصاب سازمانی','org-iam'),planned('compliance-docs','مدارک و مکاتبات حقوقی'),planned('compliance-risk','ریسک، حریم خصوصی و حفظ سوابق')]},
 {id:'settings',title:'تنظیمات و هویت سازمان',short:'تنظیمات',icon:'settings',items:[
  route('settings-users','حساب‌ها و نقش‌ها','users'),route('settings-modules','فعال‌سازی ماژول','modules'),planned('settings-orgbrand','هویت اختصاصی سازمان پسماند'),planned('settings-integrations','اتصال تجهیزات، GIS و IoT'),planned('settings-service','تنظیم SLA و فرم‌ها')]},
]);
export const ALL_WASTE_ITEMS=Object.freeze(WASTE_OS_NAV.flatMap(g=>g.items.map(item=>({...item,groupId:g.id,groupTitle:g.title}))));
export function findWasteItem(id){return ALL_WASTE_ITEMS.find(x=>x.id===id)||null;}
export function wasteCategorySummary(rows){const safe=Array.isArray(rows)?rows:[];return Object.fromEntries(['COLLECTION','FLEET','MAINTENANCE','CONTRACTOR','CONTRACT_EVAL','SHIFT','QUALITY','FACILITY','EDUCATION','LEGAL','VIOLATION'].map(k=>[k,safe.filter(r=>r?.record_kind===k).length]));}
export function validateWasteSnapshot(payload,cityId){
 if(!payload||typeof payload!=='object'||payload.cityId!==cityId||!Array.isArray(payload.rows)||!payload.organizationId)throw new Error('MUNICIPALITY_OR_ORGANIZATION_SCOPE_MISMATCH');
 if(payload.rows.some(r=>!r||typeof r!=='object'||!r.id||!r.record_kind))throw new Error('INVALID_OPERATIONAL_RECORDS');
 return payload;
}
