// UX6 current-identity scoped real case intake; never silently promote synthetic fixtures.
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=s=>{throw Error(s)};
export function context(x){if(x?.desk!=='deputy'||x.tab!=='cases'||x.orgId||!UUID.test(x.cityId)||!UUID.test(x.tenantId))fail('DEPUTY_CITY_CASE_SCOPE_REQUIRED');return x}
export function path(ctx){context(ctx);return `/api/v1/cities/${ctx.cityId}/dv32ux6-governed-case-intake`}
export function safeReport(r,ctx){context(ctx);
 if(r?.schema!=='RHF-DV32UX6-CASE-INTAKE-v1'||r.cityId!==ctx.cityId||r.tenantId!==ctx.tenantId||r.finalGo!=='NO_GO'||r.workflowStarted!==false||r.automaticFieldDispatch!==false||r.verifiedUrbanValue!==false||r.realCasesCreatedByThisRead!==0||typeof r.operatorCanCreate!=='boolean'||!Array.isArray(r.services)||r.services.length>200||!Array.isArray(r.cases)||r.cases.length>50||typeof r.truncated!=='boolean')fail('UNTRUSTED_CASE_INVENTORY');
 const sv=new Set(),ids=new Set();for(const s of r.services){if(!UUID.test(s.id)||!UUID.test(s.owner_unit_id)||sv.has(s.id)||s.active!==true||s.owner_active!==true)fail('UNTRUSTED_ACTIVE_SERVICE');sv.add(s.id)}
 for(const c of r.cases){if(!UUID.test(c.id)||ids.has(c.id)||c.status!=='DRAFT'||typeof c.summary!=='string'||c.summary.length>180)fail('UNTRUSTED_CASE_ROW');ids.add(c.id)}
 return {services:r.services,cases:r.cases,truncated:r.truncated,canCreate:r.operatorCanCreate,finalGo:false};
}
function plain(s,min,max,field){if(typeof s!=='string'||s.trim().length<min||s.trim().length>max||/[<>\r\n\u0000-\u001f]/.test(s))fail(field);return s.trim()}
export function prepare(form,ctx,report,requestId){context(ctx);if(!report?.canCreate||!UUID.test(requestId)||!report.services.some(s=>s.id===form.serviceId))fail('CASE_CREATION_FORBIDDEN');
 if(!['LOW','NORMAL','HIGH','URGENT'].includes(form.priority))fail('PRIORITY_INVALID');
 const body={action:'CREATE_DRAFT_CASE',requestId,serviceId:form.serviceId,priority:form.priority,
 summary:plain(form.summary,8,180,'SUMMARY_INVALID'),description:plain(form.description,15,800,'DESCRIPTION_INVALID'),
 evidenceNote:plain(form.evidenceNote,12,300,'EVIDENCE_INVALID'),sourceReference:plain(form.sourceReference,8,120,'REFERENCE_INVALID'),
 confirm:'I_CONFIRM_AUTHORIZED_REAL_SERVICE_CASE'};
 if(/(?:\bSYN[-_]?0*\d+\b|سناریوی ساختگی|آزمایشی|demo|synthetic)/i.test([body.summary,body.description,body.evidenceNote,body.sourceReference].join(' ')))fail('SYNTHETIC_SOURCE_DENIED');
 return body;
}
export function verifiedCreation(r,ctx,expected){context(ctx);
 if(r?.schema!=='RHF-DV32UX6-CASE-CREATED-v1'||r.cityId!==ctx.cityId||r.tenantId!==ctx.tenantId||r.caseId!==expected.requestId||r.serviceId!==expected.serviceId||r.status!=='DRAFT'||r.manualReviewRequired!==true||r.workflowStarted!==false||r.automaticFieldDispatch!==false||r.verifiedUrbanValue!==false||r.finalGo!=='NO_GO')fail('UNTRUSTED_CREATION_CONFIRMATION');
 return {id:r.caseId,status:'DRAFT'};
}
