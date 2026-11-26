import {ClientError,uuid} from './domain.mjs';
import {PULL_PARTS,assertPullRole,readPullConfig,assertConfigScope,parseUpstreamData,getPinnedJSON,compareSameSample} from './twin-pull-core.mjs';
export {PULL_PARTS};
const inFlight=new Set(),lastTry=new Map();
export async function twinPullRoute({part,method,resourceId,cityId,user,withScope,json,audit,fetchJSON=getPinnedJSON,env=process.env}){
 if(part!=='twin-pull'||!['GET','POST'].includes(method)||!resourceId)throw new ClientError('مسیر اتصال دوقلو نامعتبر است',404);
 const sourceId=uuid(resourceId,'منبع دوقلو'),cityUuid=uuid(cityId,'شهرداری');
 // Authorization and city scope are checked before exposing configuration or network requests.
 const source=await withScope(cityUuid,user,'read',async(client,city,role)=>{
  assertPullRole(role);
  const r=await client.query('SELECT * FROM city_twin_data_sources WHERE id=$1',[sourceId]);
  if(!r.rowCount)throw new ClientError('منبع در محدوده شهرداری پیدا نشد',404);
  return r.rows[0];
 });
 const configured=readPullConfig(env);
 const active=configured.enabled && configured.cityId===cityUuid && configured.sourceId===sourceId;
 if(method==='GET')return json(200,{enabled:active,mode:'MANUAL_HTTPS_PULL',autoPoll:false,sourceApproved:source.review_status==='APPROVED',format:active?configured.format:null,notice:'دریافت تنها با درخواست مدیر و از Endpoint ثابت سرور؛ مشاهدات تا بررسی مستقل، تأییدشده نیستند.'});
 if(!active)throw new ClientError('اتصال منبع در سرور فعال یا پیکربندی نشده است',409);
 assertConfigScope(configured,cityUuid,sourceId);
 if(source.review_status!=='APPROVED')throw new ClientError('منبع پیش از دریافت باید تأیید مستقل داشته باشد',409);
 if(configured.format==='GEOJSON_POINT_V1'&&source.category!=='GIS_SNAPSHOT')throw new ClientError('قالب GeoJSON فقط برای GIS مجاز است',409);
 const lock=`${cityUuid}:${sourceId}`,now=Date.now();
 if(inFlight.has(lock))throw new ClientError('دریافت قبلی هنوز در حال انجام است',429);
 if(now-(lastTry.get(lock)||0)<30000)throw new ClientError('بین دریافت‌های یک منبع حداقل ۳۰ ثانیه فاصله لازم است',429);
 inFlight.add(lock);lastTry.set(lock,now);
 try{
  const data=await fetchJSON(configured);
  if(configured.format==='RHF_JSON_V1'&&['Feature','FeatureCollection'].includes(data?.type))throw new ClientError('قالب خروجی با تنظیمات Connector سازگار نیست',422);
  if(configured.format==='GEOJSON_POINT_V1'&&!['Feature','FeatureCollection'].includes(data?.type))throw new ClientError('پاسخ GeoJSON Point مورد انتظار است',422);
  const sample=parseUpstreamData(data,source);
  const outcome=await withScope(cityUuid,user,'write',async(client,city,role)=>{
   assertPullRole(role);
   const fresh=(await client.query('SELECT id,review_status,category FROM city_twin_data_sources WHERE id=$1 FOR SHARE',[sourceId])).rows[0];
   if(!fresh||fresh.review_status!=='APPROVED'||fresh.category!==source.category)throw new ClientError('وضعیت منبع در حین دریافت تغییر کرده است',409);
   const r=await client.query(`INSERT INTO city_twin_source_samples(tenant_id,municipality_id,source_id,external_event_id,measured_value,observed_at,source_reference,latitude,longitude,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (tenant_id,municipality_id,source_id,external_event_id) DO NOTHING RETURNING id,review_status,observed_at`,
    [city.tenant_id,city.id,sourceId,sample.externalEventId,sample.value,sample.observedAt,sample.sourceReference,sample.latitude,sample.longitude,user.id]);
   if(r.rowCount){await audit(client,city,user,'TWIN_CONNECTOR',sourceId,'SAMPLE_RECEIVED',{eventId:sample.externalEventId,mode:'MANUAL_HTTPS',sampleId:r.rows[0].id});return {imported:true,duplicate:false,sampleId:r.rows[0].id,reviewStatus:r.rows[0].review_status};}
   const existing=(await client.query('SELECT id,measured_value,observed_at,source_reference,latitude,longitude,review_status FROM city_twin_source_samples WHERE source_id=$1 AND external_event_id=$2',[sourceId,sample.externalEventId])).rows[0];
   if(!existing||!compareSameSample(existing,sample))throw new ClientError('شناسه رویداد تکراری با داده متفاوت؛ نیاز به بررسی منبع',409);
   return {imported:false,duplicate:true,sampleId:existing.id,reviewStatus:existing.review_status};
  });
  return json(outcome.imported?201:200,{...outcome,automaticApproval:false,verifiedPublicValue:false,liveStream:false});
 }finally{inFlight.delete(lock);}
}
