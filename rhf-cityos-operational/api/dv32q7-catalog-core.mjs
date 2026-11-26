// DV32Q.7 governed operational reference onboarding. No synthetic data promotion.
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const SHIRAZ=new Set(['شیراز','شهرداری شیراز','shiraz','shiraz municipality']);
const code=/^[A-Z][A-Z0-9_-]{2,31}$/;
const plain=/^[A-Z][A-Z0-9_]{2,39}$/;
const kinds=new Set(['CREATE_UNIT','CREATE_SERVICE','ACTIVATE_UNIT','ACTIVATE_SERVICE']);
const fields={
 CREATE_UNIT:['action','approvalReference','code','confirm','kind','nameFa','parentUnitId','reason'],
 CREATE_SERVICE:['action','approvalReference','code','confirm','description','moduleCode','nameFa','outcomeMetric','ownerUnitId','reason','slaHours'],
 ACTIVATE_UNIT:['action','approvalReference','confirm','reason','unitId'],
 ACTIVATE_SERVICE:['action','approvalReference','confirm','reason','serviceId']
};
export function requestContract({method,resourceId,url,headers}){
 if(!['GET','POST'].includes(method))throw Error('METHOD_NOT_ALLOWED');
 if(resourceId)throw Error('RESOURCE_PATH_DENIED');
 if([...url.searchParams].length)throw Error('QUERY_PARAMETERS_DENIED');
 if(method==='POST'){
  let origin;try{origin=new URL(headers?.origin);}catch{throw Error('SAME_ORIGIN_REQUIRED');}
  if(!headers?.host||origin.host!==headers.host||!['http:','https:'].includes(origin.protocol)||
    headers['x-rhf-dv32q7-intent']!=='EXPLICIT_REAL_CATALOG_ACTION'||
    !/^application\/json(?:\s*;.*)?$/i.test(String(headers['content-type']||'')))throw Error('EXPLICIT_SAME_ORIGIN_JSON_REQUIRED');
 }
}
function safeText(value,min,max,label){
 if(typeof value!=='string'||value.trim().length<min||value.trim().length>max||/[<>\r\n\u0000-\u001f]/.test(value)||/https?:\/\//i.test(value))throw Error(label+'_INVALID');
 return value.trim();
}
export function validateAction(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!kinds.has(raw.action))throw Error('ACTION_INVALID');
 const want=fields[raw.action].slice().sort().join('|');
 if(Object.keys(raw).sort().join('|')!==want)throw Error('ACTION_FIELDS_INVALID');
 if(raw.confirm!=='I_APPROVE_REAL_CITY_CATALOG_CHANGE')throw Error('REAL_CATALOG_APPROVAL_REQUIRED');
 const a={action:raw.action,
  approvalReference:safeText(raw.approvalReference,8,120,'APPROVAL_REFERENCE'),
  reason:safeText(raw.reason,12,250,'REASON')};
 if(/سناریوی ساختگی|SYN-0\d\d/i.test(a.approvalReference+' '+a.reason))throw Error('SYNTHETIC_SOURCE_CANNOT_AUTHORIZE');
 if(a.action==='CREATE_UNIT'){
  if(typeof raw.code!=='string'||!code.test(raw.code)||raw.code.startsWith('SYN'))throw Error('UNIT_CODE_INVALID');
  if(typeof raw.kind!=='string'||!plain.test(raw.kind))throw Error('UNIT_KIND_INVALID');
  a.code=raw.code;a.kind=raw.kind;a.nameFa=safeText(raw.nameFa,4,120,'UNIT_NAME');
  if(/سناریوی ساختگی/.test(a.nameFa))throw Error('SYNTHETIC_NAME_DENIED');
  if(raw.parentUnitId!==null&&!UUID.test(raw.parentUnitId))throw Error('PARENT_UNIT_INVALID');
  a.parentUnitId=raw.parentUnitId;
 }
 if(a.action==='CREATE_SERVICE'){
  if(typeof raw.code!=='string'||!code.test(raw.code)||raw.code.startsWith('SYN'))throw Error('SERVICE_CODE_INVALID');
  if(typeof raw.moduleCode!=='string'||!plain.test(raw.moduleCode))throw Error('MODULE_CODE_INVALID');
  if(!UUID.test(raw.ownerUnitId))throw Error('OWNER_UNIT_INVALID');
  if(!Number.isSafeInteger(raw.slaHours)||raw.slaHours<1||raw.slaHours>8760)throw Error('SLA_INVALID');
  a.code=raw.code;a.moduleCode=raw.moduleCode;a.ownerUnitId=raw.ownerUnitId;a.slaHours=raw.slaHours;
  a.nameFa=safeText(raw.nameFa,4,120,'SERVICE_NAME');
  a.description=safeText(raw.description,12,500,'SERVICE_DESCRIPTION');
  a.outcomeMetric=safeText(raw.outcomeMetric,4,120,'OUTCOME_METRIC');
  if([a.nameFa,a.description,a.outcomeMetric].some(x=>/سناریوی ساختگی/.test(x)))throw Error('SYNTHETIC_NAME_DENIED');
 }
 if(a.action==='ACTIVATE_UNIT'){if(!UUID.test(raw.unitId))throw Error('UNIT_ID_INVALID');a.unitId=raw.unitId;}
 if(a.action==='ACTIVATE_SERVICE'){if(!UUID.test(raw.serviceId))throw Error('SERVICE_ID_INVALID');a.serviceId=raw.serviceId;}
 return a;
}
export function validateRead({city,role,user,units,services,slots}){
 if(!UUID.test(city?.id)||!UUID.test(city?.tenant_id)||!SHIRAZ.has(String(city.name||'').trim().toLowerCase()))throw Error('SHIRAZ_CITY_SCOPE_REQUIRED');
 if(!['DEPUTY','MUNICIPAL_ADMIN'].includes(role)&&user?.is_system_admin!==true)throw Error('CITY_REFERENCE_READ_FORBIDDEN');
 if(!Array.isArray(units)||!Array.isArray(services)||!Array.isArray(slots)||units.length>200||services.length>200||slots.length!==17)throw Error('CATALOG_INTEGRITY_OR_PAGINATION_REQUIRED');
 const ids=new Set();for(const row of units){if(!UUID.test(row.id)||ids.has(row.id)||typeof row.active!=='boolean')throw Error('UNIT_SCOPE_INTEGRITY_ERROR');ids.add(row.id);}
 const svcIds=new Set();for(const row of services){if(!UUID.test(row.id)||svcIds.has(row.id)||typeof row.active!=='boolean'||(row.owner_unit_id&&!ids.has(row.owner_unit_id)))throw Error('SERVICE_SCOPE_INTEGRITY_ERROR');svcIds.add(row.id);}
 const slotIds=new Set();for(const slot of slots){if(!Number.isSafeInteger(slot.slot)||slot.slot<1||slot.slot>17||slotIds.has(slot.slot))throw Error('MISSION_SLOT_INTEGRITY_ERROR');slotIds.add(slot.slot);}
 return {schema:'RHF-DV32Q7-OPERATIONAL-CATALOG-v1',cityId:city.id,tenantId:city.tenant_id,
  units,services,missionSlots:slots,counts:{activeUnits:units.filter(x=>x.active).length,activeServices:services.filter(x=>x.active).length,
    draftMappedSlots:slots.filter(x=>x.mapping_status==='DRAFT_MAPPED').length},
  operatorCanChange:role==='MUNICIPAL_ADMIN'||user?.is_system_admin===true,
  operatorApprovalIsSelfAttested:true,officialMissionTaxonomyCertified:false,
  operationalCasesCreated:0,automaticFieldDispatch:false,temporalStarted:false,verifiedUrbanValue:false,
  acceptance:'NO_GO'};
}
