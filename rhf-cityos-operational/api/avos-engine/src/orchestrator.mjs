/** Deterministic orchestration stages. Planning != authorization != dispatch. */
export const STAGES = Object.freeze(['NEED_IDENTIFIED','CAPACITY_DISCOVERED','OPTION_EVALUATED','ACTION_PROPOSED','AWAITING_APPROVAL','ACTION_AUTHORIZED','EXECUTION_CONFIRMED','OUTCOME_REVIEWED','VALUE_REGISTERED']);
export function matchCapacity({ opportunity, candidates, now = new Date().toISOString() }) {
  if (!opportunity?.tenantId || !opportunity?.municipalityId || !Array.isArray(candidates)) throw new Error('INVALID_MATCH_REQUEST');
  const needed = opportunity.requiredUnits;
  if (!Number.isFinite(needed) || needed <= 0) throw new Error('REQUIRED_UNITS_INVALID');
  return candidates.filter(c =>
    c.tenantId === opportunity.tenantId && c.municipalityId === opportunity.municipalityId &&
    c.verifiedAvailability === true && c.legalUseAuthorized === true && c.safetyQualified === true &&
    c.capacityUnits >= needed && c.validUntil > now &&
    (!opportunity.requiredSkill || c.skills?.includes(opportunity.requiredSkill))
  ).map(c => ({ capacityId:c.id, availableUnits:c.capacityUnits, score: c.capacityUnits - needed, evidenceId:c.evidenceId || null }))
    .sort((a,b) => a.score - b.score || a.capacityId.localeCompare(b.capacityId));
}
export function makePlan({ opportunity, matches, objective }) {
  if (!matches.length) return { state:'BLOCKED', reason:'NO_LEGALLY_USABLE_VERIFIED_CAPACITY', alternatives:['INSPECT_DATA','REPLAN','REQUEST_AUTHORIZED_RESOURCE'] };
  return { state:'ACTION_PROPOSED', objective, opportunityId:opportunity.id, tenantId:opportunity.tenantId, municipalityId:opportunity.municipalityId, selectedCapacityId:matches[0].capacityId, selectedEvidenceId:matches[0].evidenceId, requiresHumanApproval:true, dispatchOccurred:false };
}
