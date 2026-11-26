// Durable human-review BPMS. All writes inside RUVOS withScope transaction + RLS.
import {identifier,fail} from './organization-identity-core.mjs';
import {BPMS_VERSION,intakeSpec,reviewSpec,canProcessReview,assertOwnerScope,presentProcess} from './org-bpms-core.mjs';
import {isWasteDemoCity,isWasteOrganization} from './waste-pilot-core.mjs';
async function getOwner(client,city,user,assignmentId){
 const r=await client.query(`SELECT a.*,o.id AS org_verified_id,o.code,o.kind,o.active,
    p.kind AS parent_kind,p.active AS parent_active,p.name_fa AS parent_name_fa
   FROM rhf_organization_appointments a
   LEFT JOIN org_units o ON o.id=a.org_unit_id AND o.tenant_id=a.tenant_id AND o.municipality_id=a.municipality_id
   LEFT JOIN org_units p ON p.id=o.parent_id AND p.tenant_id=o.tenant_id AND p.municipality_id=o.municipality_id
   WHERE a.tenant_id=$1 AND a.municipality_id=$2 AND a.id=$3 AND a.user_id=$4`,
  [city.tenant_id,city.id,identifier(assignmentId),user.id]);
 const a=r.rows[0];const u=a?{id:a.org_verified_id,code:a.code,kind:a.kind,active:a.active,parent_kind:a.parent_kind,parent_active:a.parent_active,parent_name_fa:a.parent_name_fa}:null;
 assertOwnerScope({appointment:a,user,city,unit:u});return a;
}
async function events(client,city,processId,actor,event,note){
 await client.query(`INSERT INTO rhf_org_process_events(tenant_id,municipality_id,process_id,actor_id,event,note)
 VALUES($1,$2,$3,$4,$5,$6)`,[city.tenant_id,city.id,processId,actor,event,note]);
}
export async function orgBpmsRoute({client,city,user,role,method,resourceId,url,readBody,req,audit}){
 const scope=[city.tenant_id,city.id];
 if(method==='GET'&&!resourceId){
  if(url.searchParams.get('reviewQueue')==='1'){
   if(!user.is_system_admin&&role!=='MUNICIPAL_ADMIN')fail('صف تصمیم مستقل فقط برای بازبین مجاز است',403);
   const r=await client.query(`SELECT p.* FROM rhf_org_process_instances p JOIN org_units o ON o.id=p.org_unit_id
    AND o.tenant_id=p.tenant_id AND o.municipality_id=p.municipality_id
    WHERE p.tenant_id=$1 AND p.municipality_id=$2 AND p.status='SUBMITTED' AND o.kind='ORGANIZATION' AND o.active=true
    ORDER BY p.created_at DESC LIMIT 100`,scope);
   return {mode:BPMS_VERSION,reviewQueue:true,rows:r.rows.map(presentProcess),partial:r.rows.length===100,cityId:city.id};
  }
  const a=await getOwner(client,city,user,url.searchParams.get('assignmentId'));
  const r=await client.query(`SELECT * FROM rhf_org_process_instances WHERE tenant_id=$1 AND municipality_id=$2 AND org_unit_id=$3
   ORDER BY created_at DESC,id DESC LIMIT 101`,[...scope,a.org_unit_id]);
  return {mode:BPMS_VERSION,assignmentId:a.id,orgUnitId:a.org_unit_id,rows:r.rows.slice(0,100).map(presentProcess),partial:r.rows.length>100,cityId:city.id};
 }
 if(method==='GET'&&resourceId){
  const id=identifier(resourceId,'شناسه فرایند');
  const p=(await client.query(`SELECT * FROM rhf_org_process_instances WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3`,[...scope,id])).rows[0];
  if(!p)fail('فرایند در شهرداری یافت نشد',404);
  if(!user.is_system_admin&&role!=='MUNICIPAL_ADMIN'){
   const a=await getOwner(client,city,user,url.searchParams.get('assignmentId'));
   if(a.org_unit_id!==p.org_unit_id)fail('فرایند متعلق به این سازمان نیست',403);
  }
  const e=await client.query(`SELECT actor_id,event,note,created_at FROM rhf_org_process_events WHERE tenant_id=$1 AND municipality_id=$2 AND process_id=$3 ORDER BY created_at,id LIMIT 100`,[...scope,id]);
  return {mode:BPMS_VERSION,cityId:city.id,process:presentProcess(p),events:e.rows,partial:e.rows.length===100};
 }
 if(method==='POST'&&!resourceId){
  const b=intakeSpec(await readBody(req));const a=await getOwner(client,city,user,b.assignmentId);
  if(b.caseId){
   const linked=await client.query(`SELECT 1 FROM service_cases c LEFT JOIN service_definitions s
    ON s.id=c.service_id AND s.tenant_id=c.tenant_id AND s.municipality_id=c.municipality_id
    WHERE c.id=$1 AND c.tenant_id=$2 AND c.municipality_id=$3
    AND (c.unit_id=$4 OR s.owner_unit_id=$4) LIMIT 1`,[b.caseId,...scope,a.org_unit_id]);
   if(!linked.rows.length)fail('پرونده به‌طور صریح به سازمان منصوب‌شده منتسب نیست',403);
  }
  const r=await client.query(`INSERT INTO rhf_org_process_instances
   (tenant_id,municipality_id,org_unit_id,assignment_id,request_key,kind,title,description,evidence_ref,case_id,metric,baseline,target,unit,created_by)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
   ON CONFLICT (tenant_id,municipality_id,request_key) DO NOTHING RETURNING *`,
   [...scope,a.org_unit_id,a.id,b.requestKey,b.kind,b.title,b.description,b.evidenceRef,b.caseId,b.metric,b.baseline,b.target,b.unit,user.id]);
  if(!r.rows.length){const prev=(await client.query(`SELECT * FROM rhf_org_process_instances WHERE tenant_id=$1 AND municipality_id=$2 AND request_key=$3`,[...scope,b.requestKey])).rows[0];
   if(!prev||prev.created_by!==user.id||prev.assignment_id!==a.id||prev.kind!==b.kind||prev.title!==b.title||prev.description!==b.description||
    (prev.evidence_ref||null)!==b.evidenceRef||(prev.case_id||null)!==b.caseId||(prev.metric||null)!==b.metric||
    (prev.unit||null)!==b.unit||(prev.baseline??null)!==b.baseline||(prev.target??null)!==b.target)fail('کلید درخواست برای اطلاعات متفاوت استفاده شده است',409);
   return {mode:BPMS_VERSION,process:presentProcess(prev),idempotent:true};
  }
  const p=r.rows[0];await events(client,city,p.id,user.id,'SUBMITTED','درخواست ثبت شد؛ هیچ تصمیم یا اجرای میدانی صادر نشد');
  await audit(client,city,user,'ORG_BPMS',p.id,'SUBMIT',{kind:p.kind,orgUnitId:a.org_unit_id,caseId:p.case_id});
  return {mode:BPMS_VERSION,process:presentProcess(p),idempotent:false};
 }
 if(method==='PATCH'&&resourceId){
  if(!user.is_system_admin&&role!=='MUNICIPAL_ADMIN')fail('فقط بازبین مستقل مجاز است',403);
  const id=identifier(resourceId,'شناسه فرایند');const b=reviewSpec(await readBody(req));
  const q=await client.query(`SELECT * FROM rhf_org_process_instances WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 FOR UPDATE`,[...scope,id]);
  const p=q.rows[0];if(!p)fail('فرایند در شهرداری یافت نشد',404);
  if(!isWasteDemoCity(city.name))fail('فقط پایلوت آزمایشی شیراز مجاز است',403);
  const org=(await client.query(`SELECT o.id,o.code,o.kind,o.active,p.kind AS parent_kind,p.active AS parent_active,p.name_fa AS parent_name_fa FROM org_units o LEFT JOIN org_units p ON p.id=o.parent_id AND p.tenant_id=o.tenant_id AND p.municipality_id=o.municipality_id WHERE o.tenant_id=$1 AND o.municipality_id=$2 AND o.id=$3`,[...scope,p.org_unit_id])).rows[0];
  if(!isWasteOrganization(org))fail('واحد سازمانی مربوط به پسماند نیست',403);
  canProcessReview(user,role,p);
  if(p.version!==b.version)fail('نسخه فرایند تغییر کرده است',409);
  const next=b.action==='AUTHORIZE_FOLLOWUP'?'AUTHORIZED':'REJECTED';
  const upd=await client.query(`UPDATE rhf_org_process_instances SET status=$4,version=version+1,reviewed_by=$5,reviewed_at=now(),review_note=$6
   WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3 AND version=$7 RETURNING *`,[...scope,id,next,user.id,b.note,b.version]);
  if(!upd.rows.length)fail('ویرایش هم‌زمان؛ دوباره بارگذاری کنید',409);
  await events(client,city,id,user.id,next,b.note);
  await audit(client,city,user,'ORG_BPMS',id,next,{kind:p.kind,orgUnitId:p.org_unit_id,reviewOnly:true});
  return {mode:BPMS_VERSION,process:presentProcess(upd.rows[0])};
 }
 fail('مسیر BPMS معتبر نیست',404);
}
