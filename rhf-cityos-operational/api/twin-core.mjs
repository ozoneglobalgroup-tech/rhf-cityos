import {ClientError,uuid,requiredString,choice,number} from './domain.mjs';
export const TWIN_PARTS=Object.freeze(['digital-twins','twin-observations','twin-summary']);
export const TWIN_TYPES=Object.freeze(['GREEN_SPACE','FLEET','WASTE','PROCESS','INFRASTRUCTURE','SERVICE']);
const WRITE_ROLES=new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','OPERATOR']);
const REVIEW_ROLES=new Set(['MUNICIPAL_ADMIN','DEPUTY']);
export function ensureRead(role){if(!['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','OPERATOR','AUDITOR','VIEWER'].includes(role))throw new ClientError('نقش دسترسی به دوقلو مجاز نیست',403);}
export function ensureWrite(role){if(!WRITE_ROLES.has(role))throw new ClientError('دسترسی ثبت دوقلو یا مشاهده وجود ندارد',403);}
export function ensureIndependent(role,reviewer,creator){if(!REVIEW_ROLES.has(role))throw new ClientError('بررسی داده فقط توسط مدیر یا معاون مجاز است',403);if(reviewer===creator)throw new ClientError('ثبت‌کننده نمی‌تواند داده خود را تأیید کند',403);}
export function parseTwin(b){if(!b||typeof b!=='object')throw new ClientError('اطلاعات دوقلو معتبر نیست'); const out={caseId:uuid(b.caseId,'پرونده'),twinType:choice(b.twinType,TWIN_TYPES,'نوع دوقلو'),name:requiredString(b.name,'نام دوقلو',180),sourceReference:requiredString(b.sourceReference,'منبع معرفی دارایی',400),geographicReference:typeof b.geographicReference==='string'&&b.geographicReference.length<=400?b.geographicReference:''};if(out.name.length<5||out.sourceReference.length<5)throw new ClientError('نام یا مرجع معرفی کوتاه است');return out;}
export function parseObservation(b){if(!b||typeof b!=='object')throw new ClientError('مشاهده نامعتبر است');
 const v=number(b.value,'مقدار مشاهده');if(Math.abs(v)>1e12||Math.abs(Math.round(v*10000)-v*10000)>1e-6)throw new ClientError('مقدار مشاهده باید تا چهار رقم اعشار و در دامنه مجاز باشد');
 const code=requiredString(b.metricCode,'کد شاخص',50);if(!/^[a-z][a-z0-9_]{2,49}$/.test(code))throw new ClientError('کد شاخص فقط لاتین و حروف کوچک باشد');
 if(typeof b.observedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(b.observedAt)||!Number.isFinite(Date.parse(b.observedAt)))throw new ClientError('زمان مشاهده باید ISO UTC معتبر باشد');
 const t=Date.parse(b.observedAt);if(t>Date.now()+300000||t<Date.UTC(2000,0,1))throw new ClientError('زمان مشاهده خارج از محدوده قابل قبول است');
 const out={twinId:uuid(b.twinId,'دوقلو'),metricCode:code,metricLabel:requiredString(b.metricLabel,'نام شاخص',150),unit:requiredString(b.unit,'واحد',60),value:v,observedAt:b.observedAt,sourceReference:requiredString(b.sourceReference,'مستند اندازه‌گیری',600),note:typeof b.note==='string'&&b.note.length<=1000?b.note:''};if(out.metricLabel.length<2||out.sourceReference.length<8)throw new ClientError('نام شاخص یا شواهد کوتاه است');return out;
}
export function parseReview(b){return {decision:choice(b.decision,['ACCEPT','REJECT'],'تصمیم'),note:requiredString(b.note,'توضیح بررسی',1500)};}
export function assertEvidenceLength(s){if(s.trim().length<12)throw new ClientError('برای بررسی مستقل حداقل ۱۲ کاراکتر مستند لازم است');}
