/** V7.7: read-only, appointment-scoped synthetic lab aggregates. No raw payload, names, or legal/violation disclosure. */
import {identifier,isCurrent,fail} from './organization-identity-core.mjs';
export const ROLLUP_VERSION='RHF-WASTE-ROLE-ROLLUP-V7.7';
export const PUBLIC_DOMAINS=Object.freeze(['COLLECTION','FLEET','MAINTENANCE','CONTRACTOR','CONTRACT_EVAL','SHIFT','QUALITY','FACILITY','EDUCATION']);
export function canReadRollup(a,user,now=Date.now()){
 return !!a && a.user_id===user?.id && isCurrent(a,now) && ['MAYOR','DEPUTY_HEAD','ORG_CEO'].includes(a.position_code) && (a.position_code==='MAYOR' || a.org_active===true);
}
export function redactCounts(rows){
 const counts=Object.fromEntries(PUBLIC_DOMAINS.map(k=>[k,0]));let records=0,flows=0,pending=0,internallyReviewed=0;
 for(const r of rows){
  if(!PUBLIC_DOMAINS.includes(r.domain) && r.kind!=='FLOW')throw Error('INTERNAL: restricted domain reached rollup');
  const n=Number(r.n);if(!Number.isSafeInteger(n)||n<0)throw Error('INTERNAL: invalid aggregate count');
  if(r.kind==='RECORD'){if(!PUBLIC_DOMAINS.includes(r.domain))throw Error('INTERNAL: restricted record reached rollup');counts[r.domain]+=n;records+=n;}
  else if(r.kind==='FLOW'&&r.domain==='BPMS'){flows+=n;}
  else throw Error('INTERNAL: unexpected aggregate kind');
  if(r.status==='SUBMITTED')pending+=n;
  if(r.status==='REVIEWED')internallyReviewed+=n;
 }
 return {records,flows,pending,internallyReviewed,domains:counts};
}
export async function readWasteExecutiveRollup({client,city,user,assignmentId}){
 const id=identifier(assignmentId,'شناسه انتصاب');
 const qr=await client.query(`SELECT a.id,a.user_id,a.org_unit_id,a.position_code,a.status,a.valid_from,a.valid_to,o.active AS org_active,o.name_fa AS org_name
 FROM rhf_organization_appointments a LEFT JOIN org_units o ON o.id=a.org_unit_id AND o.tenant_id=a.tenant_id AND o.municipality_id=a.municipality_id
 WHERE a.id=$3 AND a.user_id=$4 AND a.tenant_id=$1 AND a.municipality_id=$2`,[city.tenant_id,city.id,id,user.id]);
 const a=qr.rows[0];if(!canReadRollup(a,user))fail('برای این گزارش انتصاب معتبر و مجاز وجود ندارد',403);
 // All row selection (including organizational ancestry) is enforced by the SQL, never by client filters.
 const result=await client.query(`WITH RECURSIVE allowed_units(id) AS (
   SELECT id FROM org_units WHERE id=$3::uuid AND tenant_id=$1 AND municipality_id=$2 AND active=true
   UNION SELECT o.id FROM org_units o JOIN allowed_units parent ON o.parent_id=parent.id
   WHERE o.tenant_id=$1 AND o.municipality_id=$2 AND o.active=true
 )
 SELECT w.domain,w.kind,w.status,count(*)::integer AS n
 FROM rhf_waste_lab_items w
 WHERE w.tenant_id=$1 AND w.municipality_id=$2
   AND ($4::text='MAYOR' OR w.org_unit_id IN (SELECT id FROM allowed_units))
   AND (w.domain=ANY($5::text[]) OR (w.kind='FLOW' AND w.domain='BPMS' AND coalesce(w.payload->>'processKind','')<>'LEGAL_REVIEW'))
   AND (w.kind='RECORD' OR w.kind='FLOW')
 GROUP BY w.domain,w.kind,w.status ORDER BY w.domain,w.kind,w.status`,[city.tenant_id,city.id,a.org_unit_id,a.position_code,PUBLIC_DOMAINS]);
 const counts=redactCounts(result.rows);
 return {mode:ROLLUP_VERSION,synthetic:true,isolated:true,independentlyVerified:false,verifiedPublicValue:false,autonomousDispatch:false,scope:{municipalityId:city.id,positionCode:a.position_code,orgUnitName:a.org_name||null},counts,asOf:new Date().toISOString(),coverage:'SYNTHETIC_WASTE_ONLY_NO_RESTRICTED_DOMAINS',note:'فقط آمار تجمیعی آزمایشگاه؛ بدون شواهد میدانی، داده‌های فردی، حقوقی یا تخلفات و بدون منفعت عمومی تأییدشده'};
}
