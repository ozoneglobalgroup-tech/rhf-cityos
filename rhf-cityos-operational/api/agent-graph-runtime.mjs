// Actual LangGraph.js StateGraph, pinned @langchain/langgraph 1.7.2.
// Four deterministic specialist nodes. No model calls and no side-effecting tools.
import {StateGraph,Annotation,START,END} from '@langchain/langgraph';
import {planFromEvidence,safeCount} from './urban-agent-core.mjs';
import {GRAPH_NODES,GRAPH_VERSION} from './agent-graph-core.mjs';
const State=Annotation.Root({
 source:Annotation(), objective:Annotation(), need:Annotation(), capacity:Annotation(), finance:Annotation(),
 final:Annotation(), trace:Annotation({reducer:(a,b)=>[...(a||[]),...(b||[])],default:()=>[]})
});
export const graph=new StateGraph(State)
 .addNode('need_analysis',s=>({need:{caseStatus:s.source.case.status,doneMissions:safeCount(s.source.execution.done_missions),missingExecution:safeCount(s.source.execution.done_missions)===0},trace:[{node:GRAPH_NODES[0],result:'ANALYZED'}]}))
 .addNode('capacity_assessment',s=>({capacity:{authorizedResourceCount:safeCount(s.source.value.authorized_resources),feasibleMatchCount:safeCount(s.source.value.feasible_matches),availabilityVerified:false,allocationAuthorized:false},trace:[{node:GRAPH_NODES[1],result:'REQUIRES_HUMAN_VALIDATION'}]}))
 .addNode('finance_guard',s=>({finance:{linkedApprovedBudgets:safeCount(s.source.finance.linked_approved_budgets),certifiedStatements:safeCount(s.source.finance.certified_statements),paymentProven:false},trace:[{node:GRAPH_NODES[2],result:'READ_ONLY'}]}))
 .addNode('evidence_governance',s=>({final:{...planFromEvidence(s.source,s.objective),need:s.need,capacity:s.capacity,finance:s.finance,verifiedPublicValueCreated:false,dispatched:false,autoWrites:0},trace:[{node:GRAPH_NODES[3],result:'HUMAN_DECISION_REQUIRED'}]}))
 .addEdge(START,'need_analysis')
 .addEdge('need_analysis','capacity_assessment')
 .addEdge('capacity_assessment','finance_guard')
 .addEdge('finance_guard','evidence_governance')
 .addEdge('evidence_governance',END)
 .compile();
export async function executeAuthorizedGraph(source,objective){
 const began=Date.now();
 const s=await graph.invoke({source,objective},{recursionLimit:12,signal:AbortSignal.timeout(4000)});
 const trace=s.trace||[];
 if(trace.length!==4||trace.some((x,i)=>x.node!==GRAPH_NODES[i])||!s.final||s.final.dispatched!==false||s.final.autoWrites!==0)throw Error('GRAPH_OUTPUT_INVALID');
 return {engine:GRAPH_VERSION,elapsedMs:Date.now()-began,result:s.final,trace};
}
export async function graphSelfTest(){
 const source={case:{status:'OPEN'},execution:{done_missions:0},finance:{linked_approved_budgets:0,certified_statements:0},value:{authorized_resources:0,feasible_matches:0,verified_outcomes:0}};
 const outcome=await executeAuthorizedGraph(source,'NEXT_SAFE_ACTION');
 if(outcome.trace.length!==4||outcome.result.verifiedPublicValueCreated!==false)throw Error('LANGGRAPH_SMOKE_FAILED');
 return 'V8P51_LANGGRAPH_ACTUAL_GRAPH_SMOKE=PASS';
}
