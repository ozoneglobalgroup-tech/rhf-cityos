import {ClientError,uuid,requiredString,choice} from './domain.mjs';
import {COST_CATEGORIES,ORDER_TRANSITIONS,COST_TRANSITIONS,rialAmount,allowedTransition,canIndependentReview,FINANCIAL_REVIEW_ROLES} from './execution-core.mjs';
export const EXECUTION_PARTS=['contractors','work-orders','work-costs','execution-ledger'];
const invalid=(msg,status=400)=>{throw new ClientError(msg,status)};
const safeRial=v=>{try{return rialAmount(v)}catch(e){return invalid(e.message)}};
const text=(v,max=300)=>typeof v==='string'?v.trim().slice(0,max):'';
async function acceptedCase(q,caseId){
 const r=(await q('SELECT id,status,service_id,updated_at FROM service_cases WHERE id=$1',[caseId])).rows[0];
 if(!r||r.status!=='CLOSED')invalid('پرونده باید ابتدا مختومه و پذیرفته شود',409);
 if(r.service_id){const i=(await q("SELECT result FROM service_inspections WHERE case_id=$1 AND created_at>= $2 ORDER BY created_at DESC,id DESC LIMIT 1",[caseId,r.updated_at])).rows[0];
 // The closing transition already verified latest passing inspection. Its updated_at is AFTER that inspection,
 // therefore verify latest inspection overall, not after the close timestamp.
 const latest=(await q('SELECT result FROM service_inspections WHERE case_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1',[caseId])).rows[0];
 if(!latest||latest.result!=='PASS')invalid('آخرین بازرسی باید موفق باشد',409);
 }
 return r;
}
async function caseExists(q,caseId){const r=(await q('SELECT id,status,service_id FROM service_cases WHERE id=$1',[caseId])).rows[0];if(!r)invalid('پرونده در این شهرداری یافت نشد',404);return r;}
async function coherentOrder(q,orderId,caseId){if(!orderId)return null;let o=(await q('SELECT id,case_id,status,ceiling_rial FROM city_work_orders WHERE id=$1',[orderId])).rows[0];if(!o||o.case_id!==caseId)invalid('دستورکار متعلق به این پرونده نیست',400);return o;}
export async function executionRoute({part,method,resourceId,req,url,client,city,user,role,readBody,audit}){
 const q=(s,args=[])=>client.query(s,args);
 const write=()=>{if(!['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','OPERATOR'].includes(role))invalid('اختیار ایجاد ندارید',403)};
 const manage=()=>{if(!['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR'].includes(role))invalid('اختیار مدیریت ندارید',403)};
 if(part==='contractors'){
  if(method==='GET')return (await q('SELECT id,code,name_fa,active,created_at FROM city_contractors ORDER BY name_fa LIMIT 500')).rows;
  if(method==='POST'){
   manage();const b=await readBody(req);const code=requiredString(b.code,'کد پیمانکار',60).toUpperCase(),name=requiredString(b.name,'نام پیمانکار',180);
   if(!/^[A-Z0-9_-]{3,60}$/.test(code)||name.length<2)invalid('نام یا کد پیمانکار نامعتبر است');
   const row=(await q('INSERT INTO city_contractors(tenant_id,municipality_id,code,name_fa,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id,code,name_fa,active',[city.tenant_id,city.id,code,name,user.id])).rows[0];
   await audit(client,city,user,'CONTRACTOR',row.id,'CREATE',{code});return row;
  }
 }
 if(part==='work-orders'){
  if(method==='GET')return (await q(`SELECT w.*,c.summary AS case_summary,ct.name_fa AS contractor_name,m.title AS mission_title
   FROM city_work_orders w JOIN service_cases c ON c.id=w.case_id
   LEFT JOIN city_contractors ct ON ct.id=w.contractor_id
   LEFT JOIN missions m ON m.id=w.mission_id
   ORDER BY w.created_at DESC LIMIT 300`)).rows;
  if(method==='POST'){
   write();const b=await readBody(req);const caseId=uuid(b.caseId,'پرونده'),requestKey=uuid(b.requestKey,'شناسه تکرارناپذیر');
   const prior=(await q('SELECT * FROM city_work_orders WHERE request_key=$1',[requestKey])).rows[0];if(prior){if(prior.created_by!==user.id||prior.case_id!==caseId||prior.title!==b.title||prior.reference!==(text(b.reference,200))||prior.contractor_id!==(b.contractorId||null)||prior.mission_id!==(b.missionId||null)||String(prior.ceiling_rial)!==String(safeRial(b.ceilingRial||0)))invalid('شناسه درخواست با اطلاعات متفاوت تکرار شده است',409);return prior;}
   const cs=await caseExists(q,caseId);if(['CLOSED','REJECTED'].includes(cs.status))invalid('برای پرونده مختومه دستورکار جدید صادر نمی‌شود',409);
   const missionId=b.missionId?uuid(b.missionId,'مأموریت'):null;
   if(missionId){let m=(await q('SELECT case_id FROM missions WHERE id=$1',[missionId])).rows[0];if(!m||m.case_id!==caseId)invalid('مأموریت متعلق به این پرونده نیست',400)}
   const contractorId=b.contractorId?uuid(b.contractorId,'پیمانکار'):null;
   if(contractorId){let ct=(await q('SELECT id FROM city_contractors WHERE id=$1 AND active',[contractorId])).rows[0];if(!ct)invalid('پیمانکار در این شهرداری فعال نیست',400)}
   const title=requiredString(b.title,'عنوان دستورکار',240),reference=text(b.reference,200),description=text(b.description,1500),ceiling=safeRial(b.ceilingRial||0);
   if(title.length<3)invalid('عنوان کوتاه است');
   const row=(await q(`INSERT INTO city_work_orders(tenant_id,municipality_id,case_id,mission_id,contractor_id,request_key,title,reference,description,ceiling_rial,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[city.tenant_id,city.id,caseId,missionId,contractorId,requestKey,title,reference,description,ceiling,user.id])).rows[0];
   await audit(client,city,user,'WORK_ORDER',row.id,'CREATE',{caseId,missionId,contractorId,ceiling});return row;
  }
  if(method==='PATCH'&&resourceId){write();const id=uuid(resourceId),b=await readBody(req),to=choice(b.status,Object.keys(ORDER_TRANSITIONS),'وضعیت');
   let row=(await q('SELECT * FROM city_work_orders WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!row)invalid('دستورکار یافت نشد',404);
   if(!allowedTransition(ORDER_TRANSITIONS,row.status,to))invalid('انتقال وضعیت دستورکار مجاز نیست',409);
   let delivery=row.delivery_evidence,acceptance=row.acceptance_evidence,reviewer=null;
   if(to==='ISSUED'){if(!row.reference.trim())invalid('برای صدور دستورکار، شماره مرجع لازم است',409);const c=await caseExists(q,row.case_id);if(['CLOSED','REJECTED'].includes(c.status))invalid('برای پرونده بسته یا ردشده دستورکار صادر نمی‌شود',409);}
   if(to==='DELIVERED'){delivery=requiredString(b.evidence,'شواهد تحویل',2000);if(row.mission_id){const mission=(await q('SELECT status FROM missions WHERE id=$1',[row.mission_id])).rows[0];if(mission?.status!=='DONE')invalid('مأموریت مرتبط باید ابتدا تکمیل شود',409)}}
   if(to==='ACCEPTED'){manage();if(!canIndependentReview(role,user.id,row.created_by))invalid('تأییدکننده باید متفاوت از ایجادکننده باشد',403);
    await acceptedCase(q,row.case_id);acceptance=requiredString(b.evidence,'مستند پذیرش',2000);reviewer=user.id;}
   const updated=(await q('UPDATE city_work_orders SET status=$2,delivery_evidence=$3,acceptance_evidence=$4,accepted_by=COALESCE($5,accepted_by),accepted_at=CASE WHEN $2=$6 THEN now() ELSE accepted_at END,updated_at=now() WHERE id=$1 RETURNING *',[id,to,delivery,acceptance,reviewer,'ACCEPTED'])).rows[0];
   await audit(client,city,user,'WORK_ORDER',id,to,{from:row.status});return updated;
  }
 }
 if(part==='work-costs'){
  if(method==='GET')return (await q(`SELECT x.*,c.summary AS case_summary,w.title AS order_title FROM city_work_costs x
    JOIN service_cases c ON c.id=x.case_id LEFT JOIN city_work_orders w ON w.id=x.work_order_id
    ORDER BY x.created_at DESC LIMIT 300`)).rows;
  if(method==='POST'){
   write();const b=await readBody(req),caseId=uuid(b.caseId,'پرونده'),requestKey=uuid(b.requestKey,'شناسه تکرارناپذیر');
   const prior=(await q('SELECT * FROM city_work_costs WHERE request_key=$1',[requestKey])).rows[0];if(prior){if(prior.created_by!==user.id||prior.case_id!==caseId||prior.work_order_id!==(b.workOrderId||null)||prior.category!==b.category||prior.description!==b.description||String(prior.amount_rial)!==String(safeRial(b.amountRial)))invalid('شناسه درخواست با هزینه متفاوت تکرار شده است',409);return prior;}
   await caseExists(q,caseId);
   const workOrderId=b.workOrderId?uuid(b.workOrderId,'دستورکار'):null;
   await coherentOrder(q,workOrderId,caseId);
   const category=choice(b.category,COST_CATEGORIES,'نوع هزینه'),description=requiredString(b.description,'شرح هزینه',300),amount=safeRial(b.amountRial);
   if(description.length<3||amount===0)invalid('شرح یا مبلغ نامعتبر است');
   const row=(await q(`INSERT INTO city_work_costs(tenant_id,municipality_id,case_id,work_order_id,category,description,amount_rial,request_key,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[city.tenant_id,city.id,caseId,workOrderId,category,description,amount,requestKey,user.id])).rows[0];
   await audit(client,city,user,'WORK_COST',row.id,'CREATE',{caseId,amountRial:amount,category});return row;
  }
  if(method==='PATCH'&&resourceId){write();const id=uuid(resourceId),b=await readBody(req),to=choice(b.status,Object.keys(COST_TRANSITIONS),'وضعیت');
   let row=(await q('SELECT * FROM city_work_costs WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!row)invalid('هزینه یافت نشد',404);
   if(!allowedTransition(COST_TRANSITIONS,row.status,to))invalid('انتقال وضعیت هزینه مجاز نیست',409);
   let evidence=row.evidence,reviewer=null,note=row.review_note;
   if(to==='SUBMITTED'){if(row.created_by!==user.id&&!FINANCIAL_REVIEW_ROLES.includes(role))invalid('ثبت‌کننده یا مدیر مجاز است',403);evidence=requiredString(b.evidence,'مستند هزینه',2000);}
   if(['APPROVED','REJECTED'].includes(to)){manage();if(!canIndependentReview(role,user.id,row.created_by))invalid('بازبین نمی‌تواند ثبت‌کننده هزینه باشد',403);
    note=requiredString(b.reviewNote,'یادداشت بازبینی',1000);reviewer=user.id;
    if(to==='APPROVED'){
     await acceptedCase(q,row.case_id);
     if(row.work_order_id){const w=await coherentOrder(q,row.work_order_id,row.case_id);if(w.status!=='ACCEPTED')invalid('دستورکار مرتبط باید پذیرفته شده باشد',409);
      await q('SELECT id FROM city_work_orders WHERE id=$1 FOR UPDATE',[row.work_order_id]);
      const totals=(await q("SELECT COALESCE(sum(amount_rial),0)::text AS n FROM city_work_costs WHERE work_order_id=$1 AND status='APPROVED'",[row.work_order_id])).rows[0];
      if(BigInt(totals.n)+BigInt(row.amount_rial)>BigInt(w.ceiling_rial))invalid('سقف مجاز دستورکار کافی نیست',409);
     }
    }
   }
   const updated=(await q('UPDATE city_work_costs SET status=$2,evidence=$3,reviewed_by=COALESCE($4,reviewed_by),review_note=$5,reviewed_at=CASE WHEN $2 IN ($6,$7) THEN now() ELSE reviewed_at END,updated_at=now() WHERE id=$1 RETURNING *',[id,to,evidence,reviewer,note,'APPROVED','REJECTED'])).rows[0];
   await audit(client,city,user,'WORK_COST',id,to,{from:row.status,amountRial:row.amount_rial});return updated;
  }
 }
 if(part==='execution-ledger'&&method==='GET'){
  const cid=url.searchParams.get('caseId');
  if(!cid){const counts=(await q(`SELECT status,count(*)::int AS count,coalesce(sum(amount_rial),0)::text AS rial FROM city_work_costs GROUP BY status`)).rows;
   const orders=(await q('SELECT status,count(*)::int AS count FROM city_work_orders GROUP BY status')).rows;
   return {costs:counts,orders,scope:'selected-municipality',currency:'IRR',note:'Approved means reviewed operational cost, not payment nor verified public value'};}
  uuid(cid,'پرونده');const c=(await q('SELECT c.*,s.name_fa AS service_name FROM service_cases c LEFT JOIN service_definitions s ON s.id=c.service_id WHERE c.id=$1',[cid])).rows[0];
  if(!c)invalid('پرونده در این شهرداری یافت نشد',404);
  const [missions,inspections,allocations,orders,costs]=await Promise.all([
   q('SELECT id,title,status,evidence FROM missions WHERE case_id=$1 ORDER BY created_at',[cid]),
   q('SELECT id,result,evidence,created_at FROM service_inspections WHERE case_id=$1 ORDER BY created_at DESC',[cid]),
   q(`SELECT a.id,a.quantity,a.status,r.name_fa AS resource_name,r.unit FROM capacity_allocations a JOIN capacity_resources r ON r.id=a.resource_id WHERE a.case_id=$1 ORDER BY a.created_at DESC`,[cid]),
   q(`SELECT w.*,ct.name_fa AS contractor_name FROM city_work_orders w LEFT JOIN city_contractors ct ON ct.id=w.contractor_id WHERE w.case_id=$1 ORDER BY w.created_at DESC`,[cid]),
   q('SELECT * FROM city_work_costs WHERE case_id=$1 ORDER BY created_at DESC',[cid])]);
  return {case:c,missions:missions.rows,inspections:inspections.rows,allocations:allocations.rows,orders:orders.rows,costs:costs.rows,currency:'IRR',scope:'selected-municipality'};
 }
 invalid('مسیر یا روش نامعتبر است',404);
}
