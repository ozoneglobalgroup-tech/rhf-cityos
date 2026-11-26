// RHF V8P3.5: synthetic training scenario library. No field evidence, verified capacity or public value.
// The library does not create records unless an authorized user explicitly initiates the existing V8P2 POST.
import {DOSSIER_KEYS, validateFields, validateEvidenceRefs, safeDossierResponse} from './deputy-dossier-schema.mjs';
export const SCENARIO_VERSION='RHF-V8P35-SCENARIO-STUDIO';
const entry=(id,orgKey,title,fields,status='DRAFT')=>({id,orgKey,title,fields,status});
const scenario=(id,title,category,description,question,records)=>({id,title,category,description,question,records});
export const DEMO_SCENARIOS=Object.freeze([
 scenario('S01','تنش آبیاری باغات و ناوگان','منابع و فضای سبز','پیگیری فرضی اختلال آبیاری، خدمات عمومی و وضعیت توقف تجهیزات؛ ظرفیت آزاد یا اختیار تخصیص احراز نشده است.','آیا هماهنگی بین فضای سبز و ناوگان نیازمند بررسی است؟',[
  entry('G1','GREEN','بازدید مصنوعی آبیاری باغات قصردشت',{siteCode:'DEMO-PARK-QASRDASHT',zone:'منطقه باغات نمونه',treesChecked:36,irrigationIssues:9},'SUBMITTED'),
  entry('F1','FLEET','وضعیت فرضی ماشین‌آلات فضای سبز',{fleetGroup:'DEMO-FLEET-GREEN',vehicles:9,stopped:4,downtimeHours:31},'SUBMITTED'),
  entry('P1','PUBLIC','معوقات فرضی پاسخ خدمات عمومی',{zone:'منطقه ۶ نمونه',serviceType:'خدمات پشتیبان',requests:26,overdue:8},'SUBMITTED')]),
 scenario('S02','عقب‌افتادگی نظافت و پیمانکار','SLA و پیمانکار','بررسی نمونه تعهدات پیمانکار، درخواست‌های معوق و آمادگی اداری بدون صدور اخطار یا حکم قراردادی.','آیا تأخیر فرضی خدمت نیازمند بازبینی قرارداد است؟',[
  entry('P2','PUBLIC','درخواست‌های نظافت معوق منطقه نمونه',{zone:'منطقه ۱ نمونه',serviceType:'نظافت معابر',requests:45,overdue:16},'SUBMITTED'),
  entry('C2','CONTRACT','برنامه و عملکرد فرضی پیمان خدمات',{contractCode:'DEMO-CONTRACT-102',service:'پاکسازی معابر',planned:120,performed:73}),
  entry('S2','STAFF','گردش مکاتبات پشتیبانی نظارت',{department:'DEMO-STAFF-OPS',process:'پیگیری تأییدهای اداری',requests:21,pending:12})]),
 scenario('S03','ایمنی منظر و تجهیزات','ایمنی و زیباسازی','ثبت مصنوعی نقص‌های مبلمان، کنترل ایمنی و توقف ناوگان؛ این داده به معنی حادثه واقعی نیست.','کدام نقص‌ها باید پیش از صدور کار بررسی تخصصی شوند؟',[
  entry('B3','BEAUTIFICATION','نقص‌های نمای شهری در گذر نمونه',{zone:'منطقه ۳ نمونه',assetType:'مبلمان و روشنایی',assetsChecked:44,damaged:12},'SUBMITTED'),
  entry('I3','FIRE','کنترل فرضی ایمنی تأسیسات',{facility:'DEMO-FACILITY-03',inspectionType:'چک‌لیست ایمنی محوطه',checks:30,issues:8}),
  entry('F3','FLEET','ثبت وضعیت ناوگان پشتیبان',{fleetGroup:'DEMO-FLEET-URBAN',vehicles:6,stopped:5,downtimeHours:26},'SUBMITTED')]),
 scenario('S04','پایش میادین و محیط‌زیست','نظارت محیطی','تمرین داده‌های بازرسی میادین و نمونه‌برداری محیطی؛ فاقد گزارش واقعی آلودگی یا تخلف است.','آیا یافته‌های دو حوزه نیازمند بررسی مشترک هستند؟',[
  entry('M4','MARKETS','بازرسی فرضی غرف میوه و تره‌بار',{siteCode:'DEMO-MARKET-04',visitType:'بازدید نمونه',boothsChecked:65,findings:9},'SUBMITTED'),
  entry('E4','ENV','پایش مصنوعی شاخص محیطی',{station:'DEMO-STATION-04',parameter:'شاخص محیطی تمرینی',samples:32,abnormal:6}),
  entry('P4','PUBLIC','گزارش نمونه خدمت در محدوده بازار',{zone:'حوزه بازار نمونه',serviceType:'شست‌وشوی معابر',requests:24,overdue:5},'SUBMITTED')]),
 scenario('S05','آرامستان و پاسخ به شهروندان','خدمت شهروندی','تمرین مدیریت صف درخواست، ظرفیت پشتیبانی و آموزش شهروندان بدون اتصال به پرونده شهروند واقعی.','آیا فرایند پاسخ‌گویی و اطلاع‌رسانی نیازمند اصلاح است؟',[
  entry('C5','CEMETERY','درخواست‌های آزمایشی آرامستان',{siteCode:'DEMO-CEMETERY-05',serviceType:'راهنمایی خدمات',requests:39,pending:17},'SUBMITTED'),
  entry('S5','STAFF','پرونده‌های آزمایشی پشتیبانی',{department:'DEMO-OFFICE-05',process:'پاسخ اداری',requests:26,pending:11}),
  entry('Z5','CITIZEN','جلسات فرضی آموزش و راهنمایی',{zone:'حوزه خدمات شهروندی',topic:'راهنمایی خدمات',sessions:6,participants:164})]),
 scenario('S06','بهبود مشترک خدمت در منطقه','هماهنگی بین‌سازمانی','سناریوی مصنوعی ترکیبی بین فضای سبز، زیباسازی، قرارداد و ناوگان؛ نسبت‌های واحدهای مختلف تجمیع نمی‌شوند.','چه مواردی باید پیش از بررسی ظرفیت به مسئولان ارجاع شوند؟',[
  entry('G6','GREEN','پایش مصنوعی بوستان منطقه نمونه',{siteCode:'DEMO-GREEN-06',zone:'منطقه ۹ نمونه',treesChecked:58,irrigationIssues:3},'SUBMITTED'),
  entry('B6','BEAUTIFICATION','کنترل نمونه اجزای منظر',{zone:'منطقه ۹ نمونه',assetType:'تابلو و مبلمان',assetsChecked:38,damaged:7},'SUBMITTED'),
  entry('C6','CONTRACT','عملکرد فرضی قرارداد مشترک',{contractCode:'DEMO-CONT-06',service:'نگهداشت محوطه',planned:58,performed:41}),
  entry('F6','FLEET','ناوگان فرضی چندمنظوره',{fleetGroup:'DEMO-FLEET-MIXED',vehicles:11,stopped:2,downtimeHours:12},'SUBMITTED')]),
 scenario('S07','هشدار محیطی و مشارکت','پیشگیری و آموزش','سناریوی تمرینی پایش محیط‌زیست، کنترل‌های ایمنی و اطلاع‌رسانی شهروندی؛ هیچ هشدار عمومی واقعی صادر نمی‌شود.','آیا داده‌های فرضی برای طرح بررسی تخصصی کافی‌اند؟',[
  entry('E7','ENV','مقادیر تمرینی ایستگاه نمونه',{station:'DEMO-ENV-STATION07',parameter:'شاخص مصنوعی کیفیت',samples:42,abnormal:15},'SUBMITTED'),
  entry('I7','FIRE','بازرسی تمرینی پایانه خدماتی',{facility:'DEMO-FACILITY-07',inspectionType:'بازدید ایمنی آموزشی',checks:23,issues:3}),
  entry('Z7','CITIZEN','آموزش فرضی پیشگیری محیطی',{zone:'منطقه ۷ نمونه',topic:'آموزش کاهش مخاطرات',sessions:9,participants:212})]),
 scenario('S08','تأخیر تدارکات و میادین','پشتیبانی و بازار','نمونه تأخیر تعهدات خدمات، درخواست‌های ستادی و بازرسی میادین؛ بدون تأیید تخلف قراردادی.','کدام گلوگاه‌های پشتیبانی به مدارک بیشتر نیاز دارند؟',[
  entry('C8','CONTRACT','گزارش نمونه انجام تعهدات خدمات',{contractCode:'DEMO-CONTRACT-808',service:'پشتیبانی میادین',planned:105,performed:64},'SUBMITTED'),
  entry('S8','STAFF','درخواست‌های معوق تدارکات',{department:'DEMO-STAFF-08',process:'تدارکات خدمات شهری',requests:28,pending:17}),
  entry('M8','MARKETS','بررسی نمونه محل عرضه',{siteCode:'DEMO-MARKET-08',visitType:'ارزیابی آموزشی',boothsChecked:33,findings:4})]),
 scenario('S09','حالت کنترل بدون سیگنال مثبت','کنترل خطای مثبت','تمرین وضعیت بدون کمبود ثبت‌شده و ناوگان کاملاً متوقف؛ نباید فرصت ارزش یا ظرفیت آزاد ساختگی ساخته شود.','آیا سیستم از استنتاج بی‌مبنا اجتناب می‌کند؟',[
  entry('G9','GREEN','آبیاری بدون مورد فرضی ثبت‌شده',{siteCode:'DEMO-PARK-09',zone:'منطقه ۱۱ نمونه',treesChecked:26,irrigationIssues:0}),
  entry('B9','BEAUTIFICATION','بازدید تمرینی بدون نقص',{zone:'منطقه ۱۱ نمونه',assetType:'مبلمان شهری',assetsChecked:18,damaged:0}),
  entry('F9','FLEET','ناوگان نمونه با توقف کامل',{fleetGroup:'DEMO-FLEET-STOPPED',vehicles:6,stopped:6,downtimeHours:72})])
]);
const metricRules={GREEN:['irrigationIssues','treesChecked','موارد آبیاری فرضی'],CEMETERY:['pending','requests','در انتظار'],MARKETS:['findings','boothsChecked','یافته‌های بازرسی'],BEAUTIFICATION:['damaged','assetsChecked','نقص منظر'],PUBLIC:['overdue','requests','خدمات معوق'],ENV:['abnormal','samples','مقادیر غیرعادی'],FIRE:['issues','checks','عدم انطباق'],FLEET:['stopped','vehicles','خودرو متوقف'],CONTRACT:['planned','planned','تعهد انجام‌نشده'],STAFF:['pending','requests','در انتظار']};
export function scenarioMetrics(s){
 const metrics=s.records.map(r=>{const rule=metricRules[r.orgKey];if(!rule)return {id:r.id,orgKey:r.orgKey,label:'مشارکت آموزشی',number:r.fields.participants,denominator:null,percent:null};
  const [numerator,denominator,label]=rule;const actual=r.orgKey==='CONTRACT'?r.fields.planned-r.fields.performed:r.fields[numerator];const base=r.fields[denominator];return {id:r.id,orgKey:r.orgKey,label,number:actual,denominator:base,percent:base>0?Math.round(actual/base*100):null};
 });
 const needs=s.records.filter(r=>['GREEN','PUBLIC','BEAUTIFICATION'].includes(r.orgKey)&&((r.fields.irrigationIssues||r.fields.overdue||r.fields.damaged||0)>0)).length;
 const leads=s.records.filter(r=>r.orgKey==='FLEET'&&r.fields.vehicles>r.fields.stopped).length;
 return {metrics,needs,leads,unverifiedPairings:needs*leads,verifiedPublicValue:false,confirmedAvailableResources:0,allocationAllowed:false,synthetic:true};
}
export function validateScenarioLibrary(){
 const keys=new Set(),ids=new Set(),coverage=new Set();let count=0;
 for(const s of DEMO_SCENARIOS){if(keys.has(s.id)||!/^S\d{2}$/.test(s.id))throw Error('SCENARIO_DUPLICATE');keys.add(s.id);
  if(!s.records.length||s.records.length>4)throw Error('SCENARIO_SIZE');for(const r of s.records){const key=s.id+':'+r.id;if(ids.has(key)||!DOSSIER_KEYS.includes(r.orgKey)||!['DRAFT','SUBMITTED'].includes(r.status))throw Error('SCENARIO_ROW_INVALID');ids.add(key);count++;coverage.add(r.orgKey);validateFields(r.orgKey,r.fields)} }
 if(coverage.size!==DOSSIER_KEYS.length)throw Error('SCENARIO_DOMAIN_COVERAGE');return {scenarios:DEMO_SCENARIOS.length,records:count,domains:coverage.size};
}
export function scenarioPayload(s,r){
 const data={action:'CREATE',orgKey:r.orgKey,title:r.title,description:`داده آموزشی مصنوعی سناریوی ${s.id} - ${s.title}. ${s.description} این پرونده شاهد میدانی، ظرفیت قابل تخصیص یا منفعت عمومی اثبات‌شده نیست.`,fields:validateFields(r.orgKey,r.fields),evidenceRefs:[{label:'ارجاع مصنوعی سناریوی آموزشی',referenceCode:`DEMO-V8P35-${s.id}-${r.id}`}],status:r.status};
 validateEvidenceRefs(data.evidenceRefs);return data;
}
export async function scenarioRequestKey(cityId,scenarioId,recordId){
 if(!/^[0-9a-f-]{36}$/i.test(cityId)||!/^(S\d{2})$/.test(scenarioId)||!/^[A-Z0-9]{2,8}$/.test(recordId))throw Error('SCENARIO_REQUEST_SCOPE_INVALID');
 if(!globalThis.crypto?.subtle)throw Error('SECURE_CONTEXT_REQUIRED');
 const digest=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(`RHF-V8P35|${cityId}|${scenarioId}|${recordId}`)));
 const a=Array.from(digest.slice(0,16));a[6]=(a[6]&15)|128;a[8]=(a[8]&63)|128;
 const h=a.map(x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}
export function validateServerDossiers(raw,city){return safeDossierResponse(raw,city);}
export function allowedScenarioImport(raw,city){return !!validateServerDossiers(raw,city)&&raw.canCreate===true&&raw.partial===false;}
export function findStoredScenarioRow(rows,key){return rows.find(r=>r.code===`RHF8P2-${key}`)||null;}
export const SCENARIO_IMPORT_IS_AUTOMATIC=false;
export const SCENARIO_REAL_WORLD_DISPATCH=false;
export const SCENARIO_VALUE_VERIFIED=false;
validateScenarioLibrary();
