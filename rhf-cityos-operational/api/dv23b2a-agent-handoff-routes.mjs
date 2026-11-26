/** Read-only handoff preview. No worker dispatch, model call, DB mutation, or elevated access. */
import {ClientError} from './domain.mjs';
import {dv22ScopedAccess} from './dv22-registry-routes.mjs';
import {HANDOFF_SCHEMA,handoffGovernance,compileHandoffs} from './dv23b2a-agent-handoff-core.mjs';
export const DV23B2A_PARTS=Object.freeze(['dv23-agent-handoffs']);
const deny=(m,s=403)=>{throw new ClientError(m,s)};
export async function dv23b2aAgentHandoffRoute({part,method,resourceId,url,cityId,user,withScope,json}){
 if(part!=='dv23-agent-handoffs'||method!=='GET'||resourceId)deny('DV23B2A_READONLY',405);
 const surface=url.searchParams.get('surface');
 if(!['deputy','waste'].includes(surface)||url.searchParams.getAll('surface').length!==1||[...url.searchParams.keys()].some(k=>k!=='surface'))deny('DV23B2A_INVALID_SURFACE',400);
 return json(200,await withScope(cityId,user,'read',async(client,city,role)=>{
  const {scoped}=await dv22ScopedAccess(client,city,user,role,surface);
  const check=await client.query("SELECT to_regclass('public.rhf_urban_opportunity_decisions') IS NOT NULL AS decisions, to_regclass('public.rhf_urban_need_capacity') IS NOT NULL AS ledger");
  if(check.rows[0]?.decisions!==true||check.rows[0]?.ledger!==true)deny('DV23B2A_TABLES_REQUIRED',409);
  const r=await client.query(`SELECT id,tenant_id,municipality_id,owner_org_id,need_id,capacity_id,sector,source_digest,status,created_by,decided_by
   FROM rhf_urban_opportunity_decisions WHERE tenant_id=$1 AND municipality_id=$2
    AND owner_org_id=ANY($3::uuid[]) AND status='FEASIBILITY_APPROVED'
   ORDER BY decided_at DESC,id DESC LIMIT 21`,[city.tenant_id,city.id,scoped]);
  const cases=r.rows.slice(0,20);
  const ids=[...new Set(cases.flatMap(c=>[c.need_id,c.capacity_id]))];
  const evidence=ids.length?await client.query(`SELECT id,tenant_id,municipality_id,owner_org_id,kind,sector,title,quantity,unit,evidence_ref,
    status,created_by,reviewed_by,review_note FROM rhf_urban_need_capacity
    WHERE tenant_id=$1 AND municipality_id=$2 AND owner_org_id=ANY($3::uuid[]) AND id=ANY($4::uuid[])`,
    [city.tenant_id,city.id,scoped,ids]):{rows:[]};
  const report=compileHandoffs({decisions:cases,sources:evidence.rows,city,ownerIds:scoped});
  return {schema:HANDOFF_SCHEMA,cityId:city.id,tenantId:city.tenant_id,viewerId:user.id,surface,
   coverage:{approvedCasesRead:cases.length,hasMoreCases:r.rows.length>20,blockedOrInvalid:report.blockedOrInvalid},
   packets:report.packets,governance:handoffGovernance};
 }));
}
