import {ClientError,uuid} from './domain.mjs';
import {AI_LIMITS,canReadAI,canEditAI,assertIndependent,validateKnowledge,validateQuestion,aiEnabled,chooseSources,sourceSnapshot,digest,callOpenAI} from './ai-core.mjs';
export const AI_PARTS=['ai-status','ai-knowledge','ai-assist','ai-interactions'];
let inFlight=0;
const rate=new Map();
function rateGate(userId){
 const now=Date.now();if(rate.size>10000)rate.clear();
 const key=String(userId),current=rate.get(key);
 const next=current&&now-current.since<60000?{since:current.since,count:current.count+1}:{since:now,count:1};
 if(next.count>5)throw new ClientError('سقف پنج درخواست AI در دقیقه برای این کاربر تکمیل است',429);
 rate.set(key,next);
}
function bad(e){if(e instanceof ClientError)return e;let codes={TITLE_INVALID:'عنوان منبع نامعتبر است',SOURCE_INVALID:'مرجع سند نامعتبر است',BODY_INVALID:'متن سند باید بین ۳۰ تا ۱۶۰۰ حرف باشد',QUESTION_INVALID:'پرسش باید بین ۶ تا ۶۵۰ حرف باشد',INDEPENDENT_REVIEW_REQUIRED:'بازبین باید با ثبت‌کننده متفاوت باشد',REVIEW_PERMISSION_DENIED:'اختیار بررسی مستقل ندارید'};return new ClientError(codes[e.message]||'درخواست نامعتبر است',400);}
function checkRead(role){if(!canReadAI(role))throw new ClientError('دسترسی به دستیار شهری برای نقش فعلی مجاز نیست',403);}
function checkEdit(role){if(!canEditAI(role))throw new ClientError('ثبت دانش فقط برای مدیر و معاون مجاز است',403);}
export async function aiRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json,audit}){
 const scoped=fn=>withScope(cityId,user,'read',async(client,city,role)=>{checkRead(role);return fn(client,city,role);});
 if(part==='ai-status'&&method==='GET'&&!resourceId){let x=await scoped(async(_c,city,role)=>({municipality:city.name,role}));return json(200,{...x,enabled:aiEnabled(),provider:'OpenAI Responses API',model:process.env.RHF_AI_MODEL||'gpt-4.1-mini',externalTransferRequiresConsent:true,toolExecution:false,notices:['مدل فقط در صورت فعال‌سازی مدیر و رضایت موردی اجرا می‌شود.','هیچ تأیید مالی، دستورکار یا تخصیص ظرفیتی توسط AI ایجاد نمی‌شود.']});}
 if(part==='ai-knowledge'&&method==='GET'&&!resourceId){return json(200,await scoped(async(client)=>({rows:(await client.query("SELECT id,title,source_ref,body,status,created_by,reviewed_by,review_note,created_at FROM ai_knowledge_cards ORDER BY created_at DESC,id DESC LIMIT 80")).rows,limit:80})));}
 if(part==='ai-knowledge'&&method==='POST'&&!resourceId){let b;try{b=validateKnowledge(await readBody(req));}catch(e){throw bad(e);}const result=await scoped(async(client,city,role)=>{checkEdit(role);const r=(await client.query('INSERT INTO ai_knowledge_cards(tenant_id,municipality_id,title,source_ref,body,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,status',[city.tenant_id,city.id,b.title,b.sourceRef,b.body,user.id])).rows[0];await audit(client,city,user,'AI_KNOWLEDGE',r.id,'DRAFT');return r;});return json(201,result);}
 if(part==='ai-knowledge'&&method==='PATCH'&&resourceId){uuid(resourceId);const b=await readBody(req);if(b.action!=='APPROVE'&&b.action!=='REJECT')throw new ClientError('اقدام بررسی معتبر نیست',400);const result=await scoped(async(client,city,role)=>{const row=(await client.query('SELECT * FROM ai_knowledge_cards WHERE id=$1 FOR UPDATE',[resourceId])).rows[0];if(!row)throw new ClientError('منبع دانش در این شهرداری یافت نشد',404);if(row.status!=='DRAFT')throw new ClientError('سند قبلاً بررسی شده است',409);try{assertIndependent(row.created_by,user.id,role);}catch(e){throw bad(e);}let note=String(b.reviewNote||'').trim();if(note.length<8||note.length>800)throw new ClientError('توضیح بررسی بین ۸ و ۸۰۰ کاراکتر لازم است',400);let updated=(await client.query('UPDATE ai_knowledge_cards SET status=$2,review_note=$3,reviewed_by=$4,reviewed_at=now() WHERE id=$1 RETURNING id,status',[resourceId,b.action==='APPROVE'?'APPROVED':'REJECTED',note,user.id])).rows[0];await audit(client,city,user,'AI_KNOWLEDGE',row.id,updated.status);return updated;});return json(200,result);}
 if(part==='ai-interactions'&&method==='GET'&&!resourceId){return json(200,{rows:await scoped(async(client)=>(await client.query('SELECT id,requested_at,status,model,source_refs,request_sha256,response_sha256,latency_ms FROM ai_interactions ORDER BY requested_at DESC,id DESC LIMIT 50')).rows),limit:50,contentStored:false});}
 if(part==='ai-assist'&&method==='POST'&&!resourceId){
  const input=await readBody(req);let question;try{question=validateQuestion(input);}catch(e){throw bad(e);}if(input.externalConsent!==true)throw new ClientError('برای ارسال داده به مدل خارجی رضایت صریح لازم است',400);
  if(!aiEnabled())throw new ClientError('مدل خارجی فعال نیست؛ مدیر باید RHF_AI_ENABLED و کلید سمت سرور را تنظیم کند',409);
  if(inFlight>=3)throw new ClientError('ظرفیت همزمان سرویس AI تکمیل است',429);
  let valueCaseId=input.valueCaseId?uuid(input.valueCaseId):null;
  rateGate(user.id);
  const source=await scoped(async(client)=>{
   const v=valueCaseId?(await client.query('SELECT id,title,public_need,beneficiaries,barrier,baseline_method,comparator,value_dimension,status FROM urban_value_cases WHERE id=$1',[valueCaseId])).rows[0]:null;
   if(valueCaseId&&!v)throw new ClientError('فرصت ارزش در شهرداری فعلی پیدا نشد',404);
   const term=question.split(/\s+/).filter(x=>x.length>=3).slice(0,3).map(x=>x.replace(/[\\%_]/g,'').slice(0,30));
   const pattern=term.length?`%${term[0]}%`:'%';
   const docs=(await client.query("SELECT id,title,source_ref,body FROM ai_knowledge_cards WHERE status='APPROVED' AND (title ILIKE $1 OR body ILIKE $1) ORDER BY reviewed_at DESC LIMIT 4",[pattern])).rows;
   return {value:v,docs:chooseSources(docs)};
  });
  const context=sourceSnapshot(source.value,source.docs);
  const requestHash=digest(`${question}|${context}`);const started=Date.now();let answer=null,model=process.env.RHF_AI_MODEL||'gpt-4.1-mini',status='FAILED';let failure='';
  inFlight++;try{let remote=await callOpenAI({apiKey:process.env.RHF_AI_API_KEY,model,question,context});answer=remote.answer;model=String(remote.model).slice(0,80);status='COMPLETED';}catch(e){failure=e.name==='AbortError'?'MODEL_TIMEOUT':'MODEL_UNAVAILABLE';}finally{inFlight--;}
  await scoped(async(client,city)=>{await client.query('INSERT INTO ai_interactions(tenant_id,municipality_id,actor_id,status,model,source_refs,request_sha256,response_sha256,latency_ms) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)',[city.tenant_id,city.id,user.id,status,model,JSON.stringify(source.docs.map(x=>({ref:x.ref,id:x.id}))),requestHash,answer?digest(answer):null,Date.now()-started]);});
  if(status!=='COMPLETED')throw new ClientError(failure==='MODEL_TIMEOUT'?'پاسخ مدل در مهلت مجاز دریافت نشد':'سرویس مدل خارجی در دسترس نبود؛ اطلاعاتی به‌عنوان پاسخ ساخته نشد',502);
  return json(200,{answer,model,sources:source.docs.map(({ref,id,title,sourceRef})=>({ref,id,title,sourceRef})),valueCaseId,notice:'پاسخ هوش مصنوعی پیشنهادی و تأییدنشده است؛ سنجش ارزش و اقدام قانونی یا مالی تنها در گردش‌کار رسمی مجاز است.'});
 }
 throw new ClientError('مسیر AI یا روش درخواست مجاز نیست',405);
}
