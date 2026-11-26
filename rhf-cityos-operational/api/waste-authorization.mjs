/** RHF W9.1 — authorization for the active waste organization.
 * Municipality membership is necessary but not sufficient for operations.
 * System admins and independent municipal reviewers get oversight only;
 * they do not implicitly gain operational appointment or CEO authority.
 */
export class WasteAuthorizationError extends Error { constructor(message){super(message);this.name='WasteAuthorizationError';this.status=403;this.rhfIamError=true;} }

export const WASTE_APPOINTED_READ = Object.freeze(['ORG_CEO','DEPARTMENT_HEAD','OPERATOR','ORG_AUDITOR']);
export const WASTE_APPOINTED_WRITE = Object.freeze(['ORG_CEO','DEPARTMENT_HEAD','OPERATOR']);
const REVIEWER_ROLES = new Set(['MUNICIPAL_ADMIN','AUDITOR']);
const WRITER_ROLES = new Set(['DIRECTOR']);
const READER_ROLES = new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR']);

export async function wastePermissions(client,city,user,role,org) {
 if(!client||!city?.id||!city?.tenant_id||!user?.id||!org?.id)throw new WasteAuthorizationError('WASTE_AUTH_CONTEXT_MISSING');
 if(!READER_ROLES.has(role))throw new WasteAuthorizationError('WASTE_ROLE_DENIED');
 const result=await client.query(`SELECT position_code,org_unit_id FROM rhf_organization_appointments
  WHERE tenant_id=$1 AND municipality_id=$2 AND user_id=$3
    AND status='APPROVED' AND valid_from <= now() AND (valid_to IS NULL OR valid_to > now())
    AND ((org_unit_id=$4 AND position_code=ANY($6::text[]))
      OR (org_unit_id=$5 AND position_code='DEPUTY_HEAD')
      OR (org_unit_id IS NULL AND position_code='MAYOR'))`,
  [city.tenant_id,city.id,user.id,org.id,org.parent_id || null,[...WASTE_APPOINTED_READ]]);
 const a=result.rows;
 const scoped=a.filter(x=>x.org_unit_id===org.id && WASTE_APPOINTED_READ.includes(x.position_code));
 const appointed=!!scoped.length || a.some(x=>x.position_code==='DEPUTY_HEAD'&&x.org_unit_id===org.parent_id) || a.some(x=>x.position_code==='MAYOR'&&x.org_unit_id===null);
 // An appointed deputy is permitted to supervise, not to create waste journal entries.
 // Only a specifically appointed DIRECTOR may write in the waste organization scope.
 // Municipal reviewers and system admins are never elevated to operational staff.
 const operational=!!scoped.find(x=>WASTE_APPOINTED_WRITE.includes(x.position_code));
 const oversight=user.is_system_admin===true || REVIEWER_ROLES.has(role);
 const read=oversight || appointed;
 if(!read)throw new WasteAuthorizationError('WASTE_APPROVED_APPOINTMENT_REQUIRED');
 const create=!user.is_system_admin && WRITER_ROLES.has(role) && operational;
 return Object.freeze({read:true,create,review:REVIEWER_ROLES.has(role),oversight,appointmentVerified:appointed});
}
