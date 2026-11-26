/** DV3.1 — operational intake contracts, no impersonation / no automated dispatch. */
import {createHash} from 'node:crypto';
export const DV31_SCHEMA='RHF-DV31-MULTI-ORG-INTAKE-v1';
export const DV31_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const DV31_PRIORITIES=Object.freeze(['LOW','NORMAL','HIGH','CRITICAL']);
export class IntakeError extends Error {constructor(message,status=400){super(message);this.status=status;}}
function text(v,name,min,max){if(typeof v!=='string'||v.trim().length<min||v.trim().length>max||v.includes('\u0000'))throw new IntakeError('DV31_INVALID_'+name);return v.trim();}
export function validateIntake(x){
 if(!x||Array.isArray(x)||typeof x!=='object'||Object.keys(x).sort().join('|')!==['description','ownerOrgId','priority','requestKey','serviceId','summary'].sort().join('|'))throw new IntakeError('DV31_BODY_SHAPE_INVALID');
 for(const k of ['ownerOrgId','serviceId','requestKey'])if(!DV31_UUID.test(x[k]||''))throw new IntakeError('DV31_INVALID_'+k);
 if(!DV31_PRIORITIES.includes(x.priority))throw new IntakeError('DV31_INVALID_PRIORITY');
 const summary=text(x.summary,'SUMMARY',8,300),description=text(x.description,'DESCRIPTION',20,3000);
 return Object.freeze({ownerOrgId:x.ownerOrgId,serviceId:x.serviceId,priority:x.priority,summary,description,requestKey:x.requestKey});
}
export function fingerprint(x){return createHash('sha256').update(JSON.stringify([x.ownerOrgId,x.serviceId,x.priority,x.summary,x.description])).digest('hex');}
export function operationalWriter({role,systemAdmin,positionCodes=[]}){
 if(systemAdmin||!Array.isArray(positionCodes))return false;
 return role==='DEPUTY'?positionCodes.includes('DEPUTY_HEAD'):role==='DIRECTOR'&&positionCodes.includes('ORG_CEO');
}
export function verifyIntakeRow(row,city,allowed){
 if(!row||!DV31_UUID.test(row.id||'')||row.tenant_id!==city.tenant_id||row.municipality_id!==city.id||!allowed.includes(row.unit_id))throw new IntakeError('DV31_ROW_SCOPE_VIOLATION',409);
 return row;
}
export function presentCase(row){return {id:row.id,ownerOrgId:row.unit_id,serviceId:row.service_id,summary:row.summary,
  priority:row.priority,status:row.status,description:row.description||'',createdAt:row.created_at,dueAt:row.due_at||null,
  serviceName:row.service_name||null,ownerName:row.owner_name||null};}
