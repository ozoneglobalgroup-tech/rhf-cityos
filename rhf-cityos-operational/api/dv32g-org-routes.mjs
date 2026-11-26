// Called only after authenticate() and inside withScope() transaction (city/tenant/actor RLS context).
import {ClientError} from './domain.mjs';
import {validUuid,adminAllowed,directorAllowed,validateGrant,validateRevoke,wasteReport} from './dv32g-core.mjs';
const fail=(status,message)=>{throw new ClientError(message,status);};
const q=(client,city,sql,extra=[])=>client.query(sql,[city.tenant_id,city.id,...extra]);
async function wasteOrganizations(client,city){
 return (await q(client,city,`SELECT id,code,name_fa FROM org_units WHERE tenant_id=$1 AND municipality_id=$2
 AND active AND kind='ORGANIZATION' AND (name_fa LIKE '%پسماند%' OR code ILIKE '%waste%')
 ORDER BY code LIMIT 31`)).rows;
}
async function validatedOrg(client,city,orgId){
 if(!validUuid(orgId))fail(400,'شناسه سازمان نامعتبر است');
 const orgs=await wasteOrganizations(client,city);
 if(orgs.length>30)fail(409,'ابهام در شناسایی سازمان پسماند؛ ابتدا ساختار سازمانی اصلاح شود');
 const org=orgs.find(x=>x.id===orgId);if(!org)fail(403,'شناسه سازمان پسماند معتبر و فعال نیست');return org;
}
async function ownActiveBinding(client,city,userId){
 const r=await q(client,city,`SELECT b.id,b.organization_id,b.granted_at,o.name_fa,o.code FROM rhf_dv32g_org_director_bindings b
 JOIN org_units o ON o.id=b.organization_id AND o.tenant_id=b.tenant_id AND o.municipality_id=b.municipality_id
 WHERE b.tenant_id=$1 AND b.municipality_id=$2 AND b.user_id=$3 AND b.revoked_at IS NULL AND o.active AND o.kind='ORGANIZATION'
 ORDER BY b.granted_at DESC LIMIT 2`,[userId]);
 if(r.rows.length>1)fail(409,'انتساب‌های فعال متعارض؛ نیازمند رسیدگی مدیر شهرداری');
 return r.rows[0]||null;
}
export async function dv32gBindingRoute({method,resourceId,client,city,user,role,readBody,audit}){
 const admin=adminAllowed(role,user.is_system_admin);
 if(method==='GET'&&!resourceId){
  if(admin){
   const orgs=await wasteOrganizations(client,city);
   if(orgs.length>30)fail(409,'بیش از ۳۰ سازمان کاندید؛ ابتدا ساختار اصلاح شود');
   const members=(await q(client,city,`SELECT m.user_id AS id,u.display_name AS name,u.username FROM memberships m JOIN users u ON u.id=m.user_id
      WHERE m.tenant_id=$1 AND m.municipality_id=$2 AND m.role='DIRECTOR' ORDER BY u.username LIMIT 101`)).rows;
   const bindings=(await q(client,city,`SELECT b.id,b.organization_id,b.user_id,b.granted_at,b.reason,u.display_name AS user_name,o.name_fa AS org_name
      FROM rhf_dv32g_org_director_bindings b JOIN users u ON u.id=b.user_id
      JOIN org_units o ON o.id=b.organization_id AND o.tenant_id=b.tenant_id AND o.municipality_id=b.municipality_id
      WHERE b.tenant_id=$1 AND b.municipality_id=$2 AND b.revoked_at IS NULL ORDER BY b.granted_at DESC LIMIT 101`)).rows;
   return {access:'ADMIN',readOnly:false,eligibleOrganizations:orgs,eligibleDirectors:members.slice(0,100),activeBindings:bindings.slice(0,100),truncated:members.length>100||bindings.length>100};
  }
  if(!directorAllowed(role))fail(403,'مشاهده انتساب سازمانی مجاز نیست');
  const bound=await ownActiveBinding(client,city,user.id);
  return {access:'DIRECTOR',readOnly:true,ownBinding:bound?{id:bound.id,organizationId:bound.organization_id,organizationName:bound.name_fa}:null};
 }
 if(!admin)fail(403,'فقط مدیر شهرداری می‌تواند انتساب سازمانی ایجاد یا لغو کند');
 if(method==='POST'&&!resourceId){
  let b;try{b=validateGrant(await readBody());}catch(e){fail(400,e.message);}
  const org=await validatedOrg(client,city,b.orgId);
  if(user.id===b.userId)fail(403,'خودانتسابی مدیر مجاز نیست');
  const member=(await q(client,city,`SELECT user_id FROM memberships WHERE tenant_id=$1 AND municipality_id=$2 AND user_id=$3 AND role='DIRECTOR'`,[b.userId])).rows;
  if(member.length!==1)fail(409,'کاربر باید قبلاً در همین شهرداری نقش DIRECTOR داشته باشد');
  const prev=(await q(client,city,`SELECT id,organization_id FROM rhf_dv32g_org_director_bindings
  WHERE tenant_id=$1 AND municipality_id=$2 AND user_id=$3 AND revoked_at IS NULL FOR UPDATE`,[b.userId])).rows;
  if(prev.length)fail(409,'انتساب فعال قبلی وجود دارد؛ ابتدا آن را لغو کنید');
  let result;
  try{result=(await q(client,city,`INSERT INTO rhf_dv32g_org_director_bindings
  (tenant_id,municipality_id,user_id,organization_id,granted_by,reason)
  VALUES($1,$2,$3,$4,$5,$6) RETURNING id,user_id,organization_id,granted_at`,[b.userId,org.id,user.id,b.reason])).rows[0];}
  catch(e){if(e.code==='23505')fail(409,'تعارض انتساب هم‌زمان؛ دوباره وضعیت را بررسی کنید');throw e;}
  await audit(client,city,user,'ORG_DIRECTOR_BINDING',result.id,'GRANTED',{organizationId:org.id,userId:b.userId,reason:b.reason});
  return {binding:result,humanApprovedBy:user.id,fieldDispatchAllowed:false};
 }
 if(method==='DELETE'&&resourceId){
  if(!validUuid(resourceId))fail(400,'شناسه انتساب نامعتبر است');
  let reason;try{reason=validateRevoke(await readBody());}catch(e){fail(400,e.message);}
  const rows=(await q(client,city,`SELECT id,user_id,organization_id,revoked_at FROM rhf_dv32g_org_director_bindings
   WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 FOR UPDATE`,[resourceId])).rows;
  if(!rows.length)fail(404,'انتساب در این شهرداری یافت نشد');
  if(rows[0].revoked_at)fail(409,'این انتساب قبلاً لغو شده است');
  await q(client,city,`UPDATE rhf_dv32g_org_director_bindings SET revoked_at=now(),revoked_by=$4,revocation_reason=$5
   WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND revoked_at IS NULL`,[resourceId,user.id,reason]);
  await audit(client,city,user,'ORG_DIRECTOR_BINDING',resourceId,'REVOKED',{organizationId:rows[0].organization_id,userId:rows[0].user_id,reason});
  return {revoked:true,id:resourceId};
 }
 fail(405,'روش درخواست پشتیبانی نمی‌شود');
}
export async function dv32gWasteRoute({method,resourceId,client,city,user,role,url}){
 if(method!=='GET'||resourceId)fail(405,'میزکار پسماند فقط خواندنی است');
 const admin=adminAllowed(role,user.is_system_admin);
 let org,binding;
 if(admin){
  const id=url.searchParams.get('orgId');
  if(!id)return {schema:'RHF-DV32G-ORGANIZATION-WASTE-v1',readOnly:true,needsOrganizationSelection:true,scope:{municipalityId:city.id},noCityWideFallback:true};
  org=await validatedOrg(client,city,id);
  binding={id:'ADMIN_EXPLICIT_PREVIEW'};
 }else{
  if(!directorAllowed(role))fail(403,'این نقش به میزکار مدیرعامل سازمان دسترسی ندارد');
  if(url.searchParams.has('orgId'))fail(403,'مدیرعامل اجازه تغییر محدوده سازمان با پارامتر را ندارد');
  binding=await ownActiveBinding(client,city,user.id);
  if(!binding)fail(403,'انتساب فعال و معتبر سازمانی وجود ندارد');
  org=await validatedOrg(client,city,binding.organization_id);
 }
 const rows=(await q(client,city,`WITH RECURSIVE tree(id) AS (
    SELECT id FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND active
    UNION SELECT o.id FROM org_units o JOIN tree t ON o.parent_id=t.id
    WHERE o.tenant_id=$1 AND o.municipality_id=$2 AND o.active
  ) SELECT status,priority,count(*)::int AS n FROM service_cases WHERE tenant_id=$1 AND municipality_id=$2
    AND unit_id IN (SELECT id FROM tree) GROUP BY status,priority`,[org.id])).rows;
 const resource=(await q(client,city,`WITH RECURSIVE tree(id) AS (
    SELECT id FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND active
    UNION SELECT o.id FROM org_units o JOIN tree t ON o.parent_id=t.id
    WHERE o.tenant_id=$1 AND o.municipality_id=$2 AND o.active
  ) SELECT count(*)::int AS n FROM capacity_resources WHERE tenant_id=$1 AND municipality_id=$2
    AND owner_unit_id IN (SELECT id FROM tree)`,[org.id])).rows[0]?.n;
 const reserved=(await q(client,city,`WITH RECURSIVE tree(id) AS (
    SELECT id FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND active
    UNION SELECT o.id FROM org_units o JOIN tree t ON o.parent_id=t.id
    WHERE o.tenant_id=$1 AND o.municipality_id=$2 AND o.active
  ) SELECT count(*)::int AS n FROM capacity_allocations a
   JOIN capacity_resources r ON r.id=a.resource_id AND r.tenant_id=a.tenant_id AND r.municipality_id=a.municipality_id
   WHERE a.tenant_id=$1 AND a.municipality_id=$2 AND a.status='RESERVED'
    AND r.owner_unit_id IN (SELECT id FROM tree)`,[org.id])).rows[0]?.n;
 return wasteReport({city,org,role:admin?'MUNICIPAL_ADMIN':role,binding,caseRows:rows,resources:resource,allocations:reserved});
}
