/** RHF City OS V7.1 — organizational hierarchy and fail-closed display policy.
 * No new authority, database reads, writes or artificial performance values.
 * City and unit visibility is advisory: enforcement MUST remain on server/RLS.
 */
export const ORG_OS_V7='RHF-CITY-ORG-V7.1';
export const WASTE_ORG_CODE='DEMO_WASTE_ORG';
export const UNIT_KINDS=new Set(['MUNICIPALITY','DEPUTY','ORGANIZATION','DIRECTORATE','DEPARTMENT','DISTRICT','SUBDISTRICT','SITE','OPERATION_TEAM','CONTRACTOR_INTERFACE']);
export const UAT_V7=Object.freeze([
 ['city','شهرداری به‌عنوان ریشه ساختار و نه نقش شخصی'],
 ['deputy','معاونت خدمات شهری زیر شهردار و بالای پسماند'],
 ['waste','سازمان پسماند و زیرواحدهای واقعی'],
 ['no-fake','بدون عدد مصنوعی و بدون ادعای ارزش واقعی'],
 ['mayor-preview','عدم معرفی MUNICIPAL_ADMIN به‌عنوان شهردار واقعی'],
 ['deputy-binding','بسته‌ماندن اطلاعات اختصاصی معاون بدون انتساب سروری'],
 ['director-binding','عدم ورود مدیرعامل بدون ثبت مدیریت و تطبیق هویت'],
 ['other-orgs','سایر سازمان‌ها فقط ساختار؛ بدون ماژول ساختگی'],
 ['case-scope','شمارش صرفاً با unit_id یا owner_unit_id صریح'],
 ['missing','پاسخ خطادار/ناقص به‌عنوان نامشخص، نه صفر'],
 ['links','ورود به میزکار معاونت و V6 پسماند از مسیر قبلی'],
 ['auth','رد دسترسی ناشناس و اعمال RLS سروری'],
 ['tenant','آزمون عدم نشت داده بین شهرداری‌ها و سازمان‌ها'],
 ['agent','عدم اعلام اجرای خودکار LangGraph/Temporal'],
 ['value','عدم انتساب ارزش شهری آزمایشی به واقعیت'],
 ['regression','حفظ V6، V5 و مسیرهای فعلی و امکان بازیابی'],
]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUUID=x=>typeof x==='string'&&UUID.test(x);
const cleanText=(x,max=100)=>typeof x==='string'?x.trim().slice(0,max):'';
export function isSyntheticShiraz(name){return /شیراز/.test(name||'')&&/دمو\s*آزمایشی/.test(name||'');}
export function buildOrganizationHierarchy({units,city,cityName}={}){
 if(!isUUID(city))return {state:'INVALID_CITY',error:'شناسه شهرداری معتبر نیست'};
 if(!Array.isArray(units))return {state:'NOT_LOADED',error:'ساختار از API معتبر دریافت نشده است'};
 if(units.length>5000)return {state:'INVALID_DATA',error:'فهرست ساختار برای این نسخه بیش از ظرفیت کنترل است'};
 const byId=new Map(),children=new Map();
 for(const u of units){
  if(!u||!isUUID(u.id)||byId.has(u.id)||!UNIT_KINDS.has(u.kind)||typeof u.name_fa!=='string'||!u.name_fa.trim()||typeof u.code!=='string'||(u.parent_id!==null&&u.parent_id!==undefined&&!isUUID(u.parent_id)))
   return {state:'INVALID_DATA',error:'ساختار واحدها شامل شناسه، نقش سازمانی یا رابطه نامعتبر است'};
  byId.set(u.id,{id:u.id,parentId:u.parent_id||null,kind:u.kind,code:cleanText(u.code,100),title:cleanText(u.name_fa,160),active:u.active===true});
 }
 for(const u of byId.values()){
  if(u.parentId&&!byId.has(u.parentId))return {state:'INVALID_DATA',error:'واحد دارای پدر ناموجود است'};
  const visited=new Set([u.id]);let next=u.parentId;
  while(next){if(visited.has(next))return {state:'INVALID_DATA',error:'چرخه در ساختار سازمانی'};visited.add(next);next=byId.get(next)?.parentId||null;}
  if(u.parentId){const list=children.get(u.parentId)||[];list.push(u);children.set(u.parentId,list);}
 }
 const wasteCandidates=[...byId.values()].filter(u=>u.code===WASTE_ORG_CODE&&u.kind==='ORGANIZATION'&&u.active);
 if(wasteCandidates.length>1)return {state:'INVALID_DATA',error:'سازمان پسماند دارای شناسه تکراری در شهرداری است'};
 const waste=wasteCandidates[0]||null;
 const wasteParent=waste&&byId.get(waste.parentId);
 const deputy=wasteParent?.kind==='DEPUTY'&&wasteParent.active&&/خدمات\s*شهری/.test(wasteParent.title)?wasteParent:null;
 const deputies=[...byId.values()].filter(u=>u.kind==='DEPUTY'&&u.active).sort((a,b)=>a.title.localeCompare(b.title,'fa'));
 function subtree(root){if(!root||!isUUID(root.id))return new Set();const ids=new Set(),queue=[root.id];while(queue.length){const id=queue.shift();if(ids.has(id))continue;ids.add(id);for(const child of children.get(id)||[])queue.push(child.id);}return ids;}
 const deputyIds=subtree(deputy),wasteIds=subtree(waste);
 const deputysOrgs=[...byId.values()].filter(u=>deputyIds.has(u.id)&&u.kind==='ORGANIZATION'&&u.active);
 return {state:'READY',city,cityName:cleanText(cityName,150),deputies,waste,deputy,deputyIds,wasteIds,subUnits:[...byId.values()].filter(u=>wasteIds.has(u.id)&&u.id!==waste?.id&&u.active),deputyOrganizations:deputysOrgs,allUnits:[...byId.values()],synthetic:isSyntheticShiraz(cityName),organizationReady:!!waste&&!!deputy};
}
export function validateWasteContext(data,city,waste){
 if(!data)return {state:'UNKNOWN',managerId:null};
 if(data?.mode!=='SYNTHETIC_WASTE_READ_ONLY'||data?.city?.id!==city||!waste||data?.organization?.id!==waste.id||(data.organization.code!==undefined&&data.organization.code!==WASTE_ORG_CODE))
  return {state:'INVALID',managerId:null};
 const managerId=data.organization.manager_user_id;
 return {state:'VALID',managerId:isUUID(managerId)?managerId:null};
}
/** Role is the existing municipality role; do NOT infer a mayor/deputy appointment from it. */
export function executivePolicy({role,systemAdmin=false,userId,managerId,contextState,organizationReady}={}){
 const administrator=role==='MUNICIPAL_ADMIN'&&systemAdmin===true;
 const director=role==='DIRECTOR'&&isUUID(userId)&&isUUID(managerId)&&userId===managerId&&contextState==='VALID'&&organizationReady===true;
 return {
  canCityPreview:administrator,
  canDeputyPreview:administrator&&organizationReady===true,
  canWaste:administrator&&organizationReady===true||director,
  assignedDirector:director,
  deputyAssignmentProven:false, // Existing API does not bind DEPUTY to an org-unit.
  mayorAppointmentProven:false, // MUNICIPAL_ADMIN is not a real MAYOR claim.
  role:cleanText(role,32)||'UNKNOWN',
  defaultView:administrator?'city':director?'waste':role==='DEPUTY'?'deputy':'blocked',
 };
}
/** Explicit relation only; never infer ownership from case title or module. */
export function aggregateCaseCount(cases,services,idSet){
 if(!Array.isArray(cases)||!Array.isArray(services)||!(idSet instanceof Set))return {state:'UNKNOWN',count:null,partial:true};
 if(cases.length>=300)return {state:'PARTIAL',count:null,partial:true};
 const owned=new Set(services.filter(s=>s&&idSet.has(s.owner_unit_id)&&isUUID(s.id)).map(s=>s.id));
 const n=cases.filter(c=>c&&(c.unit_id? idSet.has(c.unit_id):owned.has(c.service_id))).length;
 return {state:'SCOPED',count:n,partial:false};
}
export function safeCityOverview(cases){
 if(!Array.isArray(cases)||cases.length>=300)return {state:'UNKNOWN',count:null};
 return {state:'SCOPED',count:cases.length};
}
export function hierarchyUATReport(results={}){
 const allowed=new Set(['PASS','FAIL','NOT_RUN']);
 const rows=UAT_V7.map(([id,title])=>({id,title,result:allowed.has(results[id])?results[id]:'NOT_RUN'}));
 const complete=rows.every(x=>x.result==='PASS');
 return {version:ORG_OS_V7,rows,complete,summary:{pass:rows.filter(x=>x.result==='PASS').length,fail:rows.filter(x=>x.result==='FAIL').length,notRun:rows.filter(x=>x.result==='NOT_RUN').length}};
}
