import http from 'node:http';
import {NativeConnection,Worker} from '@temporalio/worker';
const address=process.env.TEMPORAL_ADDRESS||'rhf-cityos-operational-temporal-1:7233';
const namespace='default';const taskQueue='rhf-dv32j-planning-handoff-v1';
let connection;
try{
 connection=await NativeConnection.connect({address});
 const worker=await Worker.create({connection,namespace,taskQueue,
  workflowsPath:new URL('./workflows.mjs',import.meta.url).pathname,
  maxConcurrentWorkflowTaskExecutions:20});
 const server=http.createServer((req,res)=>{
  if(req.url!=='/healthz'){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:'ok',service:'DV32J_PLANNING_WORKER',operationalActivities:0}));
 });
 await new Promise((resolve,reject)=>server.listen(3222,'127.0.0.1',e=>e?reject(e):resolve()));
 console.log('DV32J_WORKER_READY=YES NO_OPERATIONAL_ACTIVITIES=YES');
 await worker.run();
 await new Promise(resolve=>server.close(resolve));
} catch(e){console.error('DV32J_WORKER_FAILURE',e);process.exitCode=1;}
finally{if(connection)await connection.close();}
