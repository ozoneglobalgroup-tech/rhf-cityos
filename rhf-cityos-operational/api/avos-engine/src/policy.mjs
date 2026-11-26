/** Agentic Urban Value OS — deterministic, fail-closed policy domain.
 * No LLM is allowed to mint verified principal, scopes, grants or approvals.
 */
import { createHash, randomUUID } from 'node:crypto';

export const ACTION_CATALOG = Object.freeze({
  'ruvos.case.read': { effect: 'READ', risk: 'LOW', approval: 'NONE' },
  'ruvos.capacity.read': { effect: 'READ', risk: 'LOW', approval: 'NONE' },
  'ruvos.opportunity.propose': { effect: 'WRITE', risk: 'LOW', approval: 'NONE' },
  'ruvos.mission.propose': { effect: 'WRITE', risk: 'MEDIUM', approval: 'HUMAN' },
  'ruvos.mission.create': { effect: 'WRITE', risk: 'MEDIUM', approval: 'HUMAN' },
  'ruvos.capacity.reserve': { effect: 'WRITE', risk: 'HIGH', approval: 'DUAL_HUMAN' },
  'ruvos.finance.commit': { effect: 'FINANCIAL', risk: 'CRITICAL', approval: 'DISABLED' },
  'ruvos.safety.certify': { effect: 'SAFETY', risk: 'CRITICAL', approval: 'DISABLED' },
  'ruvos.value.verify': { effect: 'VALUE', risk: 'CRITICAL', approval: 'DISABLED' }
});
const APPROVAL_ROLES = new Set(['DEPUTY', 'DIRECTOR', 'MUNICIPAL_ADMIN']);
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}
export function sha256(value) { return createHash('sha256').update(canonical(value)).digest('hex'); }
export function makeIntent({ tenantId, municipalityId, caseId, agentId, action, input, createdAt = new Date().toISOString() }) {
  if (![tenantId, municipalityId, caseId, agentId].every(v => typeof v === 'string' && v.trim())) throw new Error('SCOPED_IDENTIFIERS_REQUIRED');
  if (!Object.hasOwn(ACTION_CATALOG, action)) throw new Error('UNREGISTERED_ACTION');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('STRUCTURED_INPUT_REQUIRED');
  const intent = { id: randomUUID(), tenantId, municipalityId, caseId, agentId, action, input: structuredClone(input), createdAt };
  const fingerprint = sha256(intent);
  return Object.freeze({ ...intent, fingerprint, status: 'PROPOSED' });
}
export function ensureScope(principal, intent) {
  if (!principal || principal.verifiedByGateway !== true || principal.tenantId !== intent.tenantId || principal.municipalityId !== intent.municipalityId) {
    throw new Error('SCOPE_OR_IDENTITY_DENIED');
  }
  return true;
}
export function evaluateAction({ principal, intent, approvals = [], execute = false, now = new Date().toISOString() }) {
  try { ensureScope(principal, intent); } catch { return { permit: false, reason: 'SCOPE_OR_IDENTITY_DENIED' }; }
  const entry = ACTION_CATALOG[intent.action];
  if (!entry) return { permit: false, reason: 'UNREGISTERED_ACTION' };
  if (entry.approval === 'DISABLED') return { permit: false, reason: 'HIGH_IMPACT_TOOL_DISABLED' };
  if (intent.fingerprint !== sha256({ id:intent.id, tenantId:intent.tenantId, municipalityId:intent.municipalityId, caseId:intent.caseId, agentId:intent.agentId, action:intent.action, input:intent.input, createdAt:intent.createdAt })) {
    return { permit: false, reason: 'INTENT_TAMPERED' };
  }
  if (intent.input?.targetTenantId && intent.input.targetTenantId !== intent.tenantId) return { permit:false, reason:'CROSS_TENANT_TARGET' };
  if (intent.input?.targetMunicipalityId && intent.input.targetMunicipalityId !== intent.municipalityId) return { permit:false, reason:'CROSS_CITY_TARGET' };
  if (entry.approval !== 'NONE') {
    const valid = approvals.filter(a => a && a.origin === 'TRUSTED_APPROVAL_STORE' && a.decision === 'APPROVE' && a.intentFingerprint === intent.fingerprint && a.tenantId === intent.tenantId && a.municipalityId === intent.municipalityId && APPROVAL_ROLES.has(a.role) && typeof a.actorId === 'string' && a.actorId !== intent.agentId && a.expiresAt && a.expiresAt > now && a.revoked !== true);
    const unique = new Set(valid.map(a=>a.actorId));
    const required = entry.approval === 'DUAL_HUMAN' ? 2 : 1;
    if (unique.size < required) return { permit: false, reason: 'INDEPENDENT_APPROVAL_REQUIRED', required };
  }
  // The execution adapter must also independently verify the JWT/session, membership and RLS context.
  if (execute && principal.executionGrant !== true) return { permit: false, reason: 'EXECUTION_GRANT_REQUIRED' };
  return { permit: true, reason: execute ? 'GOVERNED_EXECUTION_ALLOWED' : 'POLICY_VALID', risk: entry.risk, effect: entry.effect };
}
