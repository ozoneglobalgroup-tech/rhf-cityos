export class ClientError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export const VALID_ROLES=['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','OPERATOR','AUDITOR','VIEWER'];
export const WRITE_ROLES=['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','OPERATOR'];
export const MANAGE_ROLES=['MUNICIPAL_ADMIN','DEPUTY'];
export const CASE_TRANSITIONS={
 RECEIVED:['TRIAGED','REJECTED'],TRIAGED:['ASSIGNED','REJECTED'],
 ASSIGNED:['IN_PROGRESS','REJECTED'],IN_PROGRESS:['AWAITING_ACCEPTANCE','REJECTED'],
 AWAITING_ACCEPTANCE:['CLOSED','IN_PROGRESS'],CLOSED:[],REJECTED:[]
};
export const MISSION_TRANSITIONS={PLANNED:['ACTIVE','CANCELLED'],ACTIVE:['DONE','CANCELLED'],DONE:[],CANCELLED:[]};
export function transition(from,to,graph){if(!graph[from]?.includes(to))throw new ClientError(`انتقال وضعیت ${from} به ${to} مجاز نیست`,409);}
export function requiredString(value,name,max=250){if(typeof value!=='string'||!value.trim()||value.length>max)throw new ClientError(`مقدار ${name} معتبر نیست`);return value.trim();}
export function uuid(value,name='شناسه'){if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value))throw new ClientError(`${name} نامعتبر است`);return value;}
export function choice(value,allowed,name){if(!allowed.includes(value))throw new ClientError(`${name} مجاز نیست`);return value;}
export function amount(x,name){if(!Number.isSafeInteger(x)||x<0)throw new ClientError(`${name} باید یک عدد صحیح مثبت یا صفر باشد`);return x;}
export function number(x,name){if(typeof x!=='number'||!Number.isFinite(x))throw new ClientError(`${name} معتبر نیست`);return x;}
export function valueOf(row){if(row.status!=='VERIFIED')return 0;const {baseline_cost_minor:b,actual_cost_minor:a,implementation_cost_minor:i,attribution_bps:p}=row;return Math.round((Number(b)-Number(a))*Number(p)/10000-Number(i));}
export function canWrite(role){return WRITE_ROLES.includes(role);}
export function canManage(role){return MANAGE_ROLES.includes(role);}

export function validateService(b){
 if(!b||typeof b!=='object')throw new ClientError('اطلاعات خدمت نامعتبر است');
 const code=requiredString(b.code,'کد خدمت',60).toUpperCase();
 if(!/^[A-Z0-9_-]{2,60}$/.test(code))throw new ClientError('کد خدمت باید لاتین، بدون فاصله و یکتا باشد');
 const name=requiredString(b.name,'نام خدمت',200),moduleCode=requiredString(b.moduleCode,'حوزه خدمت',64);
 const slaHours=b.slaHours;if(!Number.isInteger(slaHours)||slaHours<1||slaHours>8760)throw new ClientError('زمان پاسخ باید بین ۱ تا ۸۷۶۰ ساعت باشد');
 const description=typeof b.description==='string'?b.description.slice(0,2000):'';
 const outcomeMetric=requiredString(b.outcomeMetric,'شاخص نتیجه',200);
 return {code,name,moduleCode,slaHours,description,outcomeMetric,ownerUnitId:b.ownerUnitId||null};
}
export function validateInspection(b){
 if(!b||typeof b!=='object')throw new ClientError('اطلاعات بازرسی نامعتبر است');
 const caseId=uuid(b.caseId,'پرونده'),result=choice(b.result,['PASS','FAIL'],'نتیجه بازرسی');
 return {caseId,result,evidence:requiredString(b.evidence,'شواهد بازرسی',2000),notes:typeof b.notes==='string'?b.notes.slice(0,1500):''};
}
