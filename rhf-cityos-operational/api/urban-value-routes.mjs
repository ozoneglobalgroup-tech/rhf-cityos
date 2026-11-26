import {ClientError,uuid,requiredString} from './domain.mjs';
import {canViewValue,canRecordValue,valueCaseInput,matchInput,assertIndependentReviewer,readinessGate,assertValidTransition} from './urban-value-core.mjs';
export const URBAN_VALUE_PARTS=['value-cases','value-capacity-matches','value-foundation-summary'];
export async function urbanValueRoute({part,method,resourceId,req,client,city,user,role,readBody,audit}){
 if(!canViewValue(role))throw new ClientError('دسترسی به پرونده ارزش برای نقش فعلی مجاز نیست',403);
 const q=(sql,args=[])=>client.query(sql,args);
 const write=()=>{if(!canRecordValue(role))throw new ClientError('اختیار ثبت فرصت ارزش وجود ندارد',403);};
 if(part==='value-foundation-summary'&&method==='GET'&&!resourceId){
  const a=(await q(`SELECT count(*)::int AS total,count(*) FILTER(WHERE status='REVIEWED')::int AS reviewed FROM urban_value_cases`)).rows[0];
  const b=(await q(`SELECT count(*)::int AS total,count(*) FILTER(WHERE status='FEASIBLE')::int AS feasible FROM urban_capacity_matches`)).rows[0];
  const c=(await q(`SELECT count(*)::int AS verified FROM public_value_outcomes o JOIN urban_value_cases v ON v.case_id=o.case_id WHERE o.status='VERIFIED'`)).rows[0];
  return {cases:a,matches:b,verified_outcomes:c.verified,notice:'گزارش ثبت و بررسی فرصت است، نه اثبات پیامد یا صرفه‌جویی. نتایج تأییدشده فقط از public_value_outcomes واقعی شمرده می‌شوند.'};
 }
 if(part==='value-cases'&&method==='GET'&&!resourceId){
  const rows=(await q(`SELECT v.*,c.summary AS service_case_title, maker.username AS creator_username,reviewer.username AS reviewer_username,
   (SELECT count(*)::int FROM urban_capacity_matches cm WHERE cm.value_case_id=v.id) AS match_count,
   (SELECT count(*)::int FROM public_value_outcomes o WHERE o.case_id=v.case_id AND o.status='VERIFIED') AS verified_outcome_count
   FROM urban_value_cases v JOIN service_cases c ON c.id=v.case_id
   JOIN users maker ON maker.id=v.created_by LEFT JOIN users reviewer ON reviewer.id=v.reviewed_by
   ORDER BY v.created_at DESC,v.id DESC LIMIT 150`)).rows;
  return {rows,limit:150,note:'فهرست حداکثر ۱۵۰ فرصت جدید؛ جمع مدیریتی مستقل محاسبه می‌شود.'};
 }
 if(part==='value-cases'&&method==='POST'&&!resourceId){
  write();const b=valueCaseInput(await readBody(req));
  if(!(await q('SELECT 1 FROM service_cases WHERE id=$1',[b.caseId])).rowCount)throw new ClientError('پرونده خدمت در شهرداری فعلی پیدا نشد',404);
  let row;
  try {row=(await q(`INSERT INTO urban_value_cases(tenant_id,municipality_id,case_id,title,public_need,beneficiaries,geography,barrier,authority_reference,baseline_method,comparator,value_dimension,created_by)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
   [city.tenant_id,city.id,b.caseId,b.title,b.publicNeed,b.beneficiaries,b.geography,b.barrier,b.authorityReference,b.baselineMethod,b.comparator,b.valueDimension,user.id])).rows[0];}
  catch(e){if(e.code==='23505')throw new ClientError('برای این پرونده قبلاً فرصت ارزش ثبت شده است',409);throw e;}
  await audit(client,city,user,'URBAN_VALUE_CASE',row.id,'DISCOVERY',{caseId:row.case_id,dimension:row.value_dimension});return row;
 }
 if(part==='value-cases'&&method==='PATCH'&&resourceId){
  const id=uuid(resourceId);const b=await readBody(req);
  if(b.action!=='REVIEW')throw new ClientError('اقدام ناشناخته است');
  const v=(await q('SELECT * FROM urban_value_cases WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!v)throw new ClientError('فرصت ارزش پیدا نشد',404);
  assertIndependentReviewer(user.id,v.created_by,role);assertValidTransition(v.status,'REVIEWED');
  const note=requiredString(b.reviewEvidence,'یادداشت بررسی و محدودیت اختیار',1600);
  const result=(await q(`UPDATE urban_value_cases SET status='REVIEWED',review_evidence=$2,reviewed_by=$3,reviewed_at=now(),updated_at=now() WHERE id=$1 RETURNING *`,[id,note,user.id])).rows[0];
  await audit(client,city,user,'URBAN_VALUE_CASE',id,'REVIEWED',{caseId:v.case_id});return result;
 }
 if(part==='value-capacity-matches'&&method==='GET'&&!resourceId){
  return {rows:(await q(`SELECT m.*,r.code AS resource_code,r.name_fa AS resource_name,r.unit,r.authorized AS resource_authorized,v.title AS value_title,
  creator.username AS creator_username, reviewer.username AS reviewer_username
  FROM urban_capacity_matches m JOIN urban_value_cases v ON v.id=m.value_case_id JOIN capacity_resources r ON r.id=m.resource_id
  JOIN users creator ON creator.id=m.created_by LEFT JOIN users reviewer ON reviewer.id=m.reviewed_by
  ORDER BY m.created_at DESC,m.id DESC LIMIT 150`)).rows,limit:150};
 }
 if(part==='value-capacity-matches'&&method==='POST'&&!resourceId){
  write();const b=matchInput(await readBody(req));
  const v=(await q('SELECT id FROM urban_value_cases WHERE id=$1',[b.valueCaseId])).rows[0];if(!v)throw new ClientError('فرصت ارزش در شهرداری جاری موجود نیست',404);
  const r=(await q('SELECT id FROM capacity_resources WHERE id=$1',[b.resourceId])).rows[0];if(!r)throw new ClientError('ظرفیت در شهرداری جاری موجود نیست',404);
  let row;
  try {row=(await q(`INSERT INTO urban_capacity_matches(tenant_id,municipality_id,value_case_id,resource_id,requested_quantity,purpose,created_by)
   VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[city.tenant_id,city.id,b.valueCaseId,b.resourceId,b.requestedQuantity,b.purpose,user.id])).rows[0];}
  catch(e){if(e.code==='23505')throw new ClientError('این منبع قبلاً برای همین فرصت پیشنهاد شده است',409);throw e;}
  await audit(client,city,user,'URBAN_CAPACITY_MATCH',row.id,'PROPOSE',{resourceId:b.resourceId,valueCaseId:b.valueCaseId});return row;
 }
 if(part==='value-capacity-matches'&&method==='PATCH'&&resourceId){
  const id=uuid(resourceId);const b=await readBody(req);if(!['FEASIBLE','REJECTED'].includes(b.action))throw new ClientError('تصمیم پیشنهادی نامعتبر است');
  const m=(await q('SELECT * FROM urban_capacity_matches WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!m)throw new ClientError('پیشنهاد تطبیق یافت نشد',404);
  if(m.status!=='PROPOSED')throw new ClientError('پیشنهاد قبلاً بررسی شده است',409);
  assertIndependentReviewer(user.id,m.created_by,role);
  const ev=requiredString(b.reviewEvidence,'مستند بررسی',1600);
  if(b.action==='FEASIBLE'){
   // Lock the resource row and re-read actual reservations. This does NOT reserve or allocate capacity.
   const r=(await q('SELECT * FROM capacity_resources WHERE id=$1 FOR UPDATE',[m.resource_id])).rows[0];
   if(!r)throw new ClientError('منبع ظرفیت دیگر موجود نیست',404);
   const used=(await q("SELECT COALESCE(sum(quantity),0) AS n FROM capacity_allocations WHERE resource_id=$1 AND status='RESERVED'",[m.resource_id])).rows[0].n;
   readinessGate(r,Number(m.requested_quantity),Number(used));
  }
  const result=(await q(`UPDATE urban_capacity_matches SET status=$2,review_evidence=$3,reviewed_by=$4,reviewed_at=now() WHERE id=$1 RETURNING *`,[id,b.action,ev,user.id])).rows[0];
  await audit(client,city,user,'URBAN_CAPACITY_MATCH',id,b.action,{resourceId:m.resource_id,quantity:m.requested_quantity,note:'Feasibility review only; no allocation made'});
  return result;
 }
 throw new ClientError('مسیر API یافت نشد',404);
}
