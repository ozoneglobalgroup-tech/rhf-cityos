// DV32G: explicit, role- and organization-bound decisions. No automated dispatch or value claims.
export const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const validUuid=value=>typeof value==='string'&&uuidPattern.test(value);
export const adminAllowed=(role,isSystemAdmin)=>Boolean(isSystemAdmin)||role==='MUNICIPAL_ADMIN';
export const directorAllowed=role=>role==='DIRECTOR';
export function validateGrant(input){
 if (!input||Array.isArray(input)||typeof input!=='object') throw new TypeError('Invalid request');
 if(!validUuid(input.userId)||!validUuid(input.orgId))throw new TypeError('Invalid identity');
 if(typeof input.reason!=='string'||input.reason.trim().length<16||input.reason.length>1000)throw new TypeError('Explicit authorization reason (16-1000 chars) required');
 if(input.confirm!=='AUTHORIZE_ORGANIZATION_READ')throw new TypeError('Explicit confirmation required');
 return {userId:input.userId,orgId:input.orgId,reason:input.reason.trim()};
}
export function validateRevoke(input){
 if(!input||typeof input.reason!=='string'||input.reason.trim().length<16||input.reason.length>1000)throw new TypeError('Revocation reason (16-1000 chars) required');
 if(input.confirm!=='REVOKE_ORGANIZATION_READ')throw new TypeError('Explicit confirmation required');
 return input.reason.trim();
}
const CLOSED=new Set(['CLOSED','REJECTED']);
function num(n){const x=Number(n);if(!Number.isSafeInteger(x)||x<0)throw new TypeError('Invalid aggregate');return x;}
export function caseMetrics(rows){let total=0,open=0,critical=0;const byStatus={};for(const r of rows){const n=num(r.n),key=String(r.status);total+=n;byStatus[key]=(byStatus[key]||0)+n;if(!CLOSED.has(key)){open+=n;if(r.priority==='CRITICAL')critical+=n;}if(![total,open,critical].every(Number.isSafeInteger))throw new TypeError('Unsafe aggregate total');}return {total,open,criticalOpen:critical,byStatus};}
export function wasteReport({city,org,role,binding,caseRows,resources,allocations}){
 if(!city?.id||!city?.tenant_id||!org?.id||!binding?.id||!['DIRECTOR','MUNICIPAL_ADMIN'].includes(role))throw new TypeError('Missing verified authorization');
 const cases=caseMetrics(caseRows);
 const advisory=cases.criticalOpen?[{type:'CRITICAL_CASE_REVIEW',count:cases.criticalOpen,evidence:'service_cases:unit_id in active org subtree',action:'HUMAN_REVIEW_ONLY'}]:[{type:'REVIEW_EVIDENCE',evidence:'org_units/service_cases:scoped',action:'HUMAN_REVIEW_ONLY'}];
 return {schema:'RHF-DV32G-ORGANIZATION-WASTE-v1',readOnly:true,
  scope:{tenantId:city.tenant_id,municipalityId:city.id,organizationId:org.id,organizationName:org.name_fa},
  access:{role,bindingId:binding.id,organizationBound:true,privilege:'READ_ONLY'},
  cases,capacity:{resourcePools:num(resources),reservedAllocations:num(allocations),availabilityUnverified:true},advisory,
  controls:{humanApprovalRequired:true,fieldDispatchAllowed:false,automaticAllocation:false,verifiedPublicValue:false},
  caveats:['No cross-organization metrics are included.','No operation, allocation, authorization or verified value is inferred.']};
}
