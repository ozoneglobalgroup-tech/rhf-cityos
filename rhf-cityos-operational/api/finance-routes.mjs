import {ClientError,uuid,requiredString} from './domain.mjs';
import {FINANCE_READ_ROLES,FINANCE_WRITE_ROLES,BUDGET_STATUS,CONTRACT_STATUS,STATEMENT_STATUS,exactRial,validTransition,independent,withinLimit,statementSum,uniqueCostIds} from './finance-core.mjs';
export const FINANCE_PARTS=['finance-summary','finance-budgets','finance-contracts','finance-orders','finance-eligible','finance-statements'];
const bad=(message,status=400)=>{throw new ClientError(message,status)};
const trimmed=(v,max=500)=>typeof v==='string'?v.trim().slice(0,max):'';
const strict=(v,name,max=220,min=3)=>{const s=requiredString(v,name,max);if(s.length<min)bad(`${name} کوتاه است`);return s;};
const rial=v=>{try{return exactRial(v)}catch(e){return bad(e.message)}};
const askIds=v=>{try{return uniqueCostIds(v)}catch(e){return bad(e.message)}};
const sum=v=>{try{return statementSum(v)}catch(e){return bad(e.message)}};
const date=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)bad('تاریخ میلادی نامعتبر است');return v};
const checkCode=v=>{let code=strict(v,'کد',60).toUpperCase();if(!/^[A-Z0-9_-]{3,60}$/.test(code))bad('کد باید لاتین و یکتا باشد');return code};
const refUuid=(x,label)=>uuid(x,label);
export async function financeRoute({part,method,resourceId,req,url,client,city,user,role,readBody,audit}){
 const q=(sql,args=[])=>client.query(sql,args);
 if(!FINANCE_READ_ROLES.includes(role))bad('مشاهده اطلاعات مالی فقط برای مدیران و حسابرس مجاز است',403);
 const write=()=>{if(!FINANCE_WRITE_ROLES.includes(role))bad('اختیار ثبت یا تأیید امور مالی وجود ندارد',403)};
 const independentReview=created=>{write();if(!independent(role,user.id,created))bad('بازبین مستقل باید شخص دیگری باشد',403)};
 const upd=(rows,what)=>{if(!rows.length)bad(`${what} یافت نشد`,404);return rows[0]};
 if(part==='finance-summary'&&method==='GET'){
  const [bs,cs,os,ss]=await Promise.all([
   q("SELECT status,count(*)::int AS count,COALESCE(sum(amount_rial),0)::text AS rial FROM city_finance_budgets GROUP BY status"),
   q("SELECT status,count(*)::int AS count,COALESCE(sum(ceiling_rial),0)::text AS rial FROM city_service_contracts GROUP BY status"),
   q('SELECT count(*)::int AS count FROM city_contract_order_links'),
   q("SELECT status,count(*)::int AS count,COALESCE(sum(amount_rial),0)::text AS rial FROM city_payment_statements GROUP BY status")]);
  return {budgets:bs.rows,contracts:cs.rows,linkedOrders:os.rows[0]?.count||0,statements:ss.rows,currency:'IRR',scope:'selected-municipality',caution:'Certified is an approved operational statement, NOT a payment, tax invoice, accounting posting or verified public value'};
 }
 if(part==='finance-budgets'){
  if(method==='GET')return (await q(`SELECT b.*,u.display_name AS created_by_name,COALESCE(c.committed_rial,'0') AS committed_rial FROM city_finance_budgets b
    JOIN users u ON u.id=b.created_by LEFT JOIN LATERAL (
      SELECT COALESCE(sum(ceiling_rial),0)::text AS committed_rial FROM city_service_contracts
      WHERE budget_id=b.id AND status IN ('ACTIVE','CLOSED')) c ON true ORDER BY b.created_at DESC LIMIT 500`)).rows;
  if(method==='POST'){
   write();const b=await readBody(req),code=checkCode(b.code),title=strict(b.title,'عنوان بودجه',200),period=strict(b.fiscalPeriod,'دوره مالی',40,4),reference=strict(b.appropriationReference,'شماره مصوبه بودجه',200),amount=rial(b.amountRial);
   const row=upd((await q(`INSERT INTO city_finance_budgets(tenant_id,municipality_id,code,title,fiscal_period,appropriation_reference,amount_rial,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[city.tenant_id,city.id,code,title,period,reference,amount,user.id])).rows,'بودجه');
   await audit(client,city,user,'FINANCE_BUDGET',row.id,'CREATE',{code,amountRial:amount});return row;
  }
  if(method==='PATCH'&&resourceId){const id=refUuid(resourceId,'بودجه'),b=await readBody(req);if(b.status!=='APPROVED')bad('فقط تصویب بودجه در این نسخه مجاز است');
   const row=upd((await q('SELECT * FROM city_finance_budgets WHERE id=$1 FOR UPDATE',[id])).rows,'بودجه');
   if(!validTransition(BUDGET_STATUS,row.status,b.status))bad('وضعیت بودجه قابل تغییر نیست',409);independentReview(row.created_by);
   const evidence=strict(b.evidence,'مستند تصویب بودجه',2000,5);
   const out=upd((await q("UPDATE city_finance_budgets SET status='APPROVED',approval_evidence=$2,approved_by=$3,approved_at=now() WHERE id=$1 RETURNING *",[id,evidence,user.id])).rows,'بودجه');
   await audit(client,city,user,'FINANCE_BUDGET',id,'APPROVED',{evidence});return out;
  }
 }
 if(part==='finance-contracts'){
  if(method==='GET')return (await q(`SELECT c.*,ct.name_fa AS contractor_name,b.title AS budget_title,
   COALESCE(l.total_rial,'0') AS linked_ceiling_rial,COALESCE(s.certified_rial,'0') AS certified_rial
   FROM city_service_contracts c JOIN city_contractors ct ON ct.id=c.contractor_id JOIN city_finance_budgets b ON b.id=c.budget_id
   LEFT JOIN LATERAL (SELECT COALESCE(sum(w.ceiling_rial),0)::text total_rial FROM city_contract_order_links k JOIN city_work_orders w ON w.id=k.work_order_id WHERE k.contract_id=c.id) l ON true
   LEFT JOIN LATERAL (SELECT COALESCE(sum(amount_rial),0)::text certified_rial FROM city_payment_statements WHERE contract_id=c.id AND status='CERTIFIED') s ON true
   ORDER BY c.created_at DESC LIMIT 500`)).rows;
  if(method==='POST'){
   write();let b=await readBody(req),budgetId=refUuid(b.budgetId,'ردیف بودجه'),contractorId=refUuid(b.contractorId,'پیمانکار'),reference=strict(b.reference,'شماره قرارداد',100),title=strict(b.title,'عنوان قرارداد',240),amount=rial(b.ceilingRial),start=date(b.startDate),end=date(b.endDate);
   if(end<start)bad('تاریخ پایان قبل از شروع است');
   const bd=(await q('SELECT id FROM city_finance_budgets WHERE id=$1',[budgetId])).rows[0];if(!bd)bad('بودجه متعلق به شهرداری انتخاب‌شده نیست',404);
   const ct=(await q('SELECT id FROM city_contractors WHERE id=$1 AND active',[contractorId])).rows[0];if(!ct)bad('پیمانکار فعال متعلق به شهرداری یافت نشد',404);
   const row=upd((await q(`INSERT INTO city_service_contracts(tenant_id,municipality_id,budget_id,contractor_id,reference,title,ceiling_rial,start_date,end_date,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[city.tenant_id,city.id,budgetId,contractorId,reference,title,amount,start,end,user.id])).rows,'قرارداد');
   await audit(client,city,user,'CITY_CONTRACT',row.id,'CREATE',{reference,amountRial:amount,budgetId});return row;
  }
  if(method==='PATCH'&&resourceId){const id=refUuid(resourceId,'قرارداد'),b=await readBody(req);
   if(!['ACTIVE','CLOSED'].includes(b.status))bad('وضعیت قرارداد نامعتبر است');
   const row=upd((await q('SELECT * FROM city_service_contracts WHERE id=$1 FOR UPDATE',[id])).rows,'قرارداد');
   if(!validTransition(CONTRACT_STATUS,row.status,b.status))bad('انتقال وضعیت قرارداد مجاز نیست',409);
   if(b.status==='ACTIVE'){
    independentReview(row.created_by);const evidence=strict(b.evidence,'شماره یا مرجع مستند قرارداد امضاشده',2000,5);
    const budget=upd((await q('SELECT * FROM city_finance_budgets WHERE id=$1 FOR UPDATE',[row.budget_id])).rows,'بودجه قرارداد');
    if(budget.status!=='APPROVED')bad('ابتدا بودجه باید توسط بازبین مستقل تصویب شود',409);
    const sumActive=(await q("SELECT COALESCE(sum(ceiling_rial),0)::text n FROM city_service_contracts WHERE budget_id=$1 AND status IN ('ACTIVE','CLOSED')",[budget.id])).rows[0].n;
    if(!withinLimit(sumActive,row.ceiling_rial,budget.amount_rial))bad('تعهد قرارداد از سقف بودجه مصوب بیشتر است',409);
    const out=upd((await q("UPDATE city_service_contracts SET status='ACTIVE',activation_evidence=$2,activated_by=$3,activated_at=now() WHERE id=$1 RETURNING *",[id,evidence,user.id])).rows,'قرارداد');
    await audit(client,city,user,'CITY_CONTRACT',id,'ACTIVE',{evidence,budgetId:row.budget_id});return out;
   }
   write();const pending=(await q("SELECT count(*)::int n FROM city_payment_statements WHERE contract_id=$1 AND status IN ('DRAFT','SUBMITTED','REJECTED')",[id])).rows[0].n;
   if(pending)bad('تا تعیین تکلیف صورت‌وضعیت‌های باز، قرارداد بسته نمی‌شود',409);
   const out=upd((await q("UPDATE city_service_contracts SET status='CLOSED' WHERE id=$1 RETURNING *",[id])).rows,'قرارداد');
   await audit(client,city,user,'CITY_CONTRACT',id,'CLOSED');return out;
  }
 }
 if(part==='finance-orders'){
  if(method==='GET')return (await q(`SELECT w.id,w.case_id,w.title,w.reference,w.status,w.ceiling_rial,ct.name_fa contractor_name,
    k.contract_id,c.reference contract_reference FROM city_work_orders w
    LEFT JOIN city_contractors ct ON ct.id=w.contractor_id
    LEFT JOIN city_contract_order_links k ON k.work_order_id=w.id
    LEFT JOIN city_service_contracts c ON c.id=k.contract_id
    ORDER BY w.created_at DESC LIMIT 500`)).rows;
  if(method==='POST'){
   write();const b=await readBody(req),contractId=refUuid(b.contractId,'قرارداد'),orderId=refUuid(b.workOrderId,'دستورکار');
   const contract=upd((await q('SELECT * FROM city_service_contracts WHERE id=$1 FOR UPDATE',[contractId])).rows,'قرارداد');
   if(contract.status!=='ACTIVE')bad('قرارداد باید فعال باشد',409);
   const order=upd((await q('SELECT * FROM city_work_orders WHERE id=$1 FOR UPDATE',[orderId])).rows,'دستورکار');
   if(!['ISSUED','DELIVERED','ACCEPTED'].includes(order.status))bad('دستورکار باید صادر شده باشد',409);
   if(order.contractor_id!==contract.contractor_id)bad('پیمانکار دستورکار و قرارداد یکسان نیست',409);
   const existing=(await q('SELECT contract_id FROM city_contract_order_links WHERE work_order_id=$1',[orderId])).rows[0];
   if(existing){if(existing.contract_id===contractId)return {alreadyLinked:true,contractId,workOrderId:orderId};bad('این دستورکار به قرارداد دیگری متصل است',409)}
   const committed=(await q('SELECT COALESCE(sum(w.ceiling_rial),0)::text n FROM city_contract_order_links k JOIN city_work_orders w ON w.id=k.work_order_id WHERE k.contract_id=$1',[contractId])).rows[0].n;
   if(!withinLimit(committed,order.ceiling_rial,contract.ceiling_rial))bad('جمع سقف دستورکارها از سقف قرارداد بیشتر می‌شود',409);
   const row=upd((await q(`INSERT INTO city_contract_order_links(tenant_id,municipality_id,contract_id,work_order_id,created_by)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,[city.tenant_id,city.id,contractId,orderId,user.id])).rows,'پیوند دستورکار');
   await audit(client,city,user,'CONTRACT_ORDER',row.id,'LINK',{contractId,orderId});return row;
  }
 }
 if(part==='finance-eligible'&&method==='GET'){
  const contractId=url.searchParams.get('contractId');if(!contractId)return [];
  refUuid(contractId,'قرارداد');
  return (await q(`SELECT cost.id,cost.work_order_id,cost.case_id,cost.description,cost.amount_rial,w.title AS order_title
   FROM city_work_costs cost JOIN city_work_orders w ON w.id=cost.work_order_id
   JOIN city_contract_order_links k ON k.work_order_id=w.id
   LEFT JOIN city_statement_cost_lines l ON l.cost_id=cost.id
   WHERE k.contract_id=$1 AND w.status='ACCEPTED' AND cost.status='APPROVED' AND l.id IS NULL
   ORDER BY w.created_at DESC,cost.created_at DESC LIMIT 500`,[contractId])).rows;
 }
 if(part==='finance-statements'){
  if(method==='GET')return (await q(`SELECT s.*,c.reference AS contract_reference,w.title AS order_title,
    (SELECT count(*)::int FROM city_statement_cost_lines l WHERE l.statement_id=s.id) AS line_count
    FROM city_payment_statements s JOIN city_service_contracts c ON c.id=s.contract_id
    JOIN city_work_orders w ON w.id=s.work_order_id ORDER BY s.created_at DESC LIMIT 500`)).rows;
  if(method==='POST'){
   write();const b=await readBody(req),requestKey=refUuid(b.requestKey,'شناسه درخواست'),contractId=refUuid(b.contractId,'قرارداد'),reference=strict(b.reference,'شماره صورت‌وضعیت',140),costIds=askIds(b.costIds);
   const existing=(await q('SELECT * FROM city_payment_statements WHERE request_key=$1',[requestKey])).rows[0];
   if(existing){
    if(existing.created_by!==user.id||existing.contract_id!==contractId||existing.reference!==reference)bad('شناسه درخواست با مشخصات متفاوت تکرار شده است',409);
    const original=(await q('SELECT cost_id FROM city_statement_cost_lines WHERE statement_id=$1 ORDER BY cost_id',[existing.id])).rows.map(x=>x.cost_id);
    if(JSON.stringify(original)!==JSON.stringify(costIds))bad('این شناسه درخواست پیش‌تر با هزینه‌های دیگری ثبت شده است',409);
    return existing;
   }
   const contract=upd((await q('SELECT * FROM city_service_contracts WHERE id=$1 FOR UPDATE',[contractId])).rows,'قرارداد');
   if(contract.status!=='ACTIVE')bad('قرارداد فعال نیست',409);
   const rows=(await q(`SELECT cost.id,cost.amount_rial,cost.status,cost.work_order_id
    FROM city_work_costs cost JOIN city_contract_order_links k ON k.work_order_id=cost.work_order_id
    WHERE cost.id=ANY($1::uuid[]) AND k.contract_id=$2 ORDER BY cost.id FOR UPDATE OF cost`,[costIds,contractId])).rows;
   if(rows.length!==costIds.length||rows.some(x=>x.status!=='APPROVED'))bad('هزینه انتخاب‌شده تأییدشده یا متعلق به این قرارداد نیست',409);
   const orderIds=[...new Set(rows.map(x=>x.work_order_id))];
   if(orderIds.length!==1)bad('هر صورت‌وضعیت در این نسخه باید مربوط به یک دستورکار باشد',400);
   const orderId=orderIds[0];const order=upd((await q('SELECT id,status FROM city_work_orders WHERE id=$1 FOR UPDATE',[orderId])).rows,'دستورکار');
   if(order.status!=='ACCEPTED')bad('دستورکار باید ابتدا پذیرفته شود',409);
   const already=(await q('SELECT cost_id FROM city_statement_cost_lines WHERE cost_id=ANY($1::uuid[])',[costIds])).rows;
   if(already.length)bad('یک یا چند هزینه قبلاً در صورت‌وضعیت دیگری ثبت شده‌اند',409);
   const amount=sum(rows);
   if(!withinLimit('0',amount,contract.ceiling_rial))bad('مبلغ صورت‌وضعیت از سقف قرارداد بیشتر است',409);
   const out=upd((await q(`INSERT INTO city_payment_statements(tenant_id,municipality_id,contract_id,work_order_id,request_key,reference,amount_rial,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[city.tenant_id,city.id,contractId,orderId,requestKey,reference,amount,user.id])).rows,'صورت‌وضعیت');
   for(const row of rows){await q(`INSERT INTO city_statement_cost_lines(tenant_id,municipality_id,statement_id,cost_id,amount_rial)
     VALUES($1,$2,$3,$4,$5)`,[city.tenant_id,city.id,out.id,row.id,row.amount_rial]);}
   await audit(client,city,user,'PAYMENT_STATEMENT',out.id,'CREATE',{contractId,orderId,costCount:rows.length,amountRial:amount});return out;
  }
  if(method==='PATCH'&&resourceId){const id=refUuid(resourceId,'صورت‌وضعیت'),b=await readBody(req);write();
   if(!['SUBMITTED','CERTIFIED','REJECTED'].includes(b.status))bad('وضعیت صورت‌وضعیت نامعتبر است');
   const row=upd((await q('SELECT * FROM city_payment_statements WHERE id=$1 FOR UPDATE',[id])).rows,'صورت‌وضعیت');
   if(!validTransition(STATEMENT_STATUS,row.status,b.status))bad('انتقال صورت‌وضعیت مجاز نیست',409);
   if(b.status==='SUBMITTED'){
    if(row.created_by!==user.id)bad('ارسال صورت‌وضعیت صرفاً با ثبت‌کننده است',403);
    const evidence=strict(b.evidence,'شماره صورت‌وضعیت و مستندات',2000,5);
    const updated=upd((await q("UPDATE city_payment_statements SET status='SUBMITTED',evidence=$2,reviewed_by=NULL,review_note='',reviewed_at=NULL,updated_at=now() WHERE id=$1 RETURNING *",[id,evidence])).rows,'صورت‌وضعیت');
    await audit(client,city,user,'PAYMENT_STATEMENT',id,'SUBMITTED',{from:row.status});return updated;
   }
   independentReview(row.created_by);const note=strict(b.reviewNote,'یادداشت بازبینی',1000,5);
   if(b.status==='CERTIFIED'){
    const contract=upd((await q('SELECT * FROM city_service_contracts WHERE id=$1 FOR UPDATE',[row.contract_id])).rows,'قرارداد');
    if(contract.status!=='ACTIVE')bad('قرارداد فعال نیست',409);
    const order=upd((await q('SELECT * FROM city_work_orders WHERE id=$1 FOR UPDATE',[row.work_order_id])).rows,'دستورکار');
    if(order.status!=='ACCEPTED')bad('دستورکار پذیرفته نشده است',409);
    const lines=(await q(`SELECT l.amount_rial,c.status,c.work_order_id FROM city_statement_cost_lines l
      JOIN city_work_costs c ON c.id=l.cost_id WHERE l.statement_id=$1`,[id])).rows;
    if(!lines.length||lines.some(l=>l.status!=='APPROVED'||l.work_order_id!==row.work_order_id)||sum(lines)!==String(row.amount_rial))bad('ردیف‌های هزینه با صورت‌وضعیت یا تأیید عملیات مطابقت ندارند',409);
    const certified=(await q("SELECT COALESCE(sum(amount_rial),0)::text n FROM city_payment_statements WHERE contract_id=$1 AND status='CERTIFIED'",[contract.id])).rows[0].n;
    if(!withinLimit(certified,row.amount_rial,contract.ceiling_rial))bad('تأیید صورت‌وضعیت از سقف قرارداد عبور می‌کند',409);
   }
   const result=upd((await q('UPDATE city_payment_statements SET status=$2,review_note=$3,reviewed_by=$4,reviewed_at=now(),updated_at=now() WHERE id=$1 RETURNING *',[id,b.status,note,user.id])).rows,'صورت‌وضعیت');
   await audit(client,city,user,'PAYMENT_STATEMENT',id,b.status,{amountRial:row.amount_rial,reviewNote:note});return result;
  }
 }
 bad('مسیر مالی یا روش درخواست نامعتبر است',404);
}
