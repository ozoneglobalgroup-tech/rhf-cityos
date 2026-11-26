// v1.2.8: finance SoD evidence for the current RLS-scoped municipality only.
// No writes, payments, finance mutations, or global unscoped database reads.
import {ClientError} from './domain.mjs';
export const PILOT_AUDIT_ROLES=Object.freeze(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR']);
// LIMIT 101 permits honest disclosure of a 100-record presentation cap.
export const PILOT_AUDIT_SQL=Object.freeze({
 budgets:`SELECT b.id,b.code AS reference,b.title,b.status,b.amount_rial::text AS amount_rial,
    creator.username AS created_by,reviewer.username AS reviewed_by,
    b.created_by AS creator_id,b.approved_by AS reviewer_id,
    (b.status='APPROVED' AND b.approved_by IS NOT NULL AND b.approved_by<>b.created_by
       AND length(btrim(b.approval_evidence))>=5) AS valid_independent,
    b.created_at
   FROM city_finance_budgets b JOIN users creator ON creator.id=b.created_by
   LEFT JOIN users reviewer ON reviewer.id=b.approved_by
   ORDER BY b.created_at DESC,b.id DESC LIMIT 101`,
 contracts:`SELECT c.id,c.reference,c.title,c.status,c.ceiling_rial::text AS amount_rial,
    b.code AS budget_code,b.status AS budget_status,
    creator.username AS created_by,reviewer.username AS reviewed_by,
    c.created_by AS creator_id,c.activated_by AS reviewer_id,
    (c.status IN ('ACTIVE','CLOSED') AND b.status='APPROVED' AND c.activated_by IS NOT NULL
     AND c.activated_by<>c.created_by AND length(btrim(c.activation_evidence))>=5) AS valid_independent,
    c.created_at
   FROM city_service_contracts c JOIN city_finance_budgets b ON b.id=c.budget_id
   JOIN users creator ON creator.id=c.created_by LEFT JOIN users reviewer ON reviewer.id=c.activated_by
   ORDER BY c.created_at DESC,c.id DESC LIMIT 101`,
 statements:`SELECT s.id,s.reference,s.status,s.amount_rial::text AS amount_rial,
    c.reference AS contract_reference,w.case_id,
    creator.username AS created_by,reviewer.username AS reviewed_by,
    s.created_by AS creator_id,s.reviewed_by AS reviewer_id,
    (s.status='CERTIFIED' AND s.reviewed_by IS NOT NULL AND s.reviewed_by<>s.created_by
      AND length(btrim(s.review_note))>=5) AS valid_independent,
    s.created_at
   FROM city_payment_statements s JOIN city_service_contracts c ON c.id=s.contract_id
   JOIN city_work_orders w ON w.id=s.work_order_id
   JOIN users creator ON creator.id=s.created_by LEFT JOIN users reviewer ON reviewer.id=s.reviewed_by
   ORDER BY s.created_at DESC,s.id DESC LIMIT 101`,
 costs:`SELECT x.id,x.description AS title,x.status,x.amount_rial::text AS amount_rial,
    x.case_id,creator.username AS created_by,reviewer.username AS reviewed_by,
    x.created_by AS creator_id,x.reviewed_by AS reviewer_id,
    (x.status='APPROVED' AND x.reviewed_by IS NOT NULL AND x.reviewed_by<>x.created_by
      AND length(btrim(x.review_note))>=5) AS valid_independent,
    x.created_at
   FROM city_work_costs x JOIN users creator ON creator.id=x.created_by
   LEFT JOIN users reviewer ON reviewer.id=x.reviewed_by
   ORDER BY x.created_at DESC,x.id DESC LIMIT 101`
});
export function classifyEvidence(row){
 if(!row||typeof row!=='object')throw new TypeError('Invalid financial evidence row');
 if(row.valid_independent===true)return 'INDEPENDENT_CONFIRMED';
 if(row.valid_independent===false)return 'NOT_CONFIRMED';
 throw new TypeError('Invalid independent evidence flag');
}
export async function readPilotFinanceAudit({client,role}){
 if(!PILOT_AUDIT_ROLES.includes(role))throw new ClientError('مشاهده شواهد مالی فقط برای مدیران و حسابرس مجاز است',403);
 const keys=Object.keys(PILOT_AUDIT_SQL),lists={};
 // Execute within the caller's withScope transaction, using only the provided scoped client.
 for(const key of keys){
  const result=await client.query(PILOT_AUDIT_SQL[key]);
  if(!Array.isArray(result.rows))throw Error('Invalid scoped financial response');
  lists[key]={truncated:result.rows.length>100,limit:100,rows:result.rows.slice(0,100).map(r=>({...r,approval_check:classifyEvidence(r)}))};
 }
 return {scope:'selected-municipality',mode:'READ_ONLY',asOf:new Date().toISOString(),lists,
  limitation:'فهرست هر نوع سند حداکثر ۱۰۰ ردیف اخیر را نمایش می‌دهد و شمارنده کل شهرداری نیست.',
  caution:'گواهی صورت‌وضعیت پرداخت یا ثبت حسابداری نیست. نمایش یک شهرداری اثبات آزمون نفوذ یا جداسازی داده مالی با دو حساب نیست.'};
}
