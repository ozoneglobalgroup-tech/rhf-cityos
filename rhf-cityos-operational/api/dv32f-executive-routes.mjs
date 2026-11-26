// Runs only inside server.withScope(...) after authentication and city-membership validation.
import {ClientError} from './domain.mjs';
import {canViewDesk,buildExecutiveReport} from './dv32f-core.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const scoped=(client,sql,city,extra=[])=>client.query(sql,[city.tenant_id,city.id,...extra]);
async function casesForCity(client,city,orgId=null) {
 if(orgId){return (await scoped(client,`WITH RECURSIVE tree(id) AS (
   SELECT id FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND active
   UNION SELECT o.id FROM org_units o JOIN tree t ON o.parent_id=t.id
   WHERE o.tenant_id=$1 AND o.municipality_id=$2 AND o.active
 ) SELECT status,priority,count(*)::int AS n FROM service_cases
 WHERE tenant_id=$1 AND municipality_id=$2 AND unit_id IN (SELECT id FROM tree)
 GROUP BY status,priority`,city,[orgId])).rows;}
 return (await scoped(client,`SELECT status,priority,count(*)::int AS n FROM service_cases
 WHERE tenant_id=$1 AND municipality_id=$2 GROUP BY status,priority`,city)).rows;
}
async function missionGroups(client,city,orgId=null) {
 if(orgId){ // missions have no assigned org-unit relationship in the reviewed schema: don't misattribute.
  return [];
 }
 return (await scoped(client,`SELECT status,count(*)::int AS n FROM missions
 WHERE tenant_id=$1 AND municipality_id=$2 GROUP BY status`,city)).rows;
}
async function directUnitRows(client,city) {
 return (await scoped(client,`SELECT o.id,o.code,o.name_fa,o.kind,COUNT(c.id)::int AS total_cases,
 COUNT(c.id) FILTER (WHERE c.status NOT IN ('CLOSED','REJECTED'))::int AS open_cases,
 COUNT(c.id) FILTER (WHERE c.status NOT IN ('CLOSED','REJECTED') AND c.priority='CRITICAL')::int AS critical_cases
 FROM org_units o LEFT JOIN service_cases c ON c.tenant_id=o.tenant_id
 AND c.municipality_id=o.municipality_id AND c.unit_id=o.id
 WHERE o.tenant_id=$1 AND o.municipality_id=$2 AND o.active
 GROUP BY o.id,o.code,o.name_fa,o.kind ORDER BY open_cases DESC,o.code LIMIT 81`,city)).rows;
}
async function selectedWasteOrg(client,city,orgId){
  const eligible=(await scoped(client,`SELECT id,code,name_fa FROM org_units
  WHERE tenant_id=$1 AND municipality_id=$2 AND active AND kind='ORGANIZATION'
   AND (name_fa LIKE '%پسماند%' OR code ILIKE '%waste%')
  ORDER BY code LIMIT 31`,city)).rows;
  if(eligible.length>30)throw new ClientError('تعداد سازمان‌های کاندید بیش از حد مجاز است؛ اتصال سازمان پسماند را بررسی کنید',409);
  if(!orgId)return {eligible,selected:null};
  if(!UUID.test(orgId))throw new ClientError('شناسه سازمان نامعتبر است',400);
  const selected=eligible.find(x=>x.id===orgId);
  if(!selected)throw new ClientError('سازمان انتخابی به‌عنوان سازمان پسماند این شهرداری اعتبارسنجی نشده است',403);
  return {eligible,selected};
}
export async function dv32fExecutiveRoute({client,city,role,url}) {
 const desk=url.searchParams.get('desk')||'deputy';
 if(!['mayor','deputy','waste'].includes(desk))throw new ClientError('نوع میزکار نامعتبر است',400);
 if(!canViewDesk(role,desk))throw new ClientError('اختیار مشاهده این میزکار وجود ندارد؛ نقش DIRECTOR به انتساب سازمانی قابل‌اثبات نیاز دارد',403);
 const waste=desk==='waste', orgId=url.searchParams.get('orgId');
 if(!waste&&orgId)throw new ClientError('فیلتر سازمان فقط برای میزکار پسماند مجاز است',400);
 const {eligible,selected}=waste?await selectedWasteOrg(client,city,orgId):{eligible:[],selected:null};
 // Waste metrics return ZERO rather than all-city figures when organization isn't selected.
 const caseRows=waste&&!selected?[]:await casesForCity(client,city,selected?.id||null);
 const missionRows=waste?[]:await missionGroups(client,city);
 const orgRows=desk==='deputy'?await directUnitRows(client,city):[];
 const units=waste?(selected?1:0):(await scoped(client,`SELECT count(*)::int AS n FROM org_units
 WHERE tenant_id=$1 AND municipality_id=$2 AND active`,city)).rows[0].n;
 let resources=0,allocations=0;
 if(!waste){
  resources=(await scoped(client,`SELECT count(*)::int AS n FROM capacity_resources WHERE tenant_id=$1 AND municipality_id=$2`,city)).rows[0].n;
  allocations=(await scoped(client,`SELECT count(*)::int AS n FROM capacity_allocations WHERE tenant_id=$1 AND municipality_id=$2 AND status='RESERVED'`,city)).rows[0].n;
 } else if(selected){
  resources=(await scoped(client,`WITH RECURSIVE tree(id) AS (
   SELECT id FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND active
   UNION SELECT o.id FROM org_units o JOIN tree t ON o.parent_id=t.id
    WHERE o.tenant_id=$1 AND o.municipality_id=$2 AND o.active)
   SELECT count(*)::int AS n FROM capacity_resources WHERE tenant_id=$1 AND municipality_id=$2 AND owner_unit_id IN (SELECT id FROM tree)`,city,[selected.id])).rows[0].n;
  allocations=(await scoped(client,`WITH RECURSIVE tree(id) AS (
   SELECT id FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND active
   UNION SELECT o.id FROM org_units o JOIN tree t ON o.parent_id=t.id
    WHERE o.tenant_id=$1 AND o.municipality_id=$2 AND o.active)
   SELECT count(*)::int AS n FROM capacity_allocations a JOIN capacity_resources r
     ON r.id=a.resource_id AND r.tenant_id=a.tenant_id AND r.municipality_id=a.municipality_id
   WHERE a.tenant_id=$1 AND a.municipality_id=$2 AND a.status='RESERVED' AND r.owner_unit_id IN (SELECT id FROM tree)`,city,[selected.id])).rows[0].n;
 }
 return buildExecutiveReport({desk,city,role,caseRows,missionRows,units,resources,allocations,orgRows,selectedOrganization:selected,eligibleOrganizations:eligible});
}
