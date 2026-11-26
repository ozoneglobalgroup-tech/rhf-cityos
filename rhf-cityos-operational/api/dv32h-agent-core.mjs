// RHF DV32H: deterministic evidence-discovery agent, never an autonomous executor.
// Inputs must have already been authenticated, municipality-scoped and authorized by DV32F/G.
const DESKS=new Set(['mayor','deputy','waste']);
function integer(n){const v=Number(n);if(!Number.isSafeInteger(v)||v<0)throw new TypeError('UNSAFE_EVIDENCE_COUNT');return v;}
function limited(x,max=120){return String(x??'').slice(0,max);}
function card(key,title,priority,description,evidence,scope){
  return {id:key,title,priority,description,evidence,scope,reviewStatus:'NOT_SUBMITTED',
    suggestedNextStep:'HUMAN_EVIDENCE_REVIEW',humanApprovalRequired:true,automatedExecution:false,
    valueAssessment:{status:'NOT_VERIFIED',estimatedValue:null,verifiedValue:null}};
}
export function compileExecutiveDiscovery({desk,report}){
  if(!DESKS.has(desk)||!report||report.readOnly!==true)throw new TypeError('INVALID_VERIFIED_DESK_REPORT');
  const scope=report.scope||{};
  if(!scope.tenantId||!scope.municipalityId)throw new TypeError('MISSING_AUTHORIZED_SCOPE');
  if(desk==='waste'&&(!scope.organizationId||report.needsOrganizationSelection))throw new TypeError('WASTE_ORGANIZATION_NOT_BOUND');
  if(desk!=='waste'&&scope.organizationId)throw new TypeError('UNEXPECTED_ORGANIZATION_SCOPE');
  const cases=report.cases||{};
  const open=integer(desk==='waste'?cases.open:cases.openCases);
  const critical=integer(desk==='waste'?cases.criticalOpen:cases.criticalOpenCases);
  const resources=integer(report.capacity?.resourcePools);
  const reservations=integer(report.capacity?.reservedAllocations);
  if(critical>open)throw new TypeError('INCONSISTENT_CRITICAL_AGGREGATE');
  const candidates=[];
  const common={municipalityId:scope.municipalityId,tenantId:scope.tenantId,desk,...(desk==='waste'?{organizationId:scope.organizationId}:{} )};
  if(critical>0)candidates.push(card('critical-case-review','بازبینی پرونده‌های بحرانی باز','HIGH',
    `${critical} پرونده باز با اولویت بحرانی در محدوده مجاز ثبت شده است؛ علت و فوریت نیازمند تأیید انسانی است.`,
    [{source:'service_cases',kind:'AGGREGATE',metric:'critical_open_cases',count:critical,filter:'status not CLOSED/REJECTED and priority CRITICAL',attribution:desk==='waste'?'ACTIVE_ORGANIZATION_SUBTREE':'MUNICIPALITY'}],common));
  if(open>=10)candidates.push(card('open-case-triage','بررسی حجم پرونده‌های باز','MEDIUM',
    `تعداد ${open} پرونده باز به‌عنوان سیگنال بررسی ثبت شده؛ این عدد به‌تنهایی تأخیر یا نقض SLA را اثبات نمی‌کند.`,
    [{source:'service_cases',kind:'AGGREGATE',metric:'open_cases',count:open,threshold:10,attribution:desk==='waste'?'ACTIVE_ORGANIZATION_SUBTREE':'MUNICIPALITY'}],common));
  // A reserved allocation is a row count, not a capacity quantity; never compare it to pool count for overcommitment.
  if(resources>0||reservations>0)candidates.push(card('capacity-evidence-reconciliation','بازبینی مدارک ظرفیت و رزروها','LOW',
    'صرفاً تعداد مجموعه‌های منابع و ردیف‌های رزرو گزارش شده؛ مقدار آزاد، تناسب تقاضا و امکان تخصیص از این داده‌ها نتیجه نمی‌شود.',
    [{source:'capacity_resources',kind:'AGGREGATE',metric:'resource_pool_rows',count:resources},
     {source:'capacity_allocations',kind:'AGGREGATE',metric:'reserved_allocation_rows',count:reservations}],common));
  if(desk==='deputy'){
    const units=report.organization?.directUnitSummaries||[];
    if(!Array.isArray(units))throw new TypeError('INVALID_UNIT_REPORT');
    for(const r of units.filter(u=>integer(u.directCriticalCases)>0).slice(0,5)){
      const id=limited(r.id,50);if(!/^[0-9a-f-]{36}$/i.test(id))throw new TypeError('INVALID_UNIT_SCOPE');
      candidates.push(card(`direct-unit-review:${id}`,`بررسی واحد ${limited(r.name,80)}`,'MEDIUM',
        'پرونده‌های بحرانی مستقیماً به این واحد نسبت داده شده‌اند؛ سازمان‌های فرزند در این شاخص تجمیع نشده‌اند.',
        [{source:'org_units + service_cases',kind:'DIRECT_UNIT_AGGREGATE',unitId:id,metric:'direct_critical_cases',count:integer(r.directCriticalCases)}],{...common,unitId:id}));
    }
  }
  if(!candidates.length)candidates.push(card('data-quality-review','بازبینی کیفیت داده و فرصت‌های ثبت‌نشده','LOW',
    'در داده‌های تجمیعی فعلی نشانه کافی برای اولویت‌بندی خودکار وجود ندارد؛ این موضوع به‌معنای نبود نیاز شهری نیست.',
    [{source:'service_cases',kind:'SCOPED_AGGREGATE',metric:'open_and_critical_case_counts',count:open}],common));
  return {schema:'RHF-DV32H-EXECUTIVE-DISCOVERY-v1',desk,readOnly:true,scope:common,
    agent:{type:'DETERMINISTIC_EVIDENCE_DISCOVERY',modelInferenceUsed:false,runMode:'SYNCHRONOUS_READ_ONLY',
      orchestration:{temporal:'NOT_TRIGGERED',langGraph:'NOT_TRIGGERED'}},
    candidates:candidates.slice(0,10),truncated:candidates.length>10,
    controls:{humanApprovalRequired:true,hasHumanApproved:false,actionExecution:false,fieldDispatch:false,
      automatedAllocation:false,payment:false,verifiedUrbanValue:false,previewOnly:true},
    provenance:{sourceReportSchema:report.schema,scoping:'AUTHENTICATED_WITH_SCOPE_TRANSACTION',
      evidenceLevel:'AGGREGATES_ONLY',caseIdentifiersIncluded:false},
    caveats:['Signals are not independently verified value outcomes.',
      'No approval event, Temporal workflow, LangGraph job, budget or field action is started.',
      'Organization directors cannot change their organization scope through request parameters.']};
}
export function noSelection({desk,report}){
  if(desk!=='waste'||report?.needsOrganizationSelection!==true||!report?.scope?.municipalityId)
    throw new TypeError('INVALID_EMPTY_WASTE_SELECTION');
  return {schema:'RHF-DV32H-EXECUTIVE-DISCOVERY-v1',desk,readOnly:true,
    needsOrganizationSelection:true,scope:{municipalityId:report.scope.municipalityId},candidates:[],
    controls:{fieldDispatch:false,humanApprovalRequired:true,verifiedUrbanValue:false},noCityWideFallback:true};
}
