import {ClientError} from './domain.mjs';
import {UUID,validateRequest,validateLink,summary} from './dv32q2-core.mjs';
const fail=(code,message)=>{throw new ClientError(message,code);};
const query=(client,city,sql,other=[])=>client.query(sql,[city.tenant_id,city.id,...other]);
export async function dv32q2CaseTerritoryRoute({method,resourceId,client,city,user,role,url,headers,readBody,audit}){
 try{validateRequest({method,resourceId,url,headers});}catch(e){fail(e.message==='METHOD_NOT_ALLOWED'?405:400,e.message);}
 if(!UUID.test(city.id)||!UUID.test(city.tenant_id)||!['MUNICIPAL_ADMIN','DEPUTY'].includes(role)&&!user.is_system_admin)
  fail(403,'CITY_PILOT_SCOPE_RESTRICTED');
 const cityIsShiraz=['شیراز','شهرداری شیراز','shiraz','shiraz municipality'].includes(String(city.name||'').trim().toLowerCase());
 if(!cityIsShiraz)fail(403,'SHIRAZ_PILOT_ONLY');
 if(method==='POST'){
  if(role!=='MUNICIPAL_ADMIN'&&!user.is_system_admin)fail(403,'ADMIN_ONLY_DRAFT_CASE_LINK');
  let body;try{body=validateLink(await readBody());}catch(e){fail(400,e.message);}
  const terr=await query(client,city,`SELECT code FROM rhf_dv32q_pilot_territories WHERE tenant_id=$1 AND municipality_id=$2 AND code=$3 AND verification_status='DRAFT_UNVERIFIED'`,[body.territoryCode]);
  if(terr.rowCount!==1)fail(409,'DRAFT_TERRITORY_NOT_FOUND');
  const sc=await query(client,city,`SELECT id FROM service_cases WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3`,[body.caseId]);
  if(sc.rowCount!==1)fail(404,'SCOPED_CASE_NOT_FOUND');
  const found=await query(client,city,`INSERT INTO rhf_dv32q_case_territory_links (tenant_id,municipality_id,case_id,territory_code,reason,linked_by)
    VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (tenant_id,municipality_id,case_id) DO NOTHING RETURNING case_id,territory_code,created_at`,
   [body.caseId,body.territoryCode,body.reason,user.id]);
  if(found.rowCount!==1)fail(409,'CASE_ALREADY_LINKED_REQUIRES_SEPARATE_HUMAN_REVIEW');
  await audit(client,city,user,'DV32Q2_DRAFT_CASE_TERRITORY',body.caseId,'DRAFT_GEO_TAG',
   {territoryCode:body.territoryCode,reason:body.reason,caseId:body.caseId});
  return {schema:'RHF-DV32Q2-DRAFT-LINK-v1',saved:found.rows[0],serviceCaseUpdated:false,
   dispatchCreated:false,fieldMissionChanged:false,planningOnly:true,verifiedTerritory:false};
 }
 const [territories,totals,rows,available,mapped,units,services]=await Promise.all([
  query(client,city,`SELECT code,name_fa,verification_status FROM rhf_dv32q_pilot_territories WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY code`),
  query(client,city,`SELECT (SELECT count(*)::int FROM service_cases sc WHERE sc.tenant_id=$1 AND sc.municipality_id=$2) AS total,
    (SELECT count(*)::int FROM service_cases sc WHERE sc.tenant_id=$1 AND sc.municipality_id=$2 AND NOT EXISTS
      (SELECT 1 FROM rhf_dv32q_case_territory_links l WHERE l.tenant_id=sc.tenant_id AND l.municipality_id=sc.municipality_id AND l.case_id=sc.id)) AS unmapped`),
  query(client,city,`SELECT territory_code,count(*)::int AS count FROM rhf_dv32q_case_territory_links WHERE tenant_id=$1 AND municipality_id=$2 GROUP BY territory_code ORDER BY territory_code`),
  query(client,city,`SELECT id,module_code,status,priority FROM service_cases sc WHERE tenant_id=$1 AND municipality_id=$2 AND NOT EXISTS
    (SELECT 1 FROM rhf_dv32q_case_territory_links l WHERE l.tenant_id=sc.tenant_id AND l.municipality_id=sc.municipality_id AND l.case_id=sc.id) ORDER BY created_at DESC,id LIMIT 50`),
  query(client,city,`SELECT case_id,territory_code,created_at FROM rhf_dv32q_case_territory_links WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY created_at DESC,case_id LIMIT 100`),
  query(client,city,`SELECT count(*)::int AS n FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 AND active`),
  query(client,city,`SELECT count(*)::int AS n FROM service_definitions WHERE tenant_id=$1 AND municipality_id=$2 AND active`)
 ]);
 const t=totals.rows[0];
 try{return summary({city,territories:territories.rows,counts:rows.rows,
  totalCases:Number(t.total),unmapped:Number(t.unmapped),availableCases:available.rows,mappings:mapped.rows,
  units:Number(units.rows[0].n),services:Number(services.rows[0].n),role,isAdmin:user.is_system_admin});}
 catch(e){fail(409,e.message);}
}
