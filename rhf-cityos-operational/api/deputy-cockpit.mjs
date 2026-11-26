/**
 * City-scoped read model for the services deputy.
 * Must only be invoked from withScope after setting app.tenant_id and app.municipality_id.
 * PostgreSQL FORCE RLS is the final isolation boundary.
 */
export async function readDeputyCockpit(q) {
  const [cases,missions,services,inspections,capacity,outcomes,values,attention] = await Promise.all([
    q(`SELECT COALESCE(c.unit_id,s.owner_unit_id) AS unit_id,
       count(*)::int AS total,
       count(*) FILTER (WHERE c.status NOT IN ('CLOSED','REJECTED'))::int AS open,
       count(*) FILTER (WHERE c.status='CLOSED')::int AS closed,
       count(*) FILTER (WHERE c.status='AWAITING_ACCEPTANCE')::int AS awaiting,
       count(*) FILTER (WHERE c.status NOT IN ('CLOSED','REJECTED') AND c.due_at < now())::int AS overdue,
       count(*) FILTER (WHERE c.status NOT IN ('CLOSED','REJECTED') AND c.priority IN ('HIGH','CRITICAL'))::int AS urgent,
       count(*) FILTER (WHERE c.service_id IS NULL)::int AS without_service,
       count(*) FILTER (WHERE c.unit_id IS NULL AND s.owner_unit_id IS NULL)::int AS unassigned,
       count(*) FILTER (WHERE c.status='CLOSED' AND c.due_at IS NOT NULL AND c.updated_at <= c.due_at)::int AS closed_on_time,
       count(*) FILTER (WHERE c.status='CLOSED' AND c.due_at IS NOT NULL)::int AS closed_with_sla
      FROM service_cases c LEFT JOIN service_definitions s ON s.id=c.service_id
      GROUP BY COALESCE(c.unit_id,s.owner_unit_id)`),
    q(`SELECT COALESCE(c.unit_id,s.owner_unit_id) AS unit_id,
       count(*)::int AS total,
       count(*) FILTER (WHERE m.status IN ('PLANNED','ACTIVE'))::int AS active,
       count(*) FILTER (WHERE m.status='DONE')::int AS done
      FROM missions m JOIN service_cases c ON c.id=m.case_id
      LEFT JOIN service_definitions s ON s.id=c.service_id
      GROUP BY COALESCE(c.unit_id,s.owner_unit_id)`),
    q(`SELECT owner_unit_id AS unit_id,
       count(*) FILTER (WHERE active)::int AS total,
       count(*) FILTER (WHERE active AND owner_unit_id IS NULL)::int AS without_owner
      FROM service_definitions GROUP BY owner_unit_id`),
    q(`SELECT COALESCE(c.unit_id,s.owner_unit_id) AS unit_id,
       count(*)::int AS total,
       count(*) FILTER (WHERE i.result='FAIL')::int AS failed
      FROM service_inspections i JOIN service_cases c ON c.id=i.case_id
      LEFT JOIN service_definitions s ON s.id=c.service_id
      GROUP BY COALESCE(c.unit_id,s.owner_unit_id)`),
    q(`SELECT owner_unit_id AS unit_id,
       count(*)::int AS total,
       count(*) FILTER (WHERE authorized)::int AS authorized
      FROM capacity_resources GROUP BY owner_unit_id`),
    q(`SELECT COALESCE(c.unit_id,s.owner_unit_id) AS unit_id,
       count(*)::int AS total,
       count(*) FILTER (WHERE o.status='VERIFIED')::int AS verified
      FROM public_value_outcomes o JOIN service_cases c ON c.id=o.case_id
      LEFT JOIN service_definitions s ON s.id=c.service_id
      GROUP BY COALESCE(c.unit_id,s.owner_unit_id)`),
    q(`SELECT status,count(*)::int AS total FROM value_initiatives GROUP BY status`),
    q(`SELECT c.id,c.summary,c.status,c.priority,c.due_at,c.created_at,c.unit_id,
       c.service_id,s.name_fa AS service_name,COALESCE(c.unit_id,s.owner_unit_id) AS operational_unit_id,
       u.name_fa AS unit_name
      FROM service_cases c LEFT JOIN service_definitions s ON s.id=c.service_id
      LEFT JOIN org_units u ON u.id=COALESCE(c.unit_id,s.owner_unit_id)
      WHERE c.status NOT IN ('CLOSED','REJECTED')
      ORDER BY
       (CASE WHEN c.due_at<now() THEN 0 WHEN c.priority='CRITICAL' THEN 1 WHEN c.priority='HIGH' THEN 2 ELSE 3 END),
       c.due_at ASC NULLS LAST,c.created_at DESC LIMIT 35`)
  ]);
  return {
    cases:cases.rows,missions:missions.rows,services:services.rows,
    inspections:inspections.rows,capacity:capacity.rows,outcomes:outcomes.rows,
    values:values.rows,attention:attention.rows,
    dataScope:'municipality',
    note:'All counts are database aggregates for the selected municipality. This is not a district-level security policy; district selection is a visual filter.'
  };
}
