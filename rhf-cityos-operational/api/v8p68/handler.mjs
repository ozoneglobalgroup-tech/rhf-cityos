/**
 * Adapter to mount inside the EXISTING RHF City OS Node API routing.
 * No routes are registered automatically; use documented integration adapter.
 * Must receive a VERIFIED RUVOS principal resolver and an independent audit sink.
 */
import { analyzeScenario, TwinError, TWIN_VERSION, DOMAINS, SCENARIO_TYPE, SIMULATE_PERMISSION } from './digital-twin-core.mjs';
export const BASE_PATH = '/api/ruvos/v8p68/digital-twin';
const json = (res, status, payload) => {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(payload));
};
async function readJson(req) {
  let length = 0;
  const chunks = [];
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 65536) throw new TwinError('PAYLOAD_TOO_LARGE', 'Limit 64 KiB', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new TwinError('INVALID_JSON', 'Valid JSON is required', 400); }
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; }
  catch { return false; }
}

/** Returns false if request belongs to a different route; otherwise handles response. */
export function createTwinV8P68Handler({resolvePrincipal, audit, enforceSameOrigin=true} = {}) {
  if (typeof resolvePrincipal !== 'function' || typeof audit !== 'function') {
    throw new TypeError('RUVOS principal resolver and audited event sink are both required');
  }
  return async function handle(req, res) {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path !== `${BASE_PATH}/simulate` && path !== `${BASE_PATH}/capabilities`) return false;
    try {
      if (enforceSameOrigin && !sameOrigin(req)) {
        throw new TwinError('CROSS_ORIGIN_DENIED', 'Only same-origin requests are permitted', 403);
      }
      if (path.endsWith('/capabilities') && req.method !== 'GET') {
        throw new TwinError('METHOD_NOT_ALLOWED', 'GET required', 405);
      }
      if (path.endsWith('/simulate') && req.method !== 'POST') {
        throw new TwinError('METHOD_NOT_ALLOWED', 'POST required', 405);
      }
      const principal = await resolvePrincipal(req); // security-critical RUVOS integration point
      if (!principal?.userId || !principal?.tenantId) {
        throw new TwinError('UNAUTHENTICATED', 'Authenticated RUVOS session required', 401);
      }
      if (!Array.isArray(principal.permissions) || !principal.permissions.includes(SIMULATE_PERMISSION)) {
        throw new TwinError('FORBIDDEN', 'Missing simulation permission', 403);
      }
      if (path.endsWith('/capabilities')) {
        json(res, 200, {version:TWIN_VERSION, scenarioTypes:[SCENARIO_TYPE], organizationalDomains:DOMAINS,
          implementedDomains:['WASTE_MANAGEMENT'], analysisOnly:true, publicValueVerified:false});
        return true;
      }
      const payload = await readJson(req);
      const result = analyzeScenario(payload, principal);
      try {
        await audit({eventType:'DIGITAL_TWIN_SIMULATION', simulationId:result.simulationId,
          tenantId:principal.tenantId, municipalityId:result.municipalityId,
          actorUserId:principal.userId, status:result.status, effects:'NONE'});
      } catch {
        throw new TwinError('AUDIT_UNAVAILABLE', 'Audited execution required', 503);
      }
      json(res, 200, result);
      return true;
    } catch (e) {
      if (e instanceof TwinError) json(res, e.httpStatus, {error:e.code, message:e.message});
      else json(res, 500, {error:'INTERNAL_ERROR', message:'Request could not be processed'});
      return true;
    }
  };
}
