/** DV3.2D governed reservation of aggregate capacity pools, not staff or fleet dispatch. */
import {createHash} from 'node:crypto';
export const SCHEMA='RHF-DV32D-GOVERNED-CAPACITY-v1';
export const PARTS=Object.freeze(['dv32-capacity-reservations']);
export const GOVERNANCE=Object.freeze({actualPoolReservation:true,specificVehicleAssigned:false,specificPersonAssigned:false,scheduleConflictChecked:false,fieldDispatch:false,missionStateChanged:false,workerStarted:false,verifiedPublicValue:false,requiresIndependentReview:true,productionReady:false});
export const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export class CapacityError extends Error{constructor(code,status=400){super(code);this.status=status}}
const err=(k,status=400)=>{throw new CapacityError('DV32D_'+k,status)};
const keys=(b,ks)=>b&&typeof b==='object'&&!Array.isArray(b)&&Object.keys(b).sort().join(',')===ks.slice().sort().join(',');
const note=(s,k)=>{if(typeof s!=='string'||s.trim().length<30||s.trim().length>1200||/[\x00-\x1f]/.test(s))err(k);return s.trim()};
export function quantity(s){if(typeof s!=='string'||!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/.test(s)||Number(s)<=0)err('QUANTITY_INVALID');return s}
export function proposal(b){if(!keys(b,['resourcePlanId','resourceId','requestKey','quantity','justification']))err('PROPOSAL_SHAPE');if(![b.resourcePlanId,b.resourceId,b.requestKey].every(x=>UUID.test(x||'')))err('IDENTIFIER_INVALID');return Object.freeze({resourcePlanId:b.resourcePlanId,resourceId:b.resourceId,requestKey:b.requestKey,quantity:quantity(b.quantity),justification:note(b.justification,'JUSTIFICATION_INVALID')})}
export function decision(b){if(!keys(b,['action','version','note'])||!['APPROVE_RESERVATION','REJECT','RELEASE'].includes(b.action)||!Number.isSafeInteger(b.version)||b.version<1)err('DECISION_SHAPE');return Object.freeze({action:b.action,version:b.version,note:note(b.note,'REVIEW_NOTE_INVALID')})}
export const fingerprint=b=>createHash('sha256').update(JSON.stringify([b.resourcePlanId,b.resourceId,b.quantity,b.justification])).digest('hex');
export function inScope(r,city,ids){if(!r||r.tenant_id!==city.tenant_id||r.municipality_id!==city.id||!ids.includes(r.owner_org_id)||!ids.includes(r.target_org_id)||!UUID.test(r.id||''))err('SCOPE_DENIED',403);return r}
export function eligible(p,city,ids){inScope(p,city,ids);if(p.status!=='APPROVED_FOR_ALLOCATION_PLANNING'||!p.reviewed_by||p.created_by===p.reviewed_by||p.mission_created_by===p.reviewed_by||p.mission_reviewed_by===p.reviewed_by||p.mission_plan_status!=='MISSION_CREATED'||p.mission_status!=='PLANNED'||!['RECEIVED','TRIAGED','ASSIGNED','IN_PROGRESS','AWAITING_ACCEPTANCE'].includes(p.case_status)||!p.hse_assessment||p.hse_assessment.trim().length<30)err('PLAN_NOT_ELIGIBLE',409);return p}
export function resource(r,p,city){if(!r||r.tenant_id!==city.tenant_id||r.municipality_id!==city.id||r.owner_unit_id!==p.target_org_id||r.authorized!==true||!['STAFF_HOURS','FLEET_HOURS','EQUIPMENT_HOURS'].includes(r.resource_kind))err('RESOURCE_NOT_AUTHORIZED',409);return r}
export function independent(r,actor){return r.status==='SUBMITTED'&&actor!==r.created_by&&actor!==r.resource_plan_created_by&&actor!==r.resource_plan_reviewed_by&&actor!==r.mission_created_by&&actor!==r.mission_reviewed_by}
export function display(r){return {id:r.id,resourcePlanId:r.resource_plan_id,resourceId:r.resource_id,resourceKind:r.resource_kind||null,missionId:r.mission_id,quantity:String(r.quantity),status:r.status,version:r.version,createdBy:r.created_by,reviewedBy:r.reviewed_by||null,allocationId:r.allocation_id||null,createdAt:r.created_at,reviewedAt:r.reviewed_at||null,releaseAt:r.released_at||null}}
