import {identifier,fail} from './organization-identity-core.mjs';
import {WASTE_CODE} from './waste-pilot-core.mjs';
import {DEMO_MODE,validCity,allowedSeat,checkNew,checkReview,canDecision,safeRow,origin,SEEDS} from './deputy-demo-core.mjs';
async function unitOf(client,city){
 const r=await client.query(`SELECT p.id,p.kind,p.active FROM org_units p JOIN org_units w ON w.parent_id=p.id AND w.tenant_id=p.tenant_id AND w.municipality_id=p.municipality_id WHERE p.tenant_id=$1 AND p.municipality_id=$2 AND w.code=$3 AND p.kind='DEPUTY' AND p.active=true AND w.active=true LIMIT 2`,[city.tenant_id,city.id,WASTE_CODE]);
 if(r.rows.length!==1)fail('ساختار معاونت مرتبط با سازمان پسماند یکتا نیست',409);return r.rows[0];
}
async function permitFor(client,city,user,role,url){validCity(city);const unit=await unitOf(client,city);let appointment=null;
 if(!user.is_system_admin&&role!=='MUNICIPAL_ADMIN'){
  const aId=identifier(url.searchParams.get('assignmentId'),'شناسه انتصاب');
  appointment=(await client.query('SELECT * FROM rhf_organization_appointments WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND user_id=$4',[aId,city.tenant_id,city.id,user.id])).rows[0];
 }
 return {unit,permit:allowedSeat({user,role,appointment,unit,city})};
}
export async function deputyDemoRoute({client,city,user,role,method,resourceId,req,url,readBody,audit}){
 const {unit,permit}=await permitFor(client,city,user,role,url);const scope=[city.tenant_id,city.id,unit.id];
 const base=(rows)=>({mode:DEMO_MODE,synthetic:true,isolated:true,verifiedPublicValue:false,autonomousDispatch:false,cityId:city.id,deputyUnitId:unit.id,permission:permit.kind,canSeed:permit.canSeed,canCreate:permit.canCreate,canReview:permit.canReview,rows:rows.map(r=>safeRow(r,user)),partial:false});
 if(method==='GET'&&!resourceId){const r=await client.query(`SELECT * FROM rhf_deputy_demo_items WHERE tenant_id=$1 AND municipality_id=$2 AND deputy_unit_id=$3 ORDER BY created_at DESC,id DESC LIMIT 251`,scope);return {...base(r.rows.slice(0,250)),partial:r.rows.length>250};}
 if(method==='GET'&&resourceId){const id=identifier(resourceId);const r=await client.query('SELECT * FROM rhf_deputy_demo_items WHERE tenant_id=$1 AND municipality_id=$2 AND deputy_unit_id=$3 AND id=$4',[...scope,id]);if(!r.rows.length)fail('مورد آزمایشی وجود ندارد',404);const ev=await client.query('SELECT event_type,note,created_at FROM rhf_deputy_demo_events WHERE tenant_id=$1 AND municipality_id=$2 AND item_id=$3 ORDER BY created_at LIMIT 100',[city.tenant_id,city.id,id]);return {...base(r.rows),events:ev.rows};}
 if(method==='POST'&&!resourceId){origin(req);const b=await readBody(req);
  if(b?.action==='SEED'){
   if(!permit.canSeed||Object.keys(b).length!==1)fail('بارگذاری فقط توسط مدیر سامانه مجاز است',403);
   let created=0;for(const s of SEEDS){const r=await client.query(`INSERT INTO rhf_deputy_demo_items(tenant_id,municipality_id,deputy_unit_id,org_key,kind,code,title,description,metric_value,metric_unit,status,created_by) VALUES($1,$2,$3,$4,'RECORD',$5,$6,$7,$8,$9,'FIXTURE',$10) ON CONFLICT(tenant_id,municipality_id,deputy_unit_id,code) DO NOTHING RETURNING id`,[...scope,s.orgKey,s.code,s.title,s.description,s.value,s.unit,user.id]);created+=r.rows.length;}
   if(created)await audit(client,city,user,'DEPUTY_SYNTHETIC',unit.id,'SEED',{created,synthetic:true});return {...base([]),seeded:created,total:SEEDS.length};
  }
  if(!permit.canCreate)fail('اختیار ثبت سناریوی معاونت وجود ندارد',403);
  const x=checkNew(b);if(b.action!=='CREATE')fail('عملیات نامعتبر');
  const code='RHF710-'+x.requestKey;
  const ins=await client.query(`INSERT INTO rhf_deputy_demo_items(tenant_id,municipality_id,deputy_unit_id,request_key,org_key,kind,code,title,description,metric_value,metric_target,metric_unit,status,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'SUBMITTED',$13) ON CONFLICT(tenant_id,municipality_id,request_key) DO NOTHING RETURNING *`,[...scope,x.requestKey,x.orgKey,x.kind,code,x.title,x.description,x.value,x.target,x.unit,user.id]);
  let row=ins.rows[0];if(!row){row=(await client.query('SELECT * FROM rhf_deputy_demo_items WHERE tenant_id=$1 AND municipality_id=$2 AND request_key=$3',[city.tenant_id,city.id,x.requestKey])).rows[0];if(!row||row.created_by!==user.id||row.org_key!==x.orgKey||row.kind!==x.kind||row.title!==x.title||row.description!==x.description||Number(row.metric_value)!==x.value||(row.metric_target===null?null:Number(row.metric_target))!==x.target||row.metric_unit!==x.unit)fail('کلید قبلی با محتوای متفاوت ثبت شده',409);return {...base([row]),idempotent:true};}
  await client.query(`INSERT INTO rhf_deputy_demo_events(tenant_id,municipality_id,item_id,actor_id,event_type,note) VALUES($1,$2,$3,$4,'CREATE',$5)`,[city.tenant_id,city.id,row.id,user.id,'ثبت آزمایشی بدون اثر میدانی']);await audit(client,city,user,'DEPUTY_SYNTHETIC',row.id,'CREATE',{org:x.orgKey,kind:x.kind});return {...base([row]),idempotent:false};
 }
 if(method==='PATCH'&&resourceId){origin(req);const b=checkReview(await readBody(req));const id=identifier(resourceId);const r=await client.query('SELECT * FROM rhf_deputy_demo_items WHERE tenant_id=$1 AND municipality_id=$2 AND deputy_unit_id=$3 AND id=$4 FOR UPDATE',[...scope,id]);if(!r.rows.length)fail('مورد یافت نشد',404);const row=r.rows[0];canDecision(user,permit,row);if(b.version!==row.version)fail('تغییر هم‌زمان نسخه',409);
  const upd=await client.query(`UPDATE rhf_deputy_demo_items SET status=$5,version=version+1,reviewed_by=$6,reviewed_at=now(),review_note=$7 WHERE tenant_id=$1 AND municipality_id=$2 AND deputy_unit_id=$3 AND id=$4 AND version=$8 RETURNING *`,[...scope,id,b.decision,user.id,b.note,b.version]);if(upd.rows.length!==1)fail('تغییر هم‌زمان',409);
  await client.query(`INSERT INTO rhf_deputy_demo_events(tenant_id,municipality_id,item_id,actor_id,event_type,note) VALUES($1,$2,$3,$4,$5,$6)`,[city.tenant_id,city.id,id,user.id,b.decision,b.note]);await audit(client,city,user,'DEPUTY_SYNTHETIC',id,b.decision,{org:row.org_key,independent:true,verifiedPublicValue:false});return {...base(upd.rows),independent:true};
 }
 fail('مسیر آزمایشگاه معاونت معتبر نیست',404);
}
