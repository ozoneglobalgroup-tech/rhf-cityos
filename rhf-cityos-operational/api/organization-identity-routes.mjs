import {POSITIONS,identifier,appointmentSpec,assertPositionUnit,isCurrent,authorizeManagement,canRequest,canReview,canRevoke,workspace,noFalseProof,fail} from './organization-identity-core.mjs';
import {evaluateHostUat} from './uat-controller-host.mjs';
import {readScopedWasteModule} from './organization-waste-scope.mjs';
import {orgBpmsRoute} from './org-bpms-routes.mjs';
import {wasteLabRoute} from './waste-lab-routes.mjs';
import {readWasteExecutiveRollup} from './waste-executive-rollup.mjs';
import {deputyDemoRoute} from './deputy-demo-route.mjs';
import {deputyDossierRoute} from './deputy-dossier-route.mjs';
import {readAuthorityGraph} from './authority-graph-route.mjs';
import {readOpportunityExchange} from './opportunity-exchange-route.mjs';

export const ORG_IDENTITY_PARTS=Object.freeze(['organization-positions','my-workspaces','my-menu','org-executive-summary','org-waste-module','org-bpms','org-waste-lab','org-waste-rollup','org-deputy-demo','org-deputy-dossiers','org-authority-graph','org-opportunity-exchange','uat-controller']);
function clean(a){return {id:a.id,userId:a.user_id,username:a.username||null,displayName:a.display_name||null,orgUnitId:a.org_unit_id,orgUnitName:a.org_name||null,positionCode:a.position_code,positionLabel:POSITIONS[a.position_code]?.label,status:a.status,validFrom:a.valid_from,validTo:a.valid_to,approvalRef:a.approval_ref,requestedBy:a.requested_by,reviewedBy:a.reviewed_by,version:a.version,createdAt:a.created_at};}
function reason(note){if(typeof note!=='string'||note.trim().length<30||note.length>1200||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(note))fail('دلیل بررسی باید ۳۰ تا ۱۲۰۰ نویسه باشد');return note.trim()}

// Policy fence for the old city-wide endpoints. Merely hiding menus is not authorization.
// This denies legacy city-level data to scoped users, including formerly appointed users.
export async function denyLegacyForScoped({cityId,user,withScope}){
 if(user.is_system_admin)return;
 await withScope(cityId,user,'read',async(client,city,role)=>{
  const flagged=await client.query(`SELECT EXISTS(SELECT 1 FROM rhf_organization_appointments a
       WHERE a.tenant_id=$1 AND a.municipality_id=$2 AND a.user_id=$3) AS appointed`,[city.tenant_id,city.id,user.id]);
  if(role==='VIEWER'||flagged.rows[0].appointed)fail('برای حساب سازمانی، فقط مسیرهای دارای مجوز سمت‌محور مجاز است',403);
 });
}

export async function organizationIdentityRoute({part,method,resourceId,req,url,cityId,user,withScope,readBody,json,audit}){
 const result=await withScope(cityId,user,'read',async(client,city,role)=>{
  const q=(sql,params=[])=>client.query(sql,params);
  const scope=[city.tenant_id,city.id];
  async function getCurrent(id){
   const r=await q(`SELECT a.*,u.username,u.display_name,o.name_fa AS org_name,o.active AS org_active
    FROM rhf_organization_appointments a JOIN users u ON u.id=a.user_id
    LEFT JOIN org_units o ON o.id=a.org_unit_id AND o.tenant_id=a.tenant_id AND o.municipality_id=a.municipality_id
    WHERE a.tenant_id=$1 AND a.municipality_id=$2 AND a.id=$3 FOR UPDATE OF a`,[...scope,identifier(id)]);
   if(!r.rows.length)fail('انتصاب در شهرداری یافت نشد',404);
   return r.rows[0];
  }
  // Read-only management cockpit for a specifically designated synthetic UAT controller.
  // This is NOT an actual mayor/deputy/organization appointment or a means to
  // override existing workspace authorization.
  if(part==='uat-controller'){
   if(method!=='GET'||resourceId)fail('این مسیر فقط خواندنی است',405);
   const eligibility=evaluateHostUat({user,city,role,action:'workspace.read'});
   if(!eligibility.scopeAllowed)fail('دسترسی کنترلر آزمایشی فعال یا مجاز نیست',403);
   const units=await q(`SELECT id,parent_id,code,name_fa,kind,active FROM org_units
     WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY kind,name_fa LIMIT 500`,scope);
   const seats=await q(`SELECT org_unit_id,position_code,status,
      count(*)::integer AS n FROM rhf_organization_appointments
      WHERE tenant_id=$1 AND municipality_id=$2 GROUP BY org_unit_id,position_code,status
      ORDER BY position_code,status LIMIT 500`,scope);
   const own=await q(`SELECT count(*)::integer AS n FROM rhf_organization_appointments
      WHERE tenant_id=$1 AND municipality_id=$2 AND user_id=$3
      AND status='APPROVED' AND valid_from<=now()
      AND (valid_to IS NULL OR valid_to>now())`,[...scope,user.id]);
   return {mode:'SYNTHETIC_DEMO',readOnly:true,notAnAppointment:true,
     city:{id:city.id,name:city.name},controller:{username:user.username,role},
     organizationUnits:units.rows,appointmentSeatCounts:seats.rows,
     controllerHasActiveAppointment:Number(own.rows[0]?.n||0)>0,
     permissions:{existingMunicipalAdminManagement:true,
       appointmentRequestDelegation:evaluateHostUat({user,city,role,action:'appointment.request'}).scopeAllowed,
       selfApproval:false,verifiedPublicValue:false,productionExecution:false},
     notice:'پنل تجمیعی تست؛ جانشین انتصاب سازمانی یا مجوز بهره‌برداری واقعی نیست'};
  }
  if(part==='org-opportunity-exchange')return readOpportunityExchange({client,city,user,role,method,resourceId,url});
  if(part==='org-authority-graph')return readAuthorityGraph({client,city,user,role,method,resourceId,url});
  if(part==='org-deputy-dossiers')return deputyDossierRoute({client,city,user,role,method,resourceId,req,url,readBody,audit});
  if(part==='org-deputy-demo')return deputyDemoRoute({client,city,user,role,method,resourceId,req,url,readBody,audit});
  if(part==='org-bpms')return orgBpmsRoute({client,city,user,role,method,resourceId,url,readBody,req,audit});
  if(part==='org-waste-lab')return wasteLabRoute({client,city,user,role,method,resourceId,url,readBody,req,audit});
  if(part==='org-waste-rollup'&&method==='GET'&&!resourceId)return readWasteExecutiveRollup({client,city,user,assignmentId:url.searchParams.get('assignmentId')});
  if(part==='org-waste-module'&&method==='GET'&&!resourceId){
   return readScopedWasteModule({client,city,user,assignmentId:url.searchParams.get('assignmentId'),domain:url.searchParams.get('domain')});
  }
  if(part==='my-workspaces'&&method==='GET'&&!resourceId){
   const r=await q(`SELECT a.*,o.name_fa AS org_name,o.active AS org_active FROM rhf_organization_appointments a
    LEFT JOIN org_units o ON o.id=a.org_unit_id AND o.tenant_id=a.tenant_id AND o.municipality_id=a.municipality_id
    WHERE a.tenant_id=$1 AND a.municipality_id=$2 AND a.user_id=$3
    ORDER BY a.created_at DESC LIMIT 100`,[...scope,user.id]);
   return {managedIdentity:role==='VIEWER'||r.rows.length>0,workspaces:r.rows.filter(a=>isCurrent(a)&&(a.position_code==='MAYOR'||a.org_active===true)).map(a=>workspace(a,a.org_name)),pending:r.rows.filter(a=>a.status==='PENDING').length,policyVersion:'RHF-ORG-IAM-V7.2'};
  }
  if(part==='my-menu'&&method==='GET'&&!resourceId){
   const assignmentId=identifier(url.searchParams.get('assignmentId'),'شناسه انتصاب');
   const r=await q(`SELECT a.*,o.name_fa AS org_name,o.active AS org_active FROM rhf_organization_appointments a
    LEFT JOIN org_units o ON o.id=a.org_unit_id AND o.tenant_id=a.tenant_id AND o.municipality_id=a.municipality_id
    WHERE a.tenant_id=$1 AND a.municipality_id=$2 AND a.id=$3 AND a.user_id=$4`,[...scope,assignmentId,user.id]);
   const a=r.rows[0];if(!isCurrent(a)||(a.position_code!=='MAYOR'&&a.org_active!==true))fail('انتصاب معتبر و فعال یافت نشد',403);
   return {workspace:workspace(a,a.org_name),sections:[...POSITIONS[a.position_code].menu],mayWriteLegacy:false};
  }
  if(part==='org-executive-summary'&&method==='GET'&&!resourceId){
   const assignmentId=identifier(url.searchParams.get('assignmentId'),'شناسه انتصاب');
   const r=await q(`SELECT a.*,o.name_fa AS org_name,o.active AS org_active FROM rhf_organization_appointments a
    LEFT JOIN org_units o ON o.id=a.org_unit_id AND o.tenant_id=a.tenant_id AND o.municipality_id=a.municipality_id
    WHERE a.tenant_id=$1 AND a.municipality_id=$2 AND a.id=$3 AND a.user_id=$4`,[...scope,assignmentId,user.id]);
   const a=r.rows[0];if(!isCurrent(a)||(a.position_code!=='MAYOR'&&a.org_active!==true))fail('سمت معتبر و فعال یافت نشد',403);
   const mayor=a.position_code==='MAYOR';
   const sql=mayor?`SELECT count(DISTINCT c.id)::integer AS attributed_cases
      FROM service_cases c LEFT JOIN service_definitions s
      ON s.id=c.service_id AND s.tenant_id=c.tenant_id AND s.municipality_id=c.municipality_id
      WHERE c.tenant_id=$1 AND c.municipality_id=$2
      AND (c.unit_id IS NOT NULL OR s.owner_unit_id IS NOT NULL)`:
     `WITH RECURSIVE subtree(id) AS (
       SELECT id FROM org_units WHERE id=$3 AND tenant_id=$1 AND municipality_id=$2 AND active=true
       UNION SELECT o.id FROM org_units o JOIN subtree st ON o.parent_id=st.id
       WHERE o.tenant_id=$1 AND o.municipality_id=$2 AND o.active=true
      ) SELECT count(DISTINCT c.id)::integer AS attributed_cases
      FROM service_cases c LEFT JOIN service_definitions s
      ON s.id=c.service_id AND s.tenant_id=c.tenant_id AND s.municipality_id=c.municipality_id
      WHERE c.tenant_id=$1 AND c.municipality_id=$2
      AND (c.unit_id IN (SELECT id FROM subtree) OR s.owner_unit_id IN (SELECT id FROM subtree))`;
   const aggregate=await q(sql,mayor?scope:[...scope,a.org_unit_id]);
   return {assignmentId:a.id,positionCode:a.position_code,scope:{municipalityId:city.id,orgUnitId:a.org_unit_id,orgUnitName:a.org_name||null},asOf:new Date().toISOString(),coverage:'ATTRIBUTED_CASES_ONLY',counts:noFalseProof({attributedCases:aggregate.rows[0].attributed_cases}),partial:false,notes:'آمار شمارش پرونده‌های صریحاً منتسب؛ نه اثبات عملکرد، اثربخشی یا ارزش عمومی',policyVersion:'RHF-ORG-IAM-V7.2'};
  }
  if(part==='organization-positions'&&method==='GET'&&!resourceId){
   authorizeManagement(user,role);
   const r=await q(`SELECT a.*,u.username,u.display_name,o.name_fa AS org_name,o.active AS org_active FROM rhf_organization_appointments a
      JOIN users u ON u.id=a.user_id LEFT JOIN org_units o
      ON o.id=a.org_unit_id AND o.tenant_id=a.tenant_id AND o.municipality_id=a.municipality_id
      WHERE a.tenant_id=$1 AND a.municipality_id=$2 ORDER BY a.created_at DESC LIMIT 200`,scope);
   return {rows:r.rows.map(clean),limit:200,partial:r.rows.length===200,positionCatalog:POSITIONS};
  }
  if(part==='organization-positions'&&method==='POST'&&!resourceId){
   // Keep normal system-admin behavior. A non-admin MUNICIPAL_ADMIN may only
   // submit demo requests when the UAT policy is explicitly, temporarily enabled.
   const delegated=evaluateHostUat({user,city,role,action:'appointment.request'});
   if(!delegated.scopeAllowed)canRequest(user);
   const b=appointmentSpec(await readBody(req));
   if(delegated.scopeAllowed&&b.userId===user.id)fail('کنترلر آزمایشی نمی‌تواند برای خود انتصاب ایجاد کند',403);
   // Accounts may be appointed before receiving municipality membership; this prevents interim city-wide VIEWER access.
   const usr=await q('SELECT id FROM users WHERE id=$1',[b.userId]);if(!usr.rows.length)fail('حساب کاربری یافت نشد',404);
   if(b.orgUnitId){const r=await q('SELECT id,kind,active FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3',[...scope,b.orgUnitId]);assertPositionUnit(b.positionCode,r.rows[0]);}
   else assertPositionUnit(b.positionCode,null);
   const ins=await q(`INSERT INTO rhf_organization_appointments
    (tenant_id,municipality_id,org_unit_id,user_id,position_code,valid_from,valid_to,approval_ref,requested_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[...scope,b.orgUnitId,b.userId,b.positionCode,b.validFrom,b.validTo,b.approvalRef,user.id]);
   const row=ins.rows[0];await audit(client,city,user,'ORG_APPOINTMENT',row.id,'REQUEST',{targetUserId:b.userId,position:b.positionCode,orgUnitId:b.orgUnitId});
   return {appointment:clean(row),message:'در انتظار تأیید مستقل؛ دسترسی جدیدی اعطا نشده است'};
  }
  if(part==='organization-positions'&&method==='PATCH'&&resourceId){
   const b=await readBody(req);const a=await getCurrent(resourceId);
   if(!Number.isSafeInteger(b.version)||b.version!==a.version)fail('نسخه انتصاب تغییر کرده است',409);
   const action=b.action;const note=reason(b.note);
   if(action==='APPROVE'){
    canReview(user,role,a);
    if(a.valid_to&&Date.parse(a.valid_to)<=Date.now())fail('مهلت انتصاب پایان یافته است',409);
    if(a.org_unit_id){const r=await q('SELECT id,kind,active FROM org_units WHERE tenant_id=$1 AND municipality_id=$2 AND id=$3',[...scope,a.org_unit_id]);assertPositionUnit(a.position_code,r.rows[0]);}
    const activeUser=await q('SELECT 1 FROM users WHERE id=$1',[a.user_id]);if(!activeUser.rows.length)fail('کاربر حذف شده است',409);
    const mutex=`${city.id}:${a.position_code}:${a.org_unit_id||'ROOT'}`;
    await q('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[city.tenant_id,mutex]);
    const leadership=['MAYOR','DEPUTY_HEAD','ORG_CEO','DEPARTMENT_HEAD'].includes(a.position_code);
    const conflict=await q(`SELECT id FROM rhf_organization_appointments WHERE tenant_id=$1 AND municipality_id=$2
      AND id<>$3 AND status='APPROVED' AND position_code=$4
      AND org_unit_id IS NOT DISTINCT FROM $5::uuid
      AND (user_id=$6 OR $7::boolean)
      AND valid_from < coalesce($9::timestamptz,'infinity'::timestamptz)
      AND coalesce(valid_to,'infinity'::timestamptz)>$8::timestamptz LIMIT 1`,
      [...scope,a.id,a.position_code,a.org_unit_id,a.user_id,leadership,a.valid_from,a.valid_to]);
    if(conflict.rows.length)fail('انتصاب هم‌پوشان یا مدیر فعال دیگری در همین جایگاه وجود دارد',409);
    const upd=await q(`UPDATE rhf_organization_appointments SET status='APPROVED',reviewed_by=$2,reviewed_at=now(),review_note=$3,version=version+1 WHERE id=$1 RETURNING *`,[a.id,user.id,note]);
    await audit(client,city,user,'ORG_APPOINTMENT',a.id,'APPROVE',{targetUserId:a.user_id,position:a.position_code});return {appointment:clean(upd.rows[0])};
   }
   if(action==='REJECT'){
    canReview(user,role,a);
    const upd=await q(`UPDATE rhf_organization_appointments SET status='REJECTED',reviewed_by=$2,reviewed_at=now(),review_note=$3,version=version+1 WHERE id=$1 RETURNING *`,[a.id,user.id,note]);
    await audit(client,city,user,'ORG_APPOINTMENT',a.id,'REJECT',{targetUserId:a.user_id});return {appointment:clean(upd.rows[0])};
   }
   if(action==='REVOKE'){
    canRevoke(user,role,a);
    const upd=await q(`UPDATE rhf_organization_appointments SET status='REVOKED',revoked_by=$2,revoked_at=now(),revoke_note=$3,version=version+1 WHERE id=$1 RETURNING *`,[a.id,user.id,note]);
    await audit(client,city,user,'ORG_APPOINTMENT',a.id,'REVOKE',{targetUserId:a.user_id});return {appointment:clean(upd.rows[0])};
   }
   fail('اقدام مجاز نیست');
  }
  fail('مسیر سمت سازمانی یافت نشد',404);
 });
 return json(method==='POST'?201:200,result);
}
