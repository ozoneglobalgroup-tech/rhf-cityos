import http from 'node:http';
import {NativeConnection,Worker} from '@temporalio/worker';
let connection,server;
try{
 connection=await NativeConnection.connect({address:process.env.TEMPORAL_ADDRESS||'rhf-cityos-operational-temporal-1:7233'});
 const worker=await Worker.create({connection,namespace:'default',taskQueue:'rhf-dv32ux18-operator-proof-v1',
  workflowsPath:new URL('./workflows.mjs',import.meta.url).pathname,
  maxConcurrentWorkflowTaskExecutions:4});
 server=http.createServer((req,res)=>{
  if(req.method!=='GET'||req.url!=='/healthz'){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:'ok',service:'DV32UX18_NON_EXECUTING_PROOF_WORKER',activities:0,fieldDispatch:false}));
 });
 await new Promise((resolve,reject)=>server.listen(3223,'127.0.0.1',e=>e?reject(e):resolve()));
 console.log('DV32UX18_WORKER_READY=YES NO_ACTIVITIES=YES');
 await worker.run();
}catch(e){console.error('DV32UX18_WORKER_FAILURE',e);process.exitCode=1;}
finally{if(server)await new Promise(r=>server.close(r));if(connection)await connection.close();}
