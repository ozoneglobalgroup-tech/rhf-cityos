// Synthetic Deputy sandbox authorization. Never authorizes operational service execution.
import {isCurrent,identifier,fail} from './organization-identity-core.mjs';
import {isWasteDemoCity,WASTE_CODE} from './waste-pilot-core.mjs';
export const DEMO_MODE='DEPUTY_SYNTHETIC_V710';
export const ORGS=Object.freeze(['GREEN','CEMETERY','MARKETS','BEAUTIFICATION','PUBLIC','ENV','FIRE','FLEET','CONTRACT','CITIZEN','STAFF']);
export function validCity(city){if(!city||!isWasteDemoCity(city.name))fail('این آزمایشگاه فقط در شهرداری شیراز — دمو آزمایشی مجاز است',403)}
export function allowedSeat({user,role,appointment,unit,city}){
 validCity(city);
 if(user?.is_system_admin)return {kind:'ADMIN',canSeed:true,canCreate:true,canReview:true};
 if(role==='MUNICIPAL_ADMIN')return {kind:'INDEPENDENT_REVIEWER',canSeed:false,canCreate:false,canReview:true};
 if(!appointment||appointment.user_id!==user?.id||appointment.tenant_id!==city.tenant_id||appointment.municipality_id!==city.id||appointment.position_code!=='DEPUTY_HEAD'||appointment.org_unit_id!==unit.id||!isCurrent(appointment)||unit.active!==true)fail('انتصاب معتبر معاونت وجود ندارد',403);
 return {kind:'DEPUTY',canSeed:false,canCreate:true,canReview:true};
}
const str=(s,min,max,label)=>{if(typeof s!=='string'||s.trim().length<min||s.length>max||/[\x00-\x1f]/.test(s))fail(`${label} معتبر نیست`);return s.trim()};
const numeric=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e9;
export const unitMap=Object.freeze({GREEN:'درخت',CEMETERY:'درخواست',MARKETS:'مورد',BEAUTIFICATION:'مورد',PUBLIC:'مورد',ENV:'گزارش',FIRE:'مورد',FLEET:'ساعت',CONTRACT:'درصد',CITIZEN:'نفر',STAFF:'مورد'});
export function checkNew(b){if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['action','requestKey','orgKey','kind','title','description','value','unit','target'].includes(k)))fail('فرم ناشناخته');identifier(b.requestKey,'شناسه درخواست');if(!ORGS.includes(b.orgKey))fail('حوزه ناشناخته');if(!['RECORD','FLOW','VALUE'].includes(b.kind))fail('نوع درخواست');if(b.unit!==unitMap[b.orgKey])fail('واحد شاخص ناسازگار است');if(!numeric(b.value))fail('شاخص آزمایشی نامعتبر است');if(b.kind==='VALUE'&&!numeric(b.target))fail('فرصت ارزش به هدف عددی نیاز دارد');if(b.kind!=='VALUE'&&b.target!==undefined)fail('هدف فقط برای فرصت ارزش مجاز است');return {requestKey:b.requestKey,orgKey:b.orgKey,kind:b.kind,title:str(b.title,8,140,'عنوان'),description:str(b.description,30,1500,'شرح'),value:b.value,target:b.kind==='VALUE'?b.target:null,unit:b.unit};}
export function checkReview(b){if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['action','decision','version','note'].includes(k))||b.action!=='REVIEW'||!['REVIEWED','REJECTED'].includes(b.decision)||!Number.isSafeInteger(b.version)||b.version<1)fail('تصمیم معتبر نیست');return {...b,note:str(b.note,30,1200,'دلیل تصمیم')};}
export function canDecision(user,permit,row){if(!permit?.canReview||row.status!=='SUBMITTED'||row.created_by===user?.id||row.kind==='FIXTURE')fail('تصمیم مستقل مجاز نیست',403);return true}
export function safeRow(row,user){return {id:row.id,orgKey:row.org_key,kind:row.kind,code:row.code,title:row.title,description:row.description,value:Number(row.metric_value),target:row.metric_target===null?null:Number(row.metric_target),unit:row.metric_unit,status:row.status,version:row.version,createdAt:row.created_at,reviewedAt:row.reviewed_at,creatorIsMe:row.created_by===user.id,synthetic:true,verifiedPublicValue:false};}
export function origin(req){const host=req?.headers?.host;const o=req?.headers?.origin;if(!host||!o)fail('BROWSER_ORIGIN_REQUIRED',403);let u;try{u=new URL(o)}catch{fail('INVALID_ORIGIN',403)}if(u.host!==host||!['http:','https:'].includes(u.protocol)||u.protocol!==(process.env.PUBLIC_HTTPS==='true'?'https:':'http:'))fail('ORIGIN_MISMATCH',403)}
export const SEEDS=Object.freeze([
 ['GREEN',9,'درخت','بازدید آزمایشی فضای سبز'],['CEMETERY',7,'درخواست','درخواست آزمایشی آرامستان'],['MARKETS',6,'مورد','بازرسی آزمایشی بازار'],['BEAUTIFICATION',4,'مورد','بازدید آزمایشی زیباسازی'],['PUBLIC',12,'مورد','درخواست آزمایشی خدمات عمومی'],['ENV',8,'گزارش','پایش آزمایشی محیط‌زیست'],['FIRE',3,'مورد','بررسی فرضی ایمنی'],['FLEET',7,'ساعت','توقف آزمایشی ماشین‌آلات'],['CONTRACT',22,'درصد','مغایرت فرضی تعهدات'],['CITIZEN',65,'نفر','آموزش فرضی شهروندان'],['STAFF',5,'مورد','پیگیری فرضی ستادی']
].map(([orgKey,value,unit,title])=>({orgKey,value,unit,title,kind:'RECORD',code:`DEPUTY-DEMO-${orgKey}-01`,description:`سناریوی آزمایشی ${title} برای آزمون فرم، تحلیل عامل و فرایند معاونت؛ بدون شاهد میدانی.`})));
