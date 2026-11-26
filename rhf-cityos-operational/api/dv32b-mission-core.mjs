/** DV3.2B — governed human mission issuance: never dispatches field teams, allocates resources or starts workflows. */
import {createHash} from 'node:crypto';
import {DV31_UUID} from './dv31-intake-core.mjs';
export const DV32B_SCHEMA='RHF-DV32B-GOVERNED-MISSION-v1';
export const DV32B_GOVERNANCE=Object.freeze({missionRecordOnly:true,fieldDispatch:false,resourceAllocation:false,workerStarted:false,municipalActionExecuted:false,verifiedPublicValue:false,requiresIndependentRelease:true,crossTenantUat:'NOT_ATTESTED'});
export class MissionPlanError extends Error{constructor(code,status=400){super(code);this.status=status}}
const fail=(k)=>{throw new MissionPlanError('DV32B_INVALID_'+k)};
function exact(o,fields){return o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===fields.slice().sort().join('|')}
function str(x,key,min,max){if(typeof x!=='string'||x.trim().length<min||x.trim().length>max||/[\x00-\x1f]/.test(x))fail(key);return x.trim()}
export function validatePlan(b){
 if(!exact(b,['intentId','requestKey','title','assignee','justification']))fail('PLAN_SHAPE');
 for(const k of ['intentId','requestKey'])if(!DV31_UUID.test(b[k]||''))fail(k);
 return Object.freeze({intentId:b.intentId,requestKey:b.requestKey,title:str(b.title,'TITLE',8,250),assignee:str(b.assignee,'ASSIGNEE',3,150),justification:str(b.justification,'JUSTIFICATION',30,1200)});
}
export function validateDecision(b){if(!exact(b,['action','version','note'])||!['RELEASE_MISSION','REJECT'].includes(b?.action)||!Number.isSafeInteger(b?.version)||b.version<1)fail('REVIEW_SHAPE');return Object.freeze({action:b.action,version:b.version,note:str(b.note,'REVIEW_NOTE',30,1200)})}
export const planHash=p=>createHash('sha256').update(JSON.stringify([p.intentId,p.title,p.assignee,p.justification])).digest('hex');
export function checkScope(row,city,allowed){if(!row||row.tenant_id!==city.tenant_id||row.municipality_id!==city.id||!allowed.includes(row.owner_org_id)||!allowed.includes(row.target_org_id))throw new MissionPlanError('DV32B_SCOPE_DENIED',403);return row}
export function eligibleIntent(row,city,allowed){checkScope(row,city,allowed);if(row.status!=='APPROVED_FOR_PLANNING'||!DV31_UUID.test(row.service_case_id||'')||!row.reviewed_by||row.created_by===row.reviewed_by)throw new MissionPlanError('DV32B_DISPATCH_NOT_APPROVED',409);return row}
export function mayIndependentlyRelease(row,actor,writer){return writer===true&&row?.status==='SUBMITTED'&&row?.created_by!==actor&&row?.dispatch_created_by!==actor&&row?.dispatch_reviewed_by!==actor}
export function present(r){return {id:r.id,intentId:r.dispatch_intent_id,caseId:r.service_case_id,ownerOrgId:r.owner_org_id,targetOrgId:r.target_org_id,title:r.title,assignee:r.assignee,justification:r.justification,status:r.status,version:r.version,createdBy:r.created_by,reviewedBy:r.reviewed_by||null,reviewNote:r.review_note||null,missionId:r.mission_id||null,createdAt:r.created_at};}
