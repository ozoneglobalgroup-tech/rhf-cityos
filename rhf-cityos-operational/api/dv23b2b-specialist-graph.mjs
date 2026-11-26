/** Actual LangGraph.js graph. Deterministic specialists; no LLM, tools, payment or dispatch. */
import {StateGraph,Annotation,START,END} from '@langchain/langgraph';
import {SPECIALIST_SCHEMA,SPECIALIST_KEYS,summarizePacket,assertResult} from './dv23b2b-specialist-core.mjs';
const State=Annotation.Root({evidence:Annotation(),need:Annotation(),capacity:Annotation(),legal:Annotation(),value:Annotation(),trace:Annotation({reducer:(a,b)=>[...(a||[]),...(b||[])],default:()=>[]})});
const finding=(key,checks,code)=>({key,status:'REQUIRES_HUMAN_VALIDATION',checks,observation:code,verified:false});
const graph=new StateGraph(State)
 .addNode('need_analysis',s=>({need:finding(SPECIALIST_KEYS[0],['VERIFY_URGENCY','CONFIRM_SERVICE_SCOPE','VERIFY_SOURCE_CREDIBILITY'],s.evidence.need.hasEvidence?'REVIEWED_SOURCE_REQUIRES_DOMAIN_VALIDATION':'EVIDENCE_MISSING'),trace:['NEED_ANALYST']}))
 .addNode('capacity_assessment',s=>({capacity:finding(SPECIALIST_KEYS[1],['VERIFY_AVAILABILITY','CONFIRM_LEGAL_ACCESS','CHECK_LOCATION_AND_TIME'],s.evidence.need.quantity!==null&&s.evidence.capacity.quantity!==null?'REPORTED_QUANTITIES_ONLY':'QUANTITIES_UNDETERMINED'),trace:['CAPACITY_ANALYST']}))
 .addNode('legal_hse',s=>({legal:finding(SPECIALIST_KEYS[2],['LEGAL_TITLE_AND_RIGHTS','CONTRACT_CONDITIONS','HSE_RISK_ASSESSMENT'],'LEGAL_AND_HSE_NOT_CERTIFIED'),trace:['LEGAL_HSE']}))
 .addNode('value_governance',s=>({value:finding(SPECIALIST_KEYS[3],['BASELINE','ATTRIBUTION','INDEPENDENT_VERIFICATION','NO_DOUBLE_COUNTING'],'VALUE_NOT_REALIZED_OR_VERIFIED'),trace:['VALUE_GOVERNANCE']}))
 .addEdge(START,'need_analysis').addEdge('need_analysis','capacity_assessment').addEdge('capacity_assessment','legal_hse').addEdge('legal_hse','value_governance').addEdge('value_governance',END).compile();
export async function executeDV23Specialists(packet){
 const evidence=summarizePacket(packet);
 const final=await graph.invoke({evidence},{recursionLimit:12,signal:AbortSignal.timeout(5000)});
 const result={schema:SPECIALIST_SCHEMA,decisionId:evidence.decisionId,handoffFingerprint:evidence.handoffFingerprint,
  engine:'LANGGRAPH_JS_1_7_2',mode:'DETERMINISTIC_FOUR_NODE_ANALYSIS',modelInvoked:false,
  analyses:[final.need,final.capacity,final.legal,final.value],trace:final.trace||[],
  mandatoryChecks:evidence.missingChecks,municipalActionExecuted:false,autoMunicipalWrites:0,canAuthorizeExecution:false,
  verifiedPublicValue:false,valueVerification:'NOT_ATTESTED',requiresIndependentHumanReview:true};
 if(JSON.stringify(result.trace)!==JSON.stringify(SPECIALIST_KEYS))throw Error('LANGGRAPH_TRACE_INVALID');
 return assertResult(result,evidence);
}
