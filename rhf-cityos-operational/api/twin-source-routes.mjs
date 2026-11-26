import {ClientError,uuid} from './domain.mjs';
import {TWIN_SOURCE_PARTS,assertRead,assertWrite,assertReview,parseSource,parseSample,parseReview,freshness} from './twin-source-core.mjs';
import {dataTrustOverview} from './data-trust-core.mjs';
export {TWIN_SOURCE_PARTS};
export async function twinSourceRoute({part,method,resourceId,req,url,client,city,user,role,readBody,audit}){
 assertRead(role);
 const q=(sql,values=[])=>client.query(sql,values);
 if(part==='data-trust-overview'){
  if(method!=='GET'||resourceId)throw new ClientError('فقط مشاهده داده معتبر مجاز است',404);
  return dataTrustOverview({client,city,role});
 }
 if(part==='twin-source-summary'&&method==='GET'&&!resourceId){
  const a=(await q(`SELECT count(*)::int AS sources,count(*) FILTER(WHERE review_status='APPROVED')::int AS approved_sources FROM city_twin_data_sources`)).rows[0];
  const b=(await q(`SELECT count(*)::int AS samples,count(*) FILTER(WHERE review_status='ACCEPTED')::int AS reviewed_samples FROM city_twin_source_samples`)).rows[0];
  return {...a,...b,liveIoT:false,autoPoll:false,notice:'نمونه‌های واردشده از منبع GIS/IoT فقط شواهد بارگذاری‌شده‌اند، نه اتصال زنده یا منفعت اثبات‌شده.'};
 }
 if(part==='twin-data-sources'&&method==='GET'&&!resourceId){
  const twinId=url.searchParams.get('twinId');const args=twinId?[uuid(twinId,'دوقلو')]:[];
  const r=await q(`SELECT s.*,t.name AS twin_name FROM city_twin_data_sources s JOIN city_digital_twins t ON (t.id=s.twin_id AND t.tenant_id=s.tenant_id AND t.municipality_id=s.municipality_id)
   ${twinId?'WHERE s.twin_id=$1':''} ORDER BY s.created_at DESC,s.id DESC LIMIT 100`,args);
  return {rows:r.rows,limit:100,liveIoT:false};
 }
 if(part==='twin-data-sources'&&method==='POST'&&!resourceId){
  assertWrite(role);const b=parseSource(await readBody(req));
  const hit=await q('SELECT id FROM city_digital_twins WHERE id=$1',[b.twinId]);if(!hit.rowCount)throw new ClientError('دوقلو در این شهرداری وجود ندارد',404);
  let row;try{row=(await q(`INSERT INTO city_twin_data_sources(tenant_id,municipality_id,twin_id,category,provider_label,external_resource_ref,metric_code,unit,expected_interval_minutes,created_by)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[city.tenant_id,city.id,b.twinId,b.category,b.providerLabel,b.externalResourceRef,b.metricCode,b.unit,b.expectedIntervalMinutes,user.id])).rows[0];}
  catch(e){if(e.code==='23505')throw new ClientError('این منبع برای دوقلو قبلاً ثبت شده است',409);throw e;}
  await audit(client,city,user,'TWIN_DATA_SOURCE',row.id,'REGISTERED',{twinId:b.twinId,category:b.category});return {source:row,liveIoT:false};
 }
 if(part==='twin-data-sources'&&method==='PATCH'&&resourceId){
  const b=parseReview(await readBody(req));const id=uuid(resourceId,'شناسه منبع');const row=(await q('SELECT * FROM city_twin_data_sources WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!row)throw new ClientError('منبع در این شهرداری یافت نشد',404);assertReview(role,user.id,row.created_by);
  if(row.review_status!=='REGISTERED')throw new ClientError('منبع قبلاً بررسی شده است',409);
  const status=b.decision==='ACCEPT'?'APPROVED':'REJECTED';
  const updated=(await q('UPDATE city_twin_data_sources SET review_status=$2,review_note=$3,reviewed_by=$4,reviewed_at=now() WHERE id=$1 RETURNING *',[id,status,b.note,user.id])).rows[0];
  await audit(client,city,user,'TWIN_DATA_SOURCE',id,status,{review:'PROVENANCE_ONLY'});return {source:updated,liveIoT:false};
 }
 if(part==='twin-source-samples'&&method==='GET'&&!resourceId){
  const sourceId=url.searchParams.get('sourceId');const args=sourceId?[uuid(sourceId,'منبع')]:[];
  const r=await q(`SELECT sm.*,s.metric_code,s.unit,s.category,s.provider_label,s.expected_interval_minutes,s.twin_id
   FROM city_twin_source_samples sm JOIN city_twin_data_sources s ON (s.id=sm.source_id AND s.tenant_id=sm.tenant_id AND s.municipality_id=sm.municipality_id)
   ${sourceId?'WHERE sm.source_id=$1':''} ORDER BY sm.observed_at DESC,sm.id DESC LIMIT 100`,args);
  return {rows:r.rows.map(x=>({...x,freshness:freshness(x.observed_at,x.expected_interval_minutes,x.review_status)})),limit:100,liveIoT:false};
 }
 if(part==='twin-source-samples'&&method==='POST'&&!resourceId){
  assertWrite(role);const b=parseSample(await readBody(req));
  const src=(await q('SELECT * FROM city_twin_data_sources WHERE id=$1 FOR SHARE',[b.sourceId])).rows[0];
  if(!src)throw new ClientError('منبع متعلق به شهرداری جاری نیست',404);
  if(src.review_status!=='APPROVED')throw new ClientError('منبع هنوز مستقل تأیید نشده است',409);
  if(src.category==='GIS_SNAPSHOT'&&b.latitude===null)throw new ClientError('برای منبع GIS مختصات الزامی است',400);
  if(src.category==='IOT_SNAPSHOT'&&b.latitude!==null)throw new ClientError('در نوع IoT این نسخه، مختصات مکانی از منبع GIS ثبت می‌شود',400);
  let row;try{row=(await q(`INSERT INTO city_twin_source_samples(tenant_id,municipality_id,source_id,external_event_id,measured_value,observed_at,source_reference,latitude,longitude,created_by)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[city.tenant_id,city.id,b.sourceId,b.externalEventId,b.value,b.observedAt,b.sourceReference,b.latitude,b.longitude,user.id])).rows[0];}
  catch(e){if(e.code==='23505')throw new ClientError('این شناسه رویداد قبلاً دریافت شده است',409);throw e;}
  await audit(client,city,user,'TWIN_SOURCE_SAMPLE',row.id,'SUBMITTED',{sourceId:b.sourceId,eventId:b.externalEventId});return {sample:row,liveIoT:false,verifiedPublicValue:false};
 }
 if(part==='twin-source-samples'&&method==='PATCH'&&resourceId){
  const id=uuid(resourceId,'شناسه نمونه'),b=parseReview(await readBody(req));
  const found=(await q('SELECT * FROM city_twin_source_samples WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!found)throw new ClientError('نمونه در این شهرداری یافت نشد',404);assertReview(role,user.id,found.created_by);
  if(found.review_status!=='SUBMITTED')throw new ClientError('بررسی نمونه قبلاً انجام شده است',409);
  const status=b.decision==='ACCEPT'?'ACCEPTED':'REJECTED';
  const row=(await q('UPDATE city_twin_source_samples SET review_status=$2,review_note=$3,reviewed_by=$4,reviewed_at=now() WHERE id=$1 RETURNING *',[id,status,b.note,user.id])).rows[0];
  await audit(client,city,user,'TWIN_SOURCE_SAMPLE',id,status,{review:'SOURCE_NOT_PUBLIC_VALUE'});
  return {sample:row,verifiedPublicValue:false};
 }
 throw new ClientError('مسیر منبع دوقلو وجود ندارد',404);
}
