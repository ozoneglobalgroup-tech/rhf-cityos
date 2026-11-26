import React,{useEffect,useMemo,useState} from 'react';
import {BrainCircuit,ShieldCheck,Target,ArrowLeft,RefreshCcw,AlertTriangle,CheckCircle2,ClipboardList,Search,Database,Send,Clock3,Eye,Activity,LockKeyhole} from 'lucide-react';
import {prepareA01Candidates,safeAgentResult,proposalNote} from './a01-discovery-core.mjs';
import './a01-discovery.css';
const fmt=x=>Number.isSafeInteger(x)?x.toLocaleString('fa-IR'):'—';
const text=x=>typeof x==='string'?x:'—';
const canWrite=new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
/** A01 runs against existing authenticated backend; no separate auth, no background worker.
 * POST agent-plan reads scoped evidence and writes an audit record; POST followups is manual.
 */
export default function A01ValueDiscoveryWorkspace({city,cityName,cases,access,api,navigate}){
  const [clock,setClock]=useState(Date.now());
  const snap=useMemo(()=>prepareA01Candidates({city,cityName,cases,now:clock}),[city,cityName,cases,clock]);
  const [selected,setSelected]=useState('');
  const [run,setRun]=useState(null);
  const [plan,setPlan]=useState(null);
  const [note,setNote]=useState('');
  const [key,setKey]=useState('');
  const [saving,setSaving]=useState(false);
  const [status,setStatus]=useState('UNKNOWN');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{setSelected('');setRun(null);setPlan(null);setNote('');setKey('');setError('');setNotice('');setStatus('UNKNOWN')},[city,cityName]);
  useEffect(()=>{
    let valid=true;
    if(!snap.ready||typeof api!=='function')return()=>{valid=false};
    Promise.resolve().then(()=>api(`/cities/${encodeURIComponent(city)}/agent-status`)).then(r=>{
      if(valid)setStatus(r&&typeof r==='object'?'AVAILABLE':'UNKNOWN');
    }).catch(()=>{if(valid)setStatus('NOT_VERIFIED')});
    return()=>{valid=false};
  },[city,snap.ready]);
  const candidate=snap.rows.find(c=>c.id===selected)||null;
  const scopeOK=snap.ready;
  const role=access?.role||'';
  const authorized=canWrite.has(role);
  function selectItem(id){setSelected(id);setRun(null);setPlan(null);setNote('');setKey('');setNotice('');setError('')}
  async function analyze(){
    if(!scopeOK||!candidate||typeof api!=='function'||saving)return;
    setSaving(true);setRun(null);setPlan(null);setError('');setNotice('');
    try{
      // The server uses an allowlisted multi-tool plan; no external LLM or field write.
      const raw=await api(`/cities/${encodeURIComponent(city)}/agent-plan`,'POST',{
        caseId:candidate.id,intent:'CAPACITY_OPPORTUNITY',useModel:false,externalConsent:false
      });
      const validated=safeAgentResult(raw,candidate.id);
      setRun({candidateId:candidate.id,result:validated});
      setPlan(validated);
      setNote(proposalNote({candidate,result:validated}));
      setKey('');
      setNotice('تحلیل با ابزارهای سرور انجام شد. پیشنهاد فقط پس از ثبت دستی و تصویب مستقل قابل پیگیری است.');
    }catch(e){setError(text(e?.message||'تحلیل عامل با خطا مواجه شد.'));}
    finally{setSaving(false)}
  }
  async function propose(){
    if(!scopeOK||!authorized||!candidate||!plan||run?.candidateId!==candidate.id||saving)return;
    const clean=note.trim();
    if(clean.length<12||clean.length>600){setError('توضیح پیشنهاد باید بین ۱۲ تا ۶۰۰ کاراکتر باشد.');return;}
    if(!window.confirm('فقط یک پیشنهاد پیگیری داخلی ثبت می‌شود؛ اجرا و تصویب خودکار انجام نمی‌شود. ادامه می‌دهید؟'))return;
    const requestKey=key||window.crypto?.randomUUID?.();
    if(!requestKey){setError('تولید شناسه یکتا در این مرورگر ممکن نیست.');return;}
    setKey(requestKey);setSaving(true);setError('');setNotice('');
    try{
      await api(`/cities/${encodeURIComponent(city)}/agent-followups`,'POST',{
        caseId:candidate.id,requestKey,kind:'CASE_FOLLOWUP',note:clean
      });
      setNotice('پیشنهاد در گردش رسمی پیگیری ثبت شد؛ تأیید آن باید توسط شخص مستقل انجام شود.');
      setPlan(null);setRun(null);setNote('');setKey('');
    }catch(e){setError(text(e?.message||'ثبت پیشنهاد موفق نشد. درخواست را با همان شناسه دوباره امتحان کنید.'));}
    finally{setSaving(false)}
  }
  const empty = !snap.ready || snap.rows.length === 0;
  return <section dir="rtl" className="rhf-a01" data-rhf-agent="a01-shiraz-demo-v0.1" aria-label="عامل کشف فرصت‌های ارزش شهری">
    <header className="rhf-a01__hero">
      <div className="rhf-a01__hero-top"><span className="rhf-a01__overline"><BrainCircuit size={16}/> RHF AGENTIC CITY OS · AGENT A01</span><span className="rhf-a01__tag">پایلوت کنترل‌شده شیراز</span></div>
      <h2>عامل کشف فرصت‌های ارزش شهری</h2>
      <p>از پرونده واقعیِ بارگذاری‌شده تا تحلیل شواهد، پیشنهاد اقدام و ارجاع برای تأیید مستقل؛ بدون ادعای صرفه‌جویی محقق‌شده.</p>
      <div className="rhf-a01__hero-actions">
        <button type="button" onClick={()=>{setClock(Date.now());setNotice('اولویت‌بندی پرونده‌های بارگذاری‌شده به‌روز شد؛ برای دریافت رکوردهای تازه، صفحه یا داده‌های اصلی را بازخوانی کنید.')}}><RefreshCcw size={16}/> بازبینی فرصت‌ها</button>
        <button type="button" className="rhf-a01__secondary" onClick={()=>navigate?.('urban-agent')}><Eye size={16}/> میزکار رسمی عامل <ArrowLeft size={14}/></button>
      </div>
    </header>
    <div className="rhf-a01__metrics">
      <article><Target size={19}/><span>نامزدهای تحلیل عامل</span><strong>{scopeOK?fmt(snap.rows.length):'—'}</strong><small>حداکثر ۱۲ مورد از داده بارگذاری‌شده</small></article>
      <article><ClipboardList size={19}/><span>پرونده‌های باز بررسی‌شده</span><strong>{scopeOK?fmt(snap.scanned):'—'}</strong><small>نه کل پرونده‌های شهرداری</small></article>
      <article><ShieldCheck size={19}/><span>حالت اجرای ایجنت</span><strong>با مجوز انسانی</strong><small>تخصیص و پرداخت خودکار: غیرفعال</small></article>
      <article><Database size={19}/><span>منفعت تأییدشده توسط A01</span><strong>—</strong><small>بدون سنجش مستقل قابل اعلام نیست</small></article>
    </div>
    {!scopeOK?<div className="rhf-a01__message"><LockKeyhole size={18}/> اجرای آزمایشی A01 فقط برای «شیراز — دمو آزمایشی» و داده‌های بارگذاری‌شده همان شهرداری فعال است. شهرداری واقعی دست‌نخورده می‌ماند.</div>:
    <div className="rhf-a01__body">
      <section className="rhf-a01__queue">
        <div className="rhf-a01__section-head"><div><h3>پرونده‌های نامزد کشف ارزش</h3><p>موارد موعدگذشته و بحرانی در اولویت‌اند؛ سایر پرونده‌های باز نامزد بررسی ظرفیت و شواهد هستند.</p></div><span className="rhf-a01__count">{fmt(snap.rows.length)}</span></div>
        {empty?<div className="rhf-a01__empty"><Search size={22}/><p>در ردیف‌های بارگذاری‌شده فرصت قابل تحلیل پیدا نشد؛ این به معنی نبود فرصت در کل شهر نیست.</p></div>:
        <div className="rhf-a01__items">{snap.rows.map(c=><button type="button" key={c.id} className={`rhf-a01__item${selected===c.id?' is-active':''}`} onClick={()=>selectItem(c.id)} aria-pressed={selected===c.id}>
          <div><strong>{c.title}</strong><p>{c.reason.join(' · ')}</p><small>شناسه شاهد: {c.id.slice(0,8)}… · منبع: service_cases</small></div>
          <span className={c.overdue?'rhf-a01__flag late':'rhf-a01__flag'}>{c.overdue?'موعدگذشته':c.urgent?'اولویت بالا':c.acceptance?'منتظر پذیرش':'نامزد بررسی'}</span>
        </button>)}</div>}
        <p className="rhf-a01__footnote">دامنه داده: {cityName}. آمار صرفاً از ردیف‌های API دریافت‌شده است؛ یافته‌ها پیشنهاد بررسی‌اند، نه اثبات منفعت عمومی.</p>
      </section>
      <section className="rhf-a01__analysis">
        <div className="rhf-a01__section-head"><div><h3>تحلیل عامل و مسیر تصمیم</h3><p>ابزارهای سمت سرور، مستندات اجرا، مالی و ظرفیت همان پرونده را بررسی می‌کنند.</p></div><BrainCircuit size={22}/></div>
        {!candidate?<div className="rhf-a01__empty"><Activity size={24}/><p>یک پرونده را از ستون فرصت‌ها انتخاب کنید تا تحلیل قابل استناد آغاز شود.</p></div>:
        <div className="rhf-a01__selected">
          <strong>{candidate.title}</strong><div className="rhf-a01__reasons">{candidate.reason.map(x=><span key={x}>{x}</span>)}</div>
          <div className="rhf-a01__row"><span>منبع و شناسه:</span><code>service_cases / {candidate.id.slice(0,8)}…</code></div>
          <div className="rhf-a01__row"><span>وضعیت API عامل:</span><b>{status==='AVAILABLE'?'قابل دسترس':status==='NOT_VERIFIED'?'تأیید نشده':'در حال بررسی'}</b></div>
          <button type="button" disabled={saving||typeof api!=='function'} onClick={analyze} className="rhf-a01__primary"><BrainCircuit size={17}/>{saving?'در حال پردازش…':'تحلیل فرصت با ایجنت'}</button>
          {plan&&<div className="rhf-a01__report">
            <h4>پیشنهاد مستند عامل</h4>
            <strong>{text(plan.next?.label||'اقدام پیشنهادی')}</strong>
            <p>{text(plan.next?.reason||'برای اقدام، بررسی انسان لازم است.')}</p>
            <h4>شواهد دریافت‌شده</h4>
            <ul>{plan.facts.map((f,i)=><li key={i}><span>{text(f.label)}:</span> <b>{text(String(f.value??'—'))}</b></li>)}</ul>
            <div className="rhf-a01__evidence">رد ابزارها: {plan.toolTrace.map(x=>text(x)).join('، ')||'نامشخص'}</div>
            <p className="rhf-a01__footnote">مدل خارجی استفاده نشده است؛ تغییر عملیاتی خودکار: صفر. منفعت عمومی تأییدشده در این پرونده: {plan.hasVerifiedPublicValue?'شاهد تأییدشده در API ثبت شده':'تأیید نشده'}.</p>
            {authorized?<div className="rhf-a01__proposal">
              <label htmlFor="a01-note">متن پیشنهادی برای گردش بررسی مستقل</label>
              <textarea id="a01-note" rows="3" value={note} onChange={e=>setNote(e.target.value)} maxLength={600}/>
              <button type="button" disabled={saving||note.trim().length<12} onClick={propose} className="rhf-a01__primary"><Send size={17}/> ثبت پیشنهاد پیگیری (بدون اجرا)</button>
            </div>:<div className="rhf-a01__message">این نقش مجوز ثبت پیشنهاد ندارد؛ بررسی شواهد فقط‌خواندنی است.</div>}
          </div>}
        </div>}
        {error&&<div role="alert" className="rhf-a01__error"><AlertTriangle size={16}/>{error}</div>}
        {notice&&<div role="status" className="rhf-a01__success"><CheckCircle2 size={16}/>{notice}</div>}
        <button type="button" onClick={()=>navigate?.('urban-agent')} className="rhf-a01__textbutton"><Clock3 size={16}/> مشاهده صف تأیید مستقل در میزکار عامل <ArrowLeft size={15}/></button>
      </section>
    </div>}
    <footer className="rhf-a01__footer">A01 · پایلوت داده مصنوعی شیراز / تحلیل واقعی با API احرازشده / توصیه غیرالزام‌آور / بدون خوداجرا، تغییر منابع یا تأیید ارزش</footer>
  </section>;
}
