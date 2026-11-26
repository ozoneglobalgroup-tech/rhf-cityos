// DV32UX5: strict current-identity, city-bound adapters for EXISTING RUVOS APIs.
// This module never authorizes a role, never starts Temporal and never promotes simulations.
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const ACTIONS=Object.freeze(['CREATE_UNIT','CREATE_SERVICE','ACTIVATE_UNIT','ACTIVATE_SERVICE']);
const fail=(c)=>{throw Error(c);};
const str=(s,min,max,label)=>{if(typeof s!=='string'||s.trim().length<min||s.trim().length>max||/[<>\x00-\x1f]/.test(s))fail(label);return s.trim();};
export function validateContext({desk,tab,cityId,tenantId,orgId}){
 if(!UUID.test(cityId)||!UUID.test(tenantId))fail('INVALID_CURRENT_CITY');
 const ok={mayor:'readiness',deputy:'operational-catalog',waste:'temporal-observation'};
 if(ok[desk]!==tab)fail('CROSS_DESK_MODULE');
 if(desk==='waste'&&!UUID.test(orgId||''))fail('WASTE_BINDING_REQUIRED');
 if(desk!=='waste'&&orgId)fail('CITY_DESK_CANNOT_READ_ORGANIZATION');
 return {desk,tab,cityId,tenantId,orgId:orgId||null};
}
export function readinessUrl(ctx){validateContext(ctx);if(ctx.desk!=='mayor')fail('WRONG_MODULE');return `/api/v1/cities/${ctx.cityId}/dv32p-readiness-audit`;}
export function catalogUrl(ctx){validateContext(ctx);if(ctx.desk!=='deputy')fail('WRONG_MODULE');return `/api/v1/cities/${ctx.cityId}/dv32q7-operational-catalog`;}
export function pipelineUrl(ctx){validateContext(ctx);if(ctx.desk!=='waste')fail('WRONG_MODULE');return `/api/v1/cities/${ctx.cityId}/dv32l-governed-readiness?desk=waste&orgId=${ctx.orgId}`;}
export function temporalUrl(ctx,id){validateContext(ctx);if(ctx.desk!=='waste'||!UUID.test(id))fail('INVALID_REVIEW_ID');return `/api/v1/cities/${ctx.cityId}/dv32m-temporal-status/${id}?desk=waste&orgId=${ctx.orgId}`;}
export function safeReadiness(r,ctx){validateContext(ctx);if(ctx.desk!=='mayor'||r?.schema!=='RHF-DV32P-PILOT-READINESS-AUDIT-v1'||
  r.scope?.municipalityId!==ctx.cityId||r.scope?.tenantId!==ctx.tenantId||r.controls?.readOnly!==true||
  r.controls?.temporalStart!==false||r.controls?.verifiedUrbanValue!==false||
  r.acceptance?.finalProductAcceptance!=='NOT_CERTIFIED'||!Array.isArray(r.gaps)||r.gaps.length>30||
  !Array.isArray(r.observed)||r.observed.length!==3)fail('UNTRUSTED_READINESS');
 const seen=new Set();for(const row of r.observed){if(!['mayor','deputy','waste'].includes(row.desk)||seen.has(row.desk))fail('UNTRUSTED_ROLE_ROW');seen.add(row.desk);}
 const gaps=r.gaps.map(g=>{if(!['P0','P1'].includes(g.priority)||typeof g.id!=='string'||!/^[A-Z0-9_]{4,100}$/.test(g.id)||typeof g.status!=='string'||g.status.length>80)fail('UNTRUSTED_GAP');return {id:g.id,priority:g.priority,status:g.status,description:String(g.description||'').slice(0,220)};});
 return {role:r.inspectedIdentityRole,observed:r.observed.map(x=>({desk:x.desk,discovery:x.discovery,chain:x.chainStatus,eligible:x.manuallyEligibleSuggestions||0})),gaps,decision:r.acceptance.decision,verified:false};
}
export function safeCatalog(r,ctx){validateContext(ctx);if(ctx.desk!=='deputy'||r?.schema!=='RHF-DV32Q7-OPERATIONAL-CATALOG-v1'||r.cityId!==ctx.cityId||r.tenantId!==ctx.tenantId||
  r.acceptance!=='NO_GO'||r.verifiedUrbanValue!==false||r.automaticFieldDispatch!==false||
  !Array.isArray(r.units)||!Array.isArray(r.services)||!Array.isArray(r.missionSlots)||r.missionSlots.length!==17||r.units.length>200||r.services.length>200||
  typeof r.operatorCanChange!=='boolean')fail('UNTRUSTED_CATALOG');
 const ids=new Set(),svc=new Set();for(const x of r.units){if(!UUID.test(x.id)||ids.has(x.id)||typeof x.active!=='boolean')fail('INVALID_UNIT');ids.add(x.id);}
 for(const x of r.services){if(!UUID.test(x.id)||svc.has(x.id)||typeof x.active!=='boolean'||(x.owner_unit_id&&!ids.has(x.owner_unit_id)))fail('INVALID_SERVICE');svc.add(x.id);}
 for(const k of ['activeUnits','activeServices','draftMappedSlots'])if(!Number.isSafeInteger(r.counts?.[k])||r.counts[k]<0||r.counts[k]>200)fail('INVALID_CATALOG_COUNT');
 if(r.units.filter(x=>x.active).length!==r.counts.activeUnits||r.services.filter(x=>x.active).length!==r.counts.activeServices)fail('CATALOG_COUNTS_MISMATCH');
 return {units:r.units,services:r.services,slots:r.missionSlots,counts:r.counts,canMutate:r.operatorCanChange,finalGo:false};
}
export function prepareAction(action,form,ctx,catalog){validateContext(ctx);if(ctx.desk!=='deputy'||!catalog?.canMutate||!ACTIONS.includes(action))fail('ACTION_NOT_ALLOWED');
 const common={action,approvalReference:str(form.approvalReference,8,120,'APPROVAL_REFERENCE_INVALID'),reason:str(form.reason,12,250,'REASON_INVALID'),confirm:'I_APPROVE_REAL_CITY_CATALOG_CHANGE'};
 if(/سناریوی ساختگی|SYN-0\d\d/i.test(common.approvalReference+' '+common.reason))fail('SIMULATION_NOT_A_LEGAL_APPROVAL');
 if(action==='CREATE_UNIT'){
  const code=str(form.code,3,32,'CODE_INVALID').toUpperCase();const kind=str(form.kind,3,40,'KIND_INVALID').toUpperCase();
  if(!/^[A-Z][A-Z0-9_-]{2,31}$/.test(code)||code.startsWith('SYN')||!/^[A-Z][A-Z0-9_]{2,39}$/.test(kind))fail('REFERENCE_CODE_INVALID');
  if(form.parentUnitId&&!catalog.units.some(x=>x.id===form.parentUnitId))fail('INVALID_PARENT_UNIT');
  const nameFa=str(form.nameFa,4,120,'NAME_INVALID');if(/سناریوی ساختگی/.test(nameFa))fail('SYNTHETIC_UNIT_NOT_OPERATIONAL');
  return {...common,code,nameFa,kind,parentUnitId:form.parentUnitId||null};
 }
 if(action==='CREATE_SERVICE'){
  const code=str(form.code,3,32,'CODE_INVALID').toUpperCase(),moduleCode=str(form.moduleCode,3,40,'MODULE_INVALID').toUpperCase();
  if(!/^[A-Z][A-Z0-9_-]{2,31}$/.test(code)||code.startsWith('SYN')||!/^[A-Z][A-Z0-9_]{2,39}$/.test(moduleCode))fail('SERVICE_CODE_INVALID');
  if(!catalog.units.some(x=>x.id===form.ownerUnitId))fail('INVALID_OWNER_UNIT');
  const slaHours=Number(form.slaHours);if(!Number.isSafeInteger(slaHours)||slaHours<1||slaHours>8760)fail('SLA_INVALID');
  const nameFa=str(form.nameFa,4,120,'NAME_INVALID'),description=str(form.description,12,500,'DESCRIPTION_INVALID'),outcomeMetric=str(form.outcomeMetric,4,120,'METRIC_INVALID');
  if([nameFa,description,outcomeMetric].some(x=>/سناریوی ساختگی/.test(x)))fail('SYNTHETIC_SERVICE_NOT_OPERATIONAL');
  return {...common,code,nameFa,moduleCode,description,ownerUnitId:form.ownerUnitId,slaHours,outcomeMetric};
 }
 if(action==='ACTIVATE_UNIT'){
  if(!catalog.units.some(x=>x.id===form.unitId&&!x.active))fail('INVALID_INACTIVE_UNIT');return {...common,unitId:form.unitId};
 }
 if(!catalog.services.some(x=>x.id===form.serviceId&&!x.active))fail('INVALID_INACTIVE_SERVICE');return {...common,serviceId:form.serviceId};
}
export function safePipeline(r,ctx){validateContext(ctx);if(ctx.desk!=='waste'||r?.schema!=='RHF-DV32L-GOVERNED-READINESS-v1'||r.desk!=='waste'||
 r.scope?.tenantId!==ctx.tenantId||r.scope?.municipalityId!==ctx.cityId||r.scope?.organizationId!==ctx.orgId||
 r.controls?.executionAuthorization!==false||r.controls?.temporalStartByThisRoute!==false||r.controls?.verifiedUrbanValue!==false||
 !Array.isArray(r.entries)||r.entries.length>10||typeof r.reviewQueueTruncated!=='boolean')fail('UNTRUSTED_WASTE_PIPELINE');
 const ids=new Set();const entries=r.entries.map(x=>{if(typeof x.candidateId!=='string'||x.candidateId.length>190||ids.has(x.candidateId)||typeof x.manualTemporalEligibility!=='boolean'||x.executionAuthorization!==false||x.verifiedUrbanValue!==false||
 (x.reviewId&&!UUID.test(x.reviewId)))fail('UNTRUSTED_WASTE_REVIEW');ids.add(x.candidateId);return {candidateId:x.candidateId,title:String(x.title||'').slice(0,140),reviewId:x.reviewId||null,reviewStatus:x.reviewStatus||null,gate:x.gate,evidenceCurrent:x.evidenceCurrent===true,canObserve:x.manualTemporalEligibility===true&&x.gate==='ELIGIBLE_FOR_MANUAL_DV32J_CHECK'&&x.evidenceCurrent===true&&x.reviewStatus==='APPROVED_FOR_PLANNING'&&!!x.reviewId&&!r.reviewQueueTruncated};});
 return {entries,truncated:r.reviewQueueTruncated,executionAuthorized:false};
}
export function safeTemporal(r,ctx,reviewId){validateContext(ctx);if(ctx.desk!=='waste'||!UUID.test(reviewId)||r?.schema!=='RHF-DV32M-TEMPORAL-OBSERVABILITY-v1'||r.desk!=='waste'||r.reviewId!==reviewId||
 r.scope?.tenantId!==ctx.tenantId||r.scope?.municipalityId!==ctx.cityId||r.scope?.organizationId!==ctx.orgId||
 r.controls?.readOnly!==true||r.controls?.workflowStartedByThisRoute!==false||r.controls?.workflowSignaledByThisRoute!==false||r.controls?.fieldDispatch!==false||r.controls?.payment!==false||r.controls?.executionAuthorization!==false||r.controls?.verifiedUrbanValue!==false)fail('UNTRUSTED_TEMPORAL');
 return {phase:String(r.phase||'').slice(0,100),checkedAt:String(r.checkedAt||'').slice(0,45),liveObserved:r.liveWorkflowObserved===true,reviewId,executionAuthorized:false};
}
