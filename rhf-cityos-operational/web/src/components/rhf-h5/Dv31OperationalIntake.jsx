import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Building2,ClipboardList,LockKeyhole,RefreshCw,ShieldCheck,PlusCircle} from 'lucide-react';
import './dv31-operational-intake.css';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const E=encodeURIComponent;
const blank=()=>({ownerOrgId:'',serviceId:'',summary:'',description:'',priority:'NORMAL',requestKey:null});
const labels={RECEIVED:'دریافت‌شده',ASSIGNED:'ارجاع‌شده',IN_PROGRESS:'در حال اجرا',AWAITING_ACCEPTANCE:'در انتظار پذیرش',CLOSED:'مختومه',REJECTED:'ردشده',LOW:'کم',NORMAL:'عادی',HIGH:'بالا',CRITICAL:'بحرانی'};
function assertResponse(d,city,actorId,surface,tenant){
 if(d?.schema!=='RHF-DV31-MULTI-ORG-INTAKE-v1'||d.cityId!==city||d.viewerId!==actorId||d.surface!==surface||!UUID.test(d.tenantId||'')||(tenant&&tenant!==d.tenantId))throw Error('DV31_SCOPE_RESPONSE_MISMATCH');
 if(!Array.isArray(d.rows)||d.rows.length>100||!Array.isArray(d.access?.serviceOptions)||!Array.isArray(d.access?.ownerOptions)||d.governance?.noAutoDispatch!==true||d.governance?.verifiedPublicValue!==false)throw Error('DV31_CONTRACT_RESPONSE_INVALID');
 return d;
}
export default function Dv31OperationalIntake({city,actorId,surface='deputy',api,expectedTenantId}){
 const key=`${city||''}:${actorId||''}:${surface}:${expectedTenantId||''}`;
 const activeKey=useRef(key);activeKey.current=key;
 const [state,setState]=useState({key:'',loading:false,data:null,error:''});
 const [refresh,setRefresh]=useState(0),[draft,setDraft]=useState(blank),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{
  let live=true;setMessage('');setDraft(blank());setBusy(false);setState({key,loading:true,data:null,error:''});
  if(!UUID.test(city||'')||!UUID.test(actorId||'')||typeof api!=='function'){
   setState({key,loading:false,data:null,error:'شهرداری یا نشست معتبر نیست.'});return()=>{live=false};
  }
  api(`/cities/${E(city)}/dv31-operational-intake?surface=${E(surface)}`)
   .then(v=>assertResponse(v,city,actorId,surface,expectedTenantId))
   .then(data=>{if(live)setState({key,loading:false,data,error:''})})
   .catch(e=>{if(live)setState({key,loading:false,data:null,error:String(e?.message||e)})});
  return()=>{live=false};
 },[key,city,actorId,surface,api,expectedTenantId,refresh]);
 const data=state.key===key?state.data:null;
 const services=useMemo(()=>data?.access?.serviceOptions?.filter(s=>s.ownerOrgId===draft.ownerOrgId)||[],[data,draft.ownerOrgId]);
 const update=(field,value)=>setDraft(old=>({...old,[field]:value,...(field==='ownerOrgId'?{serviceId:''}:{}),requestKey:null}));
 async function submit(e){
  e.preventDefault();if(!data?.access.canCreate||busy||!services.some(x=>x.id===draft.serviceId))return;
  if(!window.confirm('پرونده عملیاتی در واحد انتخابی ثبت شود؟ این کار مأموریت یا پرداخت خودکار ایجاد نمی‌کند.'))return;
  setBusy(true);setMessage('');const startKey=key;
  const requestKey=draft.requestKey||crypto.randomUUID();setDraft(old=>({...old,requestKey}));
  try{
   const payload={...draft,requestKey};
   const result=await api(`/cities/${E(city)}/dv31-operational-intake?surface=${E(surface)}`,'POST',payload);
   if(activeKey.current!==startKey)return;
   if(result?.schema!=='RHF-DV31-MULTI-ORG-INTAKE-v1'||result.cityId!==city||result.tenantId!==data.tenantId||!UUID.test(result.row?.id||'')||result.governance?.noAutoDispatch!==true)throw Error('DV31_CREATE_RESPONSE_INVALID');
   setMessage(result.duplicate?'درخواست قبلاً ثبت شده بود؛ پرونده موجود بازیابی شد.':'پرونده خدمت ثبت شد. ارجاع یا اجرا هنوز انجام نشده است.');
   setDraft(blank());setRefresh(x=>x+1);
  }catch(e){if(activeKey.current===startKey)setMessage('ثبت تأیید نشد. شناسه درخواست برای تلاش مجدد حفظ شده است: '+String(e?.message||e));}
  finally{if(activeKey.current===startKey)setBusy(false)}
 }
 const counts=data?.metrics?.statusCounts||{};const max=Math.max(1,...Object.values(counts).map(Number));
 return <section className="rhf-dv31" dir="rtl" data-rhf-dv31="multi-org-intake-v1">
  <header className="rhf-dv31__header"><div><small>RHF CITY OS · DV3.1 OPERATIONAL INTAKE</small><h3><ClipboardList size={19}/> میز عملیات و ثبت پرونده‌های خدمات شهری</h3><p>{surface==='waste'?'محدوده سازمان مدیریت پسماند':'محدوده معاونت خدمات شهری و سازمان‌های زیرمجموعه'} · متصل به پرونده‌ها و کاتالوگ خدمات موجود</p></div>
   <button type="button" onClick={()=>setRefresh(x=>x+1)} disabled={busy||state.loading}><RefreshCw size={16}/> بازخوانی</button></header>
  {state.key===key&&state.loading&&<p role="status">در حال بازیابی پرونده‌ها و اختیارات جاری…</p>}
  {state.key===key&&state.error&&<p className="rhf-dv31__alert" role="alert"><LockKeyhole size={17}/> دسترسی یا آمادگی داده: {state.error}</p>}
  {data&&<>
   <div className="rhf-dv31__governance"><ShieldCheck size={17}/> فقط پرونده‌های سازمان مجاز نمایش داده می‌شوند. ثبت نیازمند انتصاب معتبر، خدمت و ماژول فعال است؛ ایجاد پرونده به معنی ارجاع، اجرای عملیات، پرداخت یا تحقق ارزش شهری نیست.</div>
   <div className="rhf-dv31__metrics"><div><small>پرونده قابل مشاهده</small><strong>{data.rows.length.toLocaleString('fa-IR')}{data.metrics?.hasMore?'+':''}</strong></div>
    <div><small>واحد در محدوده</small><strong>{data.access.ownerOptions.length.toLocaleString('fa-IR')}</strong></div>
    <div><small>خدمات فعال</small><strong>{data.access.serviceOptions.length.toLocaleString('fa-IR')}</strong></div>
    <div><small>مجوز ثبت</small><strong>{data.access.canCreate?'تأییدشده':'غیرفعال'}</strong></div></div>
   <div className="rhf-dv31__body">
    <div className="rhf-dv31__panel"><h4><Building2 size={16}/> پایش وضعیت پرونده‌ها</h4>
     {!Object.keys(counts).length&&<p>در محدوده جاری پرونده عملیاتی ثبت نشده است.</p>}
     {Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([status,n])=><div className="rhf-dv31__chart" key={status}><span>{labels[status]||status}</span><div className="rhf-dv31__track"><i style={{width:`${100*Number(n)/max}%`}}/></div><b>{Number(n).toLocaleString('fa-IR')}</b></div>)}
     <small>نمودار بر اساس حداکثر ۱۰۰ پرونده قابل مشاهده؛ آمار رسمی کل شهرداری نیست.</small></div>
    <div className="rhf-dv31__panel"><h4><PlusCircle size={16}/> ثبت پرونده جدید</h4>
     {!data.access.canCreate?<p className="rhf-dv31__alert">ثبت نیازمند انتصاب تأییدشده، واحد مجاز و خدمت فعال است. مدیر سامانه صرفاً با نقش مدیریتی نمی‌تواند به جای مسئول عملیاتی ثبت کند.</p>:
      <form onSubmit={submit} className="rhf-dv31__form">
       <label>واحد مسئول<select required value={draft.ownerOrgId} onChange={e=>update('ownerOrgId',e.target.value)}><option value="">انتخاب واحد</option>{data.access.ownerOptions.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
       <label>خدمت تعریف‌شده و فعال<select required value={draft.serviceId} onChange={e=>update('serviceId',e.target.value)}><option value="">انتخاب خدمت</option>{services.map(x=><option key={x.id} value={x.id}>{x.name} · SLA {x.slaHours??'—'}</option>)}</select></label>
       <label>اولویت<select value={draft.priority} onChange={e=>update('priority',e.target.value)}>{['NORMAL','LOW','HIGH','CRITICAL'].map(x=><option key={x} value={x}>{labels[x]}</option>)}</select></label>
       <label>موضوع<input required minLength={8} maxLength={300} value={draft.summary} onChange={e=>update('summary',e.target.value)}/></label>
       <label className="rhf-dv31__wide">شرح عملیات درخواستی<textarea required minLength={20} maxLength={3000} rows={3} value={draft.description} onChange={e=>update('description',e.target.value)}/></label>
       <button type="submit" disabled={busy||!draft.ownerOrgId||!draft.serviceId}>{busy?'در حال ثبت…':'ثبت پرونده بدون اعزام خودکار'}</button>
      </form>}
    </div>
   </div>
   <div className="rhf-dv31__panel"><h4>آخرین پرونده‌های محدوده سازمانی</h4>
    <div className="rhf-dv31__table"><table><thead><tr><th>موضوع</th><th>واحد / خدمت</th><th>اولویت</th><th>وضعیت</th><th>موعد</th></tr></thead><tbody>
     {!data.rows.length&&<tr><td colSpan={5}>هنوز پرونده‌ای ثبت نشده است.</td></tr>}
     {data.rows.map(r=><tr key={r.id}><td>{r.summary}</td><td>{r.ownerName||'—'}<small>{r.serviceName||'خدمت نامشخص'}</small></td><td>{labels[r.priority]||r.priority}</td><td>{labels[r.status]||r.status}</td><td>{r.dueAt?new Date(r.dueAt).toLocaleDateString('fa-IR'):'—'}</td></tr>)}</tbody></table></div>
   </div>
  </>}
  {message&&<p role="status" className="rhf-dv31__message">{message}</p>}
  <footer>DV3.1 — ثبت در جدول عملیاتی موجود service_cases؛ ارجاع، بازرسی، پذیرش و تأیید ارزش در گردش‌کارهای مجاز مراحل بعد انجام می‌شوند. UAT نهایی به تعویق افتاده است.</footer>
 </section>;
}
