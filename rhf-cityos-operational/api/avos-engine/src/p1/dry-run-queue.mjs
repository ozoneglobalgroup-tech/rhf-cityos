/**
 * In-memory SAFE simulation of idempotent queue admission.
 * NOT a durable outbox, not a concurrency control across processes,
 * not a real worker, and NEVER dispatches an API request.
 */
import {assessMissionQueue} from './mission-intent.mjs';
export class DryRunMissionQueue {
  #items=new Map();
  enqueue({principal,intent,approvals,now}){
    const decision=assessMissionQueue({principal,intent,approvals,now});
    if(!decision.permit)return {status:'DENIED',reason:decision.reason,externalActions:0};
    const key=`${intent.tenantId}:${intent.municipalityId}:${intent.requestKey}`;
    const prior=this.#items.get(key);
    if(prior){
      if(prior.fingerprint!==intent.fingerprint)throw Error('IDEMPOTENCY_CONFLICT');
      return {...prior,reused:true};
    }
    const item=Object.freeze({status:'DRY_RUN_QUEUED',requestKey:intent.requestKey,fingerprint:intent.fingerprint,externalActions:0,missionId:null,requiresDurableOutbox:true});
    this.#items.set(key,item);
    return {...item,reused:false};
  }
  list(){return [...this.#items.values()];}
}
