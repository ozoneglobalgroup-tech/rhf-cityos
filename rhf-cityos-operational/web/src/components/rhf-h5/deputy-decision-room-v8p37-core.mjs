// RHF City OS | V8P3.7 | Governed decision queue (read-only client projection)
// Source: validated, city-scoped V8P2 synthetic dossier API via V8P3.1 portfolio.
// No new permissions are conferred by this projection; server V8P2 decides on every write.
import {cityFirstProjection,CITY_MISSIONS} from './city-first-home-v8p36-core.mjs';
import {DOSSIER_KEYS} from './deputy-dossier-schema.mjs';
export const DECISION_ROOM_VERSION='RHF-CITY-DECISION-ROOM-V8P3.7';
export const DECISION_TABS=Object.freeze([
 {id:'REVIEWABLE',label:'قابل ارجاع برای بازبینی مستقل'},
 {id:'SUBMITTED',label:'همه پرونده‌های در انتظار'},
 {id:'MY_DRAFTS',label:'پیش‌نویس‌های من'},
 {id:'HISTORY',label:'سوابق بررسی‌شده'},
 {id:'ALL',label:'همه پرونده‌ها'}
]);
const validRow=r=>!!r&&typeof r.id==='string'&&typeof r.code==='string'&&typeof r.title==='string'&&DOSSIER_KEYS.includes(r.orgKey)&&['DRAFT','SUBMITTED','REVIEWED','REJECTED','FIXTURE'].includes(r.status)&&Array.isArray(r.evidenceRefs)&&[true,false].includes(r.creatorIsMe)&&Number.isSafeInteger(r.version)&&r.version>0;
const time=r=>{const t=Date.parse(r.updatedAt||r.createdAt);return Number.isFinite(t)?t:0};
const safeSort=(a,b)=>time(b)-time(a)||a.code.localeCompare(b.code)||a.id.localeCompare(b.id);
const empty=()=>({mode:'UNAVAILABLE',synthetic:true,autonomousDispatch:false,verifiedPublicValue:false,partial:false,canReview:false,canCreate:false,total:null,reviewable:[],submitted:[],myDrafts:[],history:[],all:[],hasEvidenceRefs:0,withoutEvidenceRefs:0,byMission:[],recommendations:[]});
export function decisionRoomProjection(board){
 const p=cityFirstProjection(board);
 if(p.mode!=='SCOPED_SYNTHETIC'||board.rows.some(r=>!validRow(r)))return empty();
 const all=board.rows.slice().sort(safeSort);
 const submitted=all.filter(r=>r.status==='SUBMITTED');
 const reviewable=board.canReview===true?submitted.filter(r=>r.creatorIsMe===false):[];
 const myDrafts=board.canCreate===true?all.filter(r=>r.status==='DRAFT'&&r.creatorIsMe===true):[];
 const history=all.filter(r=>r.status==='REVIEWED'||r.status==='REJECTED');
 const withoutEvidenceRefs=submitted.filter(r=>r.evidenceRefs.length===0).length;
 const byMission=CITY_MISSIONS.map(m=>({id:m.id,name:m.name,submitted:submitted.filter(r=>m.orgKeys.includes(r.orgKey)).length,reviewable:reviewable.filter(r=>m.orgKeys.includes(r.orgKey)).length}));
 const recommendations=[];
 if(reviewable.length)recommendations.push({kind:'REVIEW',title:`${reviewable.length} پرونده برای بازکردن در دفتر بازبینی`,description:'اختیار بازبینی باید هنگام اقدام نیز در سرور دوباره احراز شود؛ ثبت‌کننده حق بررسی پرونده خودش را ندارد.',id:reviewable[0].id,orgKey:reviewable[0].orgKey});
 if(withoutEvidenceRefs)recommendations.push({kind:'EVIDENCE',title:`${withoutEvidenceRefs} پرونده ارسالی بدون ارجاع سند آزمایشی`,description:'فقدان کد ارجاع در این فرم به معنای نبود مستندات واقعی نیست؛ صرفاً کنترل کیفیت داده‌های آموزشی است.',id:submitted.find(r=>r.evidenceRefs.length===0).id,orgKey:submitted.find(r=>r.evidenceRefs.length===0).orgKey});
 if(myDrafts.length)recommendations.push({kind:'DRAFT',title:`${myDrafts.length} پیش‌نویس آموزشی ثبت‌کننده`,description:'قبل از ارسال برای بررسی، شرح، فرم و کد ارجاع نمونه کنترل شود.',id:myDrafts[0].id,orgKey:myDrafts[0].orgKey});
 return {mode:'SCOPED_SYNTHETIC',synthetic:true,autonomousDispatch:false,verifiedPublicValue:false,partial:board.partial===true,canReview:board.canReview===true,canCreate:board.canCreate===true,
  total:all.length,reviewable,submitted,myDrafts,history,all,hasEvidenceRefs:submitted.length-withoutEvidenceRefs,withoutEvidenceRefs,byMission,recommendations};
}
export function filterDecisionRows(p,{tab='REVIEWABLE',orgKey='ALL',query=''}={}){
 if(!p||p.mode!=='SCOPED_SYNTHETIC')return [];
 const rows=({REVIEWABLE:p.reviewable,SUBMITTED:p.submitted,MY_DRAFTS:p.myDrafts,HISTORY:p.history,ALL:p.all})[tab];
 if(!rows)return [];
 const q=typeof query==='string'?query.trim().toLocaleLowerCase('fa').slice(0,100):'';
 return rows.filter(r=>(orgKey==='ALL'||r.orgKey===orgKey)&&(!q||[r.title,r.code,r.description].some(x=>typeof x==='string'&&x.toLocaleLowerCase('fa').includes(q))));
}
export function decisionGate(row,p){
 if(!row||!p||p.mode!=='SCOPED_SYNTHETIC')return {action:'UNAVAILABLE',label:'شواهد مجاز در دسترس نیست',hint:'بدون دریافت پاسخ معتبر تصمیم امکان‌پذیر نیست'};
 if(row.status==='FIXTURE')return {action:'READ_ONLY',label:'نمونه آموزشی غیرقابل بررسی',hint:'این رکورد برای آموزش ساخته شده و فرایند بازبینی پرونده اجرایی نیست'};
 if(row.status==='REVIEWED'||row.status==='REJECTED')return {action:'READ_ONLY',label:'مشاهده سوابق',hint:'بازبینی ثبت‌شده تنها تصمیم داخلی آزمایشی است؛ ارزش عمومی را اثبات نمی‌کند'};
 if(row.status==='DRAFT')return row.creatorIsMe&&p.canCreate?{action:'EDIT_IN_DOSSIER',label:'ورود برای تکمیل پیش‌نویس',hint:'ویرایش و ارسال فقط در دفتر پرونده و با مجوز سرور انجام می‌شود'}:{action:'READ_ONLY',label:'مشاهده پیش‌نویس',hint:'تنها ثبت‌کننده دارای مجوز می‌تواند پیش‌نویس را اصلاح کند'};
 if(row.status==='SUBMITTED'&&row.creatorIsMe)return {action:'READ_ONLY',label:'منتظر بازبین مستقل',hint:'ثبت‌کننده نمی‌تواند پرونده خودش را بازبینی یا تأیید کند'};
 if(row.status==='SUBMITTED'&&p.canReview)return {action:'OPEN_FOR_REVIEW',label:'ورود به بازبینی مستقل',hint:'صدور تصمیم فقط در API پرونده، با یادداشت مستند، نسخه معتبر و کنترل سمت ممکن است'};
 return {action:'READ_ONLY',label:'مشاهده پرونده',hint:'این حساب اختیار بازبینی ندارد'};
}
export const DECISION_ROOM_NO_DIRECT_WRITE=true;
export const DECISION_ROOM_NO_FAKE_SLA=true;
export const DECISION_ROOM_NO_AI_AUTONOMY=true;
