/** P1.4F-H1. HMAC service authentication for the isolated HTTP fixture only.
 * Trust is derived from a server-owned keyring. NEVER accept client-provided
 * actor/tenant/city/jobId/approval/lease fields. In-memory nonce cache is NOT
 * a production replay store. Do NOT mount this code on the live RUVOS server.
 */
import {createHmac,createHash,randomBytes,timingSafeEqual} from 'node:crypto';
export const STAGE_ROUTE='/_stage/agentic/dispatch-next';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const err=(code)=>Object.assign(new Error(code),{code});
const hash=b=>createHash('sha256').update(b).digest('hex');
const sign=(key,message)=>createHmac('sha256',key).update(message).digest();
const header=(h,k)=>h[k]??h[k.toLowerCase()]??h[k.toUpperCase()];
function canonical(method,path,ts,nonce,body){return [method,path,ts,nonce,hash(body)].join('\n');}
function buf(secret){return Buffer.isBuffer(secret)?secret:Buffer.from(secret,'utf8');}
export function createStageServiceAuthenticator({keyring,clock=()=>Date.now(),windowMs=30000,nonces=new Map()}={}){
 if(!(keyring instanceof Map)||keyring.size<1||windowMs<1000||windowMs>120000)throw err('STAGE_KEYRING_REQUIRED');
 for(const [keyId,v] of keyring){
  if(!/^[a-z][a-z0-9-]{3,48}$/.test(keyId)||!v||buf(v.secret).byteLength<32||
    ![v.tenantId,v.municipalityId,v.actorId].every(x=>UUID.test(String(x))))throw err('STAGE_KEYRING_INVALID');
 }
 const verify=({method,path,headers,body=Buffer.alloc(0)})=>{
  const keyId=header(headers,'x-avos-key-id');
  const tsText=header(headers,'x-avos-timestamp');
  const nonce=header(headers,'x-avos-nonce');
  const signature=header(headers,'x-avos-signature');
  if(method!=='POST'||path!==STAGE_ROUTE||!Buffer.isBuffer(body)||body.length!==0)throw err('STAGE_REQUEST_DENIED');
  if(typeof keyId!=='string'||typeof tsText!=='string'||typeof nonce!=='string'||typeof signature!=='string')throw err('SERVICE_AUTH_REQUIRED');
  const record=keyring.get(keyId);
  if(!record||!/^(0|[1-9][0-9]{12})$/.test(tsText)||!/^[a-f0-9]{32,64}$/.test(nonce)||!/^[a-f0-9]{64}$/.test(signature))throw err('SERVICE_AUTH_DENIED');
  const ts=Number(tsText), now=clock();
  if(!Number.isSafeInteger(ts)||!Number.isFinite(now)||Math.abs(now-ts)>windowMs)throw err('SERVICE_AUTH_EXPIRED');
  const message=canonical(method,path,tsText,nonce,body);
  const actual=Buffer.from(signature,'hex');
  if(!timingSafeEqual(actual,sign(buf(record.secret),message)))throw err('SERVICE_AUTH_DENIED');
  // Process-local test guard: production needs durable / distributed replay protection.
  for(const [k,expiry] of nonces){if(expiry<=now)nonces.delete(k);}
  const nonceId=`${keyId}:${nonce}`;
  if(nonces.has(nonceId))throw err('SERVICE_REPLAY_DENIED');
  nonces.set(nonceId,now+windowMs);
  return Object.freeze({origin:'STAGING_HMAC_VERIFIED',tenantId:record.tenantId,
    municipalityId:record.municipalityId,actorId:record.actorId,keyId});
 };
 return Object.freeze({verify});
}
/** Only a test/fixture signer. Caller possesses an isolated non-production key. */
export function signStageServiceRequest({keyId,secret,clock=Date.now(),nonce=randomBytes(18).toString('hex'),body=Buffer.alloc(0)}={}){
 if(typeof keyId!=='string'||buf(secret).length<32||!Buffer.isBuffer(body))throw err('SIGNER_INVALID');
 const ts=String(clock);
 return {'x-avos-key-id':keyId,'x-avos-timestamp':ts,
  'x-avos-nonce':nonce,'x-avos-signature':sign(buf(secret),canonical('POST',STAGE_ROUTE,ts,nonce,body)).toString('hex')};
}
