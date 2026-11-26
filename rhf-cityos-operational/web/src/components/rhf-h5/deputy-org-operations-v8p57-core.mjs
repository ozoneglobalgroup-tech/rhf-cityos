// RHF City OS V8P5.7 — bounded organization playbooks and labelled presentation data.
// Pure projections only. This module never grants authority, creates a real task, or calls an API.
import {ORGS,syntheticPortfolio,PERIODS,BRAND} from './deputy-performance-v8p53-core.mjs';
import {sampleTaskRows} from './deputy-organization-v8p55-core.mjs';
export const OPERATIONS57_VERSION='RHF-ORG-OPERATIONAL-UX-V8P5.7';
export const OPERATIONS57_SOURCE='SYNTHETIC_PRESENTATION';
export const OPERATIONS57_LAB_SOURCE='SCOPED_DEPUTY_DEMO_API';
export const OPERATIONS57_ORG_IDS=Object.freeze(ORGS.map(x=>x[0]));
export const OPERATIONS57_COLORS=Object.freeze([BRAND.blue,BRAND.green,BRAND.yellow,BRAND.red]);
// Catalog items are *proposed workflow designs* for UAT, never authority or an executed mission.
export const PLAYBOOK57=Object.freeze({
 WASTE:{unit:'جمع‌آوری و پردازش',decision:'بازبینی برنامه خدمات، شواهد پیمانکار و ظرفیت مجاز',flow:['دریافت نیاز و محدوده خدمت','مقایسه شواهد جمع‌آوری و ناوگان','تأیید مسئول سازمان و معاونت','کنترل مستقل خروجی خدمت'],agents:['دستیار تحلیل ناهنجاری مسیر','دستیار بررسی شواهد تفکیک'],gate:'عدم تخصیص خودکار ناوگان یا صدور دستور حمل'},
 GREEN:{unit:'فضای سبز و باغات',decision:'اولویت نگهداشت با حفاظت باغات و منابع آب',flow:['ثبت درخواست نگهداشت و موقعیت','ارزیابی ریسک باغات و برنامه آبیاری','تأیید کارشناسی و مقام مسئول','بازرسی پس از اجرا و سنجش مصرف آب'],agents:['دستیار تشخیص نیاز هرس','دستیار تحلیل مصرف آب'],gate:'بدون مجوز، هیچ دستور قطع درخت یا مصرف منبع صادر نمی‌شود'},
 CEMETERY:{unit:'مدیریت آرامستان‌ها',decision:'حفظ کیفیت خدمات، ظرفیت و کرامت مراجعان',flow:['دریافت نیاز خدمات و زیرساخت','بررسی ظرفیت و برنامه خدمت','تأیید مسئول عملیاتی','ثبت بازخورد و کنترل کیفیت'],agents:['دستیار کیفیت خدمات مراجعان','دستیار برنامه نگهداشت'],gate:'اطلاعات هویتی و مکانی اشخاص در داده آموزشی نمایش داده نمی‌شود'},
 MARKETS:{unit:'میادین و ساماندهی مشاغل',decision:'بازرسی بهداشت، ساماندهی و رعایت مقررات',flow:['ثبت نیاز بازرسی یا ساماندهی','تطبیق چک‌لیست بهداشت و ظرفیت','تأیید بازرس و مقام مجاز','پیگیری اصلاح و ارزیابی انطباق'],agents:['دستیار اولویت بازرسی','دستیار شناسایی عدم انطباق'],gate:'هیچ پلمب یا جریمه خودکار صادر نمی‌شود'},
 BEAUTIFICATION:{unit:'زیباسازی و منظر شهری',decision:'هماهنگی نگهداشت مبلمان، روشنایی و منظر',flow:['دریافت گزارش وضعیت منظر','بررسی دارایی و برآورد محدود هزینه','تأیید طرح و مسئولیت اجرایی','تحویل و بازرسی کیفیت'],agents:['دستیار نیاز مبلمان شهری','دستیار تحلیل اولویت روشنایی'],gate:'تعهد مالی یا سفارش خرید خودکار ایجاد نمی‌شود'},
 PUBLIC:{unit:'خدمات عمومی و نظافت',decision:'بررسی SLA، شکایات و کیفیت خدمت عمومی',flow:['ثبت درخواست خدمت یا ۱۳۷','ارزیابی حوزه، مسیر و ظرفیت','تأیید مأموریت انسانی','ثبت انجام و کنترل مستقل SLA'],agents:['دستیار تحلیل درخواست‌های ۱۳۷','دستیار اولویت نظافت'],gate:'هیچ اعزام یا بستن شکایت بدون تأیید انجام نمی‌شود'},
 ENV:{unit:'محیط‌زیست شهری',decision:'پایش شواهد آلودگی و پاسخ قانونی به مسئله',flow:['تجمیع داده قابل انتساب محیطی','اعتبارسنجی منبع و دامنه سنجش','تأیید اقدام توسط مرجع مسئول','اندازه‌گیری مستقل پس از اقدام'],agents:['دستیار تحلیل روند آلودگی','دستیار ممیزی اعتبار حسگر'],gate:'داده نمونه به عنوان اندازه‌گیری واقعی حسگر ارائه نمی‌شود'},
 FIRE:{unit:'ایمنی و آتش‌نشانی',decision:'آمادگی پیشگیری و آموزش در حوزه تابعه',flow:['ثبت مخاطره یا نیاز آموزش','بررسی برنامه ایمنی و ظرفیت مجاز','تأیید مقام مسئول بحران','پیگیری مانور و درس‌آموخته‌ها'],agents:['دستیار شناسایی نیاز آموزش','دستیار تحلیل آمادگی نمونه'],gate:'این میزکار دستور اعزام اضطراری صادر نمی‌کند و تابعه‌بودن سازمان نیازمند پیکربندی است'},
 FLEET:{unit:'ناوگان و ماشین‌آلات',decision:'آماده‌به‌کاری، نگهداشت و بهره‌وری منابع',flow:['دریافت نیاز خدمت و نوع ماشین','کنترل نگهداشت و مجازبودن ظرفیت','تأیید تخصیص توسط مسئول ناوگان','ثبت کارکرد و ممیزی سوخت'],agents:['دستیار پیش‌بینی نیاز نگهداشت','دستیار کشف اتلاف سوخت'],gate:'ماشین غیرمتوقف لزوماً ظرفیت آزاد نیست؛ تخصیص خودکار ممنوع'},
 CONTRACT:{unit:'پیمانکاران و نظارت',decision:'SLA، مدارک عملکرد و کنترل قرارداد',flow:['ثبت مستندات خدمت پیمانکار','مقایسه شاخص SLA و شواهد','بازبینی حقوقی و مالی مستقل','تأیید پرداخت فقط توسط نقش مسئول'],agents:['دستیار تشخیص مغایرت SLA','دستیار ارزیابی مدارک صورت‌وضعیت'],gate:'C کمتر از ۵۰ به معنی وتوی PUC+ است؛ پرداخت خودکار وجود ندارد'},
 CITIZEN:{unit:'مشارکت و آموزش شهروندی',decision:'کیفیت مشارکت، آموزش و رسیدگی شهروندی',flow:['ثبت مسئله و گروه هدف آموزشی','ارزیابی ظرفیت و کانال ارتباطی','تأیید محتوا و مجوز انتشار','سنجش مشارکت و بازخورد'],agents:['دستیار تحلیل الگوی درخواست','دستیار طراحی آموزش نمونه'],gate:'هیچ ارسال انبوه یا افشای اطلاعات شهروندی خودکار نیست'},
 STAFF:{unit:'ستاد و پشتیبانی معاونت',decision:'برنامه، بودجه، نیروی انسانی و گزارش‌دهی',flow:['شناسایی نیاز واحدها و منابع','بررسی بودجه و ظرفیت مجاز','تأیید ذی‌حساب یا مقام مجاز','پایش نتیجه و گزارش مستقل'],agents:['دستیار شناسایی ریسک برنامه','دستیار تحلیل ظرفیت اداری'],gate:'هیچ انتصاب، پرداخت یا تغییر منابع انسانی از این نما اجرا نمی‌شود'}
});
export const OPERATIONS57_TABS=Object.freeze(['today','units','process','agents']);
const all=syntheticPortfolio();
const boundedText=(x,n)=>typeof x==='string'?x.replace(/[<>]/g,'').trim().slice(0,n):'';
export function demoOrganization(id){return all.find(r=>r.id===id&&r.source===OPERATIONS57_SOURCE)??null;}
export function selectedPlaybook(id){return OPERATIONS57_ORG_IDS.includes(id)?PLAYBOOK57[id]:null;}
export function safeLabRows(rows,orgKey,loaded=false){
 if(!loaded||!OPERATIONS57_ORG_IDS.includes(orgKey)||orgKey==='WASTE'||!Array.isArray(rows))return [];
 return rows.filter(r=>r&&r.orgKey===orgKey&&typeof r.id==='string'&&typeof r.title==='string'&&typeof r.status==='string')
  .slice(0,12).map(r=>Object.freeze({id:boundedText(r.id,100),title:boundedText(r.title,140),status:boundedText(r.status,30),source:OPERATIONS57_LAB_SOURCE}));
}
export function organizationCockpit(id,{labRows=[],labLoaded=false,wasteRecords=null}={}){
 const demo=demoOrganization(id),plan=selectedPlaybook(id);if(!demo||!plan)return null;
 const tasks=sampleTaskRows(demo);
 const saved=safeLabRows(labRows,id,labLoaded);
 const records=id==='WASTE'&&Number.isSafeInteger(wasteRecords)&&wasteRecords>=0?wasteRecords:null;
 return Object.freeze({orgId:id,name:demo.name,mission:demo.mission,source:OPERATIONS57_SOURCE,
  score:demo.score,veto:demo.veto,dimensions:demo.dimensions,trend:[...demo.trend],periods:PERIODS,
  units:demo.units.map(u=>Object.freeze({id:u.id,name:u.title,score:u.score,sampleCount:u.sampleCount,source:OPERATIONS57_SOURCE})),
  tasks:tasks.map((t,i)=>Object.freeze({...t,unit:demo.units[i%3].title,priority:i===0?'HIGH_DEMO':i===1?'MEDIUM_DEMO':'NORMAL_DEMO'})),
  process:plan.flow.map((title,i)=>Object.freeze({id:`${id}-FLOW-${i+1}`,title,stage:i,source:OPERATIONS57_SOURCE})),
  agents:plan.agents.map((name,i)=>Object.freeze({id:`${id}-AGENT-${i+1}`,name,source:OPERATIONS57_SOURCE})),
  decision:plan.decision,gate:plan.gate,
  lab:Object.freeze({state:labLoaded?'SCOPED_RESPONSE':'UNAVAILABLE',count:labLoaded&&id!=='WASTE'?saved.length:null,records:saved,source:OPERATIONS57_LAB_SOURCE,partial:Array.isArray(labRows)&&labRows.length>=200}),
  wasteRecords:records,
  publicValueVerified:false,externalPerformanceConnected:false,automaticDispatch:false});
}
export function searchOrgCockpits(search='',onlyVeto=false){const q=boundedText(search,60).toLocaleLowerCase('fa-IR');return all.filter(r=>(!onlyVeto||r.veto)&&(!q||[r.id,r.name,r.mission,...r.units.map(u=>u.title)].join(' ').toLocaleLowerCase('fa-IR').includes(q))).map(r=>({id:r.id,name:r.name,score:r.score,veto:r.veto,units:r.units.length,source:OPERATIONS57_SOURCE}));}
