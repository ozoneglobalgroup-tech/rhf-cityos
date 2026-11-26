import React,{useCallback,useEffect,useRef,useState} from 'react';
import {RefreshCcw,Landmark,ShieldCheck,Plus,ArrowLeft,Network,Target,ClipboardCheck} from 'lucide-react';
import './urban-value-foundation.css';
const dimensions={SERVICE:'کیفیت خدمت',EQUITY:'عدالت',ENVIRONMENT:'محیط‌زیست',FISCAL:'مالیه',TRUST:'اعتماد',RESILIENCE:'تاب‌آوری',WELLBEING:'رفاه'};
const barriers={DISCOVERY:'ناشناخته بودن ظرفیت',LEGAL_ACCESS:'مجوز و دسترسی',QUALITY:'کیفیت نامناسب',SCHEDULING:'زمان‌بندی',COORDINATION:'هماهنگی',FUNDING:'تأمین مالی',OTHER:'سایر'};
const emptyCase={caseId:'',title:'',publicNeed:'',beneficiaries:'',geography:'',barrier:'COORDINATION',authorityReference:'',baselineMethod:'',comparator:'',valueDimension:'SERVICE'};
export default function UrbanValueFoundation({city,cityName,actorId,cases=[],api,access,navigate}){
 const seq=useRef(0),[state,setState]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [form,setForm]=useState({...emptyCase}),[match,setMatch]=useState({valueCaseId:'',resourceId:'',requestedQuantity:'',purpose:''}),[review,setReview]=useState({}),[mode,setMode]=useState('opportunities');
 const canWrite=!!access?.canWrite,canReview=['MUNICIPAL_ADMIN','DEPUTY'].includes(access?.role);
 const load=useCallback(async()=>{if(!city)return;const request=++seq.current;setBusy(true);setError('');try{
  const [a,b,c,d]=await Promise.all([
   api(`/cities/${city}/value-cases`),api(`/cities/${city}/value-capacity-matches`),api(`/cities/${city}/value-foundation-summary`),api(`/cities/${city}/capacities`)]);
  if(request===seq.current)setState({city,opportunities:a.rows||[],opportunityLimit:a.limit,matches:b.rows||[],matchLimit:b.limit,summary:c,resources:d||[]});
 }catch(e){if(request===seq.current){setError(e.message);setState(null)}}finally{if(request===seq.current)setBusy(false)}},[api,city]);
 useEffect(()=>{setState(null);setNotice('');setForm({...emptyCase});setMatch({valueCaseId:'',resourceId:'',requestedQuantity:'',purpose:''});load();return()=>{seq.current++}},[city,load]);
 const run=async(task,success)=>{setBusy(true);setError('');setNotice('');try{await task();setNotice(success);await load()}catch(e){setError(e.message)}finally{setBusy(false)}};
 const valid=state?.city===city?state:null;
 const submitCase=e=>{e.preventDefault();run(()=>api(`/cities/${city}/value-cases`,'POST',form),'فرصت ارزش به‌عنوان شناسایی اولیه ثبت شد؛ به معنی تحقق منفعت نیست.')};
 const submitMatch=e=>{e.preventDefault();run(()=>api(`/cities/${city}/value-capacity-matches`,'POST',{...match,requestedQuantity:Number(match.requestedQuantity)}),'گزینه تطبیق ظرفیت ثبت شد؛ تخصیصی ایجاد نشده است.')};
 const reviewAction=(type,id,action)=>run(()=>api(`/cities/${city}/${type}/${id}`,'PATCH',{action,reviewEvidence:review[id]||''}),'نتیجه بررسی با حساب مستقل ثبت شد.');
 return <section className="uvf" dir="rtl">
  <header className="uvf-header"><div><span className="uvf-kicker">RHF ACOS / URBAN VALUE FOUNDATION</span><h2>پرونده فرصت و فعال‌سازی ظرفیت شهری</h2><p>{cityName} · مسئله عمومی ← ظرفیت قابل استفاده ← اقدام مجاز ← ارزش قابل اثبات</p></div><button type="button" onClick={load} disabled={busy}><RefreshCcw size={17}/>{busy?'در حال دریافت':'بازخوانی'}</button></header>
  <div className="uvf-note"><ShieldCheck size={20}/><p>این نسخه «شناسایی و بررسی فرصت» است؛ نه اجرای خودکار ایجنت، تخصیص ماشین‌آلات، تأیید قانونی اختیار، یا اثبات صرفه‌جویی. پیامد واقعی تنها با خط مبنا، شواهد و کنترل مستقل در «پیامدهای ارزش عمومی» ثبت می‌شود.</p></div>
  {error&&<p className="uvf-error" role="alert">{error}</p>}{notice&&<p className="uvf-success" role="status">{notice}</p>}
  {!valid&&!error&&<p className="uvf-loading">در حال دریافت اطلاعات شهرداری انتخاب‌شده...</p>}
  {valid&&<>
   <div className="uvf-metrics"><div><span>فرصت‌های ثبت‌شده</span><strong>{valid.summary.cases.total}</strong></div><div><span>بررسی مستقل فرصت</span><strong>{valid.summary.cases.reviewed}</strong></div><div><span>پیشنهادهای تطبیق</span><strong>{valid.summary.matches.total}</strong></div><div><span>تطبیق امکان‌سنجی‌شده</span><strong>{valid.summary.matches.feasible}</strong></div></div>
   <p className="uvf-small">پیامدهای تأیید مستقلِ متصل به پرونده‌های فرصت: {valid.summary.verified_outcomes} مورد. این عدد اثبات انتساب اثر به برنامه جدید نیست.</p>
   <div className="uvf-tabs"><button className={mode==='opportunities'?'active':''} onClick={()=>setMode('opportunities')}>فرصت‌های شهری</button><button className={mode==='capacity'?'active':''} onClick={()=>setMode('capacity')}>تطبیق ظرفیت</button></div>
   {mode==='opportunities'&&<>
    {canWrite&&<form className="uvf-panel uvf-form" onSubmit={submitCase}><h3><Plus size={18}/> تعریف فرصت ارزش شهری</h3><div className="uvf-fields">
     <label>پرونده مرتبط<select required value={form.caseId} onChange={e=>setForm(f=>({...f,caseId:e.target.value}))}><option value="">انتخاب پرونده</option>{cases.map(x=><option key={x.id} value={x.id}>{x.summary}</option>)}</select></label>
     <label>عنوان فرصت<input required maxLength="200" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></label>
     <label>نیاز عمومی<textarea required maxLength="2000" value={form.publicNeed} onChange={e=>setForm(f=>({...f,publicNeed:e.target.value}))}/></label>
     <label>گروه‌های بهره‌مند<input required maxLength="500" value={form.beneficiaries} onChange={e=>setForm(f=>({...f,beneficiaries:e.target.value}))}/></label>
     <label>محدوده مکانی و اثر سرریز<input required maxLength="350" value={form.geography} onChange={e=>setForm(f=>({...f,geography:e.target.value}))}/></label>
     <label>مانع اصلی<select value={form.barrier} onChange={e=>setForm(f=>({...f,barrier:e.target.value}))}>{Object.entries(barriers).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
     <label>بعد اصلی ارزش<select value={form.valueDimension} onChange={e=>setForm(f=>({...f,valueDimension:e.target.value}))}>{Object.entries(dimensions).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
     <label>مرجع اختیار یا نیاز به بررسی مجوز<input required maxLength="500" value={form.authorityReference} onChange={e=>setForm(f=>({...f,authorityReference:e.target.value}))} placeholder="شماره مرجع یا «نیازمند احراز قانونی»"/></label>
     <label>روش تهیه خط مبنا<textarea required maxLength="1300" value={form.baselineMethod} onChange={e=>setForm(f=>({...f,baselineMethod:e.target.value}))} placeholder="سنجه، منبع داده، دوره زمانی و روش اندازه‌گیری"/></label>
     <label>روش مقایسه با وضع موجود<textarea required maxLength="1300" value={form.comparator} onChange={e=>setForm(f=>({...f,comparator:e.target.value}))} placeholder="مقایسه پیش/پس با تعدیل حجم، کیفیت و شرایط"/></label>
    </div><button className="uvf-primary" type="submit" disabled={busy}>ثبت فرصت در مرحله شناسایی</button></form>}
    <div className="uvf-panel"><h3><Landmark size={18}/> فرصت‌های ثبت‌شده</h3>{!valid.opportunities.length&&<p className="uvf-empty">فرصتی ثبت نشده است؛ این فهرست داده نمایشی تولید نمی‌کند.</p>}
    {valid.opportunities.map(v=><article className="uvf-record" key={v.id}><div><strong>{v.title}</strong><p>{v.public_need}</p><small>{v.service_case_title} · {dimensions[v.value_dimension]} · مانع: {barriers[v.barrier]}</small><small>ثبت‌کننده: {v.creator_username} · {v.status==='REVIEWED'?'بررسی مستقل انجام‌شده':'در مرحله شناسایی'} · {v.verified_outcome_count} پیامد تأییدشده مرتبط</small><details><summary>مشاهده منطق ظرفیت و خط مبنا</summary><p>ذی‌نفعان: {v.beneficiaries}</p><p>محدوده: {v.geography}</p><p>مرجع اختیار: {v.authority_reference}</p><p>خط مبنا: {v.baseline_method}</p><p>مقایسه: {v.comparator}</p><p>بازبین: {v.reviewer_username||'ثبت نشده'}</p><p>{v.review_evidence}</p></details></div>
     <div className="uvf-actions">{canReview&&v.status==='DISCOVERY'&&v.created_by!==actorId&&<><textarea placeholder="محدودیت اختیار و شواهد بررسی (الزامی)" value={review[v.id]||''} onChange={e=>setReview(x=>({...x,[v.id]:e.target.value}))}/><button disabled={busy||!(review[v.id]||'').trim()} onClick={()=>reviewAction('value-cases',v.id,'REVIEW')}>ثبت بررسی مستقل</button></>}
      <button type="button" onClick={()=>navigate('outcomes')}><Target size={15}/> پیامدها <ArrowLeft size={13}/></button></div>
    </article>)}<p className="uvf-small">حداکثر {valid.opportunityLimit} ردیف اخیر نمایش داده می‌شود؛ گزارش تجمیعی همه ردیف‌ها را در نظر می‌گیرد.</p></div>
   </>}
   {mode==='capacity'&&<>
    {canWrite&&<form className="uvf-panel uvf-form" onSubmit={submitMatch}><h3><Network size={18}/> پیشنهاد تطبیق نیاز و ظرفیت</h3><div className="uvf-fields">
     <label>فرصت ارزش<select required value={match.valueCaseId} onChange={e=>setMatch(m=>({...m,valueCaseId:e.target.value}))}><option value="">انتخاب فرصت</option>{valid.opportunities.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}</select></label>
     <label>ظرفیت موجود<select required value={match.resourceId} onChange={e=>setMatch(m=>({...m,resourceId:e.target.value}))}><option value="">انتخاب ظرفیت</option>{valid.resources.map(r=><option key={r.id} value={r.id}>{r.name_fa} — {r.unit} — {r.authorized?'دارای علامت مجوز':'بدون علامت مجوز'}</option>)}</select></label>
     <label>مقدار موردنیاز<input required type="number" step="0.001" min="0.001" max="1000000000000" value={match.requestedQuantity} onChange={e=>setMatch(m=>({...m,requestedQuantity:e.target.value}))}/></label>
     <label>توجیه پیشنهادی<textarea required maxLength="1100" value={match.purpose} onChange={e=>setMatch(m=>({...m,purpose:e.target.value}))}/></label>
    </div><button className="uvf-primary" disabled={busy}>ثبت پیشنهاد، بدون رزرو ظرفیت</button></form>}
    <div className="uvf-panel"><h3><ClipboardCheck size={18}/> وضعیت پیشنهادهای تطبیق</h3>{!valid.matches.length&&<p className="uvf-empty">پیشنهاد تطبیق ثبت نشده است.</p>}
    {valid.matches.map(m=><article className="uvf-record" key={m.id}><div><strong>{m.resource_name} ← {m.value_title}</strong><p>{m.purpose}</p><small>مقدار: {m.requested_quantity} {m.unit} · وضعیت: {m.status} · ثبت‌کننده: {m.creator_username}</small><small>بررسی‌کننده: {m.reviewer_username||'—'} · منبع: {m.resource_authorized?'دارای مجوز':'فاقد مجوز'}</small><p>{m.review_evidence}</p></div>
    {canReview&&m.status==='PROPOSED'&&m.created_by!==actorId&&<div className="uvf-actions"><textarea placeholder="شواهد و محدودیت ارزیابی" value={review[m.id]||''} onChange={e=>setReview(x=>({...x,[m.id]:e.target.value}))}/><button disabled={busy||!(review[m.id]||'').trim()} onClick={()=>reviewAction('value-capacity-matches',m.id,'FEASIBLE')}>بررسی امکان‌پذیری</button><button disabled={busy||!(review[m.id]||'').trim()} onClick={()=>reviewAction('value-capacity-matches',m.id,'REJECTED')}>رد مستند</button></div>}
    </article>)}<p className="uvf-small">حتی «FEASIBLE» تخصیص نیست و ظرفیت باید هنگام رزرو از مسیر مجاز دوباره بررسی شود.</p></div>
   </>}
  </>}
 </section>;
}
