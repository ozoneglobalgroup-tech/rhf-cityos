// DV32UX9: source-attributed, human-proposed mission coverage. NOT official legal certification.
import {UUID,SHIRAZ} from './dv32ux7-review-core.mjs';
const fail=s=>{throw Error(s)};
const noDemo=/\b(?:SYN[-_]?\d+|demo|synthetic)\b|سناریوی ساختگی|آزمایشی/i;
const hex=/^[a-f0-9]{64}$/;
function text(x,min,max,name){if(typeof x!=='string'||x.trim().length<min||x.trim().length>max||/[<>\u0000-\u001f]/.test(x)||/https?:\/\//i.test(x)||noDemo.test(x))fail(name+'_INVALID');return x.trim()}
export function boundary({method,resourceId,url,headers={}}){
 if(!['GET','POST'].includes(method))fail('METHOD_NOT_ALLOWED');
 if(resourceId||[...url.searchParams].length)fail('RESOURCE_OR_QUERY_FORBIDDEN');
 if(method==='POST'){
  let o;try{o=new URL(headers.origin)}catch{fail('ORIGIN_REQUIRED')}
  if(!headers.host||o.host!==headers.host||!['http:','https:'].includes(o.protocol)||headers['x-rhf-dv32ux9-intent']!=='EXPLICIT_SOURCE_MAPPING_REVIEW'||!/^application\/json(?:\s*;.*)?$/i.test(String(headers['content-type']||'')))fail('ORIGIN_AND_INTENT_REQUIRED');
 }
}
export function scope(city,role,user,method){
 if(!UUID.test(city?.id)||!UUID.test(city?.tenant_id)||!SHIRAZ.has(String(city.name||'').trim().toLowerCase()))fail('SHIRAZ_SCOPE_REQUIRED');
 if(!['DEPUTY','MUNICIPAL_ADMIN'].includes(role)||!UUID.test(user?.id))fail('ROLE_OR_ACTOR_DENIED');
 if(method==='POST'&&role!=='MUNICIPAL_ADMIN')fail('CITY_ADMIN_ONLY');
}
export function validate(v){
 if(!v||typeof v!=='object'||Array.isArray(v))fail('INVALID_MAPPING_BODY');
 if(v.action==='PROPOSE'){
  const fields=['action','confirm','ownerUnitId','reason','requestId','serviceId','slot','sourceReference','sourceSha256','titleFa'];
  if(Object.keys(v).sort().join('|')!==fields.sort().join('|')||v.confirm!=='I_ATTEST_SOURCE_PROPOSAL_NOT_OFFICIAL_CERTIFICATION'||!UUID.test(v.requestId)||!UUID.test(v.ownerUnitId)||!UUID.test(v.serviceId)||!Number.isInteger(v.slot)||v.slot<1||v.slot>17||!hex.test(v.sourceSha256))fail('BAD_MAPPING_PROPOSAL');
  return {action:v.action,requestId:v.requestId,ownerUnitId:v.ownerUnitId,serviceId:v.serviceId,slot:v.slot,sourceSha256:v.sourceSha256,
   titleFa:text(v.titleFa,8,220,'MISSION_TITLE'),sourceReference:text(v.sourceReference,8,180,'SOURCE_REFERENCE'),reason:text(v.reason,16,500,'REASON')};
 }
 if(v.action==='ATTEST'){
  if(Object.keys(v).sort().join('|')!==['action','confirm','note','proposalId'].join('|')||v.confirm!=='I_INDEPENDENTLY_CHECKED_SOURCE_REFERENCE'||!UUID.test(v.proposalId))fail('BAD_MAPPING_ATTESTATION');
  return {action:v.action,proposalId:v.proposalId,note:text(v.note,16,500,'ATTEST_NOTE')};
 }
 fail('UNKNOWN_MAPPING_ACTION');
}
export function validateCatalog(slots,unit,service,slot){
 if(!Array.isArray(slots)||slots.length!==17||new Set(slots.map(x=>x.slot)).size!==17||!slots.every(x=>Number.isInteger(x.slot)&&x.slot>=1&&x.slot<=17)||!slots.some(x=>x.slot===slot))fail('MISSION_REFERENCE_NOT_COMPLETE');
 if(!unit||unit.active!==true||!UUID.test(unit.id)||!service||service.active!==true||!UUID.test(service.id)||service.owner_unit_id!==unit.id)fail('ACTIVE_OWNER_SERVICE_REQUIRED');
 return true;
}
export function validateReport(r,city,role){
 if(r?.schema!=='RHF-DV32UX9-MISSION-MAPPING-v1'||r.cityId!==city.id||r.tenantId!==city.tenant_id||r.finalGo!=='NO_GO'||r.officiallyCertified!==false||r.executionAuthority!==false||r.verifiedUrbanValue!==false||r.canWrite!==(role==='MUNICIPAL_ADMIN')||!Array.isArray(r.slots)||r.slots.length!==17||!Array.isArray(r.units)||r.units.length>200||!Array.isArray(r.services)||r.services.length>200||!Array.isArray(r.proposals)||r.proposals.length>100||typeof r.truncated!=='boolean')fail('UNTRUSTED_MAPPING_REPORT');
 if(new Set(r.slots.map(s=>s.slot)).size!==17||r.slots.some(s=>!Number.isInteger(s.slot)||s.slot<1||s.slot>17))fail('INVALID_MISSION_SLOTS');
 if(r.proposals.some(x=>!UUID.test(x.id)||x.slot<1||x.slot>17||!['PENDING_SECOND_REVIEW','SECOND_HUMAN_ATTESTED'].includes(x.reviewState)))fail('INVALID_MAPPING_PROPOSAL');
 return r;
}
