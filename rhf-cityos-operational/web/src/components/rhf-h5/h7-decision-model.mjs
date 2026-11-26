/** RUVOS H7 — pure, fail-closed city-scoped presentation model.
 * Counts are limited to the rows loaded by the authenticated existing app.
 * They are NOT city-wide totals or personal assignments.
 */
const OPEN=new Set(['RECEIVED','TRIAGED','ASSIGNED','IN_PROGRESS','AWAITING_ACCEPTANCE']);
const STATUSES=Object.freeze({RECEIVED:'دریافت‌شده',TRIAGED:'بررسی اولیه',ASSIGNED:'ارجاع‌شده',IN_PROGRESS:'در حال انجام',AWAITING_ACCEPTANCE:'در انتظار پذیرش'});
const CATEGORIES=new Set(['all','overdue','urgent','acceptance']);
const ID=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
const safeText=(v,max=110)=>typeof v==='string'?v.slice(0,max):'';
function readDue(row){const v=row?.dueAt??row?.due_at;if(typeof v!=='string'||!v.trim())return null;const time=Date.parse(v);return Number.isFinite(time)?time:null;}
function rowCity(row){return row?.municipality_id??row?.municipalityId??null;}
export function deriveH7DecisionSnapshot({cases,units,modules,city,now=Date.now()}={}){
  const loaded=Array.isArray(cases)&&typeof city==='string'&&city.trim().length>0;
  const time=Number.isFinite(now)?now:Date.now();
  // An explicit cross-city field must always match. Otherwise scope is inherited from the
  // already authenticated parent application's /cities/:id request, not created here.
  const scoped=loaded?cases.filter(r=>r&&typeof r==='object'&&!Array.isArray(r)&&(
    !rowCity(r)||(typeof city==='string'&&rowCity(r)===city))):[];
  const active=scoped.filter(r=>OPEN.has(r.status));
  const queue=active.map((r,i)=>{
    const due=readDue(r);
    const overdue=due!==null&&due<time;
    const urgent=r.priority==='CRITICAL'||r.priority==='HIGH';
    const acceptance=r.status==='AWAITING_ACCEPTANCE';
    const priority=r.priority==='CRITICAL'?'بحرانی':r.priority==='HIGH'?'بالا':'عادی';
    const rank=(overdue?100:0)+(r.priority==='CRITICAL'?55:r.priority==='HIGH'?38:0)+(acceptance?25:0)+(r.status==='RECEIVED'?8:0);
    return {id:typeof r.id==='string'&&ID.test(r.id)?r.id:`row-${i}`,title:safeText(r.summary,100)||'پرونده بدون عنوان',status:r.status,statusLabel:STATUSES[r.status],priority,overdue,urgent,acceptance,due,rank};
  }).filter(x=>x.overdue||x.urgent||x.acceptance).sort((a,b)=>b.rank-a.rank||(a.due??Infinity)-(b.due??Infinity)||a.id.localeCompare(b.id));
  const counts={loadedCases:loaded?scoped.length:null,openCases:loaded?active.length:null,
    overdue:loaded?queue.filter(x=>x.overdue).length:null,
    urgent:loaded?active.filter(r=>r.priority==='CRITICAL'||r.priority==='HIGH').length:null,
    acceptance:loaded?active.filter(r=>r.status==='AWAITING_ACCEPTANCE').length:null,
    unitCount:Array.isArray(units)?units.filter(u=>!u?.municipality_id||u.municipality_id===city).length:null,
    activeModules:Array.isArray(modules)?modules.filter(m=>m&&m.active===true).length:null};
  return {loaded,counts,queue,scope:'LOADED_ROWS_ONLY',identityMode:'CITY_NOT_PERSONAL',cityNameVerified:typeof city==='string'&&city.length>0};
}
export function selectH7Queue(queue,tab='all',limit=7){
  if(!Array.isArray(queue))return [];
  if(!CATEGORIES.has(tab))return [];
  const result=queue.filter(x=>tab==='all'||(tab==='overdue'&&x.overdue)||(tab==='urgent'&&x.urgent)||(tab==='acceptance'&&x.acceptance));
  return result.slice(0,Math.min(20,Math.max(0,Number.isSafeInteger(limit)?limit:7)));
}
export function h7Count(value){return Number.isSafeInteger(value)&&value>=0?value.toLocaleString('fa-IR'):'—';}
