// V7.3 navigation/catalog contract. UI never grants access: server-signed appointment is mandatory.
export const ORG_PORTAL_V73='RHF-ORG-PORTAL-V7.3';
export const WASTE_DOMAIN_MENU=Object.freeze([
 {id:'COLLECTION',label:'جمع‌آوری و باسکول',group:'عملیات'},
 {id:'FLEET',label:'ناوگان و ماشین‌آلات',group:'عملیات'},
 {id:'MAINTENANCE',label:'تعمیرات و توقف',group:'عملیات'},
 {id:'CONTRACTOR',label:'پیمانکاران و قراردادها',group:'قراردادها'},
 {id:'CONTRACT_EVAL',label:'عملکرد پیمانکاران',group:'قراردادها'},
 {id:'SHIFT',label:'نیروی انسانی و شیفت‌ها',group:'عملیات'},
 {id:'QUALITY',label:'کیفیت و بازرسی',group:'کنترل'},
 {id:'FACILITY',label:'پردازش، انتقال و بازیافت',group:'تأسیسات'},
 {id:'EDUCATION',label:'آموزش و مشارکت',group:'مشارکت'},
 {id:'VIOLATION',label:'تخلفات (محدود)',group:'کنترل',restricted:true},
 {id:'LEGAL',label:'امور حقوقی (محدود)',group:'کنترل',restricted:true}
]);
export const ROLE_TITLES=Object.freeze({MAYOR:'شهردار',DEPUTY_HEAD:'معاون خدمات شهری',ORG_CEO:'مدیرعامل سازمان',DEPARTMENT_HEAD:'مدیر واحد',OPERATOR:'کارشناس',ORG_AUDITOR:'حسابرس'});
export const SECTION_LABELS=Object.freeze({
 'mayor-summary':'خلاصه شهرداری','decisions':'پیگیری تصمیم‌های شهردار','value-gates':'دروازه ارزش شهری',
 'deputy-summary':'میزکار معاونت','oversight':'نظارت بر سازمان‌ها','agents':'عامل‌ها و پیشنهادها',
 'organization-summary':'فرماندهی سازمان','specialized-tools':'ابزارهای تخصصی',
 'department-summary':'گزارش واحد','my-work':'کارهای من','assigned-tasks':'وظایف محول‌شده','audit-summary':'گزارش حسابرسی'
});
export function selectAuthorizedWorkspaces(x){
 if(!x||!Array.isArray(x.workspaces))return [];
 return x.workspaces.filter(w=>w&&typeof w.assignmentId==='string'&&!!ROLE_TITLES[w.positionCode]);
}
export function canReadWaste(w){return !!w&&w.positionCode==='ORG_CEO'&&typeof w.orgUnitId==='string'&&w.orgUnitId.length>0;}
export function validateModuleResponse(response,{cityId,assignmentId,domain}){
 if(!response||response.mode!=='RHF-ORG-WASTE-READ-V7.3'||response.cityId!==cityId||response.assignmentId!==assignmentId||response.domain!==domain||response.readOnly!==true||!Array.isArray(response.rows))throw Error('پاسخ دفتر سازمانی با محدوده و قرارداد معتبر مطابقت ندارد');
 if(response.rows.length>100)throw Error('محدودیت تعداد رکورد رعایت نشده');
 if(response.rows.some(r=>r.kind!==domain||!r.id))throw Error('سوابق خارج از حوزه تخصصی دریافت شد');
 return response;
}
export function validMenu(x,workspace){
 if(!x||x.workspace?.assignmentId!==workspace?.assignmentId||!Array.isArray(x.sections))return [];
 return x.sections.filter(s=>Object.hasOwn(SECTION_LABELS,s));
}
export function safeSummaryCount(s,assignmentId){
 if(!s||s.assignmentId!==assignmentId||s.counts?.attributedCases===undefined||s.counts.attributedCases===null)return null;
 const n=s.counts.attributedCases;return Number.isSafeInteger(n)&&n>=0?n:null;
}
