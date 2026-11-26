/**
 * RHF City OS — UAT-10, independent municipality onboarding.
 * Only a system administrator may invoke the HTTP route. The DB transaction
 * is always one unit: new tenant + municipality + inactive module catalog + audit.
 * This module does not migrate existing municipalities or grant appointments.
 */
export function normalizeMunicipalityName(name) {
  if (typeof name !== 'string') throw new TypeError('Municipality name must be a string');
  const result = name.normalize('NFKC').trim().replace(/\s+/gu,' ');
  if (result.length < 3 || result.length > 150) throw new RangeError('Municipality name length invalid');
  return result;
}
export async function createIndependentMunicipality({pool, user, name, conflict, audit}) {
  if (!user || user.is_system_admin !== true) throw new Error('SYSTEM_ADMIN_REQUIRED');
  const normalizedName = normalizeMunicipalityName(name);
  const client = await pool.connect();
  let begun = false;
  try {
    await client.query('BEGIN'); begun = true;
    // This lock is shared with bootstrap and serializes onboarding requests.
    await client.query('SELECT pg_advisory_xact_lock(31729219)');
    // municipalities UNIQUE(tenant_id,name) does not detect cross-tenant duplicates.
    const previous = await client.query(
      "SELECT id FROM municipalities WHERE lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')) = lower($1) LIMIT 1",
      [normalizedName]
    );
    if (previous.rows.length) throw conflict('شهرداری با این نام قبلاً ثبت شده است');
    const t = await client.query('INSERT INTO tenants(name) VALUES($1) RETURNING id', [normalizedName]);
    if (t.rows.length !== 1) throw new Error('TENANT_INSERT_FAILED');
    const tenantId=t.rows[0].id;
    const m = await client.query('INSERT INTO municipalities(tenant_id,name) VALUES($1,$2) RETURNING id,tenant_id,name', [tenantId,normalizedName]);
    if (m.rows.length !== 1 || m.rows[0].tenant_id !== tenantId) throw new Error('CITY_INSERT_FAILED');
    const city=m.rows[0];
    // Enforce RLS scope for all subsequent statements inside this transaction.
    await client.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.municipality_id',$2,true),set_config('app.actor_id',$3,true)",
      [tenantId,city.id,user.id]);
    // Register catalog entries as DISABLED: a configured module is not an operating service.
    await client.query(`INSERT INTO module_activations(tenant_id,municipality_id,code,active)
      SELECT $1,$2,code,false FROM module_catalog ON CONFLICT DO NOTHING`,[tenantId,city.id]);
    await audit(client,city,user,'MUNICIPALITY',city.id,'TENANT_ONBOARDING_CREATED',{
      onboardingStatus:'PENDING_CONFIGURATION',moduleActivation:'EXPLICIT_ONLY'
    });
    await client.query('COMMIT'); begun=false;
    return {...city,onboardingStatus:'PENDING_CONFIGURATION',organizationUnitsCreated:0,appointmentsCreated:0};
  } catch (err) {
    if (begun) { try {await client.query('ROLLBACK');} catch (rollbackError) {err.rollbackFailed = true;} }
    throw err;
  } finally {client.release();}
}
