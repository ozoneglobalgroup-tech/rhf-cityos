import {ClientError,uuid} from './domain.mjs';
import {TWIN_PARTS,ensureRead,ensureWrite,ensureIndependent,parseTwin,parseObservation,parseReview,assertEvidenceLength} from './twin-core.mjs';
export {TWIN_PARTS};
export async function twinRoute({part,method,resourceId,req,url,client,city,user,role,readBody,audit}){
 ensureRead(role);
 const q=(sql,values=[])=>client.query(sql,values);
 if(part==='twin-summary'&&method==='GET'&&!resourceId){
   const a=(await q('SELECT count(*)::int AS twins FROM city_digital_twins')).rows[0];
   const b=(await q("SELECT count(*)::int AS observations,count(*) FILTER(WHERE review_status='ACCEPTED')::int AS accepted FROM city_twin_observations")).rows[0];
   return {...a,...b,dataMode:'MANUAL',liveIoT:false,notice:'شواهد ثبت و بررسی‌شده هستند؛ تأیید داده به معنی تحقق ارزش یا پیش‌بینی معتبر نیست.'};
 }
 if(part==='digital-twins'&&method==='GET'&&!resourceId){
   const r=await q(`SELECT t.*,c.summary AS case_summary,
     (SELECT count(*)::int FROM city_twin_observations o WHERE o.twin_id=t.id) AS observation_count,
     (SELECT count(*)::int FROM city_twin_observations o WHERE o.twin_id=t.id AND o.review_status='ACCEPTED') AS accepted_count
      FROM city_digital_twins t JOIN service_cases c ON c.id=t.case_id AND c.tenant_id=t.tenant_id AND c.municipality_id=t.municipality_id
      ORDER BY t.created_at DESC,t.id DESC LIMIT 100`);
   return {rows:r.rows,limit:100,scope:city.id};
 }
 if(part==='digital-twins'&&method==='POST'&&!resourceId){
   ensureWrite(role);const b=parseTwin(await readBody(req));
   if(!(await q('SELECT 1 FROM service_cases WHERE id=$1',[b.caseId])).rowCount)throw new ClientError('پرونده مرتبط در شهرداری انتخابی پیدا نشد',404);
   let row;try{
    row=(await q(`INSERT INTO city_digital_twins(tenant_id,municipality_id,case_id,twin_type,name,source_reference,geographic_reference,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[city.tenant_id,city.id,b.caseId,b.twinType,b.name,b.sourceReference,b.geographicReference,user.id])).rows[0];
   }catch(e){if(e.code==='23505')throw new ClientError('این دوقلو برای پرونده قبلاً ثبت شده است',409);throw e;}
   await audit(client,city,user,'CITY_DIGITAL_TWIN',row.id,'REGISTER',{caseId:b.caseId,twinType:b.twinType,dataMode:'MANUAL'});
   return {twin:row,liveIoT:false};
 }
 if(part==='twin-observations'&&method==='GET'&&!resourceId){
   let filter='';const args=[];const twinId=url.searchParams.get('twinId');
   if(twinId){args.push(uuid(twinId,'شناسه دوقلو'));filter='WHERE o.twin_id=$1';}
   const r=await q(`SELECT o.*,t.name AS twin_name,t.case_id FROM city_twin_observations o JOIN city_digital_twins t ON t.id=o.twin_id AND t.tenant_id=o.tenant_id AND t.municipality_id=o.municipality_id ${filter}
     ORDER BY o.observed_at DESC,o.id DESC LIMIT 100`,args);
   return {rows:r.rows,limit:100,scope:city.id,notice:'مشاهدات ثبت‌شده و مرتبط با همین شهرداری؛ به معنی اتصال زنده حسگر نیست.'};
 }
 if(part==='twin-observations'&&method==='POST'&&!resourceId){
   ensureWrite(role);const b=parseObservation(await readBody(req));
   const exists=await q('SELECT 1 FROM city_digital_twins WHERE id=$1',[b.twinId]);if(!exists.rowCount)throw new ClientError('دوقلو در شهرداری جاری یافت نشد',404);
   let row;try{row=(await q(`INSERT INTO city_twin_observations(tenant_id,municipality_id,twin_id,metric_code,metric_label,unit,measured_value,observed_at,source_reference,note,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[city.tenant_id,city.id,b.twinId,b.metricCode,b.metricLabel,b.unit,b.value,b.observedAt,b.sourceReference,b.note,user.id])).rows[0];}
   catch(e){if(e.code==='23505')throw new ClientError('اندازه‌گیری همین شاخص و زمان قبلاً ثبت شده است',409);throw e;}
   await audit(client,city,user,'CITY_TWIN_OBSERVATION',row.id,'SUBMITTED',{twinId:b.twinId,metricCode:b.metricCode});
   return {observation:row,verifiedPublicValue:false};
 }
 if(part==='twin-observations'&&method==='PATCH'&&resourceId){
   const obsId=uuid(resourceId,'شناسه مشاهده');const b=parseReview(await readBody(req));assertEvidenceLength(b.note);
   const found=(await q('SELECT * FROM city_twin_observations WHERE id=$1 FOR UPDATE',[obsId])).rows[0];
   if(!found)throw new ClientError('مشاهده در همین شهرداری پیدا نشد',404);
   ensureIndependent(role,user.id,found.created_by);
   if(found.review_status!=='SUBMITTED')throw new ClientError('این مشاهده قبلاً بررسی شده است',409);
   const next=b.decision==='ACCEPT'?'ACCEPTED':'REJECTED';
   const row=(await q(`UPDATE city_twin_observations SET review_status=$2,review_note=$3,reviewed_by=$4,reviewed_at=now() WHERE id=$1 RETURNING *`,[obsId,next,b.note,user.id])).rows[0];
   await audit(client,city,user,'CITY_TWIN_OBSERVATION',obsId,next,{twinId:row.twin_id,scope:'PROVENANCE_REVIEW_NOT_VALUE_VERIFICATION'});
   return {observation:row,verifiedPublicValue:false,notice:'بررسی اصالت داده، ارزش عمومی یا رابطه علت و معلولی را اثبات نمی‌کند.'};
 }
 throw new ClientError('مسیر دوقلوی دیجیتال یافت نشد',404);
}
