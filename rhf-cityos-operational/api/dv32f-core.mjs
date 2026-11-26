// DV32F — read-only, conservative triad executive summaries.
// Deliberately NO claim of actual savings, verified public value, approval or dispatched action.
const CLOSED = new Set(['CLOSED','REJECTED']);
const DESKS = Object.freeze(['mayor','deputy','waste']);
export const DV32F_ROLE_MATRIX = Object.freeze({mayor:['MUNICIPAL_ADMIN'],deputy:['MUNICIPAL_ADMIN','DEPUTY'],waste:['MUNICIPAL_ADMIN','DEPUTY']});
export function canViewDesk(role,desk) {return DESKS.includes(desk)&&DV32F_ROLE_MATRIX[desk].includes(role);}
function count(x) {const n=Number(x);if (!Number.isSafeInteger(n)||n<0)throw new TypeError('Invalid aggregate count');return n;}
function bounded(x,n=160) {return String(x??'').slice(0,n);}
export function caseSummary(rows=[]) {
  if(!Array.isArray(rows))throw new TypeError('Invalid case groups');
  const byStatus={},byPriority={};let cases=0,open=0,criticalOpen=0;
  for(const r of rows){const n=count(r.n);const status=bounded(r.status,40),priority=bounded(r.priority,40);
    cases+=n;byStatus[status]=(byStatus[status]||0)+n;byPriority[priority]=(byPriority[priority]||0)+n;
    if(!CLOSED.has(status)){open+=n;if(priority==='CRITICAL')criticalOpen+=n;}}
  return {totalCases:cases,openCases:open,criticalOpenCases:criticalOpen,byStatus,byPriority};
}
export function missionSummary(rows=[]) {const byStatus={};let total=0;for(const r of rows){const n=count(r.n);total+=n;const k=bounded(r.status,40);byStatus[k]=(byStatus[k]||0)+n;}return {total,byStatus};}
export function recommendations({desk,cases,orgRows=[]}) {
  const items=[];
  if(cases.criticalOpenCases>0)items.push({key:'CRITICAL_CASE_REVIEW',title:'بازبینی پرونده‌های بحرانی',reason:`${cases.criticalOpenCases} پرونده باز با اولویت بحرانی ثبت شده است`,action:'REVIEW_ONLY',evidence:['service_cases:priority=CRITICAL:open']});
  if(desk==='deputy')for(const row of orgRows.filter(r=>count(r.critical_cases)>0).slice(0,5))items.push({key:`UNIT_REVIEW:${row.id}`,title:`بررسی وضعیت ${bounded(row.name_fa)}`,reason:`${count(row.critical_cases)} پرونده بحرانی در تخصیص مستقیم این واحد`,action:'REVIEW_ONLY',evidence:[`org_units:${row.id}`,'service_cases:unit_id:open']});
  if(!items.length)items.push({key:'EVIDENCE_REVIEW',title:'ارزیابی کیفیت داده و شواهد',reason:'شاخص‌های تجمیعی برای اثبات ارزش یا نیاز واقعی ظرفیت کافی نیستند',action:'HUMAN_REVIEW_ONLY',evidence:['service_cases:aggregates']});
  return items;
}
export function buildExecutiveReport({desk,city,role,caseRows=[],missionRows=[],units=0,resources=0,allocations=0,orgRows=[],selectedOrganization=null,eligibleOrganizations=[],generatedAt=new Date().toISOString()}) {
  if(!canViewDesk(role,desk))throw new TypeError('Unauthorized desk scope');
  if(!city?.id||!city?.tenant_id)throw new TypeError('Missing city scope');
  const cases=caseSummary(caseRows),missions=missionSummary(missionRows);
  const safeOrgRows=orgRows.slice(0,80).map(r=>({id:String(r.id),code:bounded(r.code,60),name:bounded(r.name_fa,160),kind:bounded(r.kind,50),directCases:count(r.total_cases),directOpenCases:count(r.open_cases),directCriticalCases:count(r.critical_cases)}));
  const result={schema:'RHF-DV32F-TRIAD-COMMAND-v1',readOnly:true,generatedAt,
    scope:{municipalityId:city.id,tenantId:city.tenant_id,desk},access:{role,roleBinding:'CITY_MEMBERSHIP',organizationDirectorEnabled:false},
    cases,missions,capacity:{resourcePools:count(resources),reservedAllocations:count(allocations),notAnAvailabilityGuarantee:true},
    organization:{totalActiveUnits:count(units),directUnitSummaries:desk==='deputy'?safeOrgRows:[],directUnitRowsTruncated:desk==='deputy'&&orgRows.length>80,
      eligibleWasteOrganizations:desk==='waste'?eligibleOrganizations.map(o=>({id:o.id,code:bounded(o.code,60),name:bounded(o.name_fa,160)})):[],
      selected:desk==='waste'&&selectedOrganization?{id:selectedOrganization.id,name:bounded(selectedOrganization.name_fa,160)}:null,
      missingScope:desk==='waste'&&!selectedOrganization},
    advisory:recommendations({desk,cases,orgRows}),
    controls:{humanApprovalRequired:true,fieldDispatchAllowed:false,writeOperations:false,automaticValueClaims:false,verifiedUrbanValue:'NOT_EVALUATED',scope:'FORCE_RLS_MUNICIPALITY',orgAttribution:'DIRECT_UNIT_ONLY'},
    caveats:['Read-only operational aggregates, not an independently audited city-wide outcome.',
      'No approval, dispatch, agent execution, budget transfer or value monetization occurs.',
      'Waste director login requires independently verified organization-level IAM binding; not enabled in DV32F.']};
  return result;
}
