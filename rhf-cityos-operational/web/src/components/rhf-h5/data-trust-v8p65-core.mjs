/* V8P6.5: fail-closed client contract, not a source of operational truth. */
export const DATA_TRUST_UI_VERSION='RHF-TRUSTED-MUNICIPAL-DATA-V8P6.5';
export const TRUST_STATE=Object.freeze({FRESH_REVIEWED_SNAPSHOT:{label:'مشاهده پذیرفته‌شده در بازه اعلامی',tone:'good'},STALE_REVIEWED_SNAPSHOT:{label:'مشاهده بررسی‌شده اما قدیمی',tone:'warn'},NO_REVIEWED_OBSERVATION:{label:'بدون مشاهده پذیرفته‌شده',tone:'warn'},SOURCE_NOT_APPROVED:{label:'منبع هنوز تأیید نشده',tone:'danger'},INVALID_FRESHNESS:{label:'تازگی قابل اتکا نیست',tone:'danger'}});
export const CATALOG_KEYS=Object.freeze(['GIS','IOT','FLEET','FINANCE','HR','CITIZEN_137','CONTRACTS','PAYMENT']);
const idRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str=(x,max)=>typeof x==='string'&&x.length<=max;
const ns=x=>Number.isSafeInteger(x)&&x>=0;
export function validateDataTrust(city,p){
 if(!p||Array.isArray(p)||p.version!=='RHF-DATA-TRUST-V8P6.5')return null;
 if(!idRe.test(city||'')||p.municipalityId!==city||!idRe.test(p.tenantId)||p.readOnly!==true||p.liveIoT!==false||p.modelCalibrated!==false||p.publicValueVerified!==false||p.sourceBasis!=='RUVOS_REVIEWED_TWIN_SNAPSHOTS'||p.scope!=='MUNICIPALITY')return null;
 if(!str(p.generatedAt,40)||!Number.isFinite(Date.parse(p.generatedAt)))return null;
 if(typeof p.limited!=='boolean'||!Array.isArray(p.sources)||p.sources.length>100||!Array.isArray(p.connectors)||p.connectors.length!==8)return null;
 const seen=new Set(),keys=new Set();let approved=0,fresh=0,stale=0,other=0;
 for(const s of p.sources){
  if(!s||!idRe.test(s.id)||seen.has(s.id)||!idRe.test(s.twinId)||!['GIS_SNAPSHOT','IOT_SNAPSHOT'].includes(s.category)||!TRUST_STATE[s.status]||!str(s.providerLabel,150)||!str(s.twinName,250)||!str(s.metricCode,60)||!str(s.unit,60)||!ns(s.acceptedSamples)||!ns(s.totalSamples)||s.acceptedSamples>s.totalSamples||!['REGISTERED','APPROVED','REJECTED'].includes(s.sourceReviewStatus)||!Number.isInteger(s.expectedIntervalMinutes)||s.expectedIntervalMinutes<1||s.expectedIntervalMinutes>43200||s.liveConnected!==false||s.calibrated!==false||s.publicValueVerified!==false)return null;
  if(s.lastAcceptedAt!==null&&(!str(s.lastAcceptedAt,40)||!Number.isFinite(Date.parse(s.lastAcceptedAt))))return null;
  if(s.status==='FRESH_REVIEWED_SNAPSHOT'||s.status==='STALE_REVIEWED_SNAPSHOT'){if(s.sourceReviewStatus!=='APPROVED'||s.acceptedSamples<1||!s.lastAcceptedAt)return null;}else if(s.status==='SOURCE_NOT_APPROVED'&&s.sourceReviewStatus==='APPROVED')return null;
  seen.add(s.id);if(s.sourceReviewStatus==='APPROVED')approved++;if(s.status==='FRESH_REVIEWED_SNAPSHOT')fresh++;else if(s.status==='STALE_REVIEWED_SNAPSHOT')stale++;else other++;
 }
 for(const c of p.connectors){if(!c||!CATALOG_KEYS.includes(c.key)||keys.has(c.key)||c.state!=='NOT_VERIFIED_CONNECTED'||!str(c.title,120)||!str(c.type,45))return null;keys.add(c.key);}
 if(CATALOG_KEYS.some(k=>!keys.has(k)))return null;
 const x=p.summary;if(!x||x.registered!==p.sources.length||x.approvedSources!==approved||x.freshReviewedSnapshots!==fresh||x.staleReviewedSnapshots!==stale||x.missingOrUnreviewed!==other)return null;
 return p;
}
export function trustGuidance(status){return ({FRESH_REVIEWED_SNAPSHOT:'منشأ و تازگی بررسی شده است؛ صحت واقعی حسگر، اتصال زنده و مدل پیش‌بینی هنوز باید تأیید شوند.',STALE_REVIEWED_SNAPSHOT:'ثبت جدید، بررسی مستقل مجدد و کنترل زمان‌بندی دریافت لازم است.',NO_REVIEWED_OBSERVATION:'نمونه جدید ثبت شود و شخص مستقل آن را بررسی کند.',SOURCE_NOT_APPROVED:'ابتدا منشأ و مالک منبع توسط مقام مجاز بررسی شوند.',INVALID_FRESHNESS:'ساعت منبع، بازه گزارش‌دهی و قالب زمان اصلاح و تأیید شوند.'})[status]||'نیاز به بررسی.'}
export function trustMemo({cityName,data}){
 if(!data)return 'هیچ داده معتبر دریافت نشده است؛ گزارش اتصال تولید نشد.';
 return [`RHF City OS — بررسی منشأ و تازگی داده (${cityName||'شهرداری جاری'})`,data.generatedAt,'فقط مشاهدات ثبت‌شده؛ اتصال زنده احراز نشده.',`منابع ثبت‌شده در پاسخ: ${data.summary.registered}${data.limited?' (حداکثر ۱۰۰)': ''}`,`منابع تأییدشده: ${data.summary.approvedSources}`,`نمونه تازه و بررسی‌شده: ${data.summary.freshReviewedSnapshots}`,`نمونه بررسی‌شده اما قدیمی: ${data.summary.staleReviewedSnapshots}`,'هیچ نتیجه‌ای درباره صحت فیزیکی حسگر، کالیبراسیون دوقلو یا ارزش عمومی قابل استخراج نیست.'].join('\n');
}
