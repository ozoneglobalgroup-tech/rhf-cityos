// RHF City OS V7.2: pure authorization and appointment validation helpers.
// NOT an identity provider. Account authentication remains the existing RUVOS session.
export const POSITIONS=Object.freeze({
 MAYOR:{label:'شهردار',kind:null,menu:['mayor-summary','decisions','value-gates']},
 DEPUTY_HEAD:{label:'معاون',kind:'DEPUTY',menu:['deputy-summary','oversight','agents']},
 ORG_CEO:{label:'مدیرعامل سازمان',kind:'ORGANIZATION',menu:['organization-summary','specialized-tools','agents']},
 DEPARTMENT_HEAD:{label:'مدیر واحد',kind:'DEPARTMENT',menu:['department-summary','my-work']},
 OPERATOR:{label:'کارشناس',kind:'ANY',menu:['my-work','assigned-tasks']},
 ORG_AUDITOR:{label:'حسابرس',kind:'ANY',menu:['audit-summary']}
});
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function fail(message,code=400){const e=new Error(message);e.status=code;e.rhfIamError=true;throw e}
export function identifier(s,label='شناسه'){if(typeof s!=='string'||!UUID.test(s))fail(`${label} معتبر نیست`);return s.toLowerCase()}
export function appointmentSpec(b){
 if(!b||typeof b!=='object'||Array.isArray(b))fail('درخواست نامعتبر است');
 const position=POSITIONS[b.positionCode];if(!position)fail('سمت تعریف نشده است');
 const userId=identifier(b.userId,'شناسه کاربر');const orgUnitId=b.orgUnitId?identifier(b.orgUnitId,'شناسه واحد'):null;
 if(position.kind===null&&orgUnitId!==null)fail('سمت شهردار در ریشه شهرداری تعریف می‌شود');
 if(position.kind!==null&&!orgUnitId)fail('سمت سازمانی به واحد معتبر نیاز دارد');
 const from=Date.parse(b.validFrom);const to=b.validTo?Date.parse(b.validTo):null;
 if(!Number.isFinite(from)||new Date(from).toISOString()!==b.validFrom)fail('تاریخ شروع باید ISO-8601 UTC باشد');
 if(to!==null&&(!Number.isFinite(to)||new Date(to).toISOString()!==b.validTo||to<=from))fail('تاریخ پایان معتبر نیست');
 if(from<Date.now()-86400000*365*10)fail('تاریخ شروع نامعتبر است');
 const approvalRef=typeof b.approvalRef==='string'?b.approvalRef.trim():'';
 if(approvalRef.length<8||approvalRef.length>160||/[\x00-\x1f]/.test(approvalRef))fail('مرجع انتصاب باید معتبر و حداقل ۸ نویسه باشد');
 return {userId,orgUnitId,positionCode:b.positionCode,validFrom:b.validFrom,validTo:b.validTo||null,approvalRef};
}
export function assertPositionUnit(positionCode,unit){
 const p=POSITIONS[positionCode];if(!p)fail('سمت نامعتبر');
 if(p.kind===null)return !unit;
 if(!unit||unit.active!==true)fail('واحد فعال یافت نشد',409);
 if(p.kind==='DEPARTMENT'&&!['DEPARTMENT','DIRECTORATE'].includes(unit.kind))fail('نوع واحد با سمت سازگار نیست');
 else if(p.kind!=='ANY'&&p.kind!=='DEPARTMENT'&&unit.kind!==p.kind)fail('نوع واحد با سمت سازگار نیست');
 return true;
}
export function isCurrent(a,now=Date.now()){
 return !!a&&a.status==='APPROVED'&&Date.parse(a.valid_from)<=now&&(!a.valid_to||Date.parse(a.valid_to)>now);
}
export function authorizeManagement(user,role){if(!user?.is_system_admin&&!['MUNICIPAL_ADMIN'].includes(role))fail('اختیار مدیریت انتصاب وجود ندارد',403)}
export function canRequest(user){if(!user?.is_system_admin)fail('ایجاد انتصاب حساس صرفاً با مدیر سامانه است',403)}
export function canReview(user,role,appointment){authorizeManagement(user,role);if(!appointment||appointment.status!=='PENDING')fail('درخواست در انتظار بررسی نیست',409);if([appointment.requested_by,appointment.user_id].some(x=>String(user.id).toLowerCase()===String(x).toLowerCase()))fail('تأییدکننده نباید درخواست‌کننده یا صاحب سمت باشد',403);return true}
export function canRevoke(user,role,appointment){authorizeManagement(user,role);if(!appointment||appointment.status!=='APPROVED')fail('سمت قابل لغو نیست',409);return true}
export function workspace(a,unitName=null){return {assignmentId:a.id,orgUnitId:a.org_unit_id,positionCode:a.position_code,positionLabel:POSITIONS[a.position_code].label,orgUnitName:unitName||null,validFrom:a.valid_from,expiresAt:a.valid_to||null,capabilities:[...POSITIONS[a.position_code].menu],policyVersion:'RHF-ORG-IAM-V7.2',readonly:true}}
export function scopedWhere(a){if(a.position_code==='MAYOR')return {citywide:true,orgUnitId:null};return {citywide:false,orgUnitId:a.org_unit_id}}
export function noFalseProof(metrics){return {...metrics,verifiedPublicValue:null,independentlyVerified:false,syntheticDataMayExist:true};}
