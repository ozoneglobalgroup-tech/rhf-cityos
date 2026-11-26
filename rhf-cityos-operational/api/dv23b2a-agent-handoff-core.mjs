/** DV2.3B2A: scope-confirmed, evidence-bound agent handoff contract. Planning only; no LLM/Temporal call. */
import {createHash} from 'node:crypto';
import {validatePair} from './dv23b-decision-core.mjs';
export const HANDOFF_SCHEMA='RHF-DV23B2A-AGENT-HANDOFF-v1';
export const HANDOFF_ROLES=Object.freeze([
 {key:'NEED_ANALYST',title:'تحلیل نیاز شهری',purpose:'صحت نیاز، میزان فوریت و دامنه خدمت را با شواهد بررسی کن.'},
 {key:'CAPACITY_ANALYST',title:'تحلیل ظرفیت قابل استفاده',purpose:'مالکیت ظرفیت، زمان، مکان و قابلیت تخصیص را جداگانه راستی‌آزمایی کن.'},
 {key:'LEGAL_HSE',title:'ارزیابی حقوقی، قرارداد و HSE',purpose:'مجوز دسترسی، الزامات پیمان، ایمنی و مخاطرات را بررسی کن.'},
 {key:'VALUE_GOVERNANCE',title:'تحلیل ارزش شهری و انتساب',purpose:'خط مبنا، شاخص، دوباره‌شماری، هزینه و روش تأیید مستقل را پیشنهاد بده.'}
]);
export const handoffGovernance=Object.freeze({
 readOnly:true,source:'HUMAN_FEASIBILITY_APPROVED',humanFeasibilityOnly:true,
 autoDispatch:false,canExecute:false,agentExecution:'NOT_CONNECTED',
 langGraphRuntime:'NOT_CONNECTED',temporalWorkflow:'NOT_CONNECTED',
 valueVerification:'NOT_ATTESTED',productionReady:false
});
const hash=s=>createHash('sha256').update(s).digest('hex');
export function planHandoff(decision,need,capacity,city,ownerIds){
 if(!decision||decision.status!=='FEASIBILITY_APPROVED'||!decision.decided_by||decision.decided_by===decision.created_by) return {eligible:false,reason:'HUMAN_DECISION_NOT_ELIGIBLE'};
 if(decision.tenant_id!==city.tenant_id||decision.municipality_id!==city.id||!ownerIds.includes(decision.owner_org_id))return {eligible:false,reason:'SCOPE_MISMATCH'};
 let pair;try{pair=validatePair(need,capacity,city,ownerIds)}catch{return {eligible:false,reason:'EVIDENCE_INVALID_OR_REVIEW_REVOKED'}}
 if(pair.digest!==decision.source_digest)return {eligible:false,reason:'SOURCE_DIGEST_CHANGED'};
 if(decision.need_id!==need.id||decision.capacity_id!==capacity.id||decision.sector!==need.sector)return {eligible:false,reason:'DECISION_SOURCE_MISMATCH'};
 const signature=hash(`${decision.id}|${decision.tenant_id}|${decision.municipality_id}|${decision.owner_org_id}|${pair.digest}|DV23B2A-v1`);
 return {eligible:true,packet:{
  decisionId:decision.id,ownerOrgId:decision.owner_org_id,sector:decision.sector,
  sourceDigest:pair.digest,handoffFingerprint:signature,analysisStatus:'AWAITING_AGENT_CONNECTION',
  evidence:{need:pair.candidate.need,capacity:pair.candidate.capacity,review:'INDEPENDENT_HUMAN_FEASIBILITY_APPROVED'},
  tasks:HANDOFF_ROLES.map(t=>({...t,status:'NOT_STARTED',executedByAgent:false})),
  mandatoryChecks:[...pair.candidate.missingChecks],
  proposedNextStep:'AGENT_FEASIBILITY_ANALYSIS_AFTER_SEPARATE_ACTIVATION',
  canExecute:false,verifiedPublicValue:false,realizedValueMinor:null,
 }};
}
export function compileHandoffs({decisions,sources,city,ownerIds,limit=20}){
 if(!Array.isArray(decisions)||!Array.isArray(sources)||decisions.length>30||sources.length>60||!Number.isSafeInteger(limit)||limit<1||limit>20)throw Error('INVALID_HANDOFF_BATCH');
 const byId=new Map(sources.map(r=>[r.id,r]));
 const results=[];let rejected=0;
 for(const decision of decisions){
  const p=planHandoff(decision,byId.get(decision.need_id),byId.get(decision.capacity_id),city,ownerIds);
  if(p.eligible)results.push(p.packet);else rejected++;
  if(results.length>=limit)break;
 }
 return {packets:results,blockedOrInvalid:rejected};
}
