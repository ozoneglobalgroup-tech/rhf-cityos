// Scope enforced by the server's withScope transaction and explicit SQL tenant/city predicates.
import {ClientError} from './domain.mjs';
import {boundary,identity,compose} from './dv32ux17-chain-core.mjs';
const refuse=(status,msg)=>{throw new ClientError(msg,status)};
const QUERY=`SELECT c.id,c.summary,c.status,c.created_by,c.module_code,c.description,c.evidence,c.acceptance_note,
 c.unit_id,c.service_id,s.active AS service_active,u.active AS unit_active,
 r.id AS review_id,r.status AS review_status,r.case_fingerprint AS review_fingerprint,
 r.submitted_by,r.reviewed_by,
 p.id AS plan_id,p.review_id AS plan_review_id,p.case_fingerprint AS plan_fingerprint,
 p.status AS plan_status,p.execution_authority,p.temporal_started,
 w.id AS work_order_id,w.case_fingerprint AS work_fingerprint,w.prepared_by,
 d.decision,d.decided_by,
 h.id AS handoff_id,h.case_fingerprint AS handoff_fingerprint,h.requested_by,
 h.state AS handoff_state,h.temporal_started AS handoff_temporal_started,h.dispatch_authorized AS handoff_dispatch_authorized
 FROM public.service_cases c
 JOIN public.org_units u ON u.id=c.unit_id AND u.tenant_id=c.tenant_id AND u.municipality_id=c.municipality_id
 JOIN public.service_definitions s ON s.id=c.service_id AND s.owner_unit_id=u.id AND s.tenant_id=c.tenant_id AND s.municipality_id=c.municipality_id
 LEFT JOIN LATERAL (SELECT id,status,case_fingerprint,submitted_by,reviewed_by FROM public.rhf_dv32ux7_case_reviews r0
  WHERE r0.case_id=c.id AND r0.tenant_id=c.tenant_id AND r0.municipality_id=c.municipality_id
  ORDER BY r0.submitted_at DESC,r0.id DESC LIMIT 1) r ON TRUE
 LEFT JOIN LATERAL (SELECT id,review_id,case_fingerprint,status,execution_authority,temporal_started
  FROM public.rhf_dv32ux8_case_planning p0
  WHERE p0.case_id=c.id AND p0.review_id=r.id AND p0.tenant_id=c.tenant_id AND p0.municipality_id=c.municipality_id
  ORDER BY p0.created_at DESC,p0.id DESC LIMIT 1) p ON TRUE
 LEFT JOIN LATERAL (SELECT id,case_fingerprint,prepared_by FROM public.rhf_dv32ux11_work_orders w0
  WHERE w0.case_id=c.id AND w0.plan_id=p.id AND w0.tenant_id=c.tenant_id AND w0.municipality_id=c.municipality_id
  ORDER BY w0.created_at DESC,w0.id DESC LIMIT 1) w ON TRUE
 LEFT JOIN public.rhf_dv32ux11_work_decisions d ON d.work_order_id=w.id AND d.tenant_id=c.tenant_id AND d.municipality_id=c.municipality_id
 LEFT JOIN LATERAL (SELECT id,case_fingerprint,requested_by,state,temporal_started,dispatch_authorized FROM public.rhf_dv32ux12_handoff_intents h0
  WHERE h0.work_order_id=w.id AND h0.tenant_id=c.tenant_id AND h0.municipality_id=c.municipality_id
  ORDER BY h0.created_at DESC,h0.id DESC LIMIT 1) h ON TRUE
 WHERE c.tenant_id=$1 AND c.municipality_id=$2 AND c.status='DRAFT'
 AND c.acceptance_note LIKE 'INTAKE_SOURCE:%'
 ORDER BY c.created_at DESC,c.id DESC LIMIT 41`;
export async function dv32ux17ChainRoute({method,resourceId,url,client,city,user,role}){
 try{boundary({method,resourceId,url})}catch(e){refuse(405,e.message)}
 try{identity(city,role,user)}catch(e){refuse(403,e.message)}
 const data=await client.query(QUERY,[city.tenant_id,city.id]);
 try{return compose(city,role,data.rows)}catch(e){refuse(409,e.message)}
}
