// Isolated Temporal worker, same application image and DB app role; no public HTTP port.
import {Worker,NativeConnection} from '@temporalio/worker';
import {fileURLToPath} from 'node:url';
import {runGovernedGraph} from './agent-temporal-activities.mjs';
import {runDV23Specialists} from './dv23b2b-specialist-activity.mjs';
if(process.env.RHF_TEMPORAL_WORKER!=='YES')throw Error('TEMPORAL_WORKER_EXPLICIT_ENABLE_REQUIRED');
if(!process.env.DATABASE_URL)throw Error('TEMPORAL_WORKER_DATABASE_URL_REQUIRED');
const address=process.env.RHF_TEMPORAL_ADDRESS||'temporal:7233';
const connection=await NativeConnection.connect({address});
const worker=await Worker.create({connection,namespace:process.env.RHF_TEMPORAL_NAMESPACE||'default',taskQueue:'rhf-cityos-governed-v8p52',workflowsPath:fileURLToPath(new URL('./agent-temporal-workflow.mjs',import.meta.url)),activities:{runGovernedGraph,runDV23Specialists},maxConcurrentActivityTaskExecutions:3,maxConcurrentWorkflowTaskExecutions:10});
console.log('RHF_V8P52_TEMPORAL_WORKER_READY=YES');
await worker.run();
