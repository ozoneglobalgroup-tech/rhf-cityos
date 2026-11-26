// V1.2.6: scoped read-only case-to-value operational trace. No synthetic outcomes and no finance payments.
import {ClientError} from './domain.mjs';
import {ACCEPTANCE_ROLES,normalizeTrace,traceSummary} from './acceptance-trace-core.mjs';
import {pilotSummary,nextPilotAction} from './pilot-actions-core.mjs';

// All tables referenced below are protected by city/tenant scoped FORCE RLS.
// The correlated checks deliberately require the same case/order/cost/contract chain.
export const TRACE_SQL = `
WITH facts AS MATERIALIZED (
 SELECT c.id,c.summary,c.status,c.created_at,c.due_at,
        COALESCE(s.name_fa,'') AS service_name,
        (c.service_id IS NOT NULL AND s.id IS NOT NULL) AS service_linked,
        EXISTS(SELECT 1 FROM missions m WHERE m.case_id=c.id AND m.status IN ('ACTIVE','DONE')) AS mission_started,
        EXISTS(SELECT 1 FROM missions m WHERE m.case_id=c.id AND m.status='DONE') AS mission_done,
        EXISTS(SELECT 1 FROM city_work_orders w WHERE w.case_id=c.id AND w.status='DRAFT') AS order_draft,
        EXISTS(SELECT 1 FROM city_work_orders w WHERE w.case_id=c.id AND w.status='DELIVERED') AS order_delivered,
        EXISTS(SELECT 1 FROM city_work_orders w WHERE w.case_id=c.id AND w.status IN ('ISSUED','DELIVERED','ACCEPTED')) AS order_issued,
        EXISTS(SELECT 1 FROM city_work_orders w WHERE w.case_id=c.id AND w.status='ACCEPTED') AS order_accepted,
        COALESCE((SELECT i.result FROM service_inspections i WHERE i.case_id=c.id ORDER BY i.created_at DESC,i.id DESC LIMIT 1),'NONE') AS latest_inspection,
        EXISTS(SELECT 1 FROM city_work_costs cost JOIN city_work_orders w ON w.id=cost.work_order_id
               WHERE w.case_id=c.id AND cost.case_id=c.id AND w.status='ACCEPTED' AND cost.status='APPROVED') AS cost_approved,
        EXISTS(SELECT 1 FROM city_work_orders w JOIN city_contract_order_links lk ON lk.work_order_id=w.id
               JOIN city_service_contracts ct ON ct.id=lk.contract_id JOIN city_finance_budgets b ON b.id=ct.budget_id
               WHERE w.case_id=c.id AND ct.status IN ('ACTIVE','CLOSED') AND b.status='APPROVED') AS approved_contract,
        EXISTS(SELECT 1 FROM city_work_orders w
               JOIN city_contract_order_links lk ON lk.work_order_id=w.id
               JOIN city_service_contracts ct ON ct.id=lk.contract_id
               JOIN city_finance_budgets b ON b.id=ct.budget_id
               JOIN city_payment_statements st ON st.work_order_id=w.id AND st.contract_id=ct.id
               JOIN city_statement_cost_lines line ON line.statement_id=st.id
               JOIN city_work_costs cost ON cost.id=line.cost_id AND cost.work_order_id=w.id AND cost.case_id=c.id
               WHERE w.case_id=c.id AND w.status='ACCEPTED' AND cost.status='APPROVED'
               AND ct.status IN ('ACTIVE','CLOSED') AND b.status='APPROVED' AND st.status='CERTIFIED'
               AND line.amount_rial=cost.amount_rial) AS certified_chain,
        EXISTS(SELECT 1 FROM capacity_allocations a WHERE a.case_id=c.id AND a.status='RESERVED') AS capacity_reserved,
        EXISTS(SELECT 1 FROM public_value_outcomes o WHERE o.case_id=c.id AND o.status='VERIFIED') AS outcome_verified
 FROM service_cases c LEFT JOIN service_definitions s ON s.id=c.service_id
)
`;
export const TRACE_TOTALS = `SELECT count(*)::int AS cases,
 count(*) FILTER(WHERE service_linked)::int AS service_linked,
 count(*) FILTER(WHERE mission_started)::int AS mission_started,
 count(*) FILTER(WHERE mission_done)::int AS mission_done,
 count(*) FILTER(WHERE order_issued)::int AS order_issued,
 count(*) FILTER(WHERE order_accepted)::int AS order_accepted,
 count(*) FILTER(WHERE latest_inspection='PASS')::int AS inspection_pass,
 count(*) FILTER(WHERE cost_approved)::int AS cost_approved,
 count(*) FILTER(WHERE approved_contract)::int AS approved_contract,
 count(*) FILTER(WHERE certified_chain)::int AS certified_chain,
 count(*) FILTER(WHERE status='CLOSED')::int AS closed_cases,
 count(*) FILTER(WHERE capacity_reserved)::int AS capacity_reserved,
 count(*) FILTER(WHERE outcome_verified)::int AS outcome_verified,
 count(*) FILTER(WHERE status='CLOSED' AND service_linked AND mission_done AND order_accepted
  AND latest_inspection='PASS' AND cost_approved AND approved_contract AND certified_chain)::int AS full_trace
FROM facts`;
const DETAILS = `SELECT * FROM facts ORDER BY created_at DESC,id DESC LIMIT 101`;
export async function readAcceptanceTrace({client,role}){
 if(!ACCEPTANCE_ROLES.includes(role))throw new ClientError('دسترسی به گزارش پذیرش یکپارچه برای این نقش مجاز نیست',403);
 const [a,b]=await Promise.all([client.query(TRACE_SQL+TRACE_TOTALS),client.query(TRACE_SQL+DETAILS)]);
 const totals=traceSummary(a.rows[0]);
 const asOf=new Date().toISOString();
 const cases=b.rows.slice(0,100).map(normalizeTrace).map(c=>({...c,pilot:nextPilotAction(c,asOf)}));
 const pilot=pilotSummary(totals,cases,asOf);
 return {scope:'selected-municipality',mode:'READ_ONLY',asOf,totals,pilot:{stageMissing:pilot.stageMissing,overdueInDisplayed:pilot.overdueInDisplayed,terminalReviewInDisplayed:pilot.terminalReviewInDisplayed,queueLimitedTo:100,queueIds:pilot.queue.map(c=>c.id)},
  cases,truncated:b.rows.length>100,
  policy:'پرونده فقط با مدارک ثبت‌شده و زنجیره منطبق قرارداد، دستورکار، هزینه و گواهی در وضعیت کامل قرار می‌گیرد.',
  caveat:'گواهی صورت‌وضعیت به معنای پرداخت نیست؛ پیامد تأییدشده به معنای منفعت مالی تأییدشده نیست. فهرست ۱۰۰ مورد اخیر و تجمیع کل پرونده‌های شهرداری است.'};
}
