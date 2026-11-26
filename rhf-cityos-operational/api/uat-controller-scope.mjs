/**
 * V0.7 UAT scope guard. Does NOT grant a role, override existing authorization,
 * authenticate a caller, or perform mutations. Must run AFTER trusted host auth
 * and in addition to the existing RUVOS permissions, role checks and audit.
 */
const ALLOWED_ACTIONS = new Set([
  'workspace.read',
  'organization.read',
  'demo.record.update',
  'agent.simulate',
  'twin.simulate',
  'appointment.request',
  'appointment.review.other',
  'governance.audit.read',
]);
const FORBIDDEN_ACTIONS = new Set([
  'appointment.review.self',
  'rls.disable',
  'authorization.override',
  'tenant.switch.unchecked',
  'public_value.verify',
  'production.execute',
  'credentials.read',
  'audit.modify',
]);
const deny = (reason) => Object.freeze({ scopeAllowed: false, reason });
const requiredString = (value) => typeof value === 'string' && value.length > 0 && value.trim() === value;
const isoDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) && Number.isFinite(Date.parse(value));
/**
 * evaluateUatScope(context) only determines whether an already-host-authorized
 * action is within the temporary synthetic-demo test scope. It is NOT an
 * authorization decision by itself. The host MUST independently check identity,
 * entitlements, seat overlap, RLS and append-only audit before any side effect.
 *
 * @returns {{scopeAllowed: boolean, reason: string}}
 */
export function evaluateUatScope({ policy, principal, target, action, actor, now = new Date() } = {}) {
  if (!policy || policy.enabled !== true) return deny('UAT_POLICY_DISABLED');
  if (policy.environment !== 'SYNTHETIC_DEMO') return deny('NON_DEMO_ENVIRONMENT');
  if (![policy.tenantId, policy.municipalityId, policy.controllerSubject].every(requiredString)) return deny('INVALID_POLICY_SCOPE');
  if (!isoDate(policy.expiresAtUtc)) return deny('INVALID_EXPIRY');
  const time = now instanceof Date ? now.getTime() : NaN;
  if (!Number.isFinite(time) || time >= Date.parse(policy.expiresAtUtc)) return deny('EXPIRED_OR_INVALID_TIME');
  if (Date.parse(policy.expiresAtUtc) - time > 30 * 24 * 3600_000) return deny('EXPIRY_TOO_LONG');
  if (!principal || principal.hostVerified !== true || !requiredString(principal.subject)) return deny('UNVERIFIED_PRINCIPAL');
  if (principal.subject !== policy.controllerSubject) return deny('NOT_ASSIGNED_CONTROLLER');
  if (principal.tenantId !== policy.tenantId || principal.municipalityId !== policy.municipalityId) return deny('PRINCIPAL_SCOPE_MISMATCH');
  if (!target || target.tenantId !== policy.tenantId || target.municipalityId !== policy.municipalityId) return deny('TARGET_SCOPE_MISMATCH');
  if (target.dataMode !== 'SYNTHETIC_DEMO') return deny('TARGET_NOT_SYNTHETIC');
  if (!requiredString(action) || FORBIDDEN_ACTIONS.has(action) || !ALLOWED_ACTIONS.has(action)) return deny('ACTION_NOT_ALLOWED');
  if (action === 'appointment.review.other') {
    // The host must ALSO enforce all existing appointment governance conditions.
    if (!actor || !requiredString(actor.requestedBySubject)) return deny('APPOINTMENT_REQUESTER_REQUIRED');
    if (actor.requestedBySubject === principal.subject) return deny('SELF_APPROVAL_FORBIDDEN');
    if (actor.sameSeatConflict !== false) return deny('UNRESOLVED_SEAT_CONFLICT');
  }
  return Object.freeze({ scopeAllowed: true, reason: 'UAT_SCOPE_ELIGIBLE_HOST_AUTH_AND_AUDIT_STILL_REQUIRED' });
}

export const UAT_ACTIONS = Object.freeze(Array.from(ALLOWED_ACTIONS));
