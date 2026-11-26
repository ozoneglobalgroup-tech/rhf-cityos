import {identifier,fail} from './organization-identity-core.mjs';
import {WASTE_CODE} from './waste-pilot-core.mjs';
import {validCity,allowedSeat,origin} from './deputy-demo-core.mjs';
import {DOSSIER_MODE,DOSSIER_KEYS,validateFields,validateEvidenceRefs,sampleFields} from './deputy-dossier-schema.mjs';
const textField=(s,min,max,label)=>{if(typeof s!=='string'||s.trim().length<min||s.trim().length>max||/[\x00-\x1f<>]/.test(s))fail(`${label} نامعتبر است`);return s.trim()};
const stableJSON=value=>JSON.stringify(value,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const checkKeys=(o,keys)=>{if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!keys.includes(k)))fail('فیلد نامعتبر یا اضافی در درخواست')};
export function createDossier(b){checkKeys(b,['action','requestKey','orgKey','title','description','fields','evidenceRefs','status']);if(b.action!=='CREATE')fail('عملیات ثبت نامعتبر');identifier(b.requestKey,'کلید یکتا');if(!DOSSIER_KEYS.includes(b.orgKey))fail('حوزه ناشناخته');if(!['DRAFT','SUBMITTED'].includes(b.status))fail('وضعیت آغازین نامعتبر');let fields,refs;try{fields=validateFields(b.orgKey,b.fields);refs=validateEvidenceRefs(b.evidenceRefs)}catch(e){fail(e.message)}return {requestKey:b.requestKey,orgKey:b.orgKey,title:textField(b.title,8,140,'عنوان'),description:textField(b.description,30,1500,'شرح'),fields,evidenceRefs:refs,status:b.status};}
export function patchDossier(b,row,user,permit){checkKeys(b,['action','version','title','description','fields','evidenceRefs','note']);if(!Number.isSafeInteger(b.version)||b.version<1||b.version!==row.version)fail('نسخه پرونده تغییر کرده است',409);
 if(b.action==='SAVE'){
  if(!permit.canCreate||row.created_by!==user.id||row.status!=='DRAFT')fail('فقط ثبت‌کننده می‌تواند پیش‌نویس خود را اصلاح کند',403);
  if(Object.keys(b).some(k=>!['action','version','title','description','fields','evidenceRefs'].includes(k)))fail('فیلد اضافی در ویرایش');let fields,refs;try{fields=validateFields(row.org_key,b.fields);refs=validateEvidenceRefs(b.evidenceRefs)}catch(e){fail(e.message)}return {action:'SAVE',title:textField(b.title,8,140,'عنوان'),description:textField(b.description,30,1500,'شرح'),fields,evidenceRefs:refs,note:'اصلاح نسخه پیش‌نویس آزمایشی'};
 }
 if(b.action==='SUBMIT'){
  if(Object.keys(b).some(k=>!['action','version'].includes(k))||!permit.canCreate||row.created_by!==user.id||row.status!=='DRAFT')fail('ارسال پیش‌نویس فقط برای ثبت‌کننده مجاز است',403);
  return {action:'SUBMIT',note:'ارسال پرونده آزمایشی برای بررسی مستقل'};
 }
 if(['REVIEW','REJECT'].includes(b.action)){
  if(Object.keys(b).some(k=>!['action','version','note'].includes(k))||!permit.canReview||row.created_by===user.id||row.status!=='SUBMITTED')fail('بررسی مستقل این پرونده مجاز نیست',403);
  return {action:b.action,note:textField(b.note,30,1200,'دلیل مستند تصمیم')};
 }
 fail('عملیات ویرایش نامعتبر');}
export function safeDossier(row,user){return {id:row.id,code:row.code,orgKey:row.org_key,title:row.title,description:row.description,fields:row.form_data,evidenceRefs:row.evidence_refs,status:row.status,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,reviewedAt:row.reviewed_at,creatorIsMe:row.created_by===user.id,synthetic:true,verifiedPublicValue:false};}
export async function permitFor(client,city,user,role,url){validCity(city);
 const r=await client.query(`SELECT p.id,p.kind,p.active FROM org_units p JOIN org_units w ON w.parent_id=p.id AND w.tenant_id=p.tenant_id AND w.municipality_id=p.municipality_id WHERE p.tenant_id=$1 AND p.municipality_id=$2 AND w.code=$3 AND p.kind='DEPUTY' AND p.active=true AND w.active=true LIMIT 2`,[city.tenant_id,city.id,WASTE_CODE]);
 if(r.rows.length!==1)fail('ساختار معاونت مرتبط با سازمان پسماند یکتا نیست',409);
 const unit=r.rows[0];let appointment=null;
 if(!user?.is_system_admin&&role!=='MUNICIPAL_ADMIN'){
  const assignmentId=identifier(url.searchParams.get('assignmentId'),'شناسه انتصاب');
  appointment=(await client.query('SELECT * FROM rhf_organization_appointments WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND user_id=$4',[assignmentId,city.tenant_id,city.id,user.id])).rows[0];
 }
 return {unit,permit:allowedSeat({user,role,appointment,unit,city})};
}
export async function deputyDossierRoute({client,city,user,role,method,resourceId,req,url,readBody,audit}){
 const {unit,permit}=await permitFor(client,city,user,role,url);const scope=[city.tenant_id,city.id,unit.id];
 const base=rows=>({mode:DOSSIER_MODE,cityId:city.id,synthetic:true,isolated:true,verifiedPublicValue:false,autonomousDispatch:false,permission:permit.kind,canCreate:permit.canCreate,canReview:permit.canReview,canSeed:permit.canSeed,rows:rows.map(r=>safeDossier(r,user)),partial:false});
 if(method==='GET'&&!resourceId){const org=url.searchParams.get('orgKey');if(org&&!DOSSIER_KEYS.includes(org))fail('شناسه حوزه معتبر نیست');const params=org?[...scope,org]:scope;
 const q=org?' AND org_key=$4':'';const found=await client.query(`SELECT * FROM rhf_deputy_dossiers WHERE tenant_id=$1 AND municipality_id=$2 AND deputy_unit_id=$3${q} ORDER BY created_at DESC,id DESC LIMIT 201`,params);return {...base(found.rows.slice(0,200)),partial:found.rows.length>200};}
 if(method==='GET'&&resourceId){const id=identifier(resourceId);const row=(await client.query('SELECT * FROM rhf_deputy_dossiers WHERE tenant_id=$1 AND municipality_id=$2 AND deputy_unit_id=$3 AND id=$4',[...scope,id])).rows[0];if(!row)fail('پرونده تخصصی یافت نشد',404);const ev=await client.query('SELECT event_type,note,created_at FROM rhf_deputy_dossier_events WHERE tenant_id=$1 AND municipality_id=$2 AND item_id=$3 ORDER BY created_at,id LIMIT 100',[city.tenant_id,city.id,id]);return {...base([row]),events:ev.rows};}
 if(method==='POST'&&!resourceId){origin(req);const b=await readBody(req);
  if(b?.action==='SEED'){
   if(!permit.canSeed||Object.keys(b).length!==1)fail('سناریوهای آزمایشی فقط توسط مدیر سامانه بارگذاری می‌شوند',403);
   let created=0;for(const orgKey of DOSSIER_KEYS){const seed={fields:sampleFields(orgKey),evidenceRefs:[{label:'ارجاع آزمایشی سند پایه',referenceCode:`DEMO-${orgKey}-SEED1`}]};const r=await client.query(`INSERT INTO rhf_deputy_dossiers(tenant_id,municipality_id,deputy_unit_id,org_key,code,title,description,form_data,evidence_refs,status,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,'FIXTURE',$10) ON CONFLICT(tenant_id,municipality_id,deputy_unit_id,code) DO NOTHING RETURNING id`,[...scope,orgKey,`DEMO-DOSSIER-${orgKey}-01`,`پرونده آزمایشی ${orgKey}`,`سناریوی تخصصی کاملاً مصنوعی برای آزمون سوابق و فرم‌های حوزه ${orgKey}؛ فاقد سند میدانی و اثر اجرایی.`,JSON.stringify(seed.fields),JSON.stringify(seed.evidenceRefs),user.id]);created+=r.rows.length;}
   if(created)await audit(client,city,user,'DEPUTY_SYNTHETIC_DOSSIER',unit.id,'SEED',{created,synthetic:true});return {...base([]),seeded:created,total:DOSSIER_KEYS.length};
  }
  if(!permit.canCreate)fail('اختیار ثبت پرونده تخصصی وجود ندارد',403);
  const x=createDossier(b);const inserted=await client.query(`INSERT INTO rhf_deputy_dossiers(tenant_id,municipality_id,deputy_unit_id,request_key,org_key,code,title,description,form_data,evidence_refs,status,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12) ON CONFLICT(tenant_id,municipality_id,request_key) DO NOTHING RETURNING *`,[...scope,x.requestKey,x.orgKey,`RHF8P2-${x.requestKey}`,x.title,x.description,JSON.stringify(x.fields),JSON.stringify(x.evidenceRefs),x.status,user.id]);
  let row=inserted.rows[0];if(!row){row=(await client.query('SELECT * FROM rhf_deputy_dossiers WHERE tenant_id=$1 AND municipality_id=$2 AND deputy_unit_id=$3 AND request_key=$4',[...scope,x.requestKey])).rows[0];if(!row||row.created_by!==user.id||row.org_key!==x.orgKey||row.title!==x.title||row.description!==x.description||stableJSON(row.form_data)!==stableJSON(x.fields)||stableJSON(row.evidence_refs)!==stableJSON(x.evidenceRefs)||row.status!==x.status)fail('کلید درخواست قبلی با محتوای دیگری ثبت شده است',409);return {...base([row]),idempotent:true};}
  await client.query(`INSERT INTO rhf_deputy_dossier_events(tenant_id,municipality_id,item_id,actor_id,event_type,note) VALUES($1,$2,$3,$4,'CREATE',$5)`,[city.tenant_id,city.id,row.id,user.id,'ثبت پرونده تخصصی آزمایشی']);await audit(client,city,user,'DEPUTY_SYNTHETIC_DOSSIER',row.id,'CREATE',{org:x.orgKey,status:x.status});return {...base([row]),idempotent:false};
 }
 if(method==='PATCH'&&resourceId){origin(req);const id=identifier(resourceId);const row=(await client.query('SELECT * FROM rhf_deputy_dossiers WHERE tenant_id=$1 AND municipality_id=$2 AND deputy_unit_id=$3 AND id=$4 FOR UPDATE',[...scope,id])).rows[0];if(!row)fail('پرونده یافت نشد',404);const x=patchDossier(await readBody(req),row,user,permit);
  let result;
  if(x.action==='SAVE'){result=await client.query(`UPDATE rhf_deputy_dossiers SET title=$5,description=$6,form_data=$7::jsonb,evidence_refs=$8::jsonb,updated_at=now(),version=version+1 WHERE tenant_id=$1 AND municipality_id=$2 AND deputy_unit_id=$3 AND id=$4 AND version=$9 RETURNING *`,[...scope,id,x.title,x.description,JSON.stringify(x.fields),JSON.stringify(x.evidenceRefs),row.version]);}
  else{const status=x.action==='SUBMIT'?'SUBMITTED':x.action==='REVIEW'?'REVIEWED':'REJECTED';result=await client.query(`UPDATE rhf_deputy_dossiers SET status=$5,version=version+1,updated_at=now(),reviewed_by=CASE WHEN $6::boolean THEN $7::uuid ELSE reviewed_by END,reviewed_at=CASE WHEN $6::boolean THEN now() ELSE reviewed_at END,review_note=CASE WHEN $6::boolean THEN $8 ELSE review_note END WHERE tenant_id=$1 AND municipality_id=$2 AND deputy_unit_id=$3 AND id=$4 AND version=$9 RETURNING *`,[...scope,id,status,x.action==='REVIEW'||x.action==='REJECT',user.id,x.note,row.version]);}
  if(result.rows.length!==1)fail('تداخل نسخه در تغییر پرونده',409);
  await client.query(`INSERT INTO rhf_deputy_dossier_events(tenant_id,municipality_id,item_id,actor_id,event_type,note) VALUES($1,$2,$3,$4,$5,$6)`,[city.tenant_id,city.id,id,user.id,x.action,x.note]);await audit(client,city,user,'DEPUTY_SYNTHETIC_DOSSIER',id,x.action,{org:row.org_key,synthetic:true,verifiedPublicValue:false});return {...base(result.rows),independent:x.action==='REVIEW'||x.action==='REJECT'};
 }
 fail('مسیر پرونده‌های تخصصی معتبر نیست',404);
}
