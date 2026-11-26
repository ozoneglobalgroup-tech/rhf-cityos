// RHF City OS V8P6.4: worldwide benchmarks and the non-certifying delivery gates.
// Never infer a production-ready service, verified value, or autonomous agent from a green infrastructure check.
export const GLOBAL_READINESS_VERSION='RHF-GLOBAL-EXCELLENCE-V8P6.4';
export const RESEARCH_REVIEWED_AT='2026-11-12';
export const RELEASE_SOURCE='DESIGN_REFERENCE_NOT_MUNICIPAL_DATA';
export const GATE_STATUS=Object.freeze({REVIEW:'REVIEW_REQUIRED',UNKNOWN:'NOT_EVIDENCED'});
export const GLOBAL_REFERENCES=Object.freeze([
 {id:'SINGAPORE',city:'سنگاپور',method:'یکپارچه‌سازی عملیات منطقه‌ای و دوقلوی دیجیتال',apply:'یکپارچه‌سازی جریان عملیات و حسگرها در RUVOS؛ نه فقط افزودن نقشه',source:'GovTech Singapore — Open Digital Platform',url:'https://www.tech.gov.sg/products-and-services/for-businesses/smart-city-tech/',domain:'OPERATIONS'},
 {id:'SEOUL',city:'سئول',method:'S-Map، تلفیق جغرافیا و داده اجرایی',apply:'موقعیت، دارایی، سازمان و شواهد را به پرونده تصمیم پیوند دهیم',source:'Seoul Metropolitan Government — Spatial Data',url:'https://english.seoul.go.kr/policy/smart-city/spatial-data/',domain:'TWIN'},
 {id:'HELSINKI',city:'هلسینکی',method:'اطلس انرژی و اقلیم متصل به مدل سه‌بعدی شهر',apply:'مدل تخصصی قابل توضیح و همراه مفروضات و دامنه عدم‌قطعیت بسازیم',source:'City of Helsinki — Helsinki 3D',url:'https://www.hel.fi/en/decision-making/information-on-helsinki/maps-and-geospatial-data/helsinki-3d',domain:'TWIN'},
 {id:'EU_LDT',city:'اتحادیه اروپا',method:'جعبه‌ابزار متن‌باز دوقلوهای دیجیتال محلی (ژوئن ۲۰۲۶)',apply:'قبل از ساخت سرویس جدید، اجزای قابل استفاده مجدد و interoperable را ارزیابی کنیم',source:'Interoperable Europe — LDT Toolbox',url:'https://interoperable-europe.ec.europa.eu/collection/ldttoolbox/solutions-catalogue',domain:'INTEROPERABILITY'},
 {id:'OGC_ST2',city:'استاندارد جهانی OGC',method:'SensorThings API 2.0 (نوامبر ۲۰۲۶)',apply:'درگاه سازگار با استاندارد برای مشاهده حسگر و متادیتای سنجش، نه اتصال زنده ساختگی',source:'OGC SensorThings API 2.0',url:'https://docs.ogc.org/is/23-019/23-019.html',domain:'INTEROPERABILITY'},
 {id:'JAPAN_PLATEAU',city:'ژاپن',method:'Project PLATEAU Vision 2026؛ مدل سه‌بعدی باز و معنایی شهر',apply:'CityGML و نقشه دارایی‌ها، قابلیت به‌روزرسانی و منشأ هندسه را در دوقلوی شیراز ارزیابی کنیم',source:'Japan MLIT — Project PLATEAU',url:'https://www.mlit.go.jp/plateau/en/',domain:'TWIN'},
 {id:'NYC311',city:'نیویورک',method:'311؛ پیگیری درخواست شهروند و مشاهده وضعیت در نقشه',apply:'تیکت شهروند را به مکان، مالک رسیدگی، زمان‌بندی و نتیجه قابل پیگیری پیوند دهیم',source:'NYC311 — Service Request Status',url:'https://portal.311.nyc.gov/check-status/',domain:'OPERATIONS'},
 {id:'LGA',city:'دولت محلی بریتانیا',method:'راهنمای ۲۰۲۶ پذیرش ایجنت با مسئولیت و مجوز مرحله‌ای',apply:'تعریف سطح عاملیت، مالک خدمت و تأیید رسمی برای عملیات سازمانی',source:'Local Government Association — Agentic AI Playbook',url:'https://www.local.gov.uk/publications/playbook-agentic-ai-local-government',domain:'GOVERNANCE'},
 {id:'OWASP',city:'استاندارد امنیت ایجنت',method:'راهنمای امنیت ایجنت‌ها، نسخه دوم (نوامبر ۲۰۲۶)',apply:'تست هویت ایجنت، مجوز ابزار، prompt injection و دفاع زمان اجرا',source:'OWASP — Securing Agentic Applications V2',url:'https://genai.owasp.org/resource/securing-agentic-applications-v2/',domain:'GOVERNANCE'},
 {id:'ISO',city:'شاخص‌های جهانی',method:'ISO 37120/37122/37124: شاخص‌های خدمات و شهر هوشمند',apply:'تعریف شاخص با مخرج، منبع، خط مبنا و ارزیابی مستقل؛ بدون ادعای ارزش بی‌سند',source:'ISO — 37124',url:'https://www.iso.org/standard/80290.html',domain:'VALUE'},
 {id:'GOVUX',city:'خدمات دیجیتال دولت بریتانیا',method:'خدمت کامل و قابل استفاده به‌جای صفحات زیاد',apply:'یک مسیر تصمیم از مسئله تا گام بعدی با UX سبک و دسترس‌پذیر',source:'GOV.UK — Government Design Principles',url:'https://www.gov.uk/guidance/government-design-principles',domain:'UX'}
].map(x=>Object.freeze(x)));
export const DELIVERY_GATES=Object.freeze([
 {id:'UX',title:'پذیرش UX و معرفی کامل',phase:'V8P6.4',need:'آزمون مرورگر با معاون، سازمان‌ها و کاربران دارای نیازهای دسترس‌پذیری',proof:['UAT مرورگر امضاشده','مسیر کامل مسئله تا تصمیم','آزمایش در موبایل، صفحه‌کلید و RTL'],route:'presentation',refs:['GOVUX']},
 {id:'DATA',title:'اعتماد و تبادل‌پذیری داده',phase:'V8P6.5',need:'اتصال منابع رسمی و پایش کیفیت، پوشش، تازگی و منشأ داده',proof:['اتصال حداقل یک منبع واقعی با مجوز','شناسنامه و SLA هر منبع','کنترل محدوده، حریم خصوصی و تبار داده'],route:'portfolio',refs:['EU_LDT','OGC_ST2']},
 {id:'AGENTS',title:'ایجنت‌های تخصصی کارآمد',phase:'V8P6.6',need:'آزمون انتهابه‌انتها برای ایجنت هر حوزه قبل از فعال‌سازی',proof:['داده قابل انتساب و نتیجه قابل توضیح','مجوز ابزار و سطح عاملیت','آزمون خطا، سوگیری و حمله به ایجنت'],route:'agents',refs:['LGA','OWASP']},
 {id:'EXEC',title:'اجرای کنترل‌شده واقعی',phase:'V8P6.7',need:'پرونده، مأموریت، مجوز انسانی، Temporal و رویداد حسابرسی',proof:['آزمایش با دو نقش مستقل','تداوم پس از قطع سرویس','عدم امکان اجرای بدون مجوز'],route:'decisions',refs:['LGA','OWASP']},
 {id:'TWIN',title:'مدل کالیبره و تصمیم‌پذیر',phase:'V8P6.8',need:'کالیبراسیون مدل و اعتبارسنجی بر مبنای مشاهدات و داده تاریخی',proof:['داده تاریخ‌دار با منشأ','پیش‌بینی روی داده کنارگذاشته‌شده','عدم‌قطعیت، حساسیت و مقایسه سناریو'],route:'twin',refs:['SINGAPORE','SEOUL','HELSINKI']},
 {id:'VALUE',title:'سنجش ارزش شهری مستقل',phase:'V8P6.9',need:'خط مبنا، اقدام، مشاهده بعدی و بازبینی مستقل',proof:['شاخص عملیاتی با تعریف و مخرج','شواهد قبل و بعد','بازبین مستقل و وضعیت ارزش تأییدشده'],route:'values',refs:['ISO']},
 {id:'PILOT',title:'پایلوت و احراز آمادگی تولید',phase:'V8P7.0',need:'امنیت و پایداری، بازیابی، آموزش و پذیرش عملیاتی در شهرداری',proof:['آزمون نفوذ و امنیت زنجیره تأمین','بازیابی و سناریوی حادثه','پایلوت کنترل‌شده و پذیرش مالک خدمت'],route:'governance',refs:['GOVUX','OWASP']}
].map(g=>Object.freeze({...g,proof:Object.freeze(g.proof),refs:Object.freeze(g.refs)})));
const CONNECTED=new Set(['LEDGER_CONNECTED','READ_ONLY_READY','SERVICE_CONNECTED']);
export function infrastructureObservation(runtime,missions){
 const safe=runtime&&typeof runtime==='object'&&!Array.isArray(runtime)?runtime:{};
 const services=['missions','graph','temporal'];
 const detail=services.map(id=>({id,connected:CONNECTED.has(safe[id]?.state),state:typeof safe[id]?.state==='string'?safe[id].state:'UNAVAILABLE'}));
 const ledgerBound=missions!==null&&missions!==undefined&&Array.isArray(missions?.rows)&&typeof missions?.scope==='string';
 return Object.freeze({source:'SCOPED_RUNTIME_READ_ONLY',connectivityChecked:detail.filter(x=>x.connected).length,connectivityTotal:3,serviceStates:detail,ledgerResponseAvailable:ledgerBound,agentActionsVerified:false,municipalOutcomesVerified:false,productionApproved:false});
}
export function gateAssessment(gateId,{runtime,missions}={}){
 const gate=DELIVERY_GATES.find(x=>x.id===gateId);
 if(!gate)throw Error('UNKNOWN_READINESS_GATE');
 const observed=infrastructureObservation(runtime,missions);
 const signal=gateId==='AGENTS'||gateId==='EXEC' ? `${observed.connectivityChecked}/3 سرویس در دسترس؛ نه تأیید اجرای ایجنت` :gateId==='TWIN'?'دوقلوی ثبت‌شده، مدل کالیبره یا شبیه‌سازی معتبر را ثابت نمی‌کند':'برای این مرحله شواهد پذیرش مستقل ثبت نشده است';
 return Object.freeze({gateId:gate.id,status:GATE_STATUS.UNKNOWN,reviewRequired:true,proofRequired:gate.proof.length,verifiedProof:0,signal,readinessCertified:false,source:RELEASE_SOURCE});
}
export function readinessSummary(context={}){
 const rows=DELIVERY_GATES.map(g=>gateAssessment(g.id,context));
 return Object.freeze({total:rows.length,certified:0,open:rows.length,rows,source:RELEASE_SOURCE,productionReady:false});
}
const clean=(s,max=160)=>typeof s==='string'?s.replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,max):'';
export function executiveReadinessMemo({cityName,gateId,runtime,missions}){
 const gate=DELIVERY_GATES.find(g=>g.id===gateId);if(!gate)throw Error('UNKNOWN_READINESS_GATE');
 const status=gateAssessment(gateId,{runtime,missions});
 return [`RHF City OS — Global Excellence / V8P6.4`,`شهرداری: ${clean(cityName)||'جاری'}`,`مرحله: ${gate.phase} — ${gate.title}`,`وضعیت: ${status.status}؛ بدون تأیید تولید یا منفعت عمومی`,`نیاز: ${gate.need}`,`شواهد لازم:`,...gate.proof.map((p,i)=>`${i+1}. ${p}`),`وضعیت عملیاتی: ${status.signal}`,`بررسی جهانی: ${gate.refs.map(id=>GLOBAL_REFERENCES.find(x=>x.id===id)?.source).filter(Boolean).join('؛ ')}`,`این برگه گزارشی برای برنامه‌ریزی است؛ ایجاد مأموریت، صدور مجوز یا تأیید مستقل انجام نمی‌دهد.`].join('\n');
}
