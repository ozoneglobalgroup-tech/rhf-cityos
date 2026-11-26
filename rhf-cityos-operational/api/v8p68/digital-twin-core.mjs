/**
 * RHF City OS / RUVOS — evidence-gated digital twin scenario engine, V8P6.8.
 * Pure analysis only: no database writes, no external calls, no Temporal starts.
 * Trust model: principal MUST come from the host's verified RUVOS session.
 */
import { createHash } from 'node:crypto';

export const TWIN_VERSION = '8.6.8-stage1';
export const SIMULATE_PERMISSION = 'cityos.digital_twin.simulate';
export const REAL_DATA_PERMISSION = 'cityos.digital_twin.simulate_real';
export const SCENARIO_TYPE = 'WASTE_ROUTE_EFFICIENCY';
export const DOMAINS = Object.freeze([
  'WASTE_MANAGEMENT', 'GREEN_SPACE', 'URBAN_CLEANING', 'CEMETERIES',
  'FOOD_MARKETS', 'ENVIRONMENT', 'BEAUTIFICATION', 'FIRE_SAFETY',
  'FLEET', 'CONTRACTORS', 'CITIZEN_SERVICES', 'URBAN_PUBLIC_SERVICES',
]);

export class TwinError extends Error {
  constructor(code, message, httpStatus = 400) {
    super(message);
    this.name = 'TwinError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
const err = (code, message, status = 422) => { throw new TwinError(code, message, status); };
const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (v, name, max = 120) => {
  if (typeof v !== 'string' || !v.trim() || v.length > max) err('INVALID_FIELD', `Invalid ${name}`);
  return v.trim();
};
const amount = (v, name, {min = 0, max = 1e12, positive = false} = {}) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (positive && v === 0)) {
    err('INVALID_NUMBER', `Invalid ${name}`);
  }
  return v;
};
const integer = (v, name, min, max) => {
  if (!Number.isInteger(v) || v < min || v > max) err('INVALID_INTEGER', `Invalid ${name}`);
  return v;
};
const unique = xs => [...new Set(xs)];

export function authorize(principal, municipalityId, isDemo) {
  if (!obj(principal) || !strSafe(principal.userId) || !strSafe(principal.tenantId)) {
    err('UNAUTHENTICATED', 'Authenticated RUVOS principal is required', 401);
  }
  if (!Array.isArray(principal.permissions) || !principal.permissions.includes(SIMULATE_PERMISSION)) {
    err('FORBIDDEN', 'Missing digital twin simulation permission', 403);
  }
  if (!Array.isArray(principal.municipalityIds) || !principal.municipalityIds.includes(municipalityId)) {
    err('MUNICIPALITY_SCOPE_DENIED', 'Municipality is outside the authorized scope', 403);
  }
  if (!isDemo && !principal.permissions.includes(REAL_DATA_PERMISSION)) {
    err('REAL_DATA_NOT_AUTHORIZED', 'Real-data simulation needs separate authority', 403);
  }
}
const strSafe = v => typeof v === 'string' && v.length > 0 && v.length <= 128;

function referenceList(refs, name) {
  if (!Array.isArray(refs) || refs.length > 50) err('INVALID_REFERENCES', `Invalid ${name}`);
  return refs.map((ref, i) => {
    if (!obj(ref)) err('INVALID_REFERENCE', `Invalid ${name}[${i}]`);
    const id = str(ref.id, `${name}[${i}].id`, 128);
    const sourceSystem = str(ref.sourceSystem, `${name}[${i}].sourceSystem`, 80);
    const recordedAt = str(ref.recordedAt, `${name}[${i}].recordedAt`, 40);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(recordedAt) || Number.isNaN(Date.parse(recordedAt))) {
      err('INVALID_TIMESTAMP', `Invalid ${name}[${i}].recordedAt`);
    }
    if (typeof ref.synthetic !== 'boolean') err('INVALID_REFERENCE', `Missing synthetic label in ${name}[${i}]`);
    return {id, sourceSystem, recordedAt, synthetic: ref.synthetic};
  });
}
function costs(input, name) {
  if (!obj(input)) err('INVALID_COST_INPUT', `Missing ${name}`);
  return {
    distanceKmPerShift: amount(input.distanceKmPerShift, `${name}.distanceKmPerShift`, {positive: true, max: 1e5}),
    shiftsPerYear: integer(input.shiftsPerYear, `${name}.shiftsPerYear`, 1, 10000),
    dieselLitersPer100Km: amount(input.dieselLitersPer100Km, `${name}.dieselLitersPer100Km`, {positive: true, max: 1000}),
    dieselCostPerLiterIRR: amount(input.dieselCostPerLiterIRR, `${name}.dieselCostPerLiterIRR`, {max: 1e9}),
    kgCo2ePerLiter: amount(input.kgCo2ePerLiter, `${name}.kgCo2ePerLiter`, {positive: true, max: 100}),
    laborCostPerShiftIRR: amount(input.laborCostPerShiftIRR, `${name}.laborCostPerShiftIRR`, {max: 1e12}),
    otherCostPerShiftIRR: amount(input.otherCostPerShiftIRR, `${name}.otherCostPerShiftIRR`, {max: 1e12}),
  };
}
function annualMetrics(x, distanceFactor = 1) {
  const distanceKm = x.distanceKmPerShift * x.shiftsPerYear * distanceFactor;
  const liters = distanceKm * x.dieselLitersPer100Km / 100;
  return {
    distanceKm,
    dieselLiters: liters,
    costIRR: liters * x.dieselCostPerLiterIRR + x.shiftsPerYear * (x.laborCostPerShiftIRR + x.otherCostPerShiftIRR),
    kgCo2e: liters * x.kgCo2ePerLiter,
  };
}
const round = (x, dp = 2) => Math.round((x + Number.EPSILON) * 10 ** dp) / 10 ** dp;
function quantile(sorted, p) {
  const x = (sorted.length - 1) * p;
  const a = Math.floor(x), b = Math.ceil(x);
  return sorted[a] + (sorted[b] - sorted[a]) * (x - a);
}
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; };
}
function simulate(baseline, proposed, parameters) {
  const rng = seededRandom(parameters.seed);
  const base = annualMetrics(baseline);
  const savings = [], emissionReductions = [], distances = [];
  for (let i = 0; i < parameters.runs; i++) {
    // Triangular uncertainty: this is an assumption, NOT a calibrated probability model.
    const f = 1 + parameters.uncertaintyPct * (rng() + rng() - 1);
    const next = annualMetrics(proposed, f);
    savings.push(base.costIRR - next.costIRR);
    emissionReductions.push(base.kgCo2e - next.kgCo2e);
    distances.push(next.distanceKm);
  }
  savings.sort((a,b) => a-b);
  emissionReductions.sort((a,b) => a-b);
  distances.sort((a,b) => a-b);
  const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
  return {
    annualBaseline: {distanceKm: round(base.distanceKm), dieselLiters: round(base.dieselLiters), costIRR: round(base.costIRR), kgCo2e: round(base.kgCo2e)},
    annualScenarioForecast: {distanceKm: round(mean(distances)), costSavingsIRR: round(mean(savings)), kgCo2eReduction: round(mean(emissionReductions))},
    forecastIntervalP05P95: {
      costSavingsIRR: [round(quantile(savings, .05)), round(quantile(savings, .95))],
      kgCo2eReduction: [round(quantile(emissionReductions, .05)), round(quantile(emissionReductions, .95))],
    },
    units: {distanceKm: 'km/year', dieselLiters: 'L/year', costIRR: 'IRR/year', kgCo2e: 'kgCO2e/year'},
    uncertaintyMethod: 'TRIANGULAR_ASSUMPTION_NOT_EMPIRICALLY_CALIBRATED',
  };
}

/** Validation is fail-closed; never trust any tenantId or permissions provided in payload. */
export function analyzeScenario(payload, principal) {
  if (!obj(payload)) err('INVALID_PAYLOAD', 'Scenario request must be an object');
  for (const forbidden of ['tenantId', 'tenant_id', 'createdBy', 'created_by', 'permissions', 'principal', 'verifiedValue']) {
    if (Object.hasOwn(payload, forbidden)) err('UNTRUSTED_AUTHORITY_FIELD', `Do not supply ${forbidden}`, 400);
  }
  const municipalityId = str(payload.municipalityId, 'municipalityId');
  if (typeof payload.demo !== 'boolean') err('MODE_REQUIRED', 'Explicit demo boolean is required');
  authorize(principal, municipalityId, payload.demo);
  const scenarioType = str(payload.scenarioType, 'scenarioType');
  if (scenarioType !== SCENARIO_TYPE) err('UNIMPLEMENTED_SCENARIO_TYPE', 'This scenario type is not implemented');
  const domain = str(payload.domain, 'domain');
  if (domain !== 'WASTE_MANAGEMENT') err('DOMAIN_MISMATCH', 'This engine only calculates WASTE_MANAGEMENT route scenarios');
  const name = str(payload.name, 'name', 160);
  const baseline = costs(payload.baseline, 'baseline');
  const proposed = costs(payload.proposed, 'proposed');
  if (!obj(payload.evidence)) err('INVALID_EVIDENCE', 'Evidence object is required');
  const evidence = {
    baseline: referenceList(payload.evidence.baseline, 'evidence.baseline'),
    gis: referenceList(payload.evidence.gis, 'evidence.gis'),
    calibration: referenceList(payload.evidence.calibration, 'evidence.calibration'),
  };
  if (!Array.isArray(payload.assumptions) || payload.assumptions.length > 25) err('INVALID_ASSUMPTIONS', 'Invalid assumptions list');
  const assumptions = payload.assumptions.map((x,i) => str(x, `assumptions[${i}]`, 280));
  if (assumptions.length === 0) err('INVALID_ASSUMPTIONS', 'Explicit assumptions are required');
  const missing = [];
  for (const [k, refs] of Object.entries(evidence)) if (!refs.length) missing.push(`evidence.${k}`);
  if (!obj(payload.calibration) || !strSafe(payload.calibration.method)) missing.push('calibration.method');
  const method = obj(payload.calibration) && strSafe(payload.calibration.method)
    ? str(payload.calibration.method, 'calibration.method', 128) : null;
  if (!obj(payload.simulation)) err('INVALID_SIMULATION', 'Simulation parameters required');
  const simulation = {
    runs: integer(payload.simulation.runs, 'simulation.runs', 100, 5000),
    uncertaintyPct: amount(payload.simulation.uncertaintyPct, 'simulation.uncertaintyPct', {max: .5}),
    seed: integer(payload.simulation.seed, 'simulation.seed', 0, 4294967295),
  };
  if (payload.demo && Object.values(evidence).flat().some(r => !r.synthetic)) {
    err('DEMO_MIXED_WITH_REAL', 'Demo scenario must reference synthetic data only');
  }
  if (!payload.demo && Object.values(evidence).flat().some(r => r.synthetic)) {
    err('REAL_MIXED_WITH_SYNTHETIC', 'Real-data request cannot use synthetic evidence');
  }
  const idMaterial = JSON.stringify({tenantId: principal.tenantId, municipalityId, name, domain, scenarioType, demo: payload.demo, baseline, proposed, evidence, assumptions, method, simulation});
  const simulationId = `SIM-${createHash('sha256').update(idMaterial).digest('hex').slice(0,24)}`;
  const common = {
    version: TWIN_VERSION, simulationId,
    tenantId: principal.tenantId, municipalityId, domain, scenarioType, name,
    dataMode: payload.demo ? 'SYNTHETIC_DEMO' : 'ATTRIBUTED_NON_DEMO',
    provenance: evidence, assumptions,
    calibration: {method, verifiedByIndependentReview: false},
    governance: {
      decisionPacketStatus: 'NOT_SUBMITTED',
      humanApprovalStatus: 'NOT_REQUESTED',
      temporalWorkflowStatus: 'NOT_STARTED',
      executionEffects: 'NONE',
      independentlyVerifiedPublicValue: null,
      publicValueVerificationStatus: 'NOT_VERIFIED',
    },
  };
  if (missing.length) {
    return {...common, status: 'INSUFFICIENT_EVIDENCE', missingEvidence: unique(missing), forecast: null};
  }
  return {...common, status: 'SIMULATED', missingEvidence: [],
    forecast: simulate(baseline, proposed, simulation),
    simulationParameters: simulation,
    caveat: 'Forecast only. Data and uncertainty are declared assumptions; no verified public value, physical execution, or approval.'};
}
