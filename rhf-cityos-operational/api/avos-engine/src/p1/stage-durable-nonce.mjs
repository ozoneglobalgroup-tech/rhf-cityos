/** P1.4F-H2, isolated PostgreSQL nonce replay guard. Not mounted to live RUVOS.
 * Valid signature first; only trusted keyring-derived scope then reaches database.
 * Persist a nonce before admitting a request. A transient DB failure denies access.
 * This is staged HMAC hardening, NOT production-ready service authentication.
 */
import {createStageServiceAuthenticator} from './stage-http-service-auth.mjs';
const fail=code=>Object.assign(new Error(code),{code});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createStageDurableServiceAuthenticator({pool,keyring,windowMs=30000,clock=()=>Date.now(),
 requiredDatabase='avos_stage_copy',requiredRole='cityos_runtime'}={}){
 if(!pool||typeof pool.connect!=='function')throw fail('NONCE_TRUSTED_POOL_REQUIRED');
 if(typeof clock!=='function'||!Number.isInteger(windowMs)||windowMs<1000||windowMs>120000)
   throw fail('NONCE_CONFIG_INVALID');
 const auth=createStageServiceAuthenticator({keyring,clock,windowMs});
 return Object.freeze({async verify(req){
   const p=auth.verify(req); // must reject bad signatures before a DB connection
   const nonce=req.headers?.['x-avos-nonce'];
   if(!UUID.test(p.tenantId)||!UUID.test(p.municipalityId)||!UUID.test(p.actorId)||
      typeof nonce!=='string')throw fail('NONCE_SCOPE_INVALID');
   const client=await pool.connect();let tx=false;
   try{
     await client.query('BEGIN');tx=true;
     const role=(await client.query(`SELECT current_database() AS db,current_user AS role,
       r.rolsuper,r.rolbypassrls FROM pg_roles r WHERE r.rolname=current_user`)).rows?.[0];
     if(!role||role.db!==requiredDatabase||role.role!==requiredRole||role.rolsuper||role.rolbypassrls)
       throw fail('NONCE_STAGE_ROLE_DENIED');
     await client.query(`SELECT set_config('app.tenant_id',$1,true),set_config('app.municipality_id',$2,true),
       set_config('app.actor_id',$3,true)`,[p.tenantId,p.municipalityId,p.actorId]);
     const inserted=await client.query(`INSERT INTO public.avos_stage_http_nonces
       (key_id,nonce,tenant_id,municipality_id,actor_id,expires_at)
       VALUES($1,$2,$3,$4,$5,now()+($6::integer * interval '1 millisecond'))
       ON CONFLICT(key_id,nonce) DO NOTHING RETURNING nonce`,
       [p.keyId,nonce,p.tenantId,p.municipalityId,p.actorId,windowMs]);
     if(inserted.rowCount!==1)throw fail('DURABLE_NONCE_REPLAY_DENIED');
     await client.query('COMMIT');tx=false;
     return Object.freeze(p);
   }catch(e){if(tx)await client.query('ROLLBACK').catch(()=>{});throw e;}
   finally{client.release();}
 }});
}
