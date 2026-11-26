import React,{useEffect,useState} from 'react';
import {ClipboardCheck,Database,FilePlus2,LockKeyhole,RefreshCw} from 'lucide-react';
import './dv22-need-capacity.css';
const E=encodeURIComponent;
const ID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const sectorOptions=[['WASTE','پسماند'],['PUBLIC_SERVICES','خدمات عمومی'],['GREEN_SPACES','فضای سبز'],['ENVIRONMENT','محیط‌زیست'],['HSE','ایمنی و بهداشت'],['CEMETERIES','آرامستان‌ها'],['MARKETS','میادین'],['FLEET','ناوگان'],['EDUCATION','آموزش'],['OTHER','سایر']];
const newDraft=()=>({kind:'NEED',sector:'WASTE',ownerOrgId:'',title:'',description:'',quantity:'',unit:'',evidenceRef:''});
function validateReply(data,city,actor,surface){
 if(data?.schema!=='RHF-DV22-NEED-CAPACITY-v1'||data.cityId!==city||data.viewerId!==actor||data.surface!==surface||!ID.test(data.tenantId||''))throw Error('DV22_SCOPE_INVALID');
 if(!Array.isArray(data.rows)||data.rows.length>100||!Array.isArray(data.access?.ownerOptions)||data.governance?.noAutoExecution!==true||data.governance?.valueVerification!=='NOT_ATTESTED')throw Error('DV22_GOVERNANCE_INVALID');
 return data;
}
export default function Dv22NeedCapacity({city,actorId,api,surface='deputy'}){
 const key=`${city||''}:${actorId||''}:${surface}`;
 const [state,setState]=useState({key:'',loading:false,data:null,error:''});
 const [epoch,setEpoch]=useState(0),[draft,setDraft]=useState(newDraft),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [reviewNotes,setReviewNotes]=useState({});
 useEffect(()=>{setMessage('')},[key]);
 useEffect(()=>{
  let active=true;setState({key,loading:true,data:null,error:''});setDraft(newDraft());setReviewNotes({});
  if(!ID.test(city||'')||!ID.test(actorId||'')||typeof api!=='function'){
   setState({key,loading:false,data:null,error:'نشست یا شهرداری معتبر در دسترس نیست.'});return()=>{active=false};
  }
  api(`/cities/${E(city)}/need-capacity-ledger?surface=${surface}`).then(x=>validateReply(x,city,actorId,surface))
   .then(data=>{if(active)setState({key,loading:false,data,error:''})})
   .catch(error=>{if(active)setState({key,loading:false,data:null,error:String(error?.message||error)})});
  return()=>{active=false};
 },[key,city,actorId,surface,api,epoch]);
 const data=state.key===key?state.data:null;
 const update=(k,v)=>setDraft(old=>({...old,[k]:v}));
 async function create(){
  if(!data?.access?.canSubmit||busy||!window.confirm('این درخواست به‌عنوان سابقه دستی و بررسی‌نشده ثبت شود؟'))return;
  setBusy(true);setMessage('');
  try{
   const payload={...draft,quantity:draft.quantity===''?null:Number(draft.quantity),unit:draft.quantity===''?null:draft.unit,
    requestKey:crypto.randomUUID()};
   const response=await api(`/cities/${E(city)}/need-capacity-ledger?surface=${surface}`,'POST',payload);
   if(response?.schema!=='RHF-DV22-NEED-CAPACITY-v1'||response.cityId!==city||response.tenantId!==data.tenantId||response.row?.status!=='SUBMITTED')throw Error('DV22_CREATE_RECEIPT_INVALID');
   setMessage('سابقه ثبت شد و منتظر بررسی مستقل است.');setDraft(newDraft());setEpoch(x=>x+1);
  }catch(e){setMessage('ثبت انجام نشد: '+String(e?.message||e));}finally{setBusy(false)}
 }
 async function review(row,decision){
  if(!data?.access?.canReview||row.createdBy===actorId||busy)return;
  const note=reviewNotes[row.id]||'';
  if(note.trim().length<25){setMessage('یادداشت بررسی باید حداقل ۲۵ نویسه باشد.');return}
  if(!window.confirm('نتیجه بررسی مستقل ثبت شود؟ این کار به معنی تأیید ارزش تحقق‌یافته نیست.'))return;
  setBusy(true);setMessage('');
  try{
   const result=await api(`/cities/${E(city)}/need-capacity-ledger/${E(row.id)}?surface=${surface}`,'PATCH',{decision,note});
   if(result?.schema!=='RHF-DV22-NEED-CAPACITY-v1'||result.cityId!==city||result.tenantId!==data.tenantId||result.row?.status!==decision)throw Error('DV22_REVIEW_RECEIPT_INVALID');
   setMessage('بررسی ذخیره شد؛ نتیجه هنوز ارزش شهری گواهی‌شده نیست.');setEpoch(x=>x+1);
  }catch(e){setMessage('بررسی انجام نشد: '+String(e?.message||e));}finally{setBusy(false)}
 }
 return <section className="rhf-dv22" dir="rtl" data-rhf-dv22="need-capacity-ledger">
  <header><div><small>RHF FUTURE CITIES · DV2.2</small><h3>دفتر نیازها و ظرفیت‌های شهری</h3><p>داده قابل انتساب، مالک سازمانی، سند منبع و بررسی مستقل؛ بدون اجرای خودکار ایجنت</p></div><button type="button" onClick={()=>setEpoch(x=>x+1)} disabled={busy||state.loading}><RefreshCw size={15}/> بازخوانی</button></header>
  {state.key===key&&state.loading&&<p role="status">در حال بازیابی اطلاعات همین شهر و سازمان…</p>}
  {state.key===key&&state.error&&<p role="alert" className="rhf-dv22__warning"><LockKeyhole size={17}/> دفتر در این محدوده آماده یا مجاز نیست: {state.error}</p>}
  {data&&<>
   <div className="rhf-dv22__caution"><Database size={17}/> داده‌ها فقط سوابق دستی همین شهر هستند؛ ظرفیت قابل استفاده و ارزش تحقق‌یافته هنوز مستقلاً تأیید نشده‌اند.</div>
   <div className="rhf-dv22__stats"><span>سوابق قابل مشاهده: <b>{data.rows.length}{data.coverage?.hasMore?'+':''}</b></span><span>سازمان‌های مجاز: <b>{data.access.visibleOwnerCount}</b></span><span>ثبت داده: <b>{data.access.canSubmit?'مجاز':'نیازمند انتصاب'}</b></span><span>بررسی مستقل: <b>{data.access.canReview?'مجاز':'محدود'}</b></span></div>
   {data.access.canSubmit&&<form className="rhf-dv22__form" onSubmit={e=>{e.preventDefault();create()}}>
    <h4><FilePlus2 size={16}/> ثبت نیاز یا ظرفیت مستند</h4>
    <div className="rhf-dv22__fields">
     <label>نوع<select value={draft.kind} onChange={e=>update('kind',e.target.value)}><option value="NEED">نیاز</option><option value="CAPACITY">ظرفیت</option></select></label>
     <label>حوزه<select value={draft.sector} onChange={e=>update('sector',e.target.value)}>{sectorOptions.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
     <label>سازمان مالک<select value={draft.ownerOrgId} required onChange={e=>update('ownerOrgId',e.target.value)}><option value="">انتخاب سازمان</option>{data.access.ownerOptions.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
     <label>عنوان<input minLength={8} maxLength={160} required value={draft.title} onChange={e=>update('title',e.target.value)}/></label>
     <label className="rhf-dv22__wide">شرح مستند<textarea required minLength={35} maxLength={2000} rows={2} value={draft.description} onChange={e=>update('description',e.target.value)}/></label>
     <label>مقدار (اختیاری)<input type="number" min="0" step="0.001" value={draft.quantity} onChange={e=>update('quantity',e.target.value)}/></label>
     <label>واحد (برای مقدار)<input maxLength={60} value={draft.unit} onChange={e=>update('unit',e.target.value)}/></label>
     <label className="rhf-dv22__wide">شناسه سند منبع<input required minLength={12} maxLength={500} value={draft.evidenceRef} onChange={e=>update('evidenceRef',e.target.value)} placeholder="ارجاع معتبر به سند/سامانه منبع"/></label>
    </div><button type="submit" disabled={busy||!draft.ownerOrgId}>ثبت به‌عنوان SUBMITTED</button>
   </form>}
   <div className="rhf-dv22__records"><h4><ClipboardCheck size={16}/> سوابق ثبت‌شده (حداکثر ۱۰۰ مورد)</h4>
    {!data.rows.length&&<p>برای این شهر و محدوده سازمانی، سابقه‌ای ثبت نشده است.</p>}
    {data.rows.map(row=><article key={row.id}><div className="rhf-dv22__record-head"><strong>{row.title}</strong><span>{row.kind==='NEED'?'نیاز':'ظرفیت'} · {row.status==='SUBMITTED'?'در انتظار بررسی':row.status==='REVIEWED'?'بررسی‌شده':'ردشده'}</span></div><p>{row.description}</p><small>حوزه: {sectorOptions.find(x=>x[0]===row.sector)?.[1]||row.sector} · سند: {row.evidenceRef}{row.quantity!==null?` · مقدار گزارش‌شده: ${row.quantity} ${row.unit}`:''}</small>
     {data.access.canReview&&row.status==='SUBMITTED'&&row.createdBy!==actorId&&<div className="rhf-dv22__review"><textarea placeholder="یادداشت بررسی مستقل (حداقل ۲۵ نویسه)" minLength={25} rows={2} value={reviewNotes[row.id]||''} onChange={e=>setReviewNotes(old=>({...old,[row.id]:e.target.value}))}/><button disabled={busy} onClick={()=>review(row,'REVIEWED')} type="button">تأیید بررسی سند</button><button disabled={busy} onClick={()=>review(row,'REJECTED')} type="button">رد سند</button></div>}
    </article>)}
   </div>
  </>}
  {message&&<p role="status" className="rhf-dv22__notice">{message}</p>}
  <footer>این دفتر، ثبت نیاز و ظرفیت است؛ «بازبینی سند» به معنی تحقق منفعت، مجوز هزینه یا اجرای خودکار نیست.</footer>
 </section>;
}
