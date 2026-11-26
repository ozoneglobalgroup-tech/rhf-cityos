// Authenticated by server and called INSIDE withScope('read') RLS transaction.
// No SQL, writes, IAM grants, workflow starts, external requests or role impersonation.
import {ClientError} from './domain.mjs';
import {dv32hAgentRoute} from './dv32h-agent-routes.mjs';
import {dv32iReviewRoute} from './dv32i-review-routes.mjs';
import {DESKS,validateMatrixRequest,deskQuery,scopedDiscovery,scopedReview,
 deniedRow,selectionRow,allowedRow,finalMatrix} from './dv32o-access-core.mjs';
const fail=(status,message)=>{throw new ClientError(message,status);};
function isDenied(e){return e instanceof ClientError && Number(e.status)===403;}
export async function dv32oAccessMatrixRoute({method,resourceId,client,city,user,role,url,
 probeDiscovery=dv32hAgentRoute,probeReviews=dv32iReviewRoute}){
 let request;
 try{request=validateMatrixRequest({method,resourceId,url});}
 catch(e){fail(e.message==='GET_ONLY'?405:400,e.message);}
 const rows=[];
 for(const desk of DESKS){
  const scopedUrl=deskQuery(url,desk,request.orgId);
  const ctx={method:'GET',resourceId:undefined,client,city,user,role,url:scopedUrl};
  let discovery;
  try{discovery=await probeDiscovery(ctx);}
  catch(e){if(isDenied(e)){rows.push(deniedRow(desk));continue;}throw e;}
  let scope;
  try{scope=scopedDiscovery({desk,report:discovery,city});}
  catch{fail(409,'INCONSISTENT_AUTHORIZED_DISCOVERY');}
  if(scope.access==='SELECT_ORGANIZATION'){rows.push(selectionRow(desk));continue;}
  let queue;
  try{queue=await probeReviews(ctx);}
  catch(e){if(isDenied(e)){rows.push({...deniedRow(desk),discovery:'ALLOWED',
    organizationId:scope.organizationId,candidateCount:scope.candidateCount,reviewQueue:'DENIED'});continue;}throw e;}
  let review;
  try{review=scopedReview({desk,report:queue,city,discovery:scope});}
  catch{fail(409,'INCONSISTENT_REVIEW_SCOPE_OR_ACCESS');}
  rows.push(allowedRow(desk,scope,review));
 }
 return finalMatrix({city,role,rows});
}
