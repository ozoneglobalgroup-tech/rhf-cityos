// V8P6.6: bounded GET-only briefing using existing SELECT-only evidence tools and scoped transaction.
import {ClientError} from './domain.mjs';
import {canReadAgent} from './urban-agent-core.mjs';
import {readAgentEvidence} from './urban-agent-routes.mjs';
import {CASE_SCAN_LIMIT,SCAN_LIMIT} from './agent-specialist-core.mjs';
import {AGENT_BRIEF_PARTS,createAgentBriefing} from './agent-briefing-core.mjs';
export {AGENT_BRIEF_PARTS};
export async function agentBriefingRoute({part,method,resourceId,cityId,user,withScope,json}){
 if(part!=='agent-specialist-briefing'||resourceId)throw new ClientError('مسیر خلاصه عامل معتبر نیست',404);
 if(method!=='GET')throw new ClientError('این تحلیل فقط‌خواندنی است',405);
 if(!user?.id)throw new ClientError('ابتدا وارد شوید',401);
 return json(200,await withScope(cityId,user,'read',async(client,city,role)=>{
  if(!canReadAgent(role))throw new ClientError('این نقش مجوز مشاهده تحلیل ایجنت را ندارد',403);
  const r=await client.query(`SELECT id FROM service_cases WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY created_at DESC,id DESC LIMIT ${CASE_SCAN_LIMIT}`,[city.tenant_id,city.id]);
  if(!Array.isArray(r.rows)||r.rows.length>CASE_SCAN_LIMIT)throw new ClientError('پاسخ پرونده‌ها نامعتبر است',409);
  const sample=r.rows.slice(0,SCAN_LIMIT),evidence=[];
  for(const row of sample){
   const result=await readAgentEvidence(client,row.id);
   if(!Array.isArray(result.tools)||result.tools.length!==4||!result.source||result.source.case?.id!==row.id)throw new ClientError('شواهد ابزار معتبر نیست',409);
   evidence.push(result.source);
  }
  return createAgentBriefing({city,caseRows:sample,evidenceByCase:evidence,partial:r.rows.length>SCAN_LIMIT});
 }));
}
