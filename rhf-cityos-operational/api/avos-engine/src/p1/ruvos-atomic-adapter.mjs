/** Candidate repository for P1.4C. NO calls are made unless an independently
 * authenticated, server-owned worker invokes executeAuthorizedMission with this
 * adapter. Intended for the isolated RUVOS API clone, NOT live deployment.
 * The pool must use cityos_runtime (NOSUPERUSER/NOBYPASSRLS) and a scoped tx.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function assertUuid(s){if(!UUID.test(String(s)))throw Error('ADAPTER_INVALID_UUID');return s;}
function one(result,code){if(result.rows.length!==1)throw Error(code);return result.rows[0];}
const q=(client,sql,p)=>client.query(sql,p);
/** The capacityReader MUST use trusted source provenance and row locking. The
 * default is fail closed, since RUVOS capacity_resources has no full provenance
 * certificate in the current schema. */
export function createRuvosTransactionRunner(pool, {
  capacityReader=async()=>{throw Error('CAPACITY_ATTESTATION_REQUIRED');},
  requiredDatabaseRole='cityos_runtime',
  permitStageCopy=false
}={}){
  if(!pool||typeof pool.connect!=='function')throw Error('TRUSTED_DB_POOL_REQUIRED');
  return async (principal,operation)=>{
    assertUuid(principal.tenantId);assertUuid(principal.municipalityId);assertUuid(principal.actorId);
    const client=await pool.connect();
    let inTx=false;
    try{
      await q(client,'BEGIN',[]);inTx=true;
      const identity=one(await q(client,`SELECT current_user AS db_role, current_database() AS db_name,
          r.rolsuper, r.rolbypassrls FROM pg_roles r WHERE r.rolname=current_user`,[]),'DB_IDENTITY_MISSING');
      if(identity.rolsuper||identity.rolbypassrls ||
         (identity.db_role!==requiredDatabaseRole && !(permitStageCopy && identity.db_name==='avos_stage_copy')))
        throw Error('UNTRUSTED_DATABASE_ROLE');
      await q(client,`SELECT set_config('app.tenant_id',$1,true),
        set_config('app.municipality_id',$2,true),set_config('app.actor_id',$3,true)`,
        [principal.tenantId,principal.municipalityId,principal.actorId]);
      const tenantId=principal.tenantId, municipalityId=principal.municipalityId;
      const scope=[tenantId,municipalityId];
      const tx={
        async lockIntent(id){
          const x=await q(client,`SELECT * FROM avos_agent_mission_intents
             WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 FOR UPDATE`,[...scope,assertUuid(id)]);
          if(!x.rows.length)return null;
          const r=x.rows[0];
          const reviewer=r.approved_by? await q(client,`SELECT role FROM memberships
             WHERE user_id=$1 AND municipality_id=$2`,[r.approved_by,municipalityId]):{rows:[]};
          return {id:r.id,tenantId:r.tenant_id,municipalityId:r.municipality_id,
            caseId:r.case_id,status:r.status,proposedBy:r.proposer_id,
            approvedBy:r.approved_by,missionId:r.mission_id,immutable:r.payload,
            fingerprint:String(r.payload_sha256).trim(),approval:r.approved_by?{
              origin:'TRUSTED_DB_ROW',actorId:r.approved_by,role:reviewer.rows[0]?.role||'NONE',
              fingerprint:String(r.approved_payload_sha256||'').trim(),
              expiresAt:r.approval_expires_at,revoked:r.status==='CANCELLED'}:null};
        },
        async lockOutbox(intentId){
          const r=await q(client,`SELECT * FROM avos_agent_mission_outbox
            WHERE tenant_id=$1 AND municipality_id=$2 AND intent_id=$3 FOR UPDATE`,[...scope,assertUuid(intentId)]);
          if(!r.rows.length)return null;
          const x=r.rows[0];return {id:x.id,intentId:x.intent_id,tenantId:x.tenant_id,
            municipalityId:x.municipality_id,status:x.status,
            leaseOwner:x.lease_owner,leaseExpiresAt:x.lease_expires_at,leaseGeneration:Number(x.lease_generation),missionId:x.mission_id};
        },
        async findMissionByIntent(intentId){
          const r=await q(client,`SELECT id,case_id,tenant_id,municipality_id,avos_intent_id
             FROM missions WHERE tenant_id=$1 AND municipality_id=$2 AND avos_intent_id=$3`,
            [...scope,assertUuid(intentId)]);
          if(!r.rows.length)return null;
          const x=one(r,'MULTIPLE_MISSIONS_INVARIANT_FAILED');
          return {id:x.id,caseId:x.case_id,tenantId:x.tenant_id,municipalityId:x.municipality_id,avosIntentId:x.avos_intent_id};
        },
        async lockCase(caseId){
          const r=await q(client,`SELECT id,tenant_id,municipality_id,status,updated_at FROM service_cases
            WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 FOR UPDATE`,[...scope,assertUuid(caseId)]);
          if(!r.rows.length)return null;
          const x=r.rows[0];return {id:x.id,tenantId:x.tenant_id,municipalityId:x.municipality_id,
            status:x.status,updatedAt:x.updated_at instanceof Date?x.updated_at.toISOString():x.updated_at};
        },
        async readFreshCapacity(id){
          return capacityReader({client,tenantId,municipalityId,capacityId:assertUuid(id),principal});
        },
        async createMission(data){
          const r=await q(client,`INSERT INTO missions(tenant_id,municipality_id,case_id,title,assignee,avos_intent_id)
             VALUES($1,$2,$3,$4,$5,$6)
             RETURNING id,case_id,tenant_id,municipality_id,avos_intent_id`,
             [tenantId,municipalityId,assertUuid(data.caseId),data.title,data.assignee,assertUuid(data.avosIntentId)]);
          const x=one(r,'MISSION_INSERT_UNEXPECTED');
          return {id:x.id,caseId:x.case_id,tenantId:x.tenant_id,municipalityId:x.municipality_id,avosIntentId:x.avos_intent_id};
        },
        async completeIntent(intentId,missionId){
          one(await q(client,`UPDATE avos_agent_mission_intents SET status='EXECUTED',mission_id=$4,updated_at=now()
            WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND status='QUEUED' RETURNING id`,
            [...scope,assertUuid(intentId),assertUuid(missionId)]),'INTENT_TRANSITION_CONFLICT');
        },
        async completeOutbox(outboxId,missionId){
          one(await q(client,`UPDATE avos_agent_mission_outbox SET status='COMPLETED',mission_id=$4,
            lease_owner=NULL,lease_expires_at=NULL,updated_at=now()
            WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND status='CLAIMED' AND lease_owner=$5 AND lease_generation=$6
            RETURNING id`,[...scope,assertUuid(outboxId),assertUuid(missionId),principal.jobId,principal.leaseGeneration]),'OUTBOX_TRANSITION_CONFLICT');
        },
        async writeAudit(event){
          await q(client,`INSERT INTO audit_events(tenant_id,municipality_id,actor_id,kind,entity_id,event,details)
            VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
            [...scope,principal.actorId,'AVOS_AGENT_MISSION',String(event.entityId),'MISSION_CREATED',
              JSON.stringify({intentId:event.intentId,requestKey:event.requestKey})]);
        }
      };
      const result=await operation(tx);
      await q(client,'COMMIT',[]);inTx=false;
      return result;
    } catch(e){if(inTx)await q(client,'ROLLBACK',[]).catch(()=>{});throw e;}
    finally{client.release();}
  };
}
