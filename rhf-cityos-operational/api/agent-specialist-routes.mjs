// V8P6.2: explicit GET-only municipal specialist analysis, using the established SELECT-only tools.
import {ClientError} from './domain.mjs';
import {canReadAgent} from './urban-agent-core.mjs';
import {readAgentEvidence} from './urban-agent-routes.mjs';
import {SPECIALIST_PARTS,SCAN_LIMIT,CASE_SCAN_LIMIT,classifyEvidence,publicSpecialistResponse} from './agent-specialist-core.mjs';
export {SPECIALIST_PARTS};
export async function agentSpecialistRoute({part,method,resourceId,cityId,user,withScope,json}){
 if(part!=='agent-specialist-scan'||resourceId)throw new ClientError('مسیر ایجنت تخصصی معتبر نیست',404);
 if(method!=='GET')throw new ClientError('تحلیل تخصصی فقط‌خواندنی است',405);
 if(!user?.id)throw new ClientError('نشست معتبر نیست',401);
 return json(200,await withScope(cityId,user,'read',async(client,city,role)=>{
  if(!canReadAgent(role))throw new ClientError('مشاهده تحلیل تخصصی برای این نقش مجاز نیست',403);
  // Explicit scope predicates in addition to the transaction's tenant/municipality RLS.
  const cases=(await client.query(`SELECT id FROM service_cases
    WHERE tenant_id=$1 AND municipality_id=$2
    ORDER BY created_at DESC,id DESC LIMIT ${CASE_SCAN_LIMIT}`,[city.tenant_id,city.id])).rows;
  if(!Array.isArray(cases)||cases.some(c=>typeof c.id!=='string'))throw new ClientError('پاسخ پرونده معتبر نیست',409);
  const sample=cases.slice(0,SCAN_LIMIT),findings=[];
  for(const c of sample){
   // All four existing tools perform read-only queries within the same scoped transaction.
   const {source,tools}=await readAgentEvidence(client,c.id);
   if(tools.length!==4)throw new ClientError('رد ابزارهای مجاز ناقص است',409);
   findings.push(...classifyEvidence(c.id,source));
  }
  return publicSpecialistResponse({cityId:city.id,cases:sample,scanned:sample.length,partial:cases.length>SCAN_LIMIT,findings});
 }));
}
