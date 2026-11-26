/** Isolated Unix-socket HTTP gateway. NOT a route mounted in RUVOS.
 * Request body and caller-supplied scope are rejected. Service identity is
 * established by HMAC keyring; jobId and execution rights are server-owned.
 */
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {STAGE_ROUTE} from './stage-http-service-auth.mjs';
function reply(res,status,object){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(object));}
export function createStageHttpGateway({authenticator,claimNext,executeMission,jobIdFactory=()=>`stage-${randomUUID()}`}={}){
 if(!authenticator||typeof authenticator.verify!=='function'||typeof claimNext!=='function'||typeof executeMission!=='function')throw Error('STAGE_GATEWAY_DEPENDENCIES_REQUIRED');
 return http.createServer(async(req,res)=>{
  const path=req.url;
  if(req.method!=='POST'||path!==STAGE_ROUTE){reply(res,404,{error:'NOT_FOUND'});return;}
  const parts=[];let bytes=0;
  try{
   for await(const chunk of req){bytes+=chunk.length;if(bytes>0){reply(res,400,{error:'BODY_NOT_ALLOWED'});return;}parts.push(chunk);}
   const body=Buffer.concat(parts);
   let authenticated;
   try{authenticated=await authenticator.verify({method:req.method,path,headers:req.headers,body});}
   catch{reply(res,401,{error:'UNAUTHORIZED'});return;}
   const jobId=jobIdFactory();
   if(!/^[a-z0-9_.:-]{5,120}$/i.test(jobId))throw Error('INVALID_SERVER_OWNED_JOB');
   const base={tenantId:authenticated.tenantId,municipalityId:authenticated.municipalityId,
     actorId:authenticated.actorId,jobId};
   const claimed=await claimNext({...base,origin:'RUVOS_VERIFIED_SERVICE'});
   if(!claimed){reply(res,200,{status:'EMPTY'});return;}
   const result=await executeMission({intentId:claimed.intentId,principal:{...base,
     leaseGeneration:claimed.leaseGeneration,serverAuthenticated:true,principalType:'SERVICE',allowMissionExecution:true}});
   reply(res,200,{status:result.status,created:result.created===true,missionId:result.missionId});
  }catch(_){if(!res.headersSent)reply(res,503,{error:'STAGING_EXECUTION_FAILED'});}
 });
}
