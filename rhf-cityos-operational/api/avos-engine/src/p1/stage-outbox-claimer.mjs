/** Staging-only durable outbox claimant candidate; never contacts live RUVOS.
 * Queue claim and lease are committed in the staging DB; mission insertion happens
 * in a separate transaction through executeAuthorizedMission.
 * Opaque principal must be validated by the CALLER; markers alone are not authentication.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function guard(p){if(!p||p.origin!=='RUVOS_VERIFIED_SERVICE'||![p.tenantId,p.municipalityId,p.actorId].every(x=>UUID.test(String(x)))||typeof p.jobId!=='string'||!/^[-a-zA-Z0-9_.:]{5,120}$/.test(p.jobId))throw Error('WORKER_IDENTITY_REQUIRED');}
export function createStageOutboxClaimer(pool,{leaseSeconds=60,requiredDatabase='avos_stage_copy',requiredRole='cityos_runtime'}={}){
 if(!pool||typeof pool.connect!=='function')throw Error('TRUSTED_POOL_REQUIRED');
 if(!Number.isInteger(leaseSeconds)||leaseSeconds<10||leaseSeconds>600)throw Error('INVALID_LEASE_SECONDS');
 return async principal=>{
  guard(principal);
  const client=await pool.connect();let transaction=false;
  try{
   await client.query('BEGIN');transaction=true;
   const check=(await client.query('SELECT current_database() AS db,current_user AS role')).rows?.[0];
   if(!check||check.db!==requiredDatabase||check.role!==requiredRole)throw Error('WORKER_DB_IDENTITY_DENIED');
   const roles=(await client.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows?.[0];
   if(!roles||roles.rolsuper||roles.rolbypassrls)throw Error('WORKER_BYPASS_ROLE_DENIED');
   await client.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.municipality_id',$2,true),set_config('app.actor_id',$3,true)",[principal.tenantId,principal.municipalityId,principal.actorId]);
   const found=(await client.query(`SELECT id,intent_id,tenant_id,municipality_id,status,attempt_count
     FROM avos_agent_mission_outbox
     WHERE tenant_id=$1 AND municipality_id=$2 AND
       ((status IN ('PENDING','RETRY') AND next_attempt_at<=now()) OR
        (status='CLAIMED' AND lease_expires_at<=now()))
     ORDER BY next_attempt_at,id FOR UPDATE SKIP LOCKED LIMIT 1`,[principal.tenantId,principal.municipalityId])).rows?.[0];
   if(!found){await client.query('COMMIT');transaction=false;return null;}
   const outcome=(await client.query(`UPDATE avos_agent_mission_outbox SET
      status='CLAIMED',lease_owner=$4,lease_expires_at=now()+($5::integer * interval '1 second'),
      attempt_count=attempt_count+1,lease_generation=lease_generation+1,updated_at=now()
      WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 RETURNING id,intent_id,lease_expires_at,attempt_count,lease_generation`,
       [principal.tenantId,principal.municipalityId,found.id,principal.jobId,leaseSeconds])).rows?.[0];
   if(!outcome)throw Error('WORKER_CLAIM_CONFLICT');
   await client.query('COMMIT');transaction=false;
   return Object.freeze({outboxId:outcome.id,intentId:outcome.intent_id,leaseExpiresAt:outcome.lease_expires_at,attempt:outcome.attempt_count,leaseGeneration:Number(outcome.lease_generation)});
  } catch(e){if(transaction)await client.query('ROLLBACK').catch(()=>{});throw e;}
  finally{client.release();}
 };
}
