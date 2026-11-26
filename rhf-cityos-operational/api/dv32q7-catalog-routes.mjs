// Authenticated city-scoped admin-only real catalog updates; never seed fabricated records.
import {ClientError} from './domain.mjs';
import {UUID,SHIRAZ,requestContract,validateAction,validateRead} from './dv32q7-catalog-core.mjs';
const fail=(status,msg)=>{throw new ClientError(msg,status);};
const run=(client,city,text,args=[])=>client.query(text,[city.tenant_id,city.id,...args]);
export async function dv32q7OperationalCatalogRoute({method,resourceId,url,headers,client,city,user,role,readBody,audit}){
 try{requestContract({method,resourceId,url,headers});}catch(e){fail(e.message==='METHOD_NOT_ALLOWED'?405:400,e.message);}
 if(!UUID.test(city?.id)||!UUID.test(city?.tenant_id)||!SHIRAZ.has(String(city.name||'').trim().toLowerCase()))fail(403,'SHIRAZ_CITY_SCOPE_REQUIRED');
 if(!['DEPUTY','MUNICIPAL_ADMIN'].includes(role)&&user?.is_system_admin!==true)fail(403,'CITY_REFERENCE_READ_FORBIDDEN');
 if(method==='POST'){
  if(role!=='MUNICIPAL_ADMIN'&&user?.is_system_admin!==true)fail(403,'CITY_ADMIN_ONLY');
  let a;try{a=validateAction(await readBody());}catch(e){fail(400,e.message);}
  // No automatic synthetic-to-operational promotion. Every operation is human-initiated.
  let result,kind;
  try{
   if(a.action==='CREATE_UNIT'){
    if(a.parentUnitId){const p=await run(client,city,`SELECT id FROM public.org_units WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 LIMIT 1`,[a.parentUnitId]);if(p.rowCount!==1)fail(409,'PARENT_UNIT_SCOPE_MISMATCH');}
    result=await run(client,city,`INSERT INTO public.org_units (id,tenant_id,municipality_id,parent_id,code,name_fa,kind,active,created_at)
       VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,false,now()) RETURNING id,code,name_fa,kind,active`,[a.parentUnitId,a.code,a.nameFa,a.kind]);kind='UNIT_CREATED_INACTIVE';
   }else if(a.action==='CREATE_SERVICE'){
    const owner=await run(client,city,`SELECT id FROM public.org_units WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 LIMIT 1`,[a.ownerUnitId]);
    if(owner.rowCount!==1)fail(409,'SERVICE_OWNER_SCOPE_MISMATCH');
    result=await run(client,city,`INSERT INTO public.service_definitions
      (id,tenant_id,municipality_id,module_code,code,name_fa,description,owner_unit_id,sla_hours,outcome_metric,active,created_at,updated_at)
      VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,false,now(),now()) RETURNING id,code,name_fa,active,owner_unit_id`,
      [a.moduleCode,a.code,a.nameFa,a.description,a.ownerUnitId,a.slaHours,a.outcomeMetric]);kind='SERVICE_CREATED_INACTIVE';
   }else if(a.action==='ACTIVATE_UNIT'){
    result=await run(client,city,`UPDATE public.org_units SET active=true WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND active=false RETURNING id,code,name_fa,active`,[a.unitId]);kind='UNIT_ACTIVATED_BY_ADMIN';
   }else{
    result=await run(client,city,`UPDATE public.service_definitions s SET active=true,updated_at=now()
      FROM public.org_units u WHERE s.tenant_id=$1 AND s.municipality_id=$2 AND s.id=$3 AND s.active=false
        AND u.tenant_id=s.tenant_id AND u.municipality_id=s.municipality_id AND u.id=s.owner_unit_id AND u.active=true
      RETURNING s.id,s.code,s.name_fa,s.active,s.owner_unit_id`,[a.serviceId]);kind='SERVICE_ACTIVATED_BY_ADMIN';
   }
  }catch(e){if(e.code==='23505'||e.code==='23503'||e.code==='23514'||e.code==='42501')fail(409,'CATALOG_DATABASE_CONSTRAINT_OR_PERMISSION_BLOCKED');throw e;}
  if(result.rowCount!==1)fail(409,'CATALOG_TARGET_UNAVAILABLE_OR_PREREQUISITE_MISSING');
  await audit(client,city,user,'DV32Q7_REAL_REFERENCE_CATALOG',result.rows[0].id,kind,
    {approvalReference:a.approvalReference,reason:a.reason,action:a.action,operatorAttested:true,notIndependentlyVerified:true});
  return {schema:'RHF-DV32Q7-ADMIN-ACTION-v1',action:kind,item:result.rows[0],operatorAttested:true,
    officialTaxonomyCertified:false,automaticFieldDispatch:false,temporalStarted:false,verifiedUrbanValue:false,acceptance:'NO_GO'};
 }
 const [units,services,slots]=await Promise.all([
  run(client,city,`SELECT id,code,name_fa,kind,active,parent_id FROM public.org_units WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY code LIMIT 201`),
  run(client,city,`SELECT id,code,name_fa,module_code,owner_unit_id,sla_hours,active FROM public.service_definitions WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY code LIMIT 201`),
  run(client,city,`SELECT slot,title_fa,mapping_status,axis_code,owner_unit_id,service_id FROM public.rhf_dv32q_mission_slots WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY slot`)
 ]);
 try{return validateRead({city,role,user,units:units.rows,services:services.rows,slots:slots.rows});}
 catch(e){fail(409,e.message);}
}
