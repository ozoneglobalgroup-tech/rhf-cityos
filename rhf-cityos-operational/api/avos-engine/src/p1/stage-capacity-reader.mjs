/** P1.4D staging capacity reader candidate.
 * - MUST run from within createRuvosTransactionRunner transaction, already scoped with SET LOCAL claims.
 * - It does not certify real field measurements. Certificate DB status is only a staged governance fixture.
 * - Synthetic attestations can pass ONLY when explicitly enabled AND the database is avos_stage_copy.
 * - This module is NOT mounted in the live application.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const deny=code=>{throw Error(code);};
const isId=x=>UUID.test(String(x));
function iso(x){if(x instanceof Date)return x.toISOString();if(typeof x==='string'&&Number.isFinite(Date.parse(x)))return new Date(x).toISOString();return null;}
function safeNumber(x){const n=Number(x);return Number.isFinite(n)&&n>=0?n:NaN;}
export function createStagingCapacityReader({allowSyntheticStage=false,minQualityBps=5000,maxAgeHours=24,now=()=>new Date()}={}){
 if(!Number.isInteger(minQualityBps)||minQualityBps<0||minQualityBps>10000)deny('CAPACITY_CONFIG_INVALID');
 if(!Number.isFinite(maxAgeHours)||maxAgeHours<=0||maxAgeHours>720)deny('CAPACITY_CONFIG_INVALID');
 return async function readFreshCapacity({client,tenantId,municipalityId,capacityId,principal}){
  if(!client||typeof client.query!=='function'||![tenantId,municipalityId,capacityId,principal?.actorId].every(isId))deny('CAPACITY_SCOPE_INVALID');
  if(principal.tenantId!==tenantId||principal.municipalityId!==municipalityId)deny('CAPACITY_SCOPE_DENIED');
  const identity=await client.query('SELECT current_database() AS db');
  const db=identity.rows?.[0]?.db;
  if(db!=='avos_stage_copy')deny('CAPACITY_STAGE_ONLY');
  const resource=(await client.query(`SELECT id,tenant_id,municipality_id,authorized,total_quantity,
         allocatable_bps,quality_bps,reserve_quantity FROM public.capacity_resources
         WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 FOR UPDATE`,[tenantId,municipalityId,capacityId])).rows?.[0];
  if(!resource)deny('CAPACITY_RESOURCE_NOT_VISIBLE');
  if(resource.authorized!==true)deny('CAPACITY_NOT_AUTHORIZED');
  const proof=(await client.query(`SELECT id,resource_id,tenant_id,municipality_id,evidence_ref,
      source_kind,captured_by,verified_by,captured_at,verified_at,valid_until,
      observed_quantity,qualified,status
      FROM public.avos_stage_capacity_attestations
      WHERE tenant_id=$1 AND municipality_id=$2 AND resource_id=$3 AND status='ACCEPTED'
      ORDER BY verified_at DESC,id DESC LIMIT 1 FOR UPDATE`,[tenantId,municipalityId,capacityId])).rows?.[0];
  if(!proof)deny('CAPACITY_ATTESTATION_REQUIRED');
  if(proof.captured_by===proof.verified_by||!isId(proof.captured_by)||!isId(proof.verified_by))deny('CAPACITY_REVIEW_NOT_INDEPENDENT');
  if(proof.qualified!==true)deny('CAPACITY_NOT_QUALIFIED');
  const clock=now(),time=Date.parse(clock instanceof Date?clock.toISOString():String(clock));
  const captured=Date.parse(iso(proof.captured_at)||''),verified=Date.parse(iso(proof.verified_at)||''),expires=Date.parse(iso(proof.valid_until)||'');
  if(!Number.isFinite(time)||!Number.isFinite(captured)||!Number.isFinite(verified)||!Number.isFinite(expires) ||
    captured>verified||verified>time||expires<=time||time-captured>maxAgeHours*3600000)deny('CAPACITY_EVIDENCE_STALE');
  if(proof.source_kind==='MANUAL_SYNTHETIC' && allowSyntheticStage!==true)deny('SYNTHETIC_CAPACITY_BLOCKED');
  if(!['MANUAL_SYNTHETIC','SIGNED_SENSOR','FIELD_INSPECTION'].includes(proof.source_kind))deny('CAPACITY_SOURCE_UNKNOWN');
  if(typeof proof.evidence_ref!=='string'||proof.evidence_ref.trim().length<12)deny('CAPACITY_EVIDENCE_REF_INVALID');
  const allocations=(await client.query(`SELECT COALESCE(SUM(quantity),0) AS reserved FROM public.capacity_allocations
    WHERE tenant_id=$1 AND municipality_id=$2 AND resource_id=$3 AND status='RESERVED'`,[tenantId,municipalityId,capacityId])).rows?.[0];
  if(!allocations)deny('CAPACITY_ALLOCATION_QUERY_FAILED');
  const quantity=safeNumber(resource.total_quantity),basis=safeNumber(resource.allocatable_bps),quality=safeNumber(resource.quality_bps),reserve=safeNumber(resource.reserve_quantity),reserved=safeNumber(allocations.reserved),observed=safeNumber(proof.observed_quantity);
  if([quantity,basis,quality,reserve,reserved,observed].some(n=>!Number.isFinite(n))||basis>10000||quality>10000)deny('CAPACITY_DATA_INVALID');
  const available=Math.min(observed,Math.max(0,quantity*basis/10000-reserve-reserved));
  if(quality<minQualityBps)deny('CAPACITY_QUALITY_INSUFFICIENT');
  return Object.freeze({id:capacityId,tenantId,municipalityId,origin:'TRUSTED_DB_QUERY',
    authorized:true,verified:true,qualified:true,availableUnits:available,
    validUntil:iso(proof.valid_until),evidenceRef:proof.evidence_ref,
    syntheticFixture:proof.source_kind==='MANUAL_SYNTHETIC',
    limitations:'STAGING_DB_ATTESTATION_NOT_INDEPENDENT_FIELD_CERTIFICATION'});
 };
}
