import {ClientError,uuid,requiredString,choice,number} from './domain.mjs';
export const TWIN_SOURCE_PARTS=Object.freeze(['twin-data-sources','twin-source-samples','twin-source-summary','data-trust-overview']);
const READ=new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','OPERATOR','AUDITOR','VIEWER']);
const WRITE=new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','OPERATOR']);
const REVIEW=new Set(['MUNICIPAL_ADMIN','DEPUTY']);
export function assertRead(role){if(!READ.has(role))throw new ClientError('دسترسی مشاهده منابع دوقلو مجاز نیست',403);}
export function assertWrite(role){if(!WRITE.has(role))throw new ClientError('مجوز ثبت منبع یا داده ندارید',403);}
export function assertReview(role,actor,owner){if(!REVIEW.has(role))throw new ClientError('تنها مدیر یا معاون می‌تواند بررسی کند',403);if(actor===owner)throw new ClientError('بررسی مستقل توسط ثبت‌کننده مجاز نیست',403);}
function exactText(v,name,max,min=1){const x=requiredString(v,name,max);if(x.length<min)throw new ClientError(`${name} کوتاه است`);return x;}
export function parseSource(b){if(!b||typeof b!=='object'||Array.isArray(b))throw new ClientError('منبع معتبر نیست');
 const category=choice(b.category,['GIS_SNAPSHOT','IOT_SNAPSHOT'],'نوع منبع');
 const metricCode=exactText(b.metricCode,'کد شاخص',50,3);if(!/^[a-z][a-z0-9_]{2,49}$/.test(metricCode))throw new ClientError('کد شاخص نامعتبر است');
 const expectedIntervalMinutes=number(b.expectedIntervalMinutes,'بازه تازگی');if(!Number.isInteger(expectedIntervalMinutes)||expectedIntervalMinutes<1||expectedIntervalMinutes>43200)throw new ClientError('بازه تازگی باید بین ۱ تا ۴۳۲۰۰ دقیقه باشد');
 return {twinId:uuid(b.twinId,'شناسه دوقلو'),category,providerLabel:exactText(b.providerLabel,'نام سامانه مرجع',150,4),externalResourceRef:exactText(b.externalResourceRef,'ارجاع بیرونی',250,5),metricCode,unit:exactText(b.unit,'واحد شاخص',50),expectedIntervalMinutes};
}
export function parseSample(b){if(!b||typeof b!=='object'||Array.isArray(b))throw new ClientError('نمونه معتبر نیست');
 const value=number(b.value,'مقدار');if(Math.abs(value)>1e12||Math.abs(Math.round(value*10000)-value*10000)>1e-6)throw new ClientError('مقدار باید حداکثر چهار رقم اعشار داشته باشد');
 const externalEventId=exactText(b.externalEventId,'شناسه یکتای مشاهده',120,6);if(!/^[\p{L}0-9_.:-]{6,120}$/u.test(externalEventId))throw new ClientError('شناسه مشاهده باید بدون فاصله و کاراکتر کنترلی باشد');
 const sourceReference=exactText(b.sourceReference,'منبع قابل بررسی',500,8);
 if(typeof b.observedAt!=='string'||!/^(?:\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(b.observedAt))throw new ClientError('زمان باید ISO UTC باشد');
 const ts=Date.parse(b.observedAt);if(!Number.isFinite(ts)||ts<Date.UTC(2000,0,1)||ts>Date.now()+300000)throw new ClientError('زمان اندازه‌گیری خارج از بازه معتبر است');
 if(new Date(ts).toISOString().slice(0,10)!==b.observedAt.slice(0,10))throw new ClientError('تاریخ مشاهده معتبر نیست');
 const coordNull=b.latitude===null||b.latitude===undefined||b.latitude==='';const lonNull=b.longitude===null||b.longitude===undefined||b.longitude==='';
 if(coordNull!==lonNull)throw new ClientError('مختصات باید همزمان وارد شوند');
 const latitude=coordNull?null:number(b.latitude,'عرض جغرافیایی'),longitude=lonNull?null:number(b.longitude,'طول جغرافیایی');
 if(latitude!==null&&(latitude < -90||latitude > 90||longitude < -180||longitude >180))throw new ClientError('مختصات WGS84 خارج از بازه مجاز است');
 if(latitude!==null&&([latitude,longitude].some(v=>Math.abs(Math.round(v*1e6)-v*1e6)>1e-6)))throw new ClientError('مختصات باید حداکثر شش رقم اعشار داشته باشند');
 return {sourceId:uuid(b.sourceId,'منبع'),externalEventId,value,observedAt:b.observedAt,sourceReference,latitude,longitude};
}
export function parseReview(b){if(!b||typeof b!=='object')throw new ClientError('بررسی نامعتبر است');const decision=choice(b.decision,['ACCEPT','REJECT'],'نتیجه بررسی');const note=exactText(b.note,'شواهد بررسی',1500,12);return {decision,note};}
export function freshness(observedAt,intervalMinutes,reviewStatus,now=Date.now()){
 if(reviewStatus!=='ACCEPTED')return 'UNVERIFIED';
 const elapsed=now-Date.parse(observedAt);if(!Number.isFinite(elapsed)||elapsed<0)return 'INVALID_TIME';
 return elapsed<=intervalMinutes*60000?'WITHIN_DEFINED_INTERVAL':'STALE';
}
