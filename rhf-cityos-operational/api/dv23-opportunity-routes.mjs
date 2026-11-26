/** DV2.3A. Read-only discovery over DV2.2 independently reviewed records. */
import {ClientError} from './domain.mjs';
import {dv22ScopedAccess} from './dv22-registry-routes.mjs';
import {DV23_SCHEMA,MAX_ROWS,createProposals} from './dv23-opportunity-core.mjs';
export const DV23_PARTS=Object.freeze(['dv23-opportunities']);
const deny=(code,status=403)=>{throw new ClientError(code,status)};
export async function dv23OpportunityRoute({part,method,resourceId,url,cityId,user,withScope,json}){
 if(part!=='dv23-opportunities'||method!=='GET'||resourceId)deny('NOT_FOUND',404);
 const surface=url.searchParams.get('surface');
 if(!['deputy','waste'].includes(surface))deny('DV23_INVALID_SURFACE',400);
 const response=await withScope(cityId,user,'read',async(client,city,role)=>{
  const {scoped,owners}=await dv22ScopedAccess(client,city,user,role,surface);
  const existence=await client.query("SELECT to_regclass('public.rhf_urban_need_capacity') IS NOT NULL AS present");
  if(existence.rows[0]?.present!==true)deny('DV23_DV22_MIGRATION_REQUIRED',409);
  const query=await client.query(`SELECT id,tenant_id,municipality_id,owner_org_id,kind,sector,title,quantity,unit,evidence_ref,
     status,created_by,reviewed_by,review_note,created_at FROM rhf_urban_need_capacity
     WHERE tenant_id=$1 AND municipality_id=$2 AND owner_org_id=ANY($3::uuid[]) AND status='REVIEWED'
     ORDER BY created_at DESC,id DESC LIMIT 201`,[city.tenant_id,city.id,scoped]);
  const rows=query.rows.slice(0,MAX_ROWS);
  const proposalSet=createProposals({rows,city,ownerIds:scoped});
  return {schema:DV23_SCHEMA,cityId:city.id,tenantId:city.tenant_id,viewerId:user.id,surface,
   source:'DV22_REVIEWED_MANUAL_EVIDENCE',engine:'DETERMINISTIC_RULES_NOT_LANGGRAPH',
   coverage:{reviewedRowsScanned:rows.length,reviewedNeeds:proposalSet.reviewedNeeds,
      reviewedCapacities:proposalSet.reviewedCapacities,hasMoreSourceRows:query.rows.length>MAX_ROWS,
      hasMoreCandidatePairs:proposalSet.hasMorePairs,visibleOrgCount:owners.length},
   candidates:proposalSet.candidates,
   governance:{readOnly:true,autoExecution:false,humanApproval:'REQUIRED_BEFORE_ACTION',
     legalAccess:'NOT_VERIFIED',agentExecution:'NOT_CONNECTED',temporalExecution:'NOT_CONNECTED',
     langGraphExecution:'NOT_CONNECTED',valueVerification:'NOT_ATTESTED',productionReady:false}};
 });
 return json(200,response);
}
