// DV32UX6: human-attested city-scoped operational case intake, no simulation promotion.
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const SHIRAZ=new Set(['شیراز','شهرداری شیراز','shiraz','shiraz municipality']);
const PRIORITIES=new Set(['LOW','NORMAL','HIGH','URGENT']);
const fail=c=>{throw Error(c)};
function plain(x,min,max,k){
 if(typeof x!=='string'||x.trim().length<min||x.trim().length>max||/[<>\r\n\u0000-\u001f]/.test(x)||/https?:\/\//i.test(x))fail(k+'_INVALID');
 return x.trim();
}
export function contract({method,resourceId,url,headers}){
 if(!['GET','POST'].includes(method))fail('METHOD_NOT_ALLOWED');
 if(resourceId||[...url.searchParams].length)fail('RESOURCE_OR_QUERY_DENIED');
 if(method==='POST'){
  let origin;try{origin=new URL(headers?.origin)}catch{fail('SAME_ORIGIN_REQUIRED')}
  if(!headers?.host||origin.host!==headers.host||!['http:','https:'].includes(origin.protocol)||
    headers['x-rhf-dv32ux6-intent']!=='EXPLICIT_REAL_SERVICE_CASE_INTAKE'||
    !/^application\/json(?:\s*;.*)?$/i.test(String(headers['content-type']||'')))fail('EXPLICIT_SAME_ORIGIN_JSON_REQUIRED');
 }
}
export function scopeCheck(city,role,user,method){
 if(!UUID.test(city?.id)||!UUID.test(city?.tenant_id)||!SHIRAZ.has(String(city.name||'').trim().toLowerCase()))fail('SHIRAZ_SCOPE_REQUIRED');
 if(!['DEPUTY','MUNICIPAL_ADMIN'].includes(role)&&user?.is_system_admin!==true)fail('CITY_CASE_READ_FORBIDDEN');
 if(method==='POST'&&role!=='MUNICIPAL_ADMIN'&&user?.is_system_admin!==true)fail('CITY_CASE_WRITE_FORBIDDEN');
 if(method==='POST'&&!UUID.test(user?.id||''))fail('AUTHENTICATED_ACTOR_REQUIRED');
}
export function validateCase(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('CASE_BODY_INVALID');
 const keys=['action','confirm','description','evidenceNote','priority','requestId','serviceId','sourceReference','summary'].sort().join('|');
 if(Object.keys(raw).sort().join('|')!==keys||raw.action!=='CREATE_DRAFT_CASE')fail('CASE_FIELDS_INVALID');
 if(raw.confirm!=='I_CONFIRM_AUTHORIZED_REAL_SERVICE_CASE')fail('EXPLICIT_AUTHORIZATION_REQUIRED');
 if(!UUID.test(raw.requestId)||!UUID.test(raw.serviceId))fail('CASE_OR_SERVICE_ID_INVALID');
 if(!PRIORITIES.has(raw.priority))fail('PRIORITY_INVALID');
 const value={requestId:raw.requestId,serviceId:raw.serviceId,priority:raw.priority,
  summary:plain(raw.summary,8,180,'SUMMARY'),description:plain(raw.description,15,800,'DESCRIPTION'),
  sourceReference:plain(raw.sourceReference,8,120,'SOURCE_REFERENCE'),evidenceNote:plain(raw.evidenceNote,12,300,'EVIDENCE_NOTE')};
 if(/(?:\bSYN[-_]?0*\d+\b|سناریوی ساختگی|آزمایشی|demo|synthetic)/i.test([value.summary,value.description,value.sourceReference,value.evidenceNote].join(' ')))fail('ISOLATED_SIMULATION_CANNOT_BECOME_OPERATIONAL');
 return value;
}
export function validateRead(raw,city,mayWrite){
 if(raw?.schema!=='RHF-DV32UX6-CASE-INTAKE-v1'||raw.cityId!==city?.id||raw.tenantId!==city?.tenant_id||raw.finalGo!=='NO_GO'||raw.workflowStarted!==false||raw.automaticFieldDispatch!==false||raw.verifiedUrbanValue!==false||raw.realCasesCreatedByThisRead!==0||!Array.isArray(raw.services)||!Array.isArray(raw.cases)||raw.services.length>200||raw.cases.length>50||typeof raw.truncated!=='boolean'||raw.operatorCanCreate!==mayWrite)fail('UNTRUSTED_CASE_READ');
 const active= new Set();for(const s of raw.services){if(!UUID.test(s.id)||!UUID.test(s.owner_unit_id)||s.active!==true||s.owner_active!==true||active.has(s.id))fail('INVALID_SCOPED_SERVICE');active.add(s.id)}
 const ids=new Set();for(const c of raw.cases){if(!UUID.test(c.id)||ids.has(c.id)||!['DRAFT'].includes(c.status)||typeof c.summary!=='string'||c.summary.length>180)fail('UNTRUSTED_DRAFT_CASE');ids.add(c.id)}
 return raw;
}
