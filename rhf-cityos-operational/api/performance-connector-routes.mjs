// V8P5.3 — read-only platform bridge. No public write endpoints or secret disclosure.
import {ClientError} from './domain.mjs';
import {PERFORMANCE_VERSION,connectorEndpoint,validateAggregate,disconnected} from './performance-connector-core.mjs';
export const PERFORMANCE_PARTS=Object.freeze(['performance-summary']);
export async function performanceConnectorRoute({part,method,resourceId,cityId,user,withScope,json}){
 if(part!=='performance-summary'||resourceId||method!=='GET')throw new ClientError('مسیر عملکرد فقط‌خواندنی است',405);
 return json(200,await withScope(cityId,user,'read',async(_client,city,role)=>{
  if(!user.is_system_admin&&!['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR'].includes(role))throw new ClientError('دسترسی به گزارش عملکرد تجمیعی مجاز نیست',403);
  const address=process.env.RHF_PUC_CONNECTOR_URL,host=process.env.RHF_PUC_ALLOWED_HOST,token=process.env.RHF_PUC_CONNECTOR_TOKEN;
  if(!address||!host||!token)return disconnected(city);
  let endpoint;try{endpoint=connectorEndpoint(address,host);}catch{throw new ClientError('پیکربندی اتصال ارزیابی عملکرد نامعتبر است',503);}
  let result;
  try{
   const url=new URL(endpoint);
   url.searchParams.set('municipalityId',city.id);
   url.searchParams.set('period',new Date().toISOString().slice(0,7));
   const response=await fetch(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(5000),headers:{'Accept':'application/json','Authorization':`Bearer ${token}`,'X-RHF-Tenant-ID':city.tenant_id,'X-RHF-Municipality-ID':city.id}});
   if(!response.ok||!(response.headers.get('content-type')||'').includes('application/json'))throw Error('PERFORMANCE_UPSTREAM_ERROR');
   const text=await response.text();if(text.length>30000)throw Error('PERFORMANCE_UPSTREAM_TOO_LARGE');result=validateAggregate(JSON.parse(text),city.tenant_id,city.id);
  }catch{throw new ClientError('منبع عملکرد اتصال یا داده معتبر ارائه نکرده است؛ داده آموزشی با آن جایگزین نمی‌شود',503);}
  return {...result,version:PERFORMANCE_VERSION};
 }));
}
