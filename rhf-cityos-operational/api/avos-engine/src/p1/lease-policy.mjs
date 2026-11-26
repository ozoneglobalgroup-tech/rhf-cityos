/** Review-only pure policy for durable worker queue lifecycle. No DB writes. */
export function leaseEligible(item,now){
  const t=Date.parse(now);
  if(!Number.isFinite(t))return false;
  if(!item||!['PENDING','RETRY','CLAIMED'].includes(item.status))return false;
  if(item.status==='CLAIMED')return Date.parse(item.leaseExpiresAt)<=t;
  return Date.parse(item.nextAttemptAt)<=t;
}
export function nextFailure({attempts,now,maxAttempts=5,baseDelayMs=1000,maxDelayMs=60000}){
  if(!Number.isInteger(attempts)||attempts<1||!Number.isFinite(Date.parse(now))||!Number.isInteger(maxAttempts)||maxAttempts<1)throw Error('INVALID_RETRY_POLICY');
  if(attempts>=maxAttempts)return {status:'DEAD',attempts,nextAttemptAt:null};
  const delay=Math.min(maxDelayMs,baseDelayMs*2**Math.min(attempts-1,24));
  if(!Number.isFinite(delay)||delay<0)throw Error('INVALID_DELAY');
  return {status:'RETRY',attempts,nextAttemptAt:new Date(Date.parse(now)+delay).toISOString()};
}
export function shouldStopOnError(code){
  return new Set(['SCOPE_DENIED','APPROVAL_INVALID','INTENT_FINGERPRINT_INVALID','INTENT_PAYLOAD_INVALID',
    'CASE_VERSION_CONFLICT','CASE_NOT_EXECUTABLE','CAPACITY_STALE_OR_UNVERIFIED','RECEIPT_STATE_CONFLICT']).has(code);
}
