/** Synthetic-only waste organization workbench. No writes to waste_ops_records or live BPMS. */
import {randomUUID} from 'node:crypto';
import {identifier,fail,isCurrent} from './organization-identity-core.mjs';
import {isWasteDemoCity,isWasteOrganization,WASTE_CODE} from './waste-pilot-core.mjs';
import {LAB_MODE,RESTRICTED,guardCity,checkRequestOrigin,exactKeys,access,domainAllowed,normalizedRecord,normalizedFlow,normalizedReview,canReview,safeRow,sampleRecords,sampleFlows} from './waste-lab-core.mjs';
async function getWasteOrg(client,city){
 const r=await client.query(`SELECT o.id,o.code,o.kind,o.active,p.kind AS parent_kind,p.active AS parent_active,p.name_fa AS parent_name_fa FROM org_units o JOIN org_units p ON p.id=o.parent_id AND p.tenant_id=o.tenant_id AND p.municipality_id=o.municipality_id WHERE o.tenant_id=$1 AND o.municipality_id=$2 AND o.code=$3 LIMIT 2`,[city.tenant_id,city.id,WASTE_CODE]);
 if(r.rows.length!==1||!isWasteOrganization(r.rows[0]))fail('ساختار سازمان مدیریت پسماند آماده نیست',409);return r.rows[0];
}
async function ownerAccess(client,city,user,role,assignmentId){
 guardCity(city);const org=await getWasteOrg(client,city);
 if(user.is_system_admin)return {org,permit:{kind:'ADMIN',canRestricted:true,canReview:true,canWrite:true}};
 if(role==='MUNICIPAL_ADMIN')return {org,permit:{kind:'REVIEWER',canRestricted:false,canReview:true,canWrite:false}};
 const id=identifier(assignmentId,'شناسه انتصاب');const r=await client.query(`SELECT * FROM rhf_organization_appointments WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND user_id=$4`,[id,city.tenant_id,city.id,user.id]);
 const a=r.rows[0];const permit=access({user,city,role,appointment:a,unit:org});
 return {org,permit:{...permit,canWrite:true}};
}
function output(city,org,permit,rows,partial=false){return {mode:LAB_MODE,cityId:city.id,orgUnitId:org.id,scope:permit.kind,canWrite:permit.canWrite,canReview:permit.canReview,canRestricted:permit.canRestricted,synthetic:true,isolated:true,notFieldVerified:true,verifiedPublicValue:false,autonomousDispatch:false,rows:rows.map(safeRow),partial};}
function canonical(x){return JSON.stringify(Object.entries(x||{}).sort(([a],[b])=>a.localeCompare(b)));}
async function logEvent(client,city,rowId,user,action,note){await client.query(`INSERT INTO rhf_waste_lab_events(tenant_id,municipality_id,item_id,actor_id,action,note) VALUES($1,$2,$3,$4,$5,$6)`,[city.tenant_id,city.id,rowId,user.id,action,note]);}
export async function wasteLabRoute({client,city,user,role,method,resourceId,req,url,readBody,audit}){
 const {org,permit}=await ownerAccess(client,city,user,role,url.searchParams.get('assignmentId'));
 const scope=[city.tenant_id,city.id,org.id];
 if(method==='GET'&&!resourceId){
  const r=await client.query(`SELECT * FROM rhf_waste_lab_items WHERE tenant_id=$1 AND municipality_id=$2 AND org_unit_id=$3 AND ($4::boolean OR (domain NOT IN ('LEGAL','VIOLATION') AND NOT (kind='FLOW' AND payload->>'processKind'='LEGAL_REVIEW'))) ORDER BY created_at DESC,id DESC LIMIT 301`,[...scope,permit.canRestricted]);
  return output(city,org,permit,r.rows.slice(0,300),r.rows.length>300);
 }
 if(method==='GET'&&resourceId){const rid=identifier(resourceId,'شناسه رکورد');const r=await client.query(`SELECT * FROM rhf_waste_lab_items WHERE tenant_id=$1 AND municipality_id=$2 AND org_unit_id=$3 AND id=$4`,[...scope,rid]);const item=r.rows[0];if(!item)fail('رکورد در سازمان یافت نشد',404);if((RESTRICTED.has(item.domain)||(item.kind==='FLOW'&&item.payload?.processKind==='LEGAL_REVIEW'))&&!permit.canRestricted)fail('رکورد محدود شده است',403);
 const e=await client.query(`SELECT action,note,actor_id,created_at FROM rhf_waste_lab_events WHERE tenant_id=$1 AND municipality_id=$2 AND item_id=$3 ORDER BY created_at,id LIMIT 101`,[city.tenant_id,city.id,rid]);return {...output(city,org,permit,[item]),events:e.rows.slice(0,100),partial:e.rows.length>100};}
 if(method==='POST'&&!resourceId){checkRequestOrigin(req);const b=await readBody(req);if(!b||typeof b!=='object'||Array.isArray(b))fail('فرم نامعتبر است');
  if(b.action==='SEED'){
   exactKeys(b,['action']);if(!user.is_system_admin)fail('بارگذاری سناریو فقط با حساب مدیر سامانه مجاز است',403);
   const fixtures=[...sampleRecords().map(x=>({kind:'RECORD',domain:x.domain,code:x.code,payload:x.payload,evidenceRef:x.evidenceRef})),...sampleFlows().map(x=>({kind:'FLOW',domain:'BPMS',code:x.code,title:x.title,description:x.description,payload:{processKind:x.kind,metric:x.metric??null,unit:x.unit??null,baseline:x.baseline??null,target:x.target??null},evidenceRef:`SYNTHETIC-V75/${x.code}`}))];let created=0;
   for(const x of fixtures){const r=await client.query(`INSERT INTO rhf_waste_lab_items(tenant_id,municipality_id,org_unit_id,kind,domain,code,title,description,payload,evidence_ref,status,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,'FIXTURE',$11) ON CONFLICT(tenant_id,municipality_id,org_unit_id,code) DO NOTHING RETURNING id`,[...scope,x.kind,x.domain,x.code,x.title||null,x.description||null,JSON.stringify(x.payload),x.evidenceRef,user.id]);if(r.rows.length){created++;await logEvent(client,city,r.rows[0].id,user,'SEEDED','سناریوی کاملاً ساختگی V7.5؛ بدون عملیات میدانی');}}
   if(created)await audit(client,city,user,'WASTE_LAB',org.id,'SYNTHETIC_SEED',{created});return {mode:LAB_MODE,seeded:created,totalFixtures:fixtures.length,synthetic:true};
  }
  if(!permit.canWrite)fail('ایجادکننده مجاز نیست',403);
  if(b.action==='CREATE_RECORD'){
   exactKeys(b,['action','requestKey','domain','code','data','evidenceRef']);const x=normalizedRecord({domain:b.domain,code:b.code,data:b.data,evidenceRef:b.evidenceRef,requestKey:b.requestKey},permit);
   const r=await client.query(`INSERT INTO rhf_waste_lab_items(tenant_id,municipality_id,org_unit_id,request_key,kind,domain,code,payload,evidence_ref,status,created_by) VALUES($1,$2,$3,$4,'RECORD',$5,$6,$7::jsonb,$8,'SUBMITTED',$9) ON CONFLICT(tenant_id,municipality_id,request_key) DO NOTHING RETURNING *`,[...scope,x.requestKey,x.domain,x.code,JSON.stringify(x.payload),x.evidenceRef,user.id]);
   let item=r.rows[0];if(!item){item=(await client.query(`SELECT * FROM rhf_waste_lab_items WHERE tenant_id=$1 AND municipality_id=$2 AND request_key=$3`,[city.tenant_id,city.id,x.requestKey])).rows[0];if(!item||item.created_by!==user.id||item.kind!=='RECORD'||item.domain!==x.domain||item.code!==x.code||item.evidence_ref!==x.evidenceRef||canonical(item.payload)!==canonical(x.payload))fail('کلید تکراری با محتوا متفاوت است',409);return {mode:LAB_MODE,item:safeRow(item),idempotent:true};}
   await logEvent(client,city,item.id,user,'SUBMITTED','ثبت آزمایشی؛ نیازمند بررسی مستقل');await audit(client,city,user,'WASTE_LAB',item.id,'SUBMIT',{domain:x.domain,synthetic:true});return {mode:LAB_MODE,item:safeRow(item),idempotent:false};
  }
  if(b.action==='CREATE_FLOW'){
   const f=normalizedFlow(b,permit);
   if(f.relatedRecordId){const rel=(await client.query(`SELECT kind,domain FROM rhf_waste_lab_items WHERE tenant_id=$1 AND municipality_id=$2 AND org_unit_id=$3 AND id=$4`,[...scope,f.relatedRecordId])).rows[0];if(!rel||rel.kind!=='RECORD'||(RESTRICTED.has(rel.domain)&&!permit.canRestricted))fail('انتساب رکورد خارج از محدوده است',403);}
   const payload={processKind:f.kind,metric:f.metric,unit:f.unit,baseline:f.baseline,target:f.target};const r=await client.query(`INSERT INTO rhf_waste_lab_items(tenant_id,municipality_id,org_unit_id,request_key,kind,domain,code,title,description,payload,evidence_ref,related_record_id,status,created_by) VALUES($1,$2,$3,$4,'FLOW','BPMS',$5,$6,$7,$8::jsonb,$9,$10,'SUBMITTED',$11) ON CONFLICT(tenant_id,municipality_id,request_key) DO NOTHING RETURNING *`,[...scope,f.requestKey,'DEMO-FLOW-'+f.requestKey,f.title,f.description,JSON.stringify(payload),'SYNTHETIC-V75/MANUAL',f.relatedRecordId,user.id]);
   let item=r.rows[0];if(!item){item=(await client.query(`SELECT * FROM rhf_waste_lab_items WHERE tenant_id=$1 AND municipality_id=$2 AND request_key=$3`,[city.tenant_id,city.id,f.requestKey])).rows[0];if(!item||item.created_by!==user.id||item.kind!=='FLOW'||item.title!==f.title||item.description!==f.description||canonical(item.payload)!==canonical(payload)||(item.related_record_id||null)!==f.relatedRecordId)fail('کلید گردش‌کار با درخواست متفاوت استفاده شده',409);return {mode:LAB_MODE,item:safeRow(item),idempotent:true};}
   await logEvent(client,city,item.id,user,'SUBMITTED','درخواست فرایند آزمایشی؛ اجرای خودکار ممنوع');await audit(client,city,user,'WASTE_LAB',item.id,'FLOW_SUBMIT',{type:f.kind,synthetic:true});return {mode:LAB_MODE,item:safeRow(item),idempotent:false};
  }
  fail('عملیات ثبت ناشناخته است',400);
 }
 if(method==='PATCH'&&resourceId){checkRequestOrigin(req);const b=normalizedReview(await readBody(req));const rid=identifier(resourceId,'شناسه');const r=await client.query(`SELECT * FROM rhf_waste_lab_items WHERE tenant_id=$1 AND municipality_id=$2 AND org_unit_id=$3 AND id=$4 FOR UPDATE`,[...scope,rid]);const item=r.rows[0];if(!item)fail('رکورد یافت نشد',404);if((RESTRICTED.has(item.domain)||(item.kind==='FLOW'&&item.payload?.processKind==='LEGAL_REVIEW'))&&!user.is_system_admin)fail('دسترسی محدود است',403);canReview(permit,user,item);if(item.version!==b.version)fail('نسخه درخواست تغییر کرده است',409);
 const upd=await client.query(`UPDATE rhf_waste_lab_items SET status=$5,version=version+1,reviewed_by=$6,reviewed_at=now(),review_note=$7 WHERE tenant_id=$1 AND municipality_id=$2 AND org_unit_id=$3 AND id=$4 AND version=$8 RETURNING *`,[...scope,rid,b.decision,user.id,b.note,b.version]);if(!upd.rows.length)fail('ویرایش هم‌زمان',409);
 await logEvent(client,city,rid,user,b.decision,b.note);await audit(client,city,user,'WASTE_LAB',rid,b.decision,{synthetic:true,realWorldVerified:false});return {mode:LAB_MODE,item:safeRow(upd.rows[0]),independent:true,valueCertified:false};
 }
 fail('مسیر نامعتبر',404);
}
