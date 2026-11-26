// V7.4 human-governed organization process intake. Never dispatch or certify value.
import {identifier,fail,isCurrent} from './organization-identity-core.mjs';
import {wasteReadGuard} from './organization-waste-scope.mjs';
export const BPMS_VERSION='RHF-ORG-BPMS-V7.4';
export const PROCESS_KINDS=Object.freeze({
 WEIGHBRIDGE_REVIEW:'بررسی مغایرت باسکول',FLEET_EXCEPTION:'پیگیری اختلال ناوگان',
 CONTRACTOR_REVIEW:'بررسی عملکرد پیمانکار',QUALITY_REMEDIATION:'اصلاح نقص کیفیت',
 VALUE_OPPORTUNITY:'بررسی فرصت خلق ارزش شهری'
});
const allowed=new Set(Object.keys(PROCESS_KINDS));
const cleanText=(v,min,max,label)=>{
 if(typeof v!=='string'||v.trim().length<min||v.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v))fail(`${label} باید بین ${min} تا ${max} نویسه باشد`);
 return v.trim();
};
export function intakeSpec(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('درخواست فرایند نامعتبر است');
 const keys=['assignmentId','requestKey','kind','title','description','evidenceRef','caseId','metric','baseline','target','unit'];
 if(Object.keys(raw).some(x=>!keys.includes(x)))fail('فیلد نامعتبر در درخواست فرایند');
 const assignmentId=identifier(raw.assignmentId,'شناسه انتصاب');
 const requestKey=identifier(raw.requestKey,'کلید یکتای درخواست');
 if(!allowed.has(raw.kind))fail('الگوی فرایند تعریف نشده است');
 const title=cleanText(raw.title,8,160,'عنوان');
 const description=cleanText(raw.description,35,2000,'شرح نیاز و وضعیت شواهد');
 const evidenceRef=raw.evidenceRef?cleanText(raw.evidenceRef,8,260,'مرجع شواهد'):null;
 const caseId=raw.caseId?identifier(raw.caseId,'شناسه پرونده'):null;
 const value=raw.kind==='VALUE_OPPORTUNITY';
 if(!value&&(raw.metric!==undefined||raw.baseline!==undefined||raw.target!==undefined||raw.unit!==undefined))fail('شاخص سنجش فقط برای فرصت ارزش مجاز است');
 const metric=value?cleanText(raw.metric,5,120,'شاخص ارزش'):null;
 const unit=value?cleanText(raw.unit,1,50,'واحد شاخص'):null;
 const number=(v,label)=>{
  if(v===undefined||v===null||v==='')return null;
  if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e12)fail(`${label} باید عدد محدود و معتبر باشد`);
  return v;
 };
 const baseline=value?number(raw.baseline,'خط مبنا'):null,target=value?number(raw.target,'هدف'):null;
 return {assignmentId,requestKey,kind:raw.kind,title,description,evidenceRef,caseId,metric,unit,baseline,target};
}
export function reviewSpec(b){
 if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['action','version','note'].includes(k)))fail('درخواست تصمیم نامعتبر است');
 if(!['AUTHORIZE_FOLLOWUP','REJECT'].includes(b.action))fail('تصمیم نامعتبر است');
 if(!Number.isSafeInteger(b.version)||b.version<1)fail('نسخه تصمیم نامعتبر است');
 return {action:b.action,version:b.version,note:cleanText(b.note,30,1200,'دلیل تصمیم')};
}
export function canProcessReview(user,role,process){
 if(!user?.is_system_admin&&role!=='MUNICIPAL_ADMIN')fail('اختیار بررسی مستقل وجود ندارد',403);
 if(!process||process.status!=='SUBMITTED')fail('فرایند دیگر در انتظار بررسی نیست',409);
 if(process.created_by===user.id)fail('ایجادکننده نمی‌تواند درخواست خود را تأیید کند',403);
 return true;
}
export function assertOwnerScope({appointment,user,city,unit}){
 wasteReadGuard({assignment:appointment,user,city,unit,domain:'COLLECTION'});
 return true;
}
export function presentProcess(p){
 return {id:p.id,assignmentId:p.assignment_id,orgUnitId:p.org_unit_id,kind:p.kind,title:p.title,description:p.description,
  status:p.status,version:p.version,caseId:p.case_id||null,evidenceRef:p.evidence_ref||null,metric:p.metric||null,
  baseline:p.baseline??null,target:p.target??null,unit:p.unit||null,createdBy:p.created_by,
  reviewedBy:p.reviewed_by||null,reviewNote:p.review_note||null,createdAt:p.created_at,reviewedAt:p.reviewed_at||null,
  verifiedPublicValue:null,fieldActionDispatched:false};
}
export function assertProcessScope(p,city){if(!p||p.tenant_id!==city.tenant_id||p.municipality_id!==city.id)fail('فرایند در این شهرداری یافت نشد',404);}
