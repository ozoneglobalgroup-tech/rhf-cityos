/** Outcome and attribution must never be inferred from workflow completion.
 * Only real verified evidence can progress to INDEPENDENT_REVIEW_REQUIRED.
 * VERIFIED requires separate signature and trusted review service (not implemented here).
 */
function dateMs(v) { const n = Date.parse(v); return Number.isFinite(n) ? n : null; }
function synthetic(o) { return o?.synthetic === true || /SYNTHETIC_DEMO|SIMULATED|TEST_FIXTURE/i.test([o?.sourceReference, o?.note, o?.evidence].join(' ')); }
export function assessOutcome({ baseline, followup, action, assessment = {} }) {
  const failures = [];
  if (!baseline || !followup) return { status:'NOT_VERIFIED', failures:['MISSING_MEASUREMENT_PAIR'], publicValueVerified:false };
  if (synthetic(baseline) || synthetic(followup) || action?.synthetic === true) failures.push('SYNTHETIC_OR_SIMULATED_EVIDENCE');
  if (!baseline.metricCode || baseline.metricCode !== followup.metricCode || !baseline.unit || baseline.unit !== followup.unit) failures.push('METRIC_OR_UNIT_INCOMPARABLE');
  if (!baseline.sourceVerified || !followup.sourceVerified || !baseline.integrityVerified || !followup.integrityVerified) failures.push('SOURCE_OR_INTEGRITY_UNVERIFIED');
  if (!baseline.reviewedBy || !followup.reviewedBy || baseline.reviewedBy === baseline.createdBy || followup.reviewedBy === followup.createdBy || baseline.reviewAuthorityVerified !== true || followup.reviewAuthorityVerified !== true) failures.push('INDEPENDENT_REVIEW_NOT_ESTABLISHED');
  const t0 = dateMs(baseline.observedAt), t1 = dateMs(followup.observedAt), a0 = dateMs(action?.startedAt), a1 = dateMs(action?.completedAt);
  if ([t0,t1,a0,a1].some(x=>x === null) || !(t0 < a0 && a0 <= a1 && a1 < t1)) failures.push('ACTION_TEMPORAL_ATTRIBUTION_FAILED');
  if (action?.authorized !== true || action?.executedVerified !== true || !action?.evidenceId) failures.push('GOVERNED_REAL_ACTION_NOT_VERIFIED');
  if (!assessment.comparatorVerified || !assessment.attributionMethodReviewed || !assessment.confoundersReviewed) failures.push('CAUSAL_ASSESSMENT_INCOMPLETE');
  if (assessment.scopeVerified !== true) failures.push('SCOPE_OR_POPULATION_UNVERIFIED');
  if (failures.length) return { status:'NOT_VERIFIED', failures, publicValueVerified:false };
  return { status:'INDEPENDENT_OUTCOME_REVIEW_REQUIRED', failures:[], publicValueVerified:false };
}
