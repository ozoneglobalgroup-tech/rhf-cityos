/**
 * Pure, local-only evidence snapshot for a future governed decision packet.
 * Not an approval, an action request, an actual RUVOS record, or a Temporal workflow.
 * Must only be called on the server with an authentic principal and freshly computed result.
 */
import { createHash } from 'node:crypto';
import { authorize, TwinError } from './digital-twin-core.mjs';

const fail = (code, message, status = 422) => { throw new TwinError(code, message, status); };
const ownedString = (s) => typeof s === 'string' && s.trim().length >= 12 && s.trim().length <= 600;
const finite = (x) => typeof x === 'number' && Number.isFinite(x);

export function prepareDecisionPacketDraft(simulationResult, principal, {rationale} = {}) {
  if (!simulationResult || typeof simulationResult !== 'object' ||
      simulationResult.status !== 'SIMULATED' || !simulationResult.forecast ||
      !simulationResult.governance) {
    fail('SIMULATION_NOT_READY', 'Evidence-gated simulation is required before drafting');
  }
  const r = simulationResult;
  if (r.domain !== 'WASTE_MANAGEMENT' || r.scenarioType !== 'WASTE_ROUTE_EFFICIENCY') {
    fail('UNSUPPORTED_DOMAIN', 'Only waste-route decision drafts are implemented');
  }
  // Re-check tenant and municipality authority independently of caller-controlled inputs.
  authorize(principal, r.municipalityId, r.dataMode === 'SYNTHETIC_DEMO');
  if (r.tenantId !== principal.tenantId) {
    fail('TENANT_SCOPE_DENIED', 'Cross-tenant decision draft forbidden', 403);
  }
  if (!['SYNTHETIC_DEMO', 'ATTRIBUTED_NON_DEMO'].includes(r.dataMode)) {
    fail('INVALID_DATA_MODE', 'Unrecognized provenance mode');
  }
  if (r.governance.humanApprovalStatus !== 'NOT_REQUESTED' ||
      r.governance.temporalWorkflowStatus !== 'NOT_STARTED' ||
      r.governance.decisionPacketStatus !== 'NOT_SUBMITTED' ||
      r.governance.executionEffects !== 'NONE' ||
      r.governance.independentlyVerifiedPublicValue !== null ||
      r.governance.publicValueVerificationStatus !== 'NOT_VERIFIED') {
    fail('GOVERNANCE_STATE_UNSAFE', 'Cannot derive draft from altered governance state');
  }
  if (!ownedString(rationale)) {
    fail('RATIONALE_REQUIRED', 'Decision rationale of 12..600 characters is required');
  }
  if (!r.provenance || !['baseline','gis','calibration'].every(kind => Array.isArray(r.provenance[kind]) && r.provenance[kind].length > 0)) {
    fail('EVIDENCE_MISSING', 'Baseline, GIS and calibration references are required');
  }
  const forecast = r.forecast;
  if (!forecast.annualScenarioForecast ||
    !finite(forecast.annualScenarioForecast.costSavingsIRR) ||
    !finite(forecast.annualScenarioForecast.kgCo2eReduction) ||
    !Array.isArray(forecast.forecastIntervalP05P95?.costSavingsIRR) ||
    forecast.forecastIntervalP05P95.costSavingsIRR.length !== 2 ||
    !forecast.forecastIntervalP05P95.costSavingsIRR.every(finite)) {
    fail('INVALID_FORECAST', 'Complete finite scenario economics required');
  }
  const evidenceReferences = Object.fromEntries(['baseline', 'gis', 'calibration'].map(kind => [
    kind, r.provenance[kind].map(ref => ({id: ref.id, sourceSystem: ref.sourceSystem, synthetic: ref.synthetic}))
  ]));
  const canonical = JSON.stringify({simulationId: r.simulationId, tenantId:r.tenantId, municipalityId:r.municipalityId, actorId:principal.userId, rationale:rationale.trim()});
  const draftId = 'LOCAL-DRAFT-' + createHash('sha256').update(canonical).digest('hex').slice(0, 20);
  return {
    kind: 'URBAN_DECISION_PACKET_DRAFT',
    draftId,
    status: 'LOCAL_DRAFT_NOT_SUBMITTED',
    dataMode: r.dataMode,
    tenantId: r.tenantId,
    municipalityId: r.municipalityId,
    createdByPrincipalId: principal.userId,
    simulationId: r.simulationId,
    domain: r.domain,
    title: r.name,
    purpose: rationale.trim(),
    evidenceReferences,
    forecast: {
      annualScenarioForecast: {...forecast.annualScenarioForecast},
      forecastIntervalP05P95: {...forecast.forecastIntervalP05P95},
      uncertaintyMethod: forecast.uncertaintyMethod,
    },
    governance: {
      humanApproval: 'NOT_REQUESTED',
      independentReview: 'NOT_PERFORMED',
      persistedInRuvos: false,
      temporalWorkflow: 'NOT_STARTED',
      effects: 'NONE',
      independentlyVerifiedPublicValue: null,
    },
    warning: 'FORECAST_ONLY; draft must be revalidated against source evidence and governed approval process before submission.',
  };
}
