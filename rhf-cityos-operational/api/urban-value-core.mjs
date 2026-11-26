import {ClientError,requiredString,uuid,choice} from './domain.mjs';
export const VALUE_ROLES=['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','OPERATOR','AUDITOR'];
export const REVIEW_ROLES=['MUNICIPAL_ADMIN','DEPUTY'];
export const VALUE_DIMENSIONS=['SERVICE','EQUITY','ENVIRONMENT','FISCAL','TRUST','RESILIENCE','WELLBEING'];
export const BARRIERS=['DISCOVERY','LEGAL_ACCESS','QUALITY','SCHEDULING','COORDINATION','FUNDING','OTHER'];
export function canViewValue(role){return VALUE_ROLES.includes(role);}
export function canRecordValue(role){return ['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','OPERATOR'].includes(role);}
export function valueCaseInput(b){return {
 caseId:uuid(b.caseId,'شناسه پرونده'),
 title:requiredString(b.title,'عنوان فرصت',200),
 publicNeed:requiredString(b.publicNeed,'نیاز عمومی',2000),
 beneficiaries:requiredString(b.beneficiaries,'ذی‌نفعان',500),
 geography:requiredString(b.geography,'محدوده اثر',350),
 barrier:choice(b.barrier,BARRIERS,'مانع ظرفیت'),
 authorityReference:requiredString(b.authorityReference,'مرجع اختیار',500),
 baselineMethod:requiredString(b.baselineMethod,'روش خط مبنا',1300),
 comparator:requiredString(b.comparator,'مقایسه با وضع موجود',1300),
 valueDimension:choice(b.valueDimension,VALUE_DIMENSIONS,'بعد ارزش')
};}
export function matchInput(b){const n=Number(b.requestedQuantity);
 if(!Number.isFinite(n)||n<=0||n>1e12||Math.round(n*1000)!==n*1000)throw new ClientError('مقدار ظرفیت باید مثبت و حداکثر سه رقم اعشار باشد');
 return {valueCaseId:uuid(b.valueCaseId,'شناسه فرصت'),resourceId:uuid(b.resourceId,'شناسه منبع'),requestedQuantity:n,
  purpose:requiredString(b.purpose,'دلیل تطبیق',1100)};}
export function assertIndependentReviewer(actorId,authorId,role){if(!REVIEW_ROLES.includes(role))throw new ClientError('تأیید پیشنهاد نیازمند مدیر مجاز است',403);
 if(actorId===authorId)throw new ClientError('بررسی مستقل توسط ثبت‌کننده مجاز نیست',409);}
export function readinessGate(r,requested,alreadyReserved){if(!r?.authorized)throw new ClientError('منبع ظرفیت هنوز مجوز استفاده ندارد',409);
 const total=Number(r.total_quantity),reserve=Number(r.reserve_quantity),alloc=Number(r.allocatable_bps),quality=Number(r.quality_bps);
 if(![total,reserve,alloc,quality,alreadyReserved].every(Number.isFinite))throw new ClientError('کیفیت داده ظرفیت معتبر نیست',409);
 const effective=Math.max(0,(total*alloc*quality/1e8)-reserve-Number(alreadyReserved));
 if(requested>effective+1e-9)throw new ClientError('مقدار پیشنهادی از ظرفیت مؤثر آزاد بیشتر است',409);
 return {effectiveAvailable:Math.max(0,Math.floor(effective*1000)/1000)};
}
export function assertValidTransition(previous,next){const graph={DISCOVERY:['REVIEWED'],REVIEWED:[]};if(!graph[previous]?.includes(next))throw new ClientError('انتقال وضعیت فرصت مجاز نیست',409);}
