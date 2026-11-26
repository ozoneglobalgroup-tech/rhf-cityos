/** Typed append-only operational journal for synthetic waste pilot. No autonomous dispatch. */
import {randomUUID} from 'node:crypto';
import {ClientError} from './domain.mjs';
import {RECORD_KINDS,LEGAL_ROLES,READ_ROLES,WRITE_ROLES,REVIEW_ROLES,validateRecord,safeSummary,deriveAgentCandidates} from './waste-suite-defs.mjs';
import {isWasteDemoCity,isWasteOrganization,WASTE_CODE} from './waste-pilot-core.mjs';
import {wastePermissions} from './waste-authorization.mjs';
export const WASTE_SUITE_PARTS=Object.freeze(['waste-suite']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(message,status=400){throw new ClientError(message,status)}
function canonical(obj){return JSON.stringify(Object.keys(obj||{}).sort().map(k=>[k,obj[k]]))}
function checkOrigin(req){
 const o=req.headers?.origin;
 if(!o)fail('BROWSER_ORIGIN_REQUIRED',403);
 let parsed;try{parsed=new URL(o)}catch{fail('INVALID_ORIGIN',403)}
 if(!['http:','https:'].includes(parsed.protocol)||parsed.host!==req.headers.host||parsed.protocol!==(process.env.PUBLIC_HTTPS==='true'?'https:':'http:'))fail('ORIGIN_MISMATCH',403);
}
async function findOrg(client,city){
 const r=await client.query(`SELECT o.id,o.parent_id,o.code,o.kind,o.active,p.kind parent_kind,p.active parent_active,p.name_fa parent_name_fa
 FROM org_units o JOIN org_units p ON p.id=o.parent_id AND p.tenant_id=o.tenant_id AND p.municipality_id=o.municipality_id
 WHERE o.tenant_id=$1 AND o.municipality_id=$2 AND o.code=$3 LIMIT 2`,[city.tenant_id,city.id,WASTE_CODE]);
 if(r.rows.length!==1||!isWasteOrganization(r.rows[0]))fail('WASTE_ORGANIZATION_NOT_READY',409);
 return r.rows[0];
}
export async function wasteSuiteRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json,audit}){
 if(part!=='waste-suite')fail('NOT_FOUND',404);
 if(!['GET','POST','PATCH'].includes(method))fail('METHOD_NOT_ALLOWED',405);
 if(method==='GET'&&resourceId)fail('INVALID_RESOURCE_PATH',404);
 if(method==='POST'&&resourceId)fail('INVALID_RESOURCE_PATH',404);
 if(method==='PATCH'&&!UUID.test(resourceId||''))fail('INVALID_RECORD_ID');
 if(method!=='GET')checkOrigin(req);
 const body=method==='GET'?null:await readBody(req);
 return json(method==='POST'?201:200,await withScope(cityId,user,method==='POST'?'write':'read',async(client,city,role)=>{
  if(!READ_ROLES.has(role))fail('WASTE_ROLE_DENIED',403);
  if(!isWasteDemoCity(city.name))fail('SYNTHETIC_CITY_ONLY',403);
  const org=await findOrg(client,city);
  const allowed=await wastePermissions(client,city,user,role,org);
  if(method==='GET'){
   const r=await client.query(`SELECT id,record_kind,record_code,case_id,related_record_id,occurred_at,payload,evidence_ref,review_state,source_kind,created_by,reviewed_by,created_at,reviewed_at,review_note
    FROM waste_ops_records WHERE tenant_id=$1 AND municipality_id=$2 AND org_unit_id=$3
      AND ($4::boolean OR record_kind NOT IN ('LEGAL','VIOLATION'))
    ORDER BY created_at DESC,id DESC LIMIT 1001`,[city.tenant_id,city.id,org.id,LEGAL_ROLES.has(role)]);
   const all=r.rows.slice(0,1000);const visible=LEGAL_ROLES.has(role)?all:all.filter(x=>x.record_kind!=='LEGAL'&&x.record_kind!=='VIOLATION');
   return {mode:'SYNTHETIC_WASTE_SUITE_V2',organizationId:org.id,cityId:city.id,role,
    rows:visible,partial:r.rows.length>1000,stats:safeSummary(visible),agentCandidates:deriveAgentCandidates(visible),categories:Object.fromEntries(Object.entries(RECORD_KINDS).filter(([k])=>LEGAL_ROLES.has(role)||!['LEGAL','VIOLATION'].includes(k)).map(([k,v])=>[k,v.label])),
    policy:{synthetic:true,recordReviewIsNotValueCertification:true,autonomousExecution:false,legalAccessRestricted:true,
    verifiedOnlyInMetrics:true,permissions:{read:allowed.read,create:allowed.create,review:allowed.review,oversight:allowed.oversight,appointmentVerified:allowed.appointmentVerified},note:'اطلاعات آزمایشی‌اند؛ ثبت بررسی داخلی به معنی نتیجه واقعی میدانی یا اعتبار قضایی نیست.'}};
  }
  if(method==='POST'){
   if(!WRITE_ROLES.has(role)||!allowed.create)fail('WASTE_APPROVED_WRITE_APPOINTMENT_REQUIRED',403);
   if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['kind','requestKey','data','caseId','relatedRecordId','occurredAt','evidenceRef','sourceKind'].includes(k)))fail('UNTRUSTED_FIELD_DENIED');
   if(!Object.hasOwn(RECORD_KINDS,body.kind))fail('INVALID_WASTE_DOMAIN');
   if(['LEGAL','VIOLATION'].includes(body.kind)&&role!=='MUNICIPAL_ADMIN')fail('LEGAL_WRITE_ROLE_DENIED',403);
   if(!UUID.test(body.requestKey||''))fail('INVALID_REQUEST_KEY');
   const payload=(()=>{try{return validateRecord(body.kind,body.data)}catch(e){fail(e.message)}})();
   if((body.sourceKind||'MANUAL')!=='MANUAL')fail('INVALID_SOURCE_KIND');
   if(typeof body.evidenceRef!=='string'||body.evidenceRef.trim().length<12||body.evidenceRef.length>1000)fail('EVIDENCE_REFERENCE_REQUIRED');
   if(body.caseId!==undefined&&body.caseId!==null){if(!UUID.test(body.caseId))fail('INVALID_CASE_ID');const c=await client.query('SELECT 1 FROM service_cases WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND unit_id=$4',[body.caseId,city.tenant_id,city.id,org.id]);if(!c.rows.length)fail('CASE_SCOPE_DENIED',403)}
   if(body.relatedRecordId!==undefined&&body.relatedRecordId!==null){if(!UUID.test(body.relatedRecordId))fail('INVALID_PARENT_RECORD');const p=await client.query('SELECT 1 FROM waste_ops_records WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND org_unit_id=$4',[body.relatedRecordId,city.tenant_id,city.id,org.id]);if(!p.rows.length)fail('RELATED_RECORD_SCOPE_DENIED',403)}
   const code=body.requestKey;const existing=await client.query('SELECT id,record_kind,payload,evidence_ref,case_id,related_record_id FROM waste_ops_records WHERE tenant_id=$1 AND municipality_id=$2 AND request_key=$3',[city.tenant_id,city.id,code]);
   if(existing.rows.length){const x=existing.rows[0];if(x.record_kind!==body.kind||canonical(x.payload)!==canonical(payload)||x.evidence_ref!==body.evidenceRef.trim()||(x.case_id||null)!==(body.caseId||null)||(x.related_record_id||null)!==(body.relatedRecordId||null))fail('IDEMPOTENCY_CONFLICT',409);return {id:x.id,replayed:true,reviewState:'SUBMITTED'}}
   const id=randomUUID();const recorded=body.occurredAt===undefined?null:body.occurredAt;
   if(recorded!==null&&(typeof recorded!=='string'||!Number.isFinite(Date.parse(recorded))))fail('INVALID_EVENT_DATE');
   const inserted=await client.query(`INSERT INTO waste_ops_records(id,tenant_id,municipality_id,org_unit_id,request_key,record_kind,record_code,case_id,related_record_id,occurred_at,payload,evidence_ref,source_kind,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10::timestamptz,now()),$11::jsonb,$12,$13,$14) RETURNING id,review_state`,
    [id,city.tenant_id,city.id,org.id,body.requestKey,body.kind,body.data.scaleTicket||body.data.contractRef||body.data.legalRef||body.data.assetCode||body.requestKey,body.caseId||null,body.relatedRecordId||null,recorded,JSON.stringify(payload),body.evidenceRef.trim(),body.sourceKind||'MANUAL',user.id]);
   await audit(client,city,user,'WASTE_OPS',id,'SUBMIT',{kind:body.kind,orgUnitId:org.id,caseId:body.caseId||null});
   return {id:inserted.rows[0].id,reviewState:inserted.rows[0].review_state,replayed:false,autonomousExecution:false};
  }
  if(method==='PATCH'){
   if(!REVIEW_ROLES.has(role)||!allowed.review)fail('WASTE_REVIEW_ROLE_DENIED',403);
   if(!body||Object.keys(body).some(k=>!['decision','reviewNote'].includes(k))||!['VERIFIED','REJECTED'].includes(body.decision)||typeof body.reviewNote!=='string'||body.reviewNote.trim().length<25||body.reviewNote.length>1500)fail('INVALID_REVIEW_REQUEST');
   const previous=await client.query('SELECT id,created_by,record_kind,review_state FROM waste_ops_records WHERE id=$1 AND tenant_id=$2 AND municipality_id=$3 AND org_unit_id=$4 FOR UPDATE',[resourceId,city.tenant_id,city.id,org.id]);
   if(!previous.rows.length)fail('NOT_FOUND',404);
   const row=previous.rows[0];if(row.created_by===user.id)fail('SELF_REVIEW_FORBIDDEN',403);
   if(row.review_state!=='SUBMITTED')fail('REVIEW_ALREADY_FINAL',409);
   if(['LEGAL','VIOLATION'].includes(row.record_kind)&&role!=='MUNICIPAL_ADMIN')fail('LEGAL_REVIEW_ROLE_DENIED',403);
   await client.query('UPDATE waste_ops_records SET review_state=$2,review_note=$3,reviewed_by=$4,reviewed_at=now() WHERE id=$1',[resourceId,body.decision,body.reviewNote.trim(),user.id]);
   await audit(client,city,user,'WASTE_OPS',resourceId,body.decision,{recordKind:row.record_kind});
   return {id:resourceId,reviewState:body.decision,independent:true,valueCertified:false};
  }
  fail('NOT_FOUND',404);
 }));
}
