import {condition,defineSignal,defineQuery,setHandler} from '@temporalio/workflow';
const acknowledge=defineSignal('dv32jPlanningAcknowledged');
const stateQuery=defineQuery('dv32jStatus');
export async function dv32jPlanningHandoff(input){
 if(input?.version!=='DV32J.1'||input.executionAuthorized!==false||input.verifiedUrbanValue!==false||
   typeof input.reviewId!=='string'||typeof input.evidenceSha256!=='string')throw new Error('INVALID_NON_EXECUTING_HANDOFF');
 let ack=null;
 setHandler(acknowledge,(msg)=>{
  if(!ack&&msg?.reviewId===input.reviewId&&typeof msg.actorId==='string'&&
   typeof msg.reason==='string'&&msg.reason.trim().length>=16)
   ack={actorId:msg.actorId,reason:msg.reason.slice(0,1000)};
 });
 setHandler(stateQuery,()=>({phase:ack?'ACKNOWLEDGED_NON_EXECUTING':'WAITING_FOR_PLANNING_ACK',
  reviewId:input.reviewId,desk:input.desk,executionAuthorization:false,verifiedUrbanValue:false}));
 const done=await condition(()=>ack!==null,'30 days');
 return {phase:done?'ACKNOWLEDGED_NON_EXECUTING':'EXPIRED_UNACKNOWLEDGED',
  reviewId:input.reviewId,acknowledgedBy:ack?.actorId||null,
  executionAuthorization:false,fieldDispatch:false,payment:false,verifiedUrbanValue:false};
}
