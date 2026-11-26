// Called only AFTER server.authenticate and INSIDE withScope read transaction.
import {createGovernanceReport} from './dv32e-capacity-core.mjs';
export const DV32E_PARTS = Object.freeze(['dv32e-capacity-governance']);

export async function dv32eReadRoute({part,client,city}) {
  if (part !== 'dv32e-capacity-governance') throw new Error('Unexpected DV32E route');
  if (!client || !city?.id || !city?.tenant_id) throw new Error('Missing authenticated city scope');
  const resources = await client.query(`
    SELECT r.id, r.code, r.name_fa, r.resource_kind, r.unit,
           r.total_quantity::text, r.allocatable_bps, r.quality_bps,
           r.reserve_quantity::text, r.authorized, r.owner_unit_id,
           r.constraints_note,
           COALESCE((SELECT SUM(a.quantity)
                       FROM capacity_allocations a
                      WHERE a.tenant_id=r.tenant_id
                        AND a.municipality_id=r.municipality_id
                        AND a.resource_id=r.id
                        AND a.status='RESERVED'),0)::text AS reserved_quantity
      FROM capacity_resources r
     WHERE r.tenant_id=$1 AND r.municipality_id=$2
     ORDER BY r.code, r.id
     LIMIT 201`,[city.tenant_id,city.id]);
  const backlog = await client.query(`
    SELECT status, priority, COUNT(*)::int AS n
      FROM service_cases
     WHERE tenant_id=$1 AND municipality_id=$2
       AND status NOT IN ('CLOSED','REJECTED')
     GROUP BY status,priority
     ORDER BY status,priority`,[city.tenant_id,city.id]);
  return createGovernanceReport({cityId:city.id,tenantId:city.tenant_id,
    resources:resources.rows,caseGroups:backlog.rows});
}
