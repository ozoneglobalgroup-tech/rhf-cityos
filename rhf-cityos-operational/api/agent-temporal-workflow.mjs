// Temporal Workflow isolation: deterministic state only; no DB, Node APIs or municipal actions.
import {condition,defineQuery,defineSignal,proxyActivities,setHandler} from '@temporalio/workflow';
const {runGovernedGraph}=proxyActivities({startToCloseTimeout:'45 seconds',scheduleToCloseTimeout:'2 minutes',retry:{maximumAttempts:3,initialInterval:'1 second',backoffCoefficient:2,maximumInterval:'10 seconds'}});
const releaseSignal=defineSignal('releaseReadOnly');
const statusQuery=defineQuery('phase');
export async function governedUrbanWorkflow(input){
 let state='AWAITING_HUMAN_AUTHORIZATION',released=false;
 setHandler(statusQuery,()=>state);
 setHandler(releaseSignal,(proof)=>{
  if(proof?.acknowledgeReadOnly===true&&proof?.missionVersion===2&&proof?.release==='INDEPENDENTLY_AUTHORIZED'){
   released=true;state='AUTHORIZED_FOR_READ_ONLY';
  }
 });
 const permitted=await condition(()=>released,'7 days');
 if(!permitted){state='EXPIRED';return {status:'EXPIRED',runId:null};}
 state='ANALYZING';
 try{
  const result=await runGovernedGraph(input);
  state='COMPLETED';
  return {status:'COMPLETED',runId:result.runId};
 }catch(e){state='FAILED';throw e;}
}

// Separate human-triggered analysis; no municipal execution or payment workflow.
const {runDV23Specialists}=proxyActivities({startToCloseTimeout:'40 seconds',scheduleToCloseTimeout:'3 minutes',retry:{maximumAttempts:2,initialInterval:'2 seconds'}});
export async function dv23SpecialistWorkflow(input){return await runDV23Specialists(input);}
