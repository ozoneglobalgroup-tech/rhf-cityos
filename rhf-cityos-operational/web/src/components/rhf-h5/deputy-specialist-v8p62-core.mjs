import {syntheticPortfolio} from './deputy-performance-v8p53-core.mjs';
export const PRES62_VERSION='RHF-LEADER-SPECIALIST-PRESENTATION-V8P6.2';
export const SPECIALIST62_VERSION='RHF-AGENT-SPECIALISTS-V8P6.2';
export const API_SOURCE='RUVOS_SCOPED_CASE_EVIDENCE';
export const DEMO_SOURCE='SYNTHETIC_PRESENTATION';
const id=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export const specialistNames=Object.freeze({OPERATIONS:'زنجیره اجرای خدمت',CONTRACT:'ارتباط قرارداد',INSPECTION:'شواهد بازرسی',VALUE:'شواهد ارزش شهری'});
export function presentationCatalog(){return syntheticPortfolio().map(org=>Object.freeze({id:org.id,name:org.name,mission:org.mission,units:org.units.map(u=>u.title),score:org.score,veto:org.veto,region:org.region,source:DEMO_SOURCE,operationVerified:false}));}
export const walkthrough=Object.freeze([
 {id:'city',label:'۱. شناخت شهر و حوزه‌ها',description:'۱۲ حوزه و ۳۶ واحد را در نمونه آموزشی بشناسید. حوزه‌های سازمانی قابل پیکربندی‌اند و تأیید نمی‌شود همه آن‌ها در هر شهرداری زیرمجموعه معاونت باشند.',route:'organizations'},
 {id:'problems',label:'۲. مسائل و اولویت‌ها',description:'مسئله، محل و علت را بررسی کنید. در داده واقعی، نبود نشانی یا منشأ معتبر صریحاً مشخص می‌شود.',route:'cases'},
 {id:'agents',label:'۳. ایجنت‌های دارای شواهد',description:'فقط پس از درخواست کاربر، چهار تحلیل قواعدی روی نمونه محدود پرونده‌های مجاز اجرا می‌شوند. این تحلیل استفاده از مدل زبانی یا اقدام شهری نیست.',route:'agents'},
 {id:'decision',label:'۴. تصمیم و مجوز',description:'راه‌حل پیشنهادی ابتدا باید به پرونده، کارشناس و مرجع تصویب مرتبط شود. انتخاب در این نما، مجوز نیست.',route:'decisions'},
 {id:'performance',label:'۵. ارزیابی عملکرد',description:'PUC+ با تفکیک صریح نمونه آموزشی و منبع بیرونی. امتیازهای آموزشی واقعیت شهرداری نیست.',route:'performance'},
 {id:'value',label:'۶. سنجش ارزش شهری',description:'خط مبنا، مشاهده پس از اقدام و راستی‌آزمایی مستقل شرط اثبات ارزش عمومی هستند.',route:'value'}
]);
export function validateSpecialist62(x,city){
 if(!id.test(city)||!x||x.version!==SPECIALIST62_VERSION||x.scope!==city||x.source!==API_SOURCE||x.mode!=='DETERMINISTIC_READ_ONLY'||x.analysisScope!=='RECENT_CASE_SAMPLE_ONLY'||x.modelInvoked!==false||x.autoWrites!==0||x.municipalActionExecuted!==false||x.verifiedPublicValue!==false||!Number.isSafeInteger(x.scanned)||x.scanned<0||x.scanned>12||x.limit!==12||typeof x.partial!=='boolean'||!Array.isArray(x.findings)||x.findings.length>48||x.findingsCount!==x.findings.length)return null;
 const uniq=new Set();const findings=[];
 for(const f of x.findings){if(!f||!id.test(f.caseId)||typeof f.id!=='string'||uniq.has(f.id)||!['OPERATIONS','CONTRACT','INSPECTION','VALUE'].includes(f.specialist)||f.source!==API_SOURCE||f.modelInvoked!==false||f.municipalActionExecuted!==false||f.publicValueVerified!==false||f.requiresHuman!==true||f.authorization!=='REQUIRED'||typeof f.title!=='string'||f.title.length>160||typeof f.why!=='string'||f.why.length>450||typeof f.observation!=='string'||f.observation.length>300||!Array.isArray(f.steps)||f.steps.length!==3||f.steps.some(s=>typeof s!=='string'||s.length>200)||!f.id.startsWith(f.caseId+':'))return null;
  uniq.add(f.id);findings.push({id:f.id,caseId:f.caseId,title:f.title,why:f.why,observation:f.observation,steps:f.steps,kind:f.specialist,source:API_SOURCE,requiresHuman:true});}
 return Object.freeze({scope:city,scanned:x.scanned,partial:x.partial,findings,source:API_SOURCE,modelInvoked:false,autoWrites:0});
}
export function presenterKpis(rows){return {domains:rows.length,units:rows.reduce((a,x)=>a+x.units.length,0),veto:rows.filter(x=>x.veto).length};}
