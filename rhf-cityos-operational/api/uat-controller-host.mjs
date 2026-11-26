/**
 * V0.8: opt-in, time-limited synthetic-only UAT scope adapter.
 * Not an identity provider, role assignment, session renewal, or blanket grant.
 * The host invokes it ONLY after authenticate() and withScope() have established
 * a city-specific membership and RLS transaction.
 */
import {evaluateUatScope} from './uat-controller-scope.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const deny=(reason)=>Object.freeze({scopeAllowed:false,reason});

export function evaluateHostUat({env=process.env,user,city,role,action,actor,now=new Date()}={}){
  // No admin impersonation, anonymous, viewer, or deputy elevation.
  if (!user || user.is_system_admin!==false || role!=='MUNICIPAL_ADMIN') return deny('HOST_ROLE_NOT_AUTHORIZED');
  if (!UUID.test(String(user.id||'')) || !UUID.test(String(city?.id||'')) || !UUID.test(String(city?.tenant_id||''))) return deny('INVALID_HOST_IDENTITY');
  // A demonstration marker in the DB name is an additional safety fence; not
  // a substitute for the exact tenant/city binding and host membership checks.
  if(!/(?:دمو|آزمایشی|demo|synthetic)/iu.test(String(city?.name||''))) return deny('CITY_NOT_MARKED_AS_DEMO');
  if(typeof env.RHF_UAT_CONTROLLER_USERNAME!=='string' || env.RHF_UAT_CONTROLLER_USERNAME!==user.username) return deny('CONTROLLER_USERNAME_MISMATCH');
  const policy={
    enabled:env.RHF_UAT_CONTROLLER_ENABLED==='true',
    environment:env.RHF_UAT_CONTROLLER_ENVIRONMENT,
    tenantId:env.RHF_UAT_CONTROLLER_TENANT_ID,
    municipalityId:env.RHF_UAT_CONTROLLER_MUNICIPALITY_ID,
    controllerSubject:env.RHF_UAT_CONTROLLER_SUBJECT_ID,
    expiresAtUtc:env.RHF_UAT_CONTROLLER_EXPIRES_AT_UTC
  };
  return evaluateUatScope({policy,principal:{hostVerified:true,subject:user.id,tenantId:city.tenant_id,municipalityId:city.id},
    target:{tenantId:city.tenant_id,municipalityId:city.id,dataMode:'SYNTHETIC_DEMO'},action,actor,now});
}
