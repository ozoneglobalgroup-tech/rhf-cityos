// RHF City OS V8P6.3: strictly exploratory normalized what-if analysis.
// Twin observations remain source snapshots; no calibration, autonomous action or verified outcome.
export const TWIN_LAB_VERSION='RHF-DIGITAL-TWIN-DECISION-LAB-V8P6.3';
export const EXPERIMENT_SOURCE='SYNTHETIC_WHAT_IF_NOT_FORECAST';
export const TWIN_SOURCE='RUVOS_SCOPED_TWIN_SNAPSHOTS';
export const STARTER_CASES=Object.freeze([
 ['WASTE','مدیریت پسماند','ظرفیت جمع‌آوری و نوسان حجم پسماند','نسبت پوشش خدمت'],
 ['GREEN','فضای سبز','تقاضای آبیاری و ظرفیت نگهداشت','شاخص پاسخ‌گویی نگهداشت'],
 ['FLEET','ناوگان','خرابی خودرو و ظرفیت عملیاتی','شاخص دسترس‌پذیری'],
 ['CONTRACTORS','پیمانکاران','حجم تعهدات و منابع نظارت','شاخص پوشش تعهد'],
 ['MARKETS','میادین و مشاغل','نوسان تقاضا و ظرفیت خدمات','شاخص پاسخ‌گویی'],
 ['CLEANING','نظافت عمومی','تراکم خدمت و نیروی اجرایی','شاخص پوشش عملیات'],
 ['CEMETERY','آرامستان‌ها','حجم مراجعه و ظرفیت خدمت','شاخص توان پاسخ‌گویی'],
 ['ENVIRONMENT','محیط‌زیست','حجم پایش و ظرفیت سنجش','شاخص پوشش پایش'],
 ['BEAUTY','زیباسازی','تراکم درخواست و ظرفیت اجرا','شاخص انجام کار'],
 ['FIRE','ایمنی و آتش‌نشانی (مشروط به ساختار)','حجم مأموریت و ظرفیت آماده‌باش','شاخص آمادگی نمایشی'],
 ['CITIZEN','آموزش و مشارکت','تقاضای آموزش و ظرفیت پوشش','شاخص پوشش آموزشی'],
 ['STAFF','منابع انسانی','حجم کار و ظرفیت نیروی انسانی','شاخص تاب‌آوری نیروی کار']
].map(([key,name,question,measure])=>Object.freeze({key,name,question,measure})));
export const PRESETS=Object.freeze([
 {id:'BASE',name:'وضع موجود فرضی',demand:100,capacity:100,efficiency:100,assumption:'مرجع مقایسه نمایشی؛ نه وضعیت واقعی شهرداری'},
 {id:'OPT',name:'بهینه‌سازی فرایند',demand:100,capacity:100,efficiency:115,assumption:'اثر فرضی بهبود بهره‌وری بدون افزایش ظرفیت'},
 {id:'CAP',name:'افزایش ظرفیت',demand:100,capacity:120,efficiency:100,assumption:'اثر فرضی افزایش منابع قابل استفاده'},
 {id:'SHOCK',name:'افزایش ناگهانی تقاضا',demand:140,capacity:100,efficiency:100,assumption:'آزمون حساسیت در برابر افزایش تقاضا'}
]);
export const LIMITS=Object.freeze({demand:[70,160],capacity:[70,150],efficiency:[70,130]});
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const safe=(s,max=180)=>typeof s==='string'?s.replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,max):'';
export function boundedDriver(field,value){const limits=LIMITS[field];if(!limits||!Number.isInteger(value)||value<limits[0]||value>limits[1])throw Error('DRIVER_OUT_OF_RANGE');return value;}
export function analyzeWhatIf(input){
 const demand=boundedDriver('demand',input?.demand),capacity=boundedDriver('capacity',input?.capacity),efficiency=boundedDriver('efficiency',input?.efficiency);
 const coverage=Math.round(100*capacity/100*efficiency/100/(demand/100));
 const pressure=Math.round(100*demand/100/(capacity/100*efficiency/100));
 const resourceIndex=capacity;
 const riskIndex=Math.max(0,Math.min(200,Math.round((pressure-75)*1.25)));
 return Object.freeze({coverage:Math.min(200,coverage),pressure:Math.min(200,pressure),resourceIndex,riskIndex,source:EXPERIMENT_SOURCE,forecast:false,validated:false,benefitVerified:false,actionsExecuted:0,model:'ILLUSTRATIVE_RATIO_INDEX_V1'});
}
export function rankExamples(inputs){if(!Array.isArray(inputs)||inputs.length<2||inputs.length>4)throw Error('SCENARIO_COUNT');return inputs.map(p=>({...p,output:analyzeWhatIf(p)}));}
export function validateTwinRead(city,twins,observations,sources,samples){
 if(!uuid.test(city)||!twins||twins.scope!==city||!Array.isArray(twins.rows)||twins.rows.length>100||!observations||observations.scope!==city||!Array.isArray(observations.rows)||observations.rows.length>100||!sources||!Array.isArray(sources.rows)||sources.rows.length>100||!samples||!Array.isArray(samples.rows)||samples.rows.length>100)return null;
 const twinById=new Map();
 for(const t of twins.rows){if(!t||!uuid.test(t.id)||t.municipality_id!==city||!uuid.test(t.tenant_id)||!uuid.test(t.case_id)||typeof t.name!=='string'||t.name.length>180||twinById.has(t.id))return null;twinById.set(t.id,t);}
 const sourceById=new Map();
 for(const s of sources.rows){if(!s||!uuid.test(s.id)||!uuid.test(s.twin_id)||!twinById.has(s.twin_id)||s.municipality_id!==city||s.tenant_id!==twinById.get(s.twin_id).tenant_id||!['GIS_SNAPSHOT','IOT_SNAPSHOT'].includes(s.category)||!Number.isInteger(s.expected_interval_minutes)||s.expected_interval_minutes<1||sourceById.has(s.id))return null;sourceById.set(s.id,s);}
 const accepted=[];
 for(const o of observations.rows){if(!o||!uuid.test(o.id)||!uuid.test(o.twin_id)||!twinById.has(o.twin_id)||o.municipality_id!==city||o.tenant_id!==twinById.get(o.twin_id).tenant_id||!['ACCEPTED','REJECTED','SUBMITTED'].includes(o.review_status)||(o.measured_value===null||o.measured_value===undefined||o.measured_value===''||!Number.isFinite(Number(o.measured_value)))||!Number.isFinite(Date.parse(o.observed_at)))return null;
  if(o.review_status==='ACCEPTED')accepted.push({twinId:o.twin_id,metric:safe(o.metric_label||o.metric_code),value:Number(o.measured_value),unit:safe(o.unit,60),sourceRef:safe(o.source_reference,300),at:o.observed_at,type:'MANUAL_REVIEWED'});
 }
 let acceptedSourceSamples=0;
 for(const sm of samples.rows){if(!sm||!uuid.test(sm.id)||!uuid.test(sm.source_id)||!sourceById.has(sm.source_id)||sm.municipality_id!==city||sm.tenant_id!==sourceById.get(sm.source_id).tenant_id||(sm.measured_value===null||sm.measured_value===undefined||sm.measured_value===''||!Number.isFinite(Number(sm.measured_value)))||!Number.isFinite(Date.parse(sm.observed_at)))return null;
  if(sm.review_status==='ACCEPTED')acceptedSourceSamples++;
 }
 accepted.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
 return Object.freeze({scope:city,source:TWIN_SOURCE,twins:twins.rows.map(t=>({id:t.id,name:safe(t.name),type:safe(t.twin_type,30),geographicReference:safe(t.geographic_reference,200),caseId:t.case_id,acceptedCount:Number.isSafeInteger(t.accepted_count)?t.accepted_count:null})),approvedSources:sources.rows.filter(s=>s.review_status==='APPROVED').length,allSources:sources.rows.length,acceptedObservations:accepted,acceptedSourceSamples,limited:twins.rows.length===100||observations.rows.length===100||sources.rows.length===100||samples.rows.length===100,liveConnected:false,calibrated:false,publicValueVerified:false});
}
export function twinReadiness(data){if(!data)return {state:'UNAVAILABLE',detail:'داده مجاز یا پاسخ معتبر دریافت نشده'};if(!data.twins.length)return {state:'EMPTY',detail:'هیچ دوقلوی ثبت‌شده‌ای برای این شهرداری دریافت نشد'};if(!data.acceptedObservations.length&&!data.acceptedSourceSamples)return {state:'NO_REVIEWED',detail:'دوقلو ثبت شده ولی مشاهده پذیرفته‌شده موجود نیست'};return {state:'SNAPSHOT_ONLY',detail:'مشاهدات بررسی‌شده موجودند؛ مدل شبیه‌سازی هنوز کالیبره نیست'};}
export function decisionMemo({cityName,domain,region,preset,result,reference}){
 if(!domain||!preset||!result||result.source!==EXPERIMENT_SOURCE)throw Error('MEMO_SCOPE_INVALID');
 return [`RHF City OS V8P6.3 — برگه مقایسه سناریو (صرفاً آزمایشی)`,`شهرداری: ${safe(cityName)||'جاری'}`,`حوزه: ${domain.name}`,`محدوده فرضی: ${safe(region)}`,`سناریو: ${preset.name}`,`تقاضا: ${preset.demand}% | ظرفیت: ${preset.capacity}% | کارایی: ${preset.efficiency}%`,`شاخص نسبی پوشش: ${result.coverage} | فشار: ${result.pressure} | منابع: ${result.resourceIndex} | ریسک نسبی: ${result.riskIndex}`,`مرجع مشاهدات: ${safe(reference)||'فاقد مشاهده معتبر متصل'}`,`محدودیت: مدل نسبتی نمونه است؛ پیش‌بینی، صرفه‌جویی مالی، فرمان عملیاتی یا ارزش شهری اثبات‌شده نیست.`,`تصمیم، اجرای ایجنت و تصویب فقط پس از تأیید انسانی و اتصال به پرونده و شواهد معتبر مجاز است.`].join('\n');
}
