import dns from 'node:dns/promises';
import https from 'node:https';
import net from 'node:net';
import {ClientError,uuid} from './domain.mjs';
import {parseSample} from './twin-source-core.mjs';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const PULL_PARTS=Object.freeze(['twin-pull']);
export function assertPullRole(role){if(!['MUNICIPAL_ADMIN','DEPUTY'].includes(role))throw new ClientError('دریافت داده از اتصال بیرونی فقط برای مدیر یا معاون مجاز است',403);}
function isPublicIPv4(ip){
 if(net.isIP(ip)!==4)return false;
 const [a,b,c,d]=ip.split('.').map(Number);
 if([a,b,c,d].some(x=>!Number.isInteger(x)||x<0||x>255))return false;
 return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===192&&b===0&&c===0||a===192&&b===0&&c===2||a===198&&b>=18&&b<=19||a===198&&b===51&&c===100||a===203&&b===0&&c===113||a===192&&b===88&&c===99);
}
export {isPublicIPv4};
function urlValidated(urlString,expectedHost){
 if(typeof urlString!=='string'||urlString.length>2048)throw new ClientError('نشانی Endpoint در سرور معتبر نیست',503);
 let url;try{url=new URL(urlString);}catch{throw new ClientError('نشانی Endpoint نامعتبر است',503);}
 if(url.protocol!=='https:'||url.port&&url.port!=='443'||url.username||url.password||url.search||url.hash||net.isIP(url.hostname)||url.hostname!==expectedHost||!/^([a-z0-9-]+\.)+[a-z0-9-]+$/i.test(url.hostname)||url.hostname.endsWith('.local'))throw new ClientError('نشانی HTTPS و دامنه مجاز تنظیم نشده است',503);
 return url;
}
export function readPullConfig(env=process.env){
 const enabled=env.RHF_TWIN_PULL_ENABLED==='true';
 const sourceId=env.RHF_TWIN_PULL_SOURCE_ID||'',cityId=env.RHF_TWIN_PULL_CITY_ID||'';
 if(!enabled)return {enabled:false,configured:false};
 if(!UUID.test(sourceId)||!UUID.test(cityId))throw new ClientError('شناسه شهر یا منبع در پیکربندی اتصال معتبر نیست',503);
 const allowed=String(env.RHF_TWIN_PULL_ALLOWED_HOST||'').toLowerCase();
 const url=urlValidated(env.RHF_TWIN_PULL_URL,allowed);
 const format=env.RHF_TWIN_PULL_FORMAT||'RHF_JSON_V1';
 if(!['RHF_JSON_V1','GEOJSON_POINT_V1'].includes(format))throw new ClientError('قالب منبع در سرور پشتیبانی نمی‌شود',503);
 const token=env.RHF_TWIN_PULL_BEARER_TOKEN||'';
 if(token&&(/\s/.test(token)||token.length>4096))throw new ClientError('اعتبارنامه سرویس معتبر نیست',503);
 return {enabled:true,configured:true,cityId,sourceId,format,url,token};
}
export function parseUpstreamData(data,source){
 if(!data||typeof data!=='object'||Array.isArray(data))throw new ClientError('ساختار خروجی سرویس نامعتبر است',422);
 let rec=data,lat=null,lon=null;
 if(data.type==='FeatureCollection'){
  if(!Array.isArray(data.features)||data.features.length!==1)throw new ClientError('در این فاز خروجی GIS باید دقیقاً یک Feature داشته باشد',422);
  const feat=data.features[0];if(feat?.type!=='Feature'||feat.geometry?.type!=='Point'||!Array.isArray(feat.geometry?.coordinates)||feat.geometry.coordinates.length!==2)throw new ClientError('GeoJSON Point معتبر نیست',422);
  [lon,lat]=feat.geometry.coordinates;
  rec=feat.properties||{};
 }else if(data.type==='Feature'){
  if(data.geometry?.type!=='Point'||!Array.isArray(data.geometry.coordinates)||data.geometry.coordinates.length!==2)throw new ClientError('GeoJSON Point معتبر نیست',422);
  [lon,lat]=data.geometry.coordinates;rec=data.properties||{};
 }else{
  lat=data.latitude??null;lon=data.longitude??null;
 }
 if(typeof rec.sourceReference==='string'&&/^(?:https?:\/\/)/i.test(rec.sourceReference)&&/[?#]/.test(rec.sourceReference))throw new ClientError('مرجع مستند نباید حاوی توکن URL باشد',422);
 const b={sourceId:source.id,externalEventId:rec.eventId,value:rec.value,observedAt:rec.observedAt,sourceReference:rec.sourceReference,latitude:lat,longitude:lon};
 // The same validation contract applies to human and connector imports.
 const parsed=parseSample(b);
 if(source.category==='GIS_SNAPSHOT'&&parsed.latitude===null)throw new ClientError('خروجی GIS فاقد مختصات WGS84 است',422);
 if(source.category==='IOT_SNAPSHOT'&&parsed.latitude!==null)throw new ClientError('خروجی IoT این نسخه نباید مختصات داشته باشد',422);
 return parsed;
}
export async function getPinnedJSON(config,{resolve=dns.lookup,request=https.request}={}){
 const answers=await resolve(config.url.hostname,{all:true});
 if(!Array.isArray(answers)||!answers.length||answers.some(x=>x.family===4&&!isPublicIPv4(x.address)))throw new ClientError('DNS منبع بیرونی عمومی و معتبر نیست',502);
 const ip=answers.find(x=>x.family===4&&isPublicIPv4(x.address))?.address;
 if(!ip)throw new ClientError('منبع دارای IPv4 عمومی قابل کنترل نیست',502);
 return await new Promise((fulfill,reject)=>{
  let settled=false;const finish=(err,data)=>{if(settled)return;settled=true;if(err)reject(err);else fulfill(data);};
  const headers={Accept:'application/json, application/geo+json','User-Agent':'RHF-ACOS-Twin-Pull/1.3.6'};
  if(config.token)headers.Authorization=`Bearer ${config.token}`;
  const req=request(config.url,{method:'GET',headers,timeout:7000,maxHeaderSize:8192,rejectUnauthorized:true,lookup:(_host,_opts,cb)=>cb(null,ip,4)},resp=>{
   if(resp.statusCode!==200){resp.resume();return finish(new ClientError('منبع HTTPS پاسخ موفق نداد',502));}
   const ctype=String(resp.headers['content-type']||'');
   if(!/^application\/(?:json|geo\+json)(?:\s*;|\s*$)/i.test(ctype)){resp.resume();return finish(new ClientError('نوع خروجی سرویس JSON نیست',502));}
   let size=0;const chunks=[];
   resp.on('data',chunk=>{size+=chunk.length;if(size>65536){resp.destroy();finish(new ClientError('حجم خروجی سرویس از سقف مجاز بیشتر است',413));return;}chunks.push(chunk);});
   resp.on('error',()=>finish(new ClientError('قطع ارتباط با منبع بیرونی',502)));
   resp.on('end',()=>{try{const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));finish(null,data);}catch{finish(new ClientError('پاسخ JSON منبع نامعتبر است',502));}});
  });
  req.on('timeout',()=>req.destroy(new Error('timeout')));
  req.on('error',()=>finish(new ClientError('ارتباط HTTPS با منبع برقرار نشد',502)));
  req.end();
 });
}
export function compareSameSample(existing,b){
 return String(existing.measured_value)===Number(b.value).toFixed(4) && new Date(existing.observed_at).getTime()===Date.parse(b.observedAt)
 && existing.source_reference===b.sourceReference && (existing.latitude===null?b.latitude===null:Number(existing.latitude)===b.latitude)
 && (existing.longitude===null?b.longitude===null:Number(existing.longitude)===b.longitude);
}
export function assertConfigScope(cfg,cityId,sourceId){if(!cfg.enabled||cfg.cityId!==cityId||cfg.sourceId!==sourceId)throw new ClientError('اتصال برای این شهرداری و منبع فعال نیست',403);}
