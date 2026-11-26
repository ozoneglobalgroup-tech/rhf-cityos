/** RHF DV3.2A: human-governed referral INTENT, not a field mission or dispatch. */
import {createHash} from 'node:crypto';
import {DV31_UUID} from './dv31-intake-core.mjs';
export const DV32_SCHEMA='RHF-DV32A-GOVERNED-DISPATCH-v1';
export const DV32_CASE_READY=new Set(['RECEIVED']);
export class DispatchError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const invalid=(label)=>{throw new DispatchError('DV32_INVALID_'+label)};
const only=(v,fields)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===fields.slice().sort().join('|');
function note(v,label,min=25,max=1200){
 if(typeof v!=='string'||v.trim().length<min||v.trim().length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v))invalid(label);
 return v.trim();
}
export function validateRequest(b){
 if(!only(b,['caseId','targetOrgId','requestKey','justification']))invalid('BODY_SHAPE');
 for(const k of ['caseId','targetOrgId','requestKey'])if(!DV31_UUID.test(b[k]||''))invalid(k);
 const justification=note(b.justification,'JUSTIFICATION',30,1500);
 return Object.freeze({caseId:b.caseId,targetOrgId:b.targetOrgId,requestKey:b.requestKey,justification});
}
export function validateDecision(b){
 if(!only(b,['action','version','note']))invalid('DECISION_BODY');
 if(!['APPROVE_PLANNING','REJECT'].includes(b.action))invalid('ACTION');
 if(!Number.isSafeInteger(b.version)||b.version<1)invalid('VERSION');
 return Object.freeze({action:b.action,version:b.version,note:note(b.note,'REVIEW_NOTE',30,1200)});
}
export const requestHash=b=>createHash('sha256').update(JSON.stringify([b.caseId,b.targetOrgId,b.justification])).digest('hex');
export function isDescendant(parent,target,orgs){
 const map=new Map(orgs.map(x=>[x.id,x]));const seen=new Set();let cur=target;
 while(cur&&map.has(cur)&&seen.size<=500&&!seen.has(cur)){
  if(cur===parent)return true;seen.add(cur);cur=map.get(cur).parent_id;
 }
 return false;
}
export function validCase(row,city,allowed){
 if(!row||!DV31_UUID.test(row.id||'')||row.tenant_id!==city.tenant_id||row.municipality_id!==city.id||
  !allowed.includes(row.unit_id)||!DV32_CASE_READY.has(row.status))throw new DispatchError('DV32_CASE_NOT_ELIGIBLE',409);
 return row;
}
export function validIntent(row,city,allowed){
 if(!row||!DV31_UUID.test(row.id||'')||row.tenant_id!==city.tenant_id||row.municipality_id!==city.id||
  !allowed.includes(row.owner_org_id)||!allowed.includes(row.target_org_id))throw new DispatchError('DV32_INTENT_SCOPE_MISMATCH',403);
 return row;
}
export function mayReview({canCreate,actorId,row}){
 return canCreate===true&&row?.created_by!==actorId&&row?.status==='SUBMITTED';
}
export function present(x){return {id:x.id,caseId:x.service_case_id,ownerOrgId:x.owner_org_id,targetOrgId:x.target_org_id,
 justification:x.justification,status:x.status,version:x.version,createdBy:x.created_by,
 reviewedBy:x.reviewed_by||null,reviewNote:x.review_note||null,createdAt:x.created_at,reviewedAt:x.reviewed_at||null,
 caseSummary:x.case_summary||null,targetName:x.target_name||null};}
export const DV32_GOVERNANCE=Object.freeze({caseReassigned:false,missionCreated:false,resourceAllocated:false,
 workerStarted:false,fieldActionExecuted:false,verifiedPublicValue:false,
 approvalScope:'PLANNING_ONLY',humanApprovalRequired:true});
