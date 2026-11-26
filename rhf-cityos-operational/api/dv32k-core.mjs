// DV32K.1: bounded deterministic multi-specialist evidence analysis; no LLM/tool execution.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DESKS=new Set(['mayor','deputy','waste']);
const PRIO=new Set(['HIGH','MEDIUM','LOW']);
const METRIC=/^[a-z][a-z0-9_]{0,70}$/;
const CAND=/^[a-z0-9:-]{3,110}$/;
const TRUSTED_SOURCES=new Set(['service_cases','capacity_resources','capacity_allocations','org_units + service_cases']);
function fail(msg){throw new TypeError(msg);}
function normInt(value){if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)fail('UNSAFE_EVIDENCE_COUNT');return value;}
export function prepareGraphInput(report){
 if(!report||report.schema!=='RHF-DV32H-EXECUTIVE-DISCOVERY-v1'||report.readOnly!==true||report.controls?.actionExecution!==false||report.controls?.verifiedUrbanValue!==false)fail('UNTRUSTED_DISCOVERY_REPORT');
 const {desk,scope}=report;
 if(!DESKS.has(desk)||!scope||!UUID.test(scope.tenantId)||!UUID.test(scope.municipalityId)||!Array.isArray(report.candidates)||report.candidates.length>10)fail('INVALID_DISCOVERY_SCOPE');
 if(desk==='waste'&&!UUID.test(scope.organizationId||''))fail('ORGANIZATION_BOUND_REQUIRED');
 if(desk!=='waste'&&scope.organizationId)fail('CITY_SCOPE_ONLY');
 const ids=new Set();
 const candidates=report.candidates.map(c=>{
   if(!c||!CAND.test(c.id)||ids.has(c.id)||!PRIO.has(c.priority)||!Array.isArray(c.evidence)||c.evidence.length<1||c.evidence.length>8||c.valueAssessment?.status!=='NOT_VERIFIED'||c.automatedExecution!==false)fail('INVALID_DISCOVERY_CANDIDATE');
   ids.add(c.id);
   const evidence=c.evidence.map(e=>{
    if(!e||!TRUSTED_SOURCES.has(e.source)||!METRIC.test(e.metric)||!['AGGREGATE','DIRECT_UNIT_AGGREGATE','SCOPED_AGGREGATE'].includes(e.kind))fail('UNTRUSTED_EVIDENCE_SOURCE');
    const data={source:e.source,kind:e.kind,metric:e.metric,count:normInt(e.count)};
    if(e.unitId){if(!UUID.test(e.unitId))fail('INVALID_DIRECT_UNIT');data.unitId=e.unitId;}
    return data;
   });
   return {id:c.id,priority:c.priority,evidence}; // No case IDs, narratives, PII or browser-supplied content.
 });
 const payload={schema:'RHF-DV32K-GRAPH-INPUT-v1',desk,scope:{tenantId:scope.tenantId,municipalityId:scope.municipalityId,...(desk==='waste'?{organizationId:scope.organizationId}:{})},candidates};
 if(Buffer.byteLength(JSON.stringify(payload),'utf8')>16000)fail('INPUT_EXCEEDS_BOUNDED_SIZE');
 return payload;
}
export function validateGraphOutput(result,input){
 if(!result||result.schema!=='RHF-DV32K-LANGGRAPH-v1'||result.scope?.tenantId!==input.scope.tenantId||result.scope?.municipalityId!==input.scope.municipalityId||
  (result.scope.organizationId||null)!==(input.scope.organizationId||null)||result.desk!==input.desk||!Array.isArray(result.recommendations)||result.recommendations.length!==input.candidates.length)fail('GRAPH_RESPONSE_SCOPE_MISMATCH');
 const existing=new Set(input.candidates.map(c=>c.id)),seen=new Set();
 for(const item of result.recommendations){
  if(!existing.has(item.id)||seen.has(item.id)||!['HIGH','MEDIUM','LOW'].includes(item.priority)||!['AGGREGATE_REVIEW','EVIDENCE_RECONCILIATION'].includes(item.reviewCategory)||item.humanApprovalRequired!==true||item.verifiedUrbanValue!==null||item.executionAuthorization!==false)fail('INVALID_GRAPH_RESULT');
  seen.add(item.id);
 }
 if(result.controls?.fieldDispatch!==false||result.controls?.payments!==false||result.controls?.reservations!==false||result.controls?.temporalStarted!==false||result.controls?.modelInferenceUsed!==false||result.controls?.verifiedUrbanValue!==false)fail('UNSAFE_GRAPH_CAPABILITIES');
 return result;
}
