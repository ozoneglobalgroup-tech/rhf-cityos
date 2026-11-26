// Calls DV32F/G existing authenticated, RLS-scoped data routes. No direct SQL or bypass.
import {ClientError} from './domain.mjs';
import {dv32fExecutiveRoute} from './dv32f-executive-routes.mjs';
import {dv32gWasteRoute} from './dv32g-org-routes.mjs';
import {compileExecutiveDiscovery,noSelection} from './dv32h-agent-core.mjs';
import {validateAgentRequest} from './dv32h-agent-boundary.mjs';
export async function dv32hAgentRoute({method,resourceId,client,city,user,role,url}){
  let desk;
  try{desk=validateAgentRequest({method,resourceId,url});}
  catch(e){throw new ClientError(e.message,e.message==='READ_ONLY_ENDPOINT'?405:400);}
  const report=desk==='waste'
    ?await dv32gWasteRoute({method,resourceId,client,city,user,role,url})
    :await dv32fExecutiveRoute({client,city,role,url});
  if(report.needsOrganizationSelection)return noSelection({desk,report});
  return compileExecutiveDiscovery({desk,report});
}
