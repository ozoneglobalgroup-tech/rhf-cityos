/* RHF V8P6.5: evidence-bound data trust; NO LIVE CONNECTOR ASSERTIONS.
   Data trust here means reviewed snapshot provenance, never validated sensor truth. */
import {ClientError} from './domain.mjs';
import {assertRead} from './twin-source-core.mjs';
export const DATA_TRUST_VERSION='RHF-DATA-TRUST-V8P6.5';
export const TRUST_CATEGORIES=Object.freeze(['GIS_SNAPSHOT','IOT_SNAPSHOT']);
export const DECLARED_CONNECTORS=Object.freeze([
 {key:'GIS',title:'GIS / نقشه و دارایی مکانی',type:'SPATIAL'},
 {key:'IOT',title:'IoT / اندازه‌گیری حسگر',type:'SENSOR'},
 {key:'FLEET',title:'ناوگان و نگهداشت',type:'OPERATIONAL'},
 {key:'FINANCE',title:'مالی و بودجه',type:'FINANCIAL'},
 {key:'HR',title:'منابع انسانی',type:'ORGANIZATIONAL'},
 {key:'CITIZEN_137',title:'درخواست شهروندی / ۱۳۷',type:'SERVICE'},
 {key:'CONTRACTS',title:'قراردادها و پیمانکاران',type:'CONTRACTUAL'},
 {key:'PAYMENT',title:'پرداخت',type:'FINANCIAL'}
]);
export function trustStatus(r,now=Date.now()){
 if(!r||r.review_status!=='APPROVED')return 'SOURCE_NOT_APPROVED';
 const accepted=Number(r.accepted_count)||0;
 if(accepted<1||!r.latest_accepted_at)return 'NO_REVIEWED_OBSERVATION';
 const ts=Date.parse(r.latest_accepted_at),interval=Number(r.expected_interval_minutes);
 if(!Number.isFinite(ts)||ts>now+300000||!Number.isFinite(interval)||interval<1||interval>43200)return 'INVALID_FRESHNESS';
 return now-ts<=interval*60000?'FRESH_REVIEWED_SNAPSHOT':'STALE_REVIEWED_SNAPSHOT';
}
export function evaluateTrustRows(rows,city,now=Date.now()){
 if(!Array.isArray(rows)||rows.length>101||!city?.id||!city?.tenant_id)throw Error('INVALID_TRUST_SCOPE');
 const known=new Set(),items=[];
 for(const r of rows.slice(0,100)){
  if(!r||r.municipality_id!==city.id||r.tenant_id!==city.tenant_id||known.has(r.id)||!TRUST_CATEGORIES.includes(r.category))throw Error('UNTRUSTED_SOURCE_ROW');
  known.add(r.id);
  const accepted=Number(r.accepted_count),total=Number(r.sample_count);
  if(!Number.isSafeInteger(accepted)||accepted<0||!Number.isSafeInteger(total)||total<accepted||total<0)throw Error('INVALID_SAMPLE_COUNTS');
  const status=trustStatus(r,now);
  items.push({id:r.id,twinId:r.twin_id,twinName:String(r.twin_name||''),category:r.category,providerLabel:String(r.provider_label||''),metricCode:String(r.metric_code||''),unit:String(r.unit||''),sourceReviewStatus:r.review_status,expectedIntervalMinutes:Number(r.expected_interval_minutes),acceptedSamples:accepted,totalSamples:total,lastAcceptedAt:r.latest_accepted_at&&Number.isFinite(Date.parse(r.latest_accepted_at))?new Date(r.latest_accepted_at).toISOString():null,status,liveConnected:false,calibrated:false,publicValueVerified:false});
 }
 const summary={registered:items.length,approvedSources:items.filter(x=>x.sourceReviewStatus==='APPROVED').length,freshReviewedSnapshots:items.filter(x=>x.status==='FRESH_REVIEWED_SNAPSHOT').length,staleReviewedSnapshots:items.filter(x=>x.status==='STALE_REVIEWED_SNAPSHOT').length,missingOrUnreviewed:items.filter(x=>!['FRESH_REVIEWED_SNAPSHOT','STALE_REVIEWED_SNAPSHOT'].includes(x.status)).length};
 return {items,summary};
}
export async function dataTrustOverview({client,city,role,now=Date.now()}){
 assertRead(role);
 if(!city?.id||!city?.tenant_id)throw new ClientError('محدوده شهرداری معتبر نیست',403);
 const r=await client.query(`SELECT s.id,s.tenant_id,s.municipality_id,s.twin_id,t.name AS twin_name,s.category,s.provider_label,s.metric_code,s.unit,s.expected_interval_minutes,s.review_status,
 (SELECT count(*)::int FROM city_twin_source_samples x WHERE x.source_id=s.id AND x.tenant_id=s.tenant_id AND x.municipality_id=s.municipality_id) AS sample_count,
 (SELECT count(*)::int FROM city_twin_source_samples x WHERE x.source_id=s.id AND x.tenant_id=s.tenant_id AND x.municipality_id=s.municipality_id AND x.review_status='ACCEPTED') AS accepted_count,
 (SELECT max(x.observed_at) FROM city_twin_source_samples x WHERE x.source_id=s.id AND x.tenant_id=s.tenant_id AND x.municipality_id=s.municipality_id AND x.review_status='ACCEPTED') AS latest_accepted_at
 FROM city_twin_data_sources s JOIN city_digital_twins t ON t.id=s.twin_id AND t.tenant_id=s.tenant_id AND t.municipality_id=s.municipality_id
 WHERE s.tenant_id=$1 AND s.municipality_id=$2 ORDER BY s.created_at DESC,s.id DESC LIMIT 101`,[city.tenant_id,city.id]);
 const limited=r.rows.length>100,parsed=evaluateTrustRows(r.rows,city,now);
 return {version:DATA_TRUST_VERSION,municipalityId:city.id,tenantId:city.tenant_id,generatedAt:new Date(now).toISOString(),readOnly:true,scope:'MUNICIPALITY',sourceBasis:'RUVOS_REVIEWED_TWIN_SNAPSHOTS',liveIoT:false,modelCalibrated:false,publicValueVerified:false,limited,summary:parsed.summary,sources:parsed.items,connectors:DECLARED_CONNECTORS.map(x=>({...x,state:'NOT_VERIFIED_CONNECTED'})),notice:'بررسی مستقل منشأ نمونه و تازگی، اتصال زنده یا صحت فیزیکی حسگر، کالیبراسیون شبیه‌سازی یا ارزش عمومی را اثبات نمی‌کند.'};
}
