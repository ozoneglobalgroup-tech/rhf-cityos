import {ClientError} from './domain.mjs';
import {aiEnabled,callOpenAI} from './ai-core.mjs';
import {AGENT_ROLES,canRunAgent,canReadAgent,validatePlan,planFromEvidence,sha256,TOOL_ALLOWLIST} from './urban-agent-core.mjs';
export const AGENT_PARTS=['agent-status','agent-plan','agent-history'];
const rate=new Map();let inflightModels=0;
function gate(userId){const now=Date.now();const key=String(userId);if(rate.size>10000)rate.clear();const prev=rate.get(key);const entry=prev&&now-prev.start<60000?{start:prev.start,count:prev.count+1}:{start:now,count:1};if(entry.count>5)throw new ClientError('سقف پنج اجرای عامل در دقیقه تکمیل شد',429);rate.set(key,entry);}
const noAccess=()=>new ClientError('اجرای عامل برای این نقش مجاز نیست',403);
const noRead=()=>new ClientError('مشاهده سوابق عامل برای این نقش مجاز نیست',403);
const sqlTools=Object.freeze({
 read_service_case:async(client,id)=>{
  const r=await client.query('SELECT id,summary,status,priority FROM service_cases WHERE id=$1 LIMIT 1',[id]);
  if(!r.rows.length)throw new ClientError('پرونده در شهرداری فعلی یافت نشد',404);
  return r.rows[0];
 },
 read_execution_evidence:async(client,id)=>{
  const r=await client.query(`SELECT
   (SELECT count(*) FROM missions WHERE case_id=$1 AND status='DONE')::int AS done_missions,
   (SELECT count(*) FROM city_work_orders WHERE case_id=$1)::int AS work_orders,
   (SELECT count(*) FROM city_work_orders WHERE case_id=$1 AND status IN ('ISSUED','DELIVERED','ACCEPTED'))::int AS issued_or_delivered_or_accepted,
   (SELECT count(*) FROM city_work_orders WHERE case_id=$1 AND status IN ('DELIVERED','ACCEPTED'))::int AS delivered_or_accepted,
   (SELECT count(*) FROM city_work_orders WHERE case_id=$1 AND status='ACCEPTED')::int AS accepted_orders,
   (SELECT count(*) FROM service_inspections WHERE case_id=$1 AND result='PASS')::int AS passed_inspections,
   (SELECT result FROM service_inspections WHERE case_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1) AS latest_inspection_result,
   (SELECT count(*) FROM city_work_costs WHERE case_id=$1 AND status='APPROVED')::int AS approved_costs`,[id]);return r.rows[0];
 },
 read_finance_evidence:async(client,id)=>{
  const r=await client.query(`SELECT
   (SELECT count(DISTINCT con.id) FROM city_work_orders o JOIN city_contract_order_links l ON l.work_order_id=o.id JOIN city_service_contracts con ON con.id=l.contract_id WHERE o.case_id=$1 AND con.status='ACTIVE')::int AS linked_active_contracts,
   (SELECT count(DISTINCT b.id) FROM city_work_orders o JOIN city_contract_order_links l ON l.work_order_id=o.id JOIN city_service_contracts con ON con.id=l.contract_id JOIN city_finance_budgets b ON b.id=con.budget_id WHERE o.case_id=$1 AND b.status='APPROVED')::int AS linked_approved_budgets,
   (SELECT count(*) FROM city_payment_statements p JOIN city_work_orders o ON o.id=p.work_order_id WHERE o.case_id=$1 AND p.status='CERTIFIED')::int AS certified_statements`,[id]);return r.rows[0];
 },
 read_value_capacity_evidence:async(client,id)=>{
  const r=await client.query(`SELECT
   (SELECT count(*) FROM public_value_outcomes WHERE case_id=$1 AND status='VERIFIED')::int AS verified_outcomes,
   (SELECT count(*) FROM capacity_resources WHERE authorized=true)::int AS authorized_resources,
   (SELECT count(*) FROM urban_capacity_matches m JOIN urban_value_cases v ON v.id=m.value_case_id WHERE v.case_id=$1 AND m.status='FEASIBLE')::int AS feasible_matches`,[id]);return r.rows[0];
 }
});
// Constrained orchestrator: four known SELECT-only tools; no LLM-generated SQL or arbitrary tool dispatch.
export async function readAgentEvidence(client,caseId){
 const out={},tools=[];
 for(const [name,key] of [['read_service_case','case'],['read_execution_evidence','execution'],['read_finance_evidence','finance'],['read_value_capacity_evidence','value']]){
  if(!TOOL_ALLOWLIST.includes(name))throw new ClientError('ابزار غیرمجاز',403);
  out[key]=await sqlTools[name](client,caseId);tools.push(name);
 }
 return {source:out,tools};
}
export async function urbanAgentRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json,audit}){
 if(resourceId)throw new ClientError('مسیر عامل معتبر نیست',404);
 const scoped=fn=>withScope(cityId,user,'read',async(client,city,role)=>{if(!canReadAgent(role))throw noRead();return fn(client,city,role);});
 if(part==='agent-status'&&method==='GET')return json(200,await scoped(async(_c,city,role)=>({municipality:city.name,role,modelEnabled:aiEnabled(),mode:'BOUNDED_READ_ONLY',maxTools:4,externalConsentRequired:true,autoWrite:false,notices:['عامل با چهار ابزار فقط‌خواندنی و برنامه کنترل‌شده اجرا می‌شود.','خروجی پیشنهادی است؛ هیچ تصمیم قانونی، تخصیص یا هزینه‌ای را اجرا نمی‌کند.']})));
 if(part==='agent-history'&&method==='GET')return json(200,await scoped(async(client)=>({rows:(await client.query("SELECT id,actor_id,created_at,event,details FROM audit_events WHERE kind='GOVERNED_URBAN_AGENT' ORDER BY created_at DESC,id DESC LIMIT 30")).rows,limit:30,contentStored:false})));
 if(part==='agent-plan'&&method==='POST'){
  let input;try{input=validatePlan(await readBody(req));}catch(e){throw new ClientError(e.message==='CONSENT_REQUIRED'?'برای ارسال به مدل رضایت صریح لازم است':'ورودی اجرای عامل معتبر نیست',400);}
  if(input.useModel&&!aiEnabled())throw new ClientError('مدل AI در سرور فعال نیست؛ اجرای بدون مدل را انتخاب کنید',409);
  gate(user.id);
  const {source,tools}=await scoped(async(client,city,role)=>{
   if(!canRunAgent(role))throw noAccess();
   return readAgentEvidence(client,input.caseId);
  });
  const result=planFromEvidence(source,input.intent);let modelComment=null,modelUsed=false,modelStatus='DISABLED';
  if(input.useModel){
   if(inflightModels>=2)throw new ClientError('ظرفیت همزمان مدل تکمیل است',429);
   const context=JSON.stringify({caseStatus:source.case.status,objective:input.intent,facts:result.facts,proposedSteps:result.steps});
   inflightModels++;try{const r=await callOpenAI({apiKey:process.env.RHF_AI_API_KEY,model:process.env.RHF_AI_MODEL||'gpt-4.1-mini',question:'فقط با تکیه به شواهد محدود، ریسک‌ها و شکاف‌های مدارک اقدام بعد را کوتاه توضیح بده؛ هیچ عدد منفعت یا تصمیم قانونی نساز.',context});modelComment=r.answer;modelUsed=true;modelStatus='COMPLETED';}
   catch{modelStatus='PROVIDER_UNAVAILABLE';}finally{inflightModels--;}
  }
  // Only a minimal append-only audit event; no raw prompts, model output or evidence text stored.
  await scoped(async(client,city)=>audit(client,city,user,'GOVERNED_URBAN_AGENT',input.caseId,'PLAN_CREATED',{
   intent:input.intent,toolNames:tools,sourceHash:sha256(JSON.stringify(source)),modelUsed,modelStatus,modelHash:modelComment?sha256(modelComment):null,autoWrites:0
  }));
  return json(200,{caseId:input.caseId,intent:input.intent,steps:result.steps,next:result.next,facts:result.facts,toolTrace:tools,modelUsed,modelStatus,modelComment,notices:result.notices,hasVerifiedPublicValue:result.hasVerifiedPublicValue,autoWrites:0});
 }
 throw new ClientError('مسیر یا روش درخواست عامل مجاز نیست',405);
}
