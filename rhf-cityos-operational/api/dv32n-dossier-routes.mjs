// DV32N: no writes, no Temporal start/signal. Every delegated route rechecks current authorized scope.
import {ClientError} from './domain.mjs';
import {dv32hAgentRoute} from './dv32h-agent-routes.mjs';
import {dv32iReviewRoute} from './dv32i-review-routes.mjs';
import {dv32lPipelineRoute} from './dv32l-pipeline-routes.mjs';
import {dv32mTemporalStatusRoute} from './dv32m-temporal-routes.mjs';
import {validateDossierRequest,forwardedReadUrl,buildDossier,dossierTemporalEligible} from './dv32n-dossier-core.mjs';
const fail=(code,msg)=>{throw new ClientError(msg,code);};
export async function dv32nDossierRoute({method,resourceId,client,city,user,role,url}){
 let req;
 try{req=validateDossierRequest({method,resourceId,url});}
 catch(e){fail(e.message==='GET_ONLY'?405:400,e.message);}
 const scopedUrl=forwardedReadUrl(url);
 const opts={method:'GET',resourceId:undefined,client,city,user,role,url:scopedUrl};
 const readiness=await dv32lPipelineRoute(opts); // RLS + authorized H/K/I reconciliation
 if(readiness.needsOrganizationSelection)fail(403,'EXPLICIT_ORGANIZATION_SELECTION_REQUIRED');
 if(readiness.desk!==req.desk)fail(403,'DESK_MISMATCH');
 const report=await dv32hAgentRoute(opts); // current evidence, not a client-supplied snapshot
 const queue=await dv32iReviewRoute(opts); // independent latest evidence SHA and actor checks
 const entry=readiness.entries?.filter(x=>x?.candidateId===req.candidateId);
 if(!Array.isArray(entry)||entry.length!==1)fail(404,'CANDIDATE_NOT_FOUND_IN_AUTHORIZED_SCOPE');
 if(req.includeTemporal&&!dossierTemporalEligible(entry[0],readiness))fail(409,'TEMPORAL_OBSERVATION_NOT_AUTHORIZED');
 let observation=null;
 if(req.includeTemporal){
  observation=await dv32mTemporalStatusRoute({...opts,resourceId:entry[0].reviewId}); // ONLY existing GET status
 }
 try{return buildDossier({readiness,report,queue,candidateId:req.candidateId,desk:req.desk,city,
   includeTemporal:req.includeTemporal,observation});}
 catch(e){fail(409,'EVIDENCE_DOSSIER_CONSISTENCY_FAILURE');}
}
