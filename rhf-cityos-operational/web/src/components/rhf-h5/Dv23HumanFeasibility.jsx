import React,{useEffect,useState} from 'react';
import {ClipboardCheck,RefreshCw,ShieldAlert} from 'lucide-react';
import './dv23b-human-feasibility.css';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,E=encodeURIComponent;
function validateDecisions(data,city,actor,surface,tenant){
 if(data?.schema!=='RHF-DV23B1-HUMAN-FEASIBILITY-v1'||data.cityId!==city||data.viewerId!==actor||data.surface!==surface||data.tenantId!==tenant)throw Error('DV23B1_CITY_SCOPE_MISMATCH');
 if(!Array.isArray(data.rows)||data.rows.length>100||typeof data.access?.canSubmit!=='boolean'||typeof data.access?.canReview!=='boolean'||data.governance?.execution!=='NOT_AUTHORIZED'||data.governance?.valueVerification!=='NOT_ATTESTED'||data.governance?.feasibilityOnly!==true||data.rows.some(r=>r.canExecute!==false||r.valueVerified!==false))throw Error('DV23B1_GOVERNANCE_UNSAFE');
 return data;
}
function validateCandidates(data,city,actor,surface,tenant){
 if(data?.schema!=='RHF-DV23A-EVIDENCE-DISCOVERY-v1'||data.cityId!==city||data.viewerId!==actor||data.surface!==surface||data.tenantId!==tenant||!Array.isArray(data.candidates)||data.candidates.length>20||data.governance?.autoExecution!==false||data.governance?.valueVerification!=='NOT_ATTESTED'||data.candidates.some(x=>x.canAutoExecute!==false||x.verifiedPublicValue!==false||!UUID.test(x.need?.id||'')||!UUID.test(x.capacity?.id||'')))throw Error('DV23B1_SOURCE_DISCOVERY_INVALID');
 return data.candidates;
}
export default function Dv23HumanFeasibility({city,actorId,surface='deputy',api,expectedTenantId}){
 const key=`${city||''}:${actorId||''}:${surface}:${expectedTenantId||''}`;
 const [state,setState]=useState({key:'',busy:false,loading:false,error:'',rows:[],candidates:[],access:{}});
 const [epoch,setEpoch]=useState(0),[selected,setSelected]=useState(''),[note,setNote]=useState(''),[notes,setNotes]=useState({}),[message,setMessage]=useState('');
 useEffect(()=>{
  let active=true;setSelected('');setNote('');setNotes({});setMessage('');setState({key,busy:false,loading:true,error:'',rows:[],candidates:[],access:{}});
  if(!UUID.test(city||'')||!UUID.test(actorId||'')||!UUID.test(expectedTenantId||'')||typeof api!=='function'){
   setState({key,loading:false,error:'شهرداری یا نشست معتبر نیست.',rows:[],candidates:[],access:{}});return()=>{active=false};
  }
  Promise.all([api(`/cities/${E(city)}/dv23-feasibility?surface=${surface}`),api(`/cities/${E(city)}/dv23-opportunities?surface=${surface}`)])
   .then(([decisions,proposals])=>({decisions:validateDecisions(decisions,city,actorId,surface,expectedTenantId),candidates:validateCandidates(proposals,city,actorId,surface,expectedTenantId)}))
   .then(({decisions,candidates})=>{if(active)setState({key,loading:false,error:'',rows:decisions.rows,candidates,access:decisions.access})})
   .catch(e=>{if(active)setState({key,loading:false,error:String(e?.message||e),rows:[],candidates:[],access:{}})});
  return()=>{active=false};
 },[key,city,actorId,surface,expectedTenantId,api,epoch]);
 const data=state.key===key&&!state.loading&&!state.error?state:null;
 async function submit(){
  if(!data?.access.canSubmit||note.trim().length<25||!selected||state.busy)return;
  const chosen=data.candidates.find(c=>c.key===selected);if(!chosen)return;
  if(!window.confirm('فقط پرونده ارزیابی امکان‌سنجی ایجاد شود؟ این کار مجوز اجرا یا هزینه نیست.'))return;
  setState(s=>({...s,busy:true}));setMessage('');
  try{const receipt=await api(`/cities/${E(city)}/dv23-feasibility?surface=${surface}`,'POST',
    {needId:chosen.need.id,capacityId:chosen.capacity.id,note:note.trim(),requestKey:crypto.randomUUID()});
   if(receipt?.schema!=='RHF-DV23B1-HUMAN-FEASIBILITY-v1'||receipt.cityId!==city||receipt.tenantId!==expectedTenantId||receipt.row?.status!=='PROPOSED'||receipt.row.canExecute!==false)throw Error('CREATE_RECEIPT_MISMATCH');
   setMessage('پرونده امکان‌سنجی ثبت شد؛ نیازمند بررسی مستقل است.');setEpoch(x=>x+1);
  }catch(e){setMessage('ثبت انجام نشد: '+String(e?.message||e))}finally{setState(s=>({...s,busy:false}))}
 }
 async function decide(row,decision){
  const text=notes[row.id]||'';
  if(!data?.access.canReview||row.createdBy===actorId||row.status!=='PROPOSED'||text.trim().length<25||state.busy)return;
  if(!window.confirm('تصمیم فقط درباره ورود به بررسی امکان‌سنجی است؛ مجوز عملیات نیست. تأیید می‌کنید؟'))return;
  setState(s=>({...s,busy:true}));setMessage('');
  try{const receipt=await api(`/cities/${E(city)}/dv23-feasibility/${E(row.id)}?surface=${surface}`,'PATCH',{decision,note:text.trim()});
   if(receipt?.schema!=='RHF-DV23B1-HUMAN-FEASIBILITY-v1'||receipt.cityId!==city||receipt.tenantId!==expectedTenantId||receipt.row?.status!==decision||receipt.row.canExecute!==false)throw Error('DECISION_RECEIPT_MISMATCH');
   setMessage('تصمیم ثبت شد؛ اقدام عملیاتی و خلق ارزش همچنان تأیید نشده‌اند.');setEpoch(x=>x+1);
  }catch(e){setMessage('تصمیم انجام نشد: '+String(e?.message||e))}finally{setState(s=>({...s,busy:false}))}
 }
 return <section className="rhf-dv23b" dir="rtl" data-rhf-dv23b="human-feasibility-v1">
  <header><div><small>RHF FUTURE CITIES · DV2.3B1</small><h3>پرونده تصمیم انسانی درباره امکان‌سنجی فرصت‌ها</h3><p>درخواست ارزیابی · تصویب مستقل · حسابرسی؛ بدون مجوز هزینه، اجرا یا ادعای ارزش</p></div>
   <button type="button" onClick={()=>setEpoch(x=>x+1)} disabled={state.busy||state.loading}><RefreshCw size={16}/> بازخوانی</button></header>
  {state.key===key&&state.loading&&<p role="status">در حال بازیابی پرونده‌های مجاز همین شهر…</p>}
  {state.key===key&&state.error&&<p role="alert" className="rhf-dv23b__warn"><ShieldAlert size={16}/> دسترسی یا پیش‌نیاز فراهم نیست: {state.error}</p>}
  {data&&<>
   <div className="rhf-dv23b__warning">تصویب «امکان‌سنجی» نه اجرای مأموریت است، نه تأیید ظرفیت قانونی، نه ارزش شهری محقق‌شده. اتصال LangGraph و Temporal هنوز انجام نشده است.</div>
   <p>پرونده‌های قابل مشاهده: <b>{data.rows.length}</b>{data.access?.canSubmit?' · ثبت با سمت عملیاتی مجاز است':' · ثبت نیازمند انتصاب عملیاتی است'}</p>
   {data.access?.canSubmit&&<form onSubmit={e=>{e.preventDefault();submit()}} className="rhf-dv23b__form">
    <label>فرصت مستند و بررسی‌شده<select required value={selected} onChange={e=>setSelected(e.target.value)}><option value="">فرصت را انتخاب کنید</option>{data.candidates.map(c=><option key={c.key} value={c.key}>{c.sector} · {c.need.title} ← {c.capacity.title}</option>)}</select></label>
    <label>توجیه درخواست بررسی (حداقل ۲۵ حرف)<textarea required minLength={25} maxLength={1500} rows={2} value={note} onChange={e=>setNote(e.target.value)}/></label>
    <button type="submit" disabled={!selected||note.trim().length<25||state.busy}>ثبت پرونده PROPOSED</button>
    {!data.candidates.length&&<p>برای ایجاد پرونده، ابتدا نیاز و ظرفیت سازگار با اسناد REVIEWED در DV2.2 لازم است.</p>}
   </form>}
   <div className="rhf-dv23b__items">{data.rows.map(r=><article key={r.id}><strong>{r.sector} · {r.status==='PROPOSED'?'در انتظار تصمیم':r.status==='FEASIBILITY_APPROVED'?'مجاز برای بررسی امکان‌سنجی':'ردشده'}</strong><p>{r.note}</p>
    <small>شناسه پرونده: {r.id.slice(0,8)} · ارزش تأییدشده: خیر · مجوز اجرا: خیر</small>
    {r.reviewNote&&<p>یادداشت بررسی: {r.reviewNote}</p>}
    {data.access.canReview&&r.createdBy!==actorId&&r.status==='PROPOSED'&&<div className="rhf-dv23b__review"><textarea minLength={25} maxLength={1500} rows={2} placeholder="یادداشت بررسی مستقل (حداقل ۲۵ حرف)" value={notes[r.id]||''} onChange={e=>setNotes(old=>({...old,[r.id]:e.target.value}))}/><button disabled={state.busy||((notes[r.id]||'').trim().length<25)} type="button" onClick={()=>decide(r,'FEASIBILITY_APPROVED')}>تأیید بررسی امکان‌سنجی</button><button disabled={state.busy||((notes[r.id]||'').trim().length<25)} type="button" onClick={()=>decide(r,'REJECTED')}>رد پرونده</button></div>}
   </article>)}{!data.rows.length&&<p>پرونده‌ای در محدوده دسترسی فعلی ثبت نشده است.</p>}</div>
  </>}
  {message&&<p role="status">{message}</p>}
  <footer><ClipboardCheck size={16}/> ایجاد پرونده و تصمیم انسانی در تراکنش حسابرسی می‌شود. از این صفحه هیچ اقدام اجرایی صادر نمی‌شود.</footer>
 </section>;
}
