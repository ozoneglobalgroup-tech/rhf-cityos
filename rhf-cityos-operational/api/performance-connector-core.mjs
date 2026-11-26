// RHF V8P5.3 — read-only, aggregate-only PUC+ connector. No synthetic records in API.
export const PERFORMANCE_VERSION='RHF-PUC-CONNECTOR-V8P5.3';
export const PUC_WEIGHTS=Object.freeze({P:0.35,U:0.25,C:0.20,Plus:0.20});
export const ALLOWED_ORGS=Object.freeze(['WASTE','GREEN','CEMETERY','MARKETS','BEAUTIFICATION','PUBLIC','ENV','FIRE','FLEET','CONTRACT','CITIZEN','STAFF']);
export function scorePUC({P,U,C,Plus}){if([P,U,C,Plus].some(x=>!Number.isFinite(x)||x<0||x>100))throw Error('PUC_INVALID_DIMENSION');return Math.round(P*.35+U*.25+C*.20+Plus*.20);}
export function connectorEndpoint(rawUrl,allowedHost){
 if(!rawUrl||!allowedHost)return null;
 let u;try{u=new URL(rawUrl);}catch{throw Error('CONNECTOR_INVALID_URL');}
 if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search||u.port||u.hostname.toLowerCase()!==allowedHost.toLowerCase()||u.pathname!=='/api/v1/municipal-performance/summary')throw Error('CONNECTOR_ENDPOINT_DENIED');
 if(!/^[a-z0-9][a-z0-9.-]{3,252}$/i.test(u.hostname)||/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)||u.hostname.endsWith('.local')||u.hostname==='localhost')throw Error('CONNECTOR_HOST_DENIED');
 return u;
}
const bounded=(n)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
export function validateAggregate(raw,tenantId,cityId){
 if(!raw||raw.schema!=='RHF_PUC_AGGREGATE_V1'||raw.tenantId!==tenantId||raw.municipalityId!==cityId||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(raw.period||'')||!Array.isArray(raw.organizations)||raw.organizations.length>12||raw.organizations.length===0)throw Error('PERFORMANCE_SCOPE_OR_SCHEMA_INVALID');
 const seen=new Set();const organizations=raw.organizations.map(x=>{
  if(!x||!ALLOWED_ORGS.includes(x.orgKey)||seen.has(x.orgKey)||!Number.isSafeInteger(x.sampleSize)||x.sampleSize<5||x.sampleSize>100000||![x.P,x.U,x.C,x.Plus].every(bounded))throw Error('PERFORMANCE_ROW_INVALID');
  seen.add(x.orgKey);
  return {orgKey:x.orgKey,P:x.P,U:x.U,C:x.C,Plus:x.Plus,score:scorePUC(x),veto:x.C<50,sampleSize:x.sampleSize};
 });
 // Strict allowlist: do not forward arbitrary person-, team- or salary-level data.
 return Object.freeze({state:'CONNECTED',source:'EXTERNAL_AGGREGATE',schema:'RHF_PUC_AGGREGATE_V1',period:raw.period,tenantId,municipalityId:cityId,organizations,verifiedPublicValue:false});
}
export const disconnected=(scope)=>({version:PERFORMANCE_VERSION,state:'NOT_CONNECTED',schema:'RHF_PUC_AGGREGATE_V1',municipalityId:scope.id,organizations:[],verifiedPublicValue:false,noPersonnelData:true});
