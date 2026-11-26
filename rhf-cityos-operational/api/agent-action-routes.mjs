import {ClientError} from './domain.mjs';
import {ACTION_PARTS,READ_ROLES,WRITE_ROLES,validId,validateProposal,validateDecision,allowedTransition,safeRecord} from './agent-action-core.mjs';
export {ACTION_PARTS};
function forbid(){throw new ClientError('این نقش اجازه دسترسی به صف اقدامات عامل را ندارد',403);}
const listSQL=`SELECT a.*,c.summary AS case_summary FROM agent_followup_actions a JOIN service_cases c ON c.id=a.case_id AND c.tenant_id=a.tenant_id AND c.municipality_id=a.municipality_id ORDER BY a.created_at DESC,a.id DESC LIMIT 50`;
function convert(e){
 const m={ROLE_DENIED:403,REVIEW_ROLE_DENIED:403,SELF_APPROVAL_DENIED:403,EXECUTE_ROLE_DENIED:403,CANCEL_ROLE_DENIED:403,INVALID_STATE:409};
 if(m[e.message])throw new ClientError(({SELF_APPROVAL_DENIED:'ایجادکننده نمی‌تواند پیشنهاد خود را تأیید کند',INVALID_STATE:'وضعیت اقدام اجازه این تغییر را نمی‌دهد'}[e.message])||'نقش یا اختیار این عملیات مجاز نیست',m[e.message]);
 throw new ClientError('ورودی اقدام عامل معتبر نیست',400);
}
export async function agentActionRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json,audit}){
 if(part!=='agent-followups')throw new ClientError('مسیر اقدام عامل معتبر نیست',404);
 if(method==='GET'&&!resourceId)return json(200,await withScope(cityId,user,'read',async(client,city,role)=>{
   if(!READ_ROLES.includes(role))forbid();return {rows:(await client.query(listSQL)).rows.map(safeRecord),limit:50,scope:city.id,notice:'اقدامات فقط وظیفه پیگیری داخلی هستند؛ پرونده و امور مالی تغییر نمی‌کنند.'};
 }));
 if(method==='POST'&&!resourceId){
   let b;try{b=validateProposal(await readBody(req));}catch{throw new ClientError('شناسه، کد یکتا یا شرح پیشنهاد معتبر نیست',400);}
   return json(201,await withScope(cityId,user,'write',async(client,city,role)=>{
     if(!WRITE_ROLES.includes(role))forbid();
     const match=await client.query('SELECT * FROM agent_followup_actions WHERE request_key=$1 FOR UPDATE',[b.requestKey]);
     if(match.rows.length){const x=match.rows[0];if(x.case_id!==b.caseId||x.note!==b.note||x.created_by!==user.id||x.kind!==b.kind)throw new ClientError('کلید درخواست قبلاً برای اقدام متفاوت استفاده شده است',409);return {action:safeRecord(x),idempotent:true};}
     const existing=await client.query('SELECT status FROM service_cases WHERE id=$1',[b.caseId]);if(!existing.rows.length)throw new ClientError('پرونده در همین شهرداری پیدا نشد',404);
     const r=await client.query(`INSERT INTO agent_followup_actions(tenant_id,municipality_id,case_id,request_key,kind,note,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (tenant_id,municipality_id,request_key) DO NOTHING RETURNING *`,[city.tenant_id,city.id,b.caseId,b.requestKey,b.kind,b.note,user.id]);
     if(!r.rows.length){const found=(await client.query('SELECT * FROM agent_followup_actions WHERE request_key=$1',[b.requestKey])).rows[0];if(!found||found.case_id!==b.caseId||found.note!==b.note||found.created_by!==user.id)throw new ClientError('کلید درخواست قبلاً برای اقدام متفاوت استفاده شده است',409);return {action:safeRecord(found),idempotent:true};}
     await audit(client,city,user,'GOVERNED_AGENT_ACTION',r.rows[0].id,'PROPOSED',{kind:b.kind,caseId:b.caseId});return {action:safeRecord(r.rows[0]),idempotent:false};
   }));
 }
 if(method==='PATCH'&&resourceId){
   if(!validId(resourceId))throw new ClientError('شناسه اقدام معتبر نیست',400);
   let b;try{b=validateDecision(await readBody(req));}catch{throw new ClientError('نوع یا مستند تصمیم معتبر نیست',400);}
   return json(200,await withScope(cityId,user,'write',async(client,city,role)=>{
     if(!WRITE_ROLES.includes(role))forbid();
     const r=await client.query('SELECT * FROM agent_followup_actions WHERE id=$1 FOR UPDATE',[resourceId]);if(!r.rows.length)throw new ClientError('اقدام در همین شهرداری یافت نشد',404);
     const x=r.rows[0];let next;try{next=allowedTransition(x,b.action,role,user.id);}catch(e){convert(e);}
     const stamp={AUTHORIZED:'approved',REJECTED:'approved',EXECUTED:'executed',CANCELLED:'cancelled'}[next];
     const actorCol={approved:'approved_by',executed:'executed_by',cancelled:'cancelled_by'}[stamp];
     const whenCol={approved:'approved_at',executed:'executed_at',cancelled:'cancelled_at'}[stamp];
     const noteCol={approved:'review_note',executed:'execution_note',cancelled:'cancel_note'}[stamp];
     // All SQL identifiers are constants from a closed server-side allowlist.
     const out=await client.query(`UPDATE agent_followup_actions SET status=$2,${actorCol}=$3,${whenCol}=now(),${noteCol}=$4,updated_at=now() WHERE id=$1 RETURNING *`,[resourceId,next,user.id,b.note]);
     await audit(client,city,user,'GOVERNED_AGENT_ACTION',resourceId,next,{kind:x.kind,caseId:x.case_id});return {action:safeRecord(out.rows[0]),reversible:next==='EXECUTED',affectedOperationalRecords:0};
   }));
 }
 throw new ClientError('متد عملیات عامل پشتیبانی نمی‌شود',405);
}
