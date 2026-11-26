/* Pure presentation helpers; API and authorization remain authoritative. */
export const POSITION_LABELS = Object.freeze({
 MAYOR:'شهردار',DEPUTY_HEAD:'معاون',ORG_CEO:'مدیرعامل سازمان',
 DEPARTMENT_HEAD:'مدیر واحد',OPERATOR:'کارشناس',ORG_AUDITOR:'حسابرس سازمان'
});
export const POSITION_ORDER = Object.keys(POSITION_LABELS);
export const STATUS_META = Object.freeze({
 PENDING:{label:'در انتظار بررسی',tone:'pending'},
 APPROVED:{label:'تأییدشده',tone:'approved'},
 REJECTED:{label:'ردشده',tone:'rejected'},
 REVOKED:{label:'لغوشده',tone:'muted'}
});
export const CAPABILITY_HINTS = Object.freeze({
 MAYOR:['فرماندهی شهرداری','تحلیل تجمیعی معاونت‌ها','پیشنهادهای عامل شهری'],
 DEPUTY_HEAD:['نمای تجمیعی سازمان‌های تابعه','ریسک‌های خدمات شهری','پیشنهادهای عامل معاونت'],
 ORG_CEO:['خلاصه تخصصی سازمان','پرونده‌های مجاز سازمان','پیشنهادهای عامل پسماند'],
 DEPARTMENT_HEAD:['میزکار واحد','وظایف مجاز'],OPERATOR:['وظایف من'],ORG_AUDITOR:['گزارش‌های مجاز حسابرسی']
});
const same=(a,b)=>Boolean(a&&b&&String(a).toLowerCase()===String(b).toLowerCase());
export function summarizeRows(rows){
 if(!Array.isArray(rows))return null;
 const result={total:rows.length,PENDING:0,APPROVED:0,REJECTED:0,REVOKED:0};
 for(const row of rows){if(Object.hasOwn(result,row?.status))result[row.status]+=1;}
 return result;
}
export function allowedUnits(units,positionCode){
 if(!Array.isArray(units))return [];
 return units.filter(x=>x?.active===true&&(
 positionCode==='DEPUTY_HEAD'?x.kind==='DEPUTY':
 positionCode==='ORG_CEO'?x.kind==='ORGANIZATION':
 positionCode==='DEPARTMENT_HEAD'?['DEPARTMENT','DIRECTORATE'].includes(x.kind):true
 ));
}
export function reviewEligibility(appointment,actorId){
 if(!appointment)return {ok:false,reason:'برای بررسی، یک درخواست را انتخاب کنید.'};
 if(appointment.status!=='PENDING')return {ok:false,reason:'این درخواست دیگر در انتظار بررسی نیست.'};
 if(!actorId)return {ok:false,reason:'هویت کاربر جاری تأیید نشده است.'};
 if(same(appointment.requestedBy,actorId))return {ok:false,reason:'شما ثبت‌کننده این درخواست هستید. تأیید یا رد باید با یک حساب مدیریتی مستقل انجام شود.'};
 if(same(appointment.userId,actorId))return {ok:false,reason:'این انتصاب مربوط به حساب شماست و اجازه بررسی درخواست خود را ندارید.'};
 return {ok:true,reason:'تصمیم نهایی همچنان در سرور بر اساس سمت و مجوز شما کنترل می‌شود.'};
}
export function checkReviewNote(value){
 if(typeof value!=='string')return {ok:false,message:'دلیل تصمیم را وارد کنید.'};
 const n=value.trim();
 if(n.length<30)return {ok:false,message:`دلیل مستند باید حداقل ۳۰ نویسه داشته باشد (${n.length} نویسه وارد شده).`};
 if(value.length>1200)return {ok:false,message:'دلیل تصمیم حداکثر ۱۲۰۰ نویسه مجاز است.'};
 if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))return {ok:false,message:'متن دلیل دارای نویسه کنترلی غیرمجاز است.'};
 return {ok:true,message:''};
}
export function filterRows(rows,{status='PENDING',search=''}={}){
 if(!Array.isArray(rows))return [];
 const term=String(search||'').trim().toLocaleLowerCase();
 return rows.filter(x=>(status==='ALL'||x.status===status)&&(!term||[
 x.displayName,x.username,x.orgUnitName,x.approvalRef,POSITION_LABELS[x.positionCode]
 ].some(y=>String(y||'').toLocaleLowerCase().includes(term))));
}
export function readableDate(value){
 if(!value)return 'ثبت نشده';
 const d=new Date(value);return Number.isFinite(d.valueOf())?d.toLocaleDateString('fa-IR'):'نامشخص';
}
export function validRequestDraft(draft,users,units){
 if(!draft?.userId||!Array.isArray(users)||!users.some(x=>x.id===draft.userId))return 'ابتدا حساب کاربری را انتخاب کنید.';
 if(!Object.hasOwn(POSITION_LABELS,draft.positionCode))return 'سمت معتبر انتخاب کنید.';
 if(draft.positionCode!=='MAYOR'&&!allowedUnits(units,draft.positionCode).some(x=>x.id===draft.orgUnitId))return 'واحد یا سازمان مرتبط با این سمت را انتخاب کنید.';
 if(typeof draft.approvalRef!=='string'||draft.approvalRef.trim().length<8)return 'شماره حکم/مرجع انتصاب باید حداقل ۸ نویسه داشته باشد.';
 const from=draft.validFrom?Date.parse(draft.validFrom):Date.now();
 if(!Number.isFinite(from))return 'تاریخ شروع اعتبار معتبر نیست.';
 if(draft.validTo){const to=Date.parse(draft.validTo);if(!Number.isFinite(to)||to<=from)return 'پایان اعتبار باید پس از آغاز اعتبار باشد.';}
 return null;
}

export function duplicatePending(rows,draft){
 if(!Array.isArray(rows)||!draft?.userId||!draft?.positionCode)return null;
 const unit=draft.positionCode==='MAYOR'?null:draft.orgUnitId||null;
 return rows.find(a=>a.status==='PENDING'&&same(a.userId,draft.userId)&&a.positionCode===draft.positionCode&&
  (unit===null?(!a.orgUnitId):same(a.orgUnitId,unit)))||null;
}
