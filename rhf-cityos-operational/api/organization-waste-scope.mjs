/** RHF V7.3: organization-specific, read-only waste service under authoritative appointment.
 * Never forwards a scoped identity to the old municipality-wide waste-suite API.
 */
import {identifier,isCurrent,fail} from './organization-identity-core.mjs';
import {isWasteDemoCity,isWasteOrganization} from './waste-pilot-core.mjs';

export const ORG_WASTE_V73='RHF-ORG-WASTE-READ-V7.3';
export const WASTE_DOMAINS=Object.freeze({
  FLEET:'ناوگان و ماشین‌آلات',MAINTENANCE:'تعمیرات و توقف',COLLECTION:'جمع‌آوری و باسکول',
  CONTRACTOR:'پیمانکاران و قراردادها',CONTRACT_EVAL:'عملکرد پیمانکاران',SHIFT:'شیفت و تنظیف',
  EDUCATION:'آموزش شهروندان',FACILITY:'مراکز پردازش و بازیافت',QUALITY:'کیفیت و بازرسی',
  VIOLATION:'تخلفات ـ مجوز ویژه',LEGAL:'حقوقی ـ مجوز ویژه'
});
const DENIED=new Set(['LEGAL','VIOLATION']);
export function validateWasteDomain(domain){
 if(typeof domain!=='string'||!Object.hasOwn(WASTE_DOMAINS,domain))fail('حوزه پسماند معتبر نیست',400);
 return domain;
}
export function wasteReadGuard({assignment,user,city,unit,domain}){
 validateWasteDomain(domain);
 if(DENIED.has(domain))fail('اطلاعات تخلفات و حقوقی به مجوز اختصاصی نیاز دارد؛ این مسیر دسترسی ندارد',403);
 if(!assignment||assignment.user_id!==user?.id||assignment.tenant_id!==city?.tenant_id||assignment.municipality_id!==city?.id)fail('انتصاب به نشست و شهرداری تعلق ندارد',403);
 if(!isCurrent(assignment)||assignment.position_code!=='ORG_CEO')fail('فقط مدیرعامل منصوب‌شده و دارای اعتبار سازمانی مجاز است',403);
 if(!isWasteDemoCity(city?.name)||unit?.id!==assignment.org_unit_id||!isWasteOrganization(unit))fail('ساختار سازمان پسماند یا محدوده آزمایشی معتبر نیست',403);
 return true;
}
// Never project fields of staff/personnel into this API; SHIFT remains aggregate from validated V2 journal.
export function safeWasteRecord(r){
 if(!r||typeof r!=='object')return null;
 const p=(r.payload&&typeof r.payload==='object'&&!Array.isArray(r.payload))?r.payload:{};
 const allow={
  FLEET:['assetCode','assetType','capacityKg','condition','zone','nextService'],
  MAINTENANCE:['assetCode','maintenanceType','openedAt','closedAt','downtimeHours','workshopRef'],
  COLLECTION:['stream','material','netKg','grossKg','tareKg','weighedAt','scaleTicket','vehicleCode','routeCode','sourceMethod'],
  CONTRACTOR:['contractorCode','contractRef','serviceType','contractStatus','startDate','endDate'],
  CONTRACT_EVAL:['contractorCode','periodStart','periodEnd','plannedServices','completedServices','inspectedServices','passedInspections'],
  SHIFT:['serviceDate','serviceType','district','routeCode','shiftName','requiredStaff','presentStaff','absentStaff','replacementStaff'],
  EDUCATION:['heldAt','district','topic','channel','participants','preScore','postScore'],
  FACILITY:['facilityCode','facilityType','district','capacityTonsPerDay','controlStatus'],
  QUALITY:['inspectedAt','district','routeCode','inspectedCount','passedCount','complaints']
 };
 const payload={};for(const k of allow[r.record_kind]||[])if(Object.hasOwn(p,k))payload[k]=p[k];
 return {id:r.id,kind:r.record_kind,code:r.record_code,caseId:r.case_id||null,occurredAt:r.occurred_at,reviewState:r.review_state,evidenceRef:r.evidence_ref,sourceKind:r.source_kind,createdAt:r.created_at,payload};
}
export async function readScopedWasteModule({client,city,user,assignmentId,domain}){
 const id=identifier(assignmentId,'شناسه انتصاب');validateWasteDomain(domain);
 // Must NOT infer org from querystring or arbitrary client-supplied organization IDs.
 const a=(await client.query(`SELECT a.*,o.id AS org_verified_id,o.code,o.kind,o.active,
      p.kind AS parent_kind,p.active AS parent_active,p.name_fa AS parent_name_fa
     FROM rhf_organization_appointments a
     LEFT JOIN org_units o ON o.id=a.org_unit_id AND o.tenant_id=a.tenant_id AND o.municipality_id=a.municipality_id
     LEFT JOIN org_units p ON p.id=o.parent_id AND p.tenant_id=o.tenant_id AND p.municipality_id=o.municipality_id
     WHERE a.tenant_id=$1 AND a.municipality_id=$2 AND a.user_id=$3 AND a.id=$4`,[city.tenant_id,city.id,user.id,id])).rows[0];
 const u=a?{id:a.org_verified_id,code:a.code,kind:a.kind,active:a.active,parent_kind:a.parent_kind,parent_active:a.parent_active,parent_name_fa:a.parent_name_fa}:null;
 wasteReadGuard({assignment:a,user,city,unit:u,domain});
 const raw=(await client.query(`SELECT id,record_kind,record_code,case_id,occurred_at,payload,evidence_ref,
     review_state,source_kind,created_at FROM waste_ops_records
     WHERE tenant_id=$1 AND municipality_id=$2 AND org_unit_id=$3 AND record_kind=$4
     ORDER BY created_at DESC,id DESC LIMIT 101`,[city.tenant_id,city.id,a.org_unit_id,domain])).rows;
 return {mode:ORG_WASTE_V73,cityId:city.id,assignmentId:a.id,orgUnitId:a.org_unit_id,
   domain,label:WASTE_DOMAINS[domain],rows:raw.slice(0,100).map(safeWasteRecord),partial:raw.length>100,
   readOnly:true,notFieldVerified:true,verifiedPublicValue:null,legalRestricted:true,
   note:'سوابق داخلی آزمایشی‌اند. VERIFIED به معنی راستی‌آزمایی میدانی یا تحقق ارزش عمومی نیست.'};
}
