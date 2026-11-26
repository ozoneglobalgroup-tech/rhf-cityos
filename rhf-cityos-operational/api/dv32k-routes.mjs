// DV32K uses authenticated withScope() and DV32H's existing role/RLS filters.
import {ClientError} from './domain.mjs';
import {dv32hAgentRoute} from './dv32h-agent-routes.mjs';
import {prepareGraphInput,validateGraphOutput} from './dv32k-core.mjs';
import {validateAgentRequest} from './dv32h-agent-boundary.mjs';
export async function analyzeViaSidecar(input){
 const secret=process.env.DV32K_BRIDGE_SECRET;
 if(typeof secret!=='string'||!/^[a-f0-9]{64}$/.test(secret))throw new ClientError('LANGGRAPH_BRIDGE_NOT_CONFIGURED',503);
 // Hostname is fixed, not request-controlled: prevents SSRF.
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),5000);
 try{
  const res=await fetch('http://dv32k-agent:3225/analyze',{method:'POST',headers:{'Content-Type':'application/json','X-RHF-DV32K-Bridge':secret},body:JSON.stringify(input),signal:controller.signal});
  if(!res.ok)throw new Error('GRAPH_SIDECAR_REJECTED');
  const body=await res.text();if(Buffer.byteLength(body,'utf8')>32768)throw new Error('GRAPH_OUTPUT_TOO_LARGE');
  return JSON.parse(body);
 }catch{throw new ClientError('LANGGRAPH_TEMPORARILY_UNAVAILABLE',503);}
 finally{clearTimeout(timeout);}
}
export async function dv32kGraphRoute({method,resourceId,client,city,user,role,url,analyze=analyzeViaSidecar}){
 try{validateAgentRequest({method,resourceId,url});}catch(e){throw new ClientError(e.message,e.message==='READ_ONLY_ENDPOINT'?405:400);}
 const report=await dv32hAgentRoute({method,resourceId,client,city,user,role,url});
 if(report.needsOrganizationSelection)return {schema:'RHF-DV32K-LANGGRAPH-v1',desk:'waste',needsOrganizationSelection:true,recommendations:[],humanApprovalRequired:true,executionAuthorization:false,noCityWideFallback:true};
 let input;try{input=prepareGraphInput(report);}catch{throw new ClientError('UNTRUSTED_DISCOVERY_EVIDENCE',422);}
 const result=await analyze(input);
 try{return validateGraphOutput(result,input);}catch{throw new ClientError('LANGGRAPH_OUTPUT_REJECTED',503);}
}
