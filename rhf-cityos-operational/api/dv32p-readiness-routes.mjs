// GET only. Every delegated route runs with the original authenticated city and RLS scope.
import {ClientError} from './domain.mjs';
import {dv32oAccessMatrixRoute} from './dv32o-access-routes.mjs';
import {dv32lPipelineRoute} from './dv32l-pipeline-routes.mjs';
import {DESKS,validateAuditRequest,auditDeskUrl,ensureMatrix,classifyChain,buildReadiness} from './dv32p-readiness-core.mjs';
const fail=(code,msg)=>{throw new ClientError(msg,code);};
export async function dv32pPilotAuditRoute({method,resourceId,client,city,user,role,url,
 probeMatrix=dv32oAccessMatrixRoute,probeChain=dv32lPipelineRoute,clock=()=>new Date().toISOString()}){
 let req;
 try{req=validateAuditRequest({method,resourceId,url});}
 catch(e){fail(e.message==='GET_ONLY'?405:400,e.message);}
 const ctx={method:'GET',resourceId:undefined,client,city,user,role,url};
 const matrix=await probeMatrix(ctx);
 let rows;
 try{rows=ensureMatrix(matrix,city);}catch{fail(409,'INCONSISTENT_AUTHENTICATED_ACCESS_MATRIX');}
 const chains=[];
 for(let i=0;i<DESKS.length;i++){
  const desk=DESKS[i],row=rows[i];
  if(row.discovery!=='ALLOWED'||row.reviewQueue!=='ALLOWED'){
   chains.push(classifyChain({desk,matrixRow:row,readiness:null,city}));continue;
  }
  const query=auditDeskUrl(url,desk,req.orgId);
  let report=null;
  try{report=await probeChain({...ctx,url:query});}
  catch(e){
   // Dependency failures do not upgrade readiness; never translate them into approval.
   if(e instanceof ClientError && [403,404,409,422,503].includes(Number(e.status))){
    chains.push(classifyChain({desk,matrixRow:row,readiness:null,city}));continue;
   }
   throw e;
  }
  try{chains.push(classifyChain({desk,matrixRow:row,readiness:report,city}));}
  catch{fail(409,'INCONSISTENT_GOVERNANCE_OR_TENANT_SCOPE');}
 }
 return buildReadiness({city,role,matrix,chains,observedAt:clock()});
}
