// Network-isolated real Temporal SDK smoke: workflow survives worker restart while awaiting authorization.
import {Connection,WorkflowClient} from '@temporalio/client';
import {NativeConnection,Worker} from '@temporalio/worker';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {closeSmokeResources} from './agent-temporal-smoke-cleanup.mjs';
const address=process.env.RHF_TEMPORAL_ADDRESS||'temporal:7233';
let connection,core,worker,workerLoop;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
for(let attempt=0;attempt<30;attempt++){
 try{connection=await Connection.connect({address});core=await NativeConnection.connect({address});break;}
 catch(e){if(attempt===29)throw e;await pause(1000);}
}
const client=new WorkflowClient({connection,namespace:'default'}),queue=`rhf-v52-smoke-${randomUUID()}`,runId=randomUUID();
const create=()=>Worker.create({connection:core,namespace:'default',taskQueue:queue,workflowsPath:fileURLToPath(new URL('./agent-temporal-workflow.mjs',import.meta.url)),activities:{runGovernedGraph:async b=>({runId})}});
let smokeError=null;
try{
 worker=await create();workerLoop=worker.run();
 const handle=await client.start('governedUrbanWorkflow',{workflowId:`rhf-v52-smoke-${runId}`,taskQueue:queue,args:[{tenantId:randomUUID(),cityId:randomUUID(),missionId:randomUUID(),actorId:randomUUID(),requestKey:randomUUID()}],workflowExecutionTimeout:'2 minutes'});
 for(let i=0;i<25;i++){try{if(await handle.query('phase')==='AWAITING_HUMAN_AUTHORIZATION')break;}catch{}await pause(200);if(i===24)throw Error('WAIT_GATE_NOT_REACHED');}
 const before=await handle.query('phase');if(before!=='AWAITING_HUMAN_AUTHORIZATION')throw Error('HUMAN_GATE_NOT_DURABLE');
 await worker.shutdown();await workerLoop;worker=null;workerLoop=null;
 worker=await create();workerLoop=worker.run();
 const after=await handle.query('phase');if(after!=='AWAITING_HUMAN_AUTHORIZATION')throw Error('WORKFLOW_NOT_RESTORED');
 await handle.signal('releaseReadOnly',{release:'INDEPENDENTLY_AUTHORIZED',missionVersion:2,acknowledgeReadOnly:true});
 const outcome=await handle.result();if(outcome.status!=='COMPLETED'||outcome.runId!==runId)throw Error('TEMPORAL_RELEASE_FAILED');
}catch(error){smokeError=error;}
try{
 await closeSmokeResources({worker,workerLoop,core,connection});
}catch(cleanupError){
 if(!smokeError)smokeError=cleanupError;
 else console.error('V8P52_SMOKE_CLEANUP_SECONDARY_FAILURE',cleanupError?.message||'unknown');
}
if(smokeError)throw smokeError;
console.log('V8P52_TEMPORAL_REAL_WORKER_RESTART_SMOKE=PASS');
