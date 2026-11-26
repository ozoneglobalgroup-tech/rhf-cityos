// Read-only financial operations control room, always called inside withScope tenant/city transaction.
import {ClientError} from './domain.mjs';
import {FINANCE_CONTROL_ROLES,budgetBalance,makeFinanceAlerts} from './finance-control-core.mjs';
export async function readFinancialControl({client,role}){
 if(!FINANCE_CONTROL_ROLES.includes(role))throw new ClientError('مشاهده مرکز کنترل مالی برای این نقش مجاز نیست',403);
 const q=(sql,params=[])=>client.query(sql,params);
 // Aggregates cover ALL rows, unlike bounded drill-down lists. No payment inference.
 const totals=(await q(`SELECT
  (SELECT COALESCE(sum(amount_rial),0)::text FROM city_finance_budgets WHERE status='APPROVED') approved_budget_rial,
  (SELECT COALESCE(sum(amount_rial),0)::text FROM city_finance_budgets WHERE status='DRAFT') draft_budget_rial,
  (SELECT COALESCE(sum(ceiling_rial),0)::text FROM city_service_contracts WHERE status IN ('ACTIVE','CLOSED')) committed_rial,
  (SELECT COALESCE(sum(amount_rial),0)::text FROM city_payment_statements WHERE status='CERTIFIED') certified_rial,
  (SELECT COALESCE(sum(amount_rial),0)::text FROM city_payment_statements WHERE status='SUBMITTED') submitted_rial,
  (SELECT count(*)::int FROM city_payment_statements WHERE status='SUBMITTED') submitted_count,
  (SELECT count(*)::int FROM city_service_contracts WHERE status='ACTIVE') active_contract_count,
  (SELECT count(*)::int FROM city_contract_order_links) linked_order_count,
  (SELECT count(*)::int FROM city_work_orders w WHERE w.status IN ('ISSUED','DELIVERED','ACCEPTED') AND NOT EXISTS(SELECT 1 FROM city_contract_order_links k WHERE k.work_order_id=w.id)) unlinked_order_count,
  (SELECT count(*)::int FROM city_work_costs cost JOIN city_work_orders w ON w.id=cost.work_order_id
    JOIN city_contract_order_links k ON k.work_order_id=w.id JOIN city_service_contracts c ON c.id=k.contract_id
    WHERE cost.status='APPROVED' AND w.status='ACCEPTED' AND c.status='ACTIVE'
    AND NOT EXISTS(SELECT 1 FROM city_statement_cost_lines l WHERE l.cost_id=cost.id)) eligible_cost_count,
  (SELECT COALESCE(sum(cost.amount_rial),0)::text FROM city_work_costs cost JOIN city_work_orders w ON w.id=cost.work_order_id
    JOIN city_contract_order_links k ON k.work_order_id=w.id JOIN city_service_contracts c ON c.id=k.contract_id
    WHERE cost.status='APPROVED' AND w.status='ACCEPTED' AND c.status='ACTIVE'
    AND NOT EXISTS(SELECT 1 FROM city_statement_cost_lines l WHERE l.cost_id=cost.id)) eligible_cost_rial
 `)).rows[0];
 // Bound lists and report limits honestly; totals/alert counts are never inferred from limits.
 const [budgetResult,contractResult,statementResult]=await Promise.all([
  q(`SELECT b.id,b.code,b.title,b.fiscal_period,b.amount_rial::text,b.status,b.appropriation_reference,
    COALESCE((SELECT sum(c.ceiling_rial) FROM city_service_contracts c WHERE c.budget_id=b.id AND c.status IN ('ACTIVE','CLOSED')),0)::text committed_rial
    FROM city_finance_budgets b ORDER BY (b.status='APPROVED') DESC,b.created_at DESC,b.id LIMIT 201`),
  q(`SELECT c.id,c.reference,c.title,c.status,c.ceiling_rial::text,c.end_date::text,
    ct.name_fa contractor_name,b.code budget_code,
    COALESCE((SELECT sum(w.ceiling_rial) FROM city_contract_order_links l JOIN city_work_orders w ON w.id=l.work_order_id WHERE l.contract_id=c.id),0)::text linked_ceiling_rial,
    COALESCE((SELECT sum(s.amount_rial) FROM city_payment_statements s WHERE s.contract_id=c.id AND s.status='CERTIFIED'),0)::text certified_rial
    FROM city_service_contracts c JOIN city_contractors ct ON ct.id=c.contractor_id JOIN city_finance_budgets b ON b.id=c.budget_id
    ORDER BY (c.status='ACTIVE') DESC,c.created_at DESC,c.id LIMIT 201`),
  q(`SELECT s.id,s.reference,s.status,s.amount_rial::text,s.created_at,s.updated_at,
    c.reference contract_reference,ct.name_fa contractor_name
    FROM city_payment_statements s JOIN city_service_contracts c ON c.id=s.contract_id
    JOIN city_contractors ct ON ct.id=c.contractor_id
    WHERE s.status='SUBMITTED' ORDER BY s.updated_at ASC,s.id LIMIT 201`)
 ]);
 const budgets=budgetResult.rows.slice(0,200).map(b=>({...b,...budgetBalance(b.amount_rial,b.committed_rial)}));
 const contracts=contractResult.rows.slice(0,200);
 const statements=statementResult.rows.slice(0,200);
 const budgetTotals=budgetBalance(totals.approved_budget_rial,totals.committed_rial);
 const alerts=makeFinanceAlerts({budgets,contracts,statements,totals});
 return {currency:'IRR',scope:'selected-municipality',asOf:new Date().toISOString(),totals:{...totals,...budgetTotals},
  budgets,contracts,statements,alerts,
  truncated:{budgets:budgetResult.rows.length>200,contracts:contractResult.rows.length>200,statements:statementResult.rows.length>200},
  caveat:'Read-only financial management; contract commitment is reserved budget (not spending). CERTIFIED is NOT paid, invoiced, legally validated, or verified public value. Totals use all city rows; detail lists are capped at 200.'};
}
