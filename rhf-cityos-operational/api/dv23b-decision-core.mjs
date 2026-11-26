/** DV2.3B1: human feasibility review of two DV22 reviewed records; NOT execution approval. */
import {createHash} from 'node:crypto';
import {createProposals} from './dv23-opportunity-core.mjs';
export const DV23B_SCHEMA='RHF-DV23B1-HUMAN-FEASIBILITY-v1';
export const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export class DV23BError extends Error {constructor(message){super(message);this.name='DV23BError'}}
export const isPlain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
export function validatedSubmit(x){
 if(!isPlain(x)||Object.keys(x).sort().join(',')!=='capacityId,needId,note,requestKey')throw new DV23BError('INVALID_SUBMISSION_SHAPE');
 if(![x.needId,x.capacityId,x.requestKey].every(v=>typeof v==='string'&&UUID.test(v)))throw new DV23BError('INVALID_IDENTIFIER');
 if(x.needId===x.capacityId)throw new DV23BError('SAME_SOURCE_NOT_ALLOWED');
 if(typeof x.note!=='string'||x.note.trim().length<25||x.note.trim().length>1500)throw new DV23BError('JUSTIFICATION_LENGTH');
 return {needId:x.needId,capacityId:x.capacityId,requestKey:x.requestKey,note:x.note.trim()};
}
export function validatedDecision(x){
 if(!isPlain(x)||Object.keys(x).sort().join(',')!=='decision,note')throw new DV23BError('INVALID_DECISION_SHAPE');
 if(!['FEASIBILITY_APPROVED','REJECTED'].includes(x.decision))throw new DV23BError('INVALID_DECISION');
 if(typeof x.note!=='string'||x.note.trim().length<25||x.note.trim().length>1500)throw new DV23BError('DECISION_NOTE_LENGTH');
 return {decision:x.decision,note:x.note.trim()};
}
const source=x=>[x.id,x.tenant_id,x.municipality_id,x.owner_org_id,x.kind,x.sector,x.title,
  x.quantity===null?null:String(x.quantity),x.unit,x.evidence_ref,x.status,x.created_by,x.reviewed_by,x.review_note];
export function digestPair(need,capacity){return createHash('sha256').update(JSON.stringify([source(need),source(capacity)])).digest('hex')}
export function validatePair(need,capacity,city,visibleIds){
 if(!need||!capacity||need.kind!=='NEED'||capacity.kind!=='CAPACITY')throw new DV23BError('PAIR_KIND_MISMATCH');
 const p=createProposals({rows:[need,capacity],city,ownerIds:visibleIds});
 if(p.candidates.length!==1||p.candidates[0].need.id!==need.id||p.candidates[0].capacity.id!==capacity.id)throw new DV23BError('PAIR_NOT_ELIGIBLE');
 return {candidate:p.candidates[0],digest:digestPair(need,capacity)};
}
export function presentDecision(r){return {id:r.id,ownerOrgId:r.owner_org_id,needId:r.need_id,capacityId:r.capacity_id,
 sector:r.sector,status:r.status,createdBy:r.created_by,createdAt:r.created_at,
 note:r.justification,reviewedBy:r.decided_by||null,reviewNote:r.decision_note||null,reviewedAt:r.decided_at||null,
 canExecute:false,valueVerified:false,temporalWorkflow:'NOT_CONNECTED',langGraphAgent:'NOT_CONNECTED'};}
export const noExecution={execution:'NOT_AUTHORIZED',feasibilityOnly:true,agentExecution:'NOT_CONNECTED',temporalExecution:'NOT_CONNECTED',valueVerification:'NOT_ATTESTED',productionReady:false};
