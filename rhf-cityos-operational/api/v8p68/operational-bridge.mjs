/**
 * RHF City OS v8p68 / fail-closed, dependency-injected route bridge.
 *
 * This file DOES NOT register a route and DOES NOT extract authority from
 * headers, query params, cookies, or JSON itself. The host must provide an
 * authenticated, verified RUVOS session resolver and durable audit writer.
 *
 * IMPORTANT: `loadVerifiedRuvosPrincipal` must run the host's existing
 * authentication checks and return verified:true only AFTER verification.
 * The marker is not a substitute for verifying a token/session.
 */
import { createTwinV8P68Handler } from './handler.mjs';
import { TwinError } from './digital-twin-core.mjs';

const permittedString = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
const limitedStrings = value => Array.isArray(value) && value.length <= 256 &&
  value.every(permittedString);

export function createRuvosOperationalTwinBridge({loadVerifiedRuvosPrincipal, appendCommittedAuditEvent} = {}) {
  if (typeof loadVerifiedRuvosPrincipal !== 'function') {
    throw new TypeError('loadVerifiedRuvosPrincipal must be an existing trusted RUVOS auth callback');
  }
  if (typeof appendCommittedAuditEvent !== 'function') {
    throw new TypeError('appendCommittedAuditEvent must persist an append-only audit record');
  }
  return createTwinV8P68Handler({
    resolvePrincipal: async req => {
      // This function must not be based only on a header or unverified JWT decode.
      const verifiedContext = await loadVerifiedRuvosPrincipal(req);
      if (verifiedContext?.verified !== true ||
          !permittedString(verifiedContext.userId) ||
          !permittedString(verifiedContext.tenantId) ||
          !limitedStrings(verifiedContext.municipalityIds) ||
          !limitedStrings(verifiedContext.permissions)) {
        throw new TwinError('RUVOS_AUTH_NOT_VERIFIED', 'A verified scoped RUVOS session is required', 401);
      }
      // Narrow, new object: ignore tenant/user/scope claims from request body.
      return Object.freeze({
        userId: verifiedContext.userId,
        tenantId: verifiedContext.tenantId,
        municipalityIds: Object.freeze([...new Set(verifiedContext.municipalityIds)]),
        permissions: Object.freeze([...new Set(verifiedContext.permissions)]),
      });
    },
    audit: async event => {
      // Enforce write acknowledgement. DB transaction must be committed by host.
      const committed = await appendCommittedAuditEvent(Object.freeze({...event}));
      if (committed !== true) throw new Error('AUDIT_COMMIT_NOT_ATTESTED');
    },
    enforceSameOrigin: true,
  });
}
