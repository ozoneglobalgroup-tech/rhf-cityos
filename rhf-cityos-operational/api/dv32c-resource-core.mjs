import {createHash} from 'node:crypto';
export const DV32C_SCHEMA='RHF-DV32C-RESOURCE-HSE-PLANNING-v1';
export const DV32C_GOVERNANCE=Object.freeze({resourceReservation:false,personnelAssignment:false,fleetDispatch:false,missionStateChanged:false,workerStarted:false,municipalActionExecuted:false,verifiedPublicValue:false,requiresIndependentReview:true,productionReady:false});
export const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export class ResourceError extends Error{constructor(code,status=400){super(code);this.status=status}}
const fail=k=>{throw new ResourceError('DV32C_INVALID_'+k)};
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===keys.slice().sort().join('|');
function text(v,k,min=30,max=1200){if(typeof v!=='string'||v.trim().length<min||v.trim().length>max||/[\x00-\x1f]/.test(v))fail(k);return v.trim()}
export function validateProposal(b){
 if(!exact(b,['missionPlanId','requestKey','personnelRequired','vehiclesRequired','equipment','hseAssessment','schedule','justification']))fail('PROPOSAL_SHAPE');
 if(!UUID.test(b.missionPlanId||'')||!UUID.test(b.requestKey||''))fail('IDENTIFIERS');
 if(!Number.isSafeInteger(b.personnelRequired)||b.personnelRequired<1||b.personnelRequired>500)fail('PERSONNEL_COUNT');
 if(!Number.isSafeInteger(b.vehiclesRequired)||b.vehiclesRequired<0||b.vehiclesRequired>100)fail('VEHICLE_COUNT');
 return Object.freeze({missionPlanId:b.missionPlanId,requestKey:b.requestKey,personnelRequired:b.personnelRequired,vehiclesRequired:b.vehiclesRequired,equipment:text(b.equipment,'EQUIPMENT',10),hseAssessment:text(b.hseAssessment,'HSE'),schedule:text(b.schedule,'SCHEDULE',15),justification:text(b.justification,'JUSTIFICATION')});
}
export function validateReview(b){if(!exact(b,['action','version','note'])||!['APPROVE_PLAN','REJECT'].includes(b?.action)||!Number.isSafeInteger(b?.version)||b.version<1)fail('REVIEW_SHAPE');return Object.freeze({action:b.action,version:b.version,note:text(b.note,'REVIEW_NOTE')})}
export const fingerprint=b=>createHash('sha256').update(JSON.stringify([b.missionPlanId,b.personnelRequired,b.vehiclesRequired,b.equipment,b.hseAssessment,b.schedule,b.justification])).digest('hex');
export function scope(r,city,ids){if(!r||r.tenant_id!==city.tenant_id||r.municipality_id!==city.id||!ids.includes(r.owner_org_id)||!ids.includes(r.target_org_id))throw new ResourceError('DV32C_SCOPE_DENIED',403);return r}
export function eligibleMissionPlan(p,city,ids){scope(p,city,ids);if(p.status!=='MISSION_CREATED'||!UUID.test(p.mission_id||'')||!p.reviewed_by||p.created_by===p.reviewed_by)throw new ResourceError('DV32C_MISSION_NOT_RELEASED',409);return p}
export const independent=(r,actor,permitted)=>permitted===true&&r?.status==='SUBMITTED'&&r.created_by!==actor&&r.mission_created_by!==actor&&r.mission_reviewed_by!==actor;
export const present=r=>({id:r.id,missionPlanId:r.mission_plan_id,missionId:r.mission_id,ownerOrgId:r.owner_org_id,targetOrgId:r.target_org_id,personnelRequired:r.personnel_required,vehiclesRequired:r.vehicles_required,equipment:r.equipment,hseAssessment:r.hse_assessment,schedule:r.schedule,justification:r.justification,status:r.status,version:r.version,createdBy:r.created_by,reviewedBy:r.reviewed_by||null,reviewNote:r.review_note||null,createdAt:r.created_at});
