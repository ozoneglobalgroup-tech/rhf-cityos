import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ClipboardCheck,LockKeyhole,RefreshCw,ShieldAlert} from 'lucide-react';
import './dv32-governed-dispatch.css';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const E=encodeURIComponent;
const blank=()=>({caseId:'',targetOrgId:'',justification:'',requestKey:null});
const states={SUBMITTED:'در انتظار تصمیم',APPROVED_FOR_PLANNING:'تأیید برای برنامه‌ریزی (بدون اعزام)',REJECTED:'ردشده'};
function check(d,city,actor,surface,tenant){
 if(d?.schema!=='RHF-DV32A-GOVERNED-DISPATCH-v1'||d.cityId!==city||d.viewerId!==actor||d.surface!==surface||
  !UUID.test(d.tenantId||'')||(tenant&&tenant!==d.tenantId)||!Array.isArray(d.rows)||
  d.governance?.missionCreated!==false||d.governance?.caseReassigned!==false||
  d.governance?.verifiedPublicValue!==false||d.governance?.approvalScope!=='PLANNING_ONLY')throw Error('DV32_RESPONSE_INVALID');
 return d;
}
export default function Dv32GovernedDispatch({city,actorId,api,surface='deputy',expectedTenantId}){
 const key=[city,actorId,surface,expectedTenantId].join(':');
 const current=useRef(key);current.current=key;
 const [state,setState]=useState({key:'',loading:false,data:null,error:''});
 const [tick,refresh]=useState(0);const [draft,setDraft]=useState(blank);
 const [review,setReview]=useState({});const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 useEffect(()=>{
  let active=true;setDraft(blank());setReview({});setMessage('');setState({key,loading:true,data:null,error:''});
  if(!UUID.test(city||'')||!UUID.test(actorId||'')||typeof api!=='function'){
   setState({key,loading:false,data:null,error:'شناسه شهر یا نشست معتبر نیست.'});return()=>{active=false};
  }
  api(`/cities/${E(city)}/dv32-governed-dispatch?surface=${E(surface)}`).then(v=>check(v,city,actorId,surface,expectedTenantId))
   .then(data=>{if(active)setState({key,loading:false,data,error:''})})
   .catch(e=>{if(active)setState({key,loading:false,data:null,error:String(e?.message||e)})});
  return()=>{active=false};
 },[key,city,actorId,api,surface,expectedTenantId,tick]);
 const data=state.key===key?state.data:null;
 const selected=data?.access?.candidateCases?.find(c=>c.id===draft.caseId);
 const targets=useMemo(()=>{
  if(!selected||!data)return [];
  const orgs=data.access.targetOrgs||[];const byId=new Map(orgs.map(o=>[o.id,o]));
  return orgs.filter(o=>{let id=o.id;const seen=new Set();while(byId.has(id)&&!seen.has(id)){
   if(id===selected.ownerOrgId)return true;seen.add(id);id=byId.get(id).parentId;
  }return false;});
 },[data,selected]);
 async function submit(e){
  e.preventDefault();if(busy||!data?.access?.canSubmit||!selected||!targets.some(x=>x.id===draft.targetOrgId))return;
  if(!window.confirm('درخواست بررسی ارجاع ثبت شود؟ هیچ مأموریت یا اعزامی ایجاد نمی‌شود.'))return;
  setBusy(true);setMessage('');const originalKey=key;
  const requestKey=draft.requestKey||crypto.randomUUID();setDraft(x=>({...x,requestKey}));
  try{
   const p={caseId:draft.caseId,targetOrgId:draft.targetOrgId,justification:draft.justification,requestKey};
   const out=await api(`/cities/${E(city)}/dv32-governed-dispatch?surface=${E(surface)}`,'POST',p);
   if(current.current!==originalKey)return;
   if(out?.schema!=='RHF-DV32A-GOVERNED-DISPATCH-v1'||out.cityId!==city||out.tenantId!==data.tenantId||
    out.governance?.missionCreated!==false)throw Error('DV32_CREATE_RESPONSE_INVALID');
   setMessage(out.duplicate?'درخواست موجود بازیابی شد.':'درخواست ارجاع برای تصمیم مستقل ثبت شد.');setDraft(blank());refresh(x=>x+1);
  }catch(e){if(current.current===originalKey)setMessage('ثبت انجام نشد؛ شناسه درخواست حفظ شد: '+String(e?.message||e))}
  finally{if(current.current===originalKey)setBusy(false)}
 }
 async function decide(row,action){
  if(busy||!data?.access?.canReview||row.createdBy===actorId||row.status!=='SUBMITTED')return;
  const note=review[row.id]||'';if(note.trim().length<30)return setMessage('دلیل مستقل تصمیم حداقل ۳۰ نویسه باشد.');
  if(!window.confirm(action==='APPROVE_PLANNING'?'فقط ورود به برنامه‌ریزی تأیید شود؟ هیچ مأموریت یا اعزامی ایجاد نمی‌شود.':'این درخواست رد شود؟'))return;
  setBusy(true);setMessage('');const originalKey=key;
  try{
   const out=await api(`/cities/${E(city)}/dv32-governed-dispatch/${E(row.id)}?surface=${E(surface)}`,'PATCH',
    {action,version:row.version,note});
   if(current.current!==originalKey)return;
   if(out?.schema!=='RHF-DV32A-GOVERNED-DISPATCH-v1'||out.cityId!==city||out.tenantId!==data.tenantId||
    out.governance?.missionCreated!==false)throw Error('DV32_REVIEW_RESPONSE_INVALID');
   setMessage('تصمیم انسانی ثبت شد؛ اجرای میدانی فعال نشده است.');refresh(x=>x+1);
  }catch(e){if(current.current===originalKey)setMessage('تصمیم ثبت نشد: '+String(e?.message||e))}
  finally{if(current.current===originalKey)setBusy(false)}
 }
 return <section className="rhf-dv32" data-rhf-dv32="governed-dispatch-v1" dir="rtl">
  <header><div><small>RHF CITY OS · DV3.2A</small><h3><ClipboardCheck size={18}/> درخواست ارجاع و تصمیم مستقل</h3>
   <p>بر اساس پرونده‌های واقعی DV3.1؛ تأیید صرفاً مجوز برنامه‌ریزی است، نه ایجاد مأموریت یا اعزام میدانی.</p></div>
   <button type="button" onClick={()=>refresh(x=>x+1)} disabled={busy||state.loading}><RefreshCw size={15}/> بازخوانی</button></header>
  {state.key===key&&state.loading&&<p role="status">در حال بررسی پرونده‌ها و اختیارات سازمانی…</p>}
  {state.key===key&&state.error&&<p className="rhf-dv32__warn" role="alert"><LockKeyhole size={16}/> {state.error}</p>}
  {data&&<>
   <p className="rhf-dv32__safe"><ShieldAlert size={16}/> ثبت و تأیید درخواست ارجاع، وضعیت پرونده اصلی را تغییر نمی‌دهد؛ هیچ مأموریت، تخصیص منبع، پرداخت یا ارزش تأییدشده‌ای ایجاد نمی‌شود.</p>
   <div className="rhf-dv32__summary"><div>درخواست‌های قابل مشاهده <b>{data.metrics.visible}</b></div><div>منتظر بررسی <b>{data.metrics.pending}</b></div><div>پرونده مناسب <b>{data.access.candidateCases.length}</b></div></div>
   {data.access.canSubmit?<form className="rhf-dv32__form" onSubmit={submit}>
    <label>پرونده دریافت‌شده<select required value={draft.caseId} onChange={e=>setDraft({...blank(),caseId:e.target.value})}><option value="">انتخاب پرونده</option>
     {data.access.candidateCases.map(c=><option key={c.id} value={c.id}>{c.summary}</option>)}</select></label>
    <label>واحد مقصدِ مجاز<select required value={draft.targetOrgId} onChange={e=>setDraft(x=>({...x,targetOrgId:e.target.value,requestKey:null}))}><option value="">انتخاب واحد</option>
     {targets.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <label className="rhf-dv32__full">توجیه و شواهد ارجاع<textarea rows={3} minLength={30} maxLength={1500} required value={draft.justification} onChange={e=>setDraft(x=>({...x,justification:e.target.value,requestKey:null}))}/></label>
    <button type="submit" disabled={busy||!draft.caseId||!draft.targetOrgId}>ثبت درخواست برای بررسی مستقل</button>
   </form>:<p className="rhf-dv32__warn">برای ثبت یا تأیید ارجاع، انتصاب عملیاتی معتبر و نقش سازمانی مناسب ضروری است.</p>}
   <div className="rhf-dv32__records"><h4>پرونده‌های تصمیم‌گیری ارجاع</h4>
    {!data.rows.length&&<p>هنوز درخواست ارجاعی در محدوده شما وجود ندارد.</p>}
    {data.rows.map(r=><article key={r.id}><div><strong>{r.caseSummary||r.caseId}</strong><span>{states[r.status]||r.status}</span><small>مقصد: {r.targetName||r.targetOrgId}</small><p>{r.justification}</p></div>
     {data.access.canReview&&r.status==='SUBMITTED'&&r.createdBy!==actorId&&<div className="rhf-dv32__review">
      <textarea placeholder="دلیل مستقل بررسی، حداقل ۳۰ نویسه" rows={2} value={review[r.id]||''} onChange={e=>setReview(x=>({...x,[r.id]:e.target.value}))}/>
      <button type="button" disabled={busy} onClick={()=>decide(r,'APPROVE_PLANNING')}>تأیید فقط برای برنامه‌ریزی</button>
      <button type="button" disabled={busy} onClick={()=>decide(r,'REJECT')}>رد درخواست</button></div>}
    </article>)}
   </div>
  </>}
  {message&&<p role="status">{message}</p>}
  <footer>DV3.2A — دفتر درخواست ارجاع با RLS و حسابرسی؛ ایجاد مأموریت، منابع، تأیید اجرا و KPI در گام‌های بعدی.</footer>
 </section>;
}
