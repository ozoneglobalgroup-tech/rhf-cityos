/** RHF City OS DV32UX33 — backend membership mutation policy.
 * A membership grants city-wide application access. An organizational appointment
 * is separate and never automatically becomes a municipality-wide role.
 * This module is pure; authorization runs again inside the scoped DB transaction.
 */
import {ClientError, VALID_ROLES} from './domain.mjs';

const deny = (message, code=403) => {throw new ClientError(message, code);};
const REASON_MIN=30;

export function evaluateMembershipMutation({actor,actorRole,targetUserId,requestedRole,existingRole=null,action,expectedRole,reason}={}) {
  if (!actor?.id || !targetUserId || !VALID_ROLES.includes(requestedRole)) {
    deny('کاربر یا نقش درخواست‌شده معتبر نیست',400);
  }
  const systemAdmin=actor.is_system_admin===true;
  if (!systemAdmin && actorRole!=='MUNICIPAL_ADMIN') {
    deny('مدیریت عضویت این شهرداری مجاز نیست');
  }
  if (String(actor.id).toLowerCase()===String(targetUserId).toLowerCase()) {
    deny('تغییر عضویت خود از این مسیر مجاز نیست');
  }
  if (existingRole !== null && !VALID_ROLES.includes(existingRole)) {
    deny('نقش فعلی معتبر نیست',409);
  }
  if (existingRole===requestedRole) {
    return Object.freeze({kind:'UNCHANGED',previousRole:existingRole,nextRole:requestedRole});
  }
  if (existingRole===null) {
    if (!systemAdmin && requestedRole!=='VIEWER') {
      deny('ثبت نقش بالاتر از VIEWER فقط از مسیر مدیر سامانه مجاز است');
    }
    // Backward compatible first-time VIEWER onboarding; no role overwrite.
    if (requestedRole==='VIEWER' && (action===undefined || action==='GRANT')) {
      return Object.freeze({kind:'GRANT',previousRole:null,nextRole:requestedRole});
    }
    if (action!=='GRANT' || typeof reason!=='string' || reason.trim().length<REASON_MIN || reason.length>1200) {
      deny('اعطای نقش جدید به ثبت صریح و دلیل مستند نیاز دارد',400);
    }
    return Object.freeze({kind:'GRANT',previousRole:null,nextRole:requestedRole,reason:reason.trim()});
  }
  // Existing role may not be overwritten by a generic POST or a municipal admin.
  if (!systemAdmin) {
    deny('تغییر نقش موجود فقط توسط مدیر سامانه مجاز است');
  }
  if (action!=='CHANGE' || expectedRole!==existingRole) {
    deny('تغییر نقش به اقدام صریح و نقش قبلی تأییدشده نیاز دارد',409);
  }
  if (typeof reason!=='string' || reason.trim().length<REASON_MIN || reason.length>1200) {
    deny('دلیل تغییر نقش باید حداقل ۳۰ نویسه باشد',400);
  }
  return Object.freeze({kind:'CHANGE',previousRole:existingRole,nextRole:requestedRole,reason:reason.trim()});
}
