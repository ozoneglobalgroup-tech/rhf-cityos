/** Agentic planner interface. The model never receives a write tool. */
import { makePlan, matchCapacity } from './orchestrator.mjs';
import { makeIntent } from './policy.mjs';
export class AgenticCoordinator {
  constructor({capacityReader}) {
    if (typeof capacityReader?.list !== 'function') throw new Error('CAPACITY_READER_PORT_REQUIRED');
    this.capacityReader=capacityReader;
  }
  async propose({verifiedContext, opportunity, objective}) {
    if (verifiedContext?.verifiedByGateway !== true || verifiedContext.tenantId !== opportunity.tenantId || verifiedContext.municipalityId !== opportunity.municipalityId) throw new Error('UNVERIFIED_SCOPED_CONTEXT');
    const capacities=await this.capacityReader.list({tenantId:opportunity.tenantId,municipalityId:opportunity.municipalityId});
    const matches=matchCapacity({opportunity,candidates:capacities});
    const plan=makePlan({opportunity,matches,objective});
    if (plan.state==='BLOCKED') return { plan, intent:null };
    const intent=makeIntent({tenantId:opportunity.tenantId,municipalityId:opportunity.municipalityId,caseId:opportunity.caseId,agentId:'agent:city-value-orchestrator',action:'ruvos.mission.propose',input:{opportunityId:opportunity.id,capacityId:plan.selectedCapacityId,evidenceId:plan.selectedEvidenceId,objective}});
    return { plan, intent };  // No API mutation, approval, or action is performed.
  }
}
