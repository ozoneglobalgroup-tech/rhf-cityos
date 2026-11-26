import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {
  Activity,ArrowLeft,ArrowUpLeft,BrainCircuit,CheckCircle2,Clock3,
  ClipboardList,FileCheck2,Filter,Info,Layers3,RefreshCcw,Search,
  ShieldCheck,ShieldAlert,Sparkles,XCircle
} from 'lucide-react';
import {
  aggregateMissionStatuses,describeAgentAccess,followupStatusFa,humanTime,
  normalizeAgentMissionResponse,safeLabel,statusFa
} from './agent-workspace-model.mjs';
import './agent-operations-readonly.css';
import './h6-agent-polish.css';

const tabs=Object.freeze([
  {id:'overview',label:'نمای کلی'},
  {id:'missions',label:'چرخه مأموریت‌ها'},
  {id:'followups',label:'پیگیری‌های داخلی'}
]);
function PanelTitle({icon:Icon,title,sub,extra}){
  return <div className="rhf-a2__panel-head"><div className="rhf-a2__panel-heading"><span className="rhf-a2__panel-icon"><Icon size={18}/></span><div><h3>{title}</h3>{sub&&<p>{sub}</p>}</div></div>{extra}</div>;
}
function Empty({message,icon:Icon=Info}){
  return <div className="rhf-a2__empty"><Icon size={22} aria-hidden="true"/><p>{message}</p></div>;
}
function StatusTag({value}){
  const tone=(value==='EXECUTED'||value==='DONE'||value==='AUTHORIZED')?'positive':
    (value==='REJECTED'||value==='FAILED'||value==='DEAD_LETTER')?'negative':
    (value==='PROPOSED'||value==='QUEUED'||value==='CLAIMED'||value==='PENDING')?'pending':'neutral';
  return <span className={'rhf-a2__tag rhf-a2__tag--'+tone}>{statusFa[value]||followupStatusFa[value]||safeLabel(value)}</span>;
}
function Kpi({icon:Icon,label,value,note,tone='blue'}){
  return <article className="rhf-a2__kpi"><span className={'rhf-a2__kpi-icon rhf-a2__kpi-icon--'+tone}><Icon size={20}/></span>
    <p className="rhf-a2__kpi-label">{label}</p><strong className="rhf-a2__kpi-number">{value}</strong><p className="rhf-a2__kpi-foot">{note}</p></article>;
}
/**
 * Display-only Agentic workspace for CURRENT RUVOS client/session.
 * The caller must inject existing authenticated GET method and selected municipality.
 * Never issues writes or obtains tokens on its own.
 */
export default function AgentOperationsReadOnly({municipalityId,apiGet,cityName}){
  const [data,setData]=useState({loading:false,error:'',status:null,missions:null,followups:null,refreshedAt:null});
  const [tab,setTab]=useState('overview');
  const [search,setSearch]=useState('');
  const [revision,setRevision]=useState(0);
  const requestId=useRef(0);
  const apiRef=useRef(apiGet); apiRef.current=apiGet;
  const refresh=useCallback(()=>setRevision(v=>v+1),[]);
  useEffect(()=>{
    const current=++requestId.current;
    if(!municipalityId||typeof apiRef.current!=='function'){
      setData({loading:false,error:'شناسه شهرداری یا اتصال احرازشده API موجود نیست.',status:null,missions:null,followups:null,refreshedAt:null});
      return ()=>{requestId.current++};
    }
    const base=`/cities/${encodeURIComponent(municipalityId)}`;
    setData(s=>({...s,loading:true,error:'',status:null,missions:null,followups:null}));
    Promise.allSettled([
      apiRef.current(`${base}/agent-status`),
      apiRef.current(`${base}/avos-missions`),
      apiRef.current(`${base}/agent-followups`)
    ]).then(results=>{
      if(requestId.current!==current)return;
      const unwrap=r=>r.status==='fulfilled'?(r.value?.data??r.value):null;
      const [status,missions,followups]=results.map(unwrap);
      setData({loading:false,error:results.every(r=>r.status==='rejected')?'داده‌های عامل از API دریافت نشد.':'',status,missions,followups,refreshedAt:Date.now()});
    });
    return ()=>{requestId.current++};
  },[municipalityId,revision]);
  const mission=normalizeAgentMissionResponse(data.missions);
  const counts=aggregateMissionStatuses(mission.rows);
  const followups=Array.isArray(data.followups?.rows)?data.followups.rows.slice(0,50):null;
  const filter=search.trim().toLocaleLowerCase('fa-IR');
  const filteredMissions=useMemo(()=>mission.rows.filter(r=>{
    if(!filter)return true;
    return [r.id,r.caseId,r.missionId,r.status,r.outboxStatus].some(v=>safeLabel(v).toLocaleLowerCase('fa-IR').includes(filter));
  }),[mission.rows,filter]);
  const filteredFollowups=useMemo(()=>followups?.filter(r=>{
    if(!filter)return true;
    return [r.id,r.caseId??r.case_id,r.status,r.note].some(v=>safeLabel(v).toLocaleLowerCase('fa-IR').includes(filter));
  })??null,[followups,filter]);
  const schemaPending=mission.kind==='SCHEMA_PENDING';
  const accessible=!!municipalityId&&typeof apiGet==='function';
  return <section dir="rtl" className="rhf-a2" data-rhf-h5="agent-v3" aria-label="میزکار عامل راهبری عملیات شهری">
    <div className="rhf-a2__hero">
      <div className="rhf-a2__hero-text">
        <span className="rhf-a2__eyebrow"><Sparkles size={14}/> RHF ACOS · AGENT GOVERNANCE</span>
        <h2>راهبری هوشمند عملیات شهری</h2>
        <p>از تحلیل و پیشنهاد تا نظارت بر تصمیم انسانی و ردگیری ثبت مأموریت‌ها</p>
        <div className="rhf-a2__hero-labels">
          <span><ShieldCheck size={15}/> نمای فقط‌خواندنی</span>
          <span><Layers3 size={15}/> {safeLabel(cityName)||'شهرداری منتخب'}</span>
        </div>
      </div>
      <div className="rhf-a2__hero-actions">
        <span className="rhf-a2__execution-off"><span className="rhf-a2__dot"/> اجرای خودکار غیرفعال</span>
        <button type="button" className="rhf-a2__refresh" onClick={refresh} disabled={data.loading||!accessible}>
          <RefreshCcw size={17} aria-hidden="true"/> {data.loading?'در حال به‌روزرسانی':'به‌روزرسانی داده‌ها'}
        </button>
      </div>
    </div>
    <div role="status" className={'rhf-a2__governance '+(schemaPending?'rhf-a2__governance--warning':'')}>
      <ShieldAlert size={20} aria-hidden="true"/>
      <div><strong>{schemaPending?'زیرساخت اجرایی هنوز نصب نشده است':'مرز اختیارات و صحت داده‌ها'}</strong>
        <p>{schemaPending?'در پایگاه داده این شهرداری، اسکیمای اجرای عامل فعال نیست. آمار اجرایی نمایش داده نمی‌شود.':'این صفحه تنها وضعیت‌های ثبت‌شده در RUVOS را نمایش می‌دهد؛ پیگیری داخلی به معنی مأموریت میدانی و خلق ارزش تأییدشده نیست.'}</p></div>
    </div>
    {data.error&&<div className="rhf-a2__error" role="alert"><XCircle size={18}/>{data.error}</div>}
    <div className="rhf-a2__kpis" aria-busy={data.loading}>
      <Kpi icon={BrainCircuit} tone="purple" label="وضعیت عامل" value={data.status?.mode==='BOUNDED_READ_ONLY'?'تحلیل فعال':'نامشخص'} note={describeAgentAccess(data.status)}/>
      <Kpi icon={ClipboardList} label="پیشنهادهای مأموریت" value={mission.kind==='READ_ONLY'?String(counts.proposed):'—'} note="فقط پیشنهادهای ثبت‌شده"/>
      <Kpi icon={Clock3} tone="amber" label="در صف اجرا" value={mission.kind==='READ_ONLY'?String(counts.queued):'—'} note="بدون اجرای خودکار"/>
      <Kpi icon={FileCheck2} tone="teal" label="مأموریت‌های دارای شناسه" value={mission.kind==='READ_ONLY'?String(counts.registered):'—'} note="ثبت سیستمی؛ نه انجام میدانی"/>
    </div>
    <div className="rhf-a2__main">
      <div className="rhf-a2__workspace">
        <nav className="rhf-a2__tabs" role="tablist" aria-label="بخش‌های میزکار">
          {tabs.map(t=><button key={t.id} id={'rhf-tab-'+t.id} type="button" role="tab" aria-selected={tab===t.id} className={tab===t.id?'is-active':''} onClick={()=>{setTab(t.id);setSearch('')}}>{t.label}</button>)}
        </nav>
        {(tab==='missions'||tab==='followups')&&<label className="rhf-a2__search"><Search size={17} aria-hidden="true"/><input aria-label="جست‌وجو در موارد این بخش" value={search} onChange={e=>setSearch(e.target.value)} placeholder="جست‌وجوی شناسه، پرونده یا وضعیت…"/></label>}
        {tab==='overview'&&<div className="rhf-a2__overview">
          <article className="rhf-a2__panel"><PanelTitle icon={Activity} title="چرخه حکمرانی اقدام" sub="مراحل قابل ردیابی، بدون صدور فرمان اجرایی"/>
            <div className="rhf-a2__steps"><div><span>۰۱</span><strong>پیشنهاد عامل</strong><small>تحلیل مبتنی بر شواهد</small></div><div><span>۰۲</span><strong>تأیید انسانی</strong><small>کنترل مستقل</small></div><div><span>۰۳</span><strong>ثبت و ممیزی</strong><small>پس از مجوز معتبر</small></div></div>
            <div className="rhf-a2__inline-note"><Info size={16}/> این نمودار مراحل قراردادی را نمایش می‌دهد؛ به معنی انجام آن‌ها در این شهرداری نیست.</div>
          </article>
          <article className="rhf-a2__panel"><PanelTitle icon={ShieldCheck} title="کنترل اجرای عامل" sub="وضعیت مجوزهای اجرایی"/>
            <div className="rhf-a2__security-item"><span>اجرای خودکار مأموریت</span><span className="rhf-a2__tag rhf-a2__tag--neutral">غیرفعال</span></div>
            <div className="rhf-a2__security-item"><span>تخصیص منابع</span><span className="rhf-a2__tag rhf-a2__tag--neutral">غیرفعال</span></div>
            <div className="rhf-a2__security-item"><span>ثبت ارزش اقتصادی واقعی</span><span className="rhf-a2__tag rhf-a2__tag--neutral">تأییدنشده</span></div>
            <div className="rhf-a2__security-item"><span>آخرین خواندن اطلاعات</span><span className="rhf-a2__muted">{data.refreshedAt?humanTime(data.refreshedAt):'—'}</span></div>
          </article>
        </div>}
        {tab==='missions'&&<article className="rhf-a2__panel"><PanelTitle icon={Layers3} title="پیشنهادها و مأموریت‌های عامل" sub={mission.message} extra={<span className="rhf-a2__mini-count">{mission.kind==='READ_ONLY'?filteredMissions.length:'—'} مورد</span>}/>
          {mission.kind!=='READ_ONLY'?<Empty message={mission.message}/>:filteredMissions.length===0?<Empty message="در این محدوده موردی برای نمایش پیدا نشد."/>:<div className="rhf-a2__scroll"><table><thead><tr><th>شناسه Intent</th><th>پرونده</th><th>وضعیت</th><th>Outbox</th><th>شناسه مأموریت</th><th>ثبت</th></tr></thead><tbody>{filteredMissions.map((r,i)=><tr key={r.id||i}><td className="rhf-a2__mono">{safeLabel(r.id)}</td><td>{safeLabel(r.caseId)}</td><td><StatusTag value={r.status}/></td><td><StatusTag value={r.outboxStatus}/></td><td>{safeLabel(r.missionId)}</td><td>{humanTime(r.createdAt)}</td></tr>)}</tbody></table></div>}
        </article>}
        {tab==='followups'&&<article className="rhf-a2__panel"><PanelTitle icon={CheckCircle2} title="پیگیری‌های داخلی عامل" sub="پیگیری داخلی معادل ایجاد مأموریت عملیاتی نیست" extra={<span className="rhf-a2__mini-count">{filteredFollowups?.length??'—'} مورد نمایشی</span>}/>
          {filteredFollowups===null?<Empty message="سرویس پیگیری‌های داخلی در دسترس نیست."/>:filteredFollowups.length===0?<Empty message="پیگیری قابل نمایش وجود ندارد."/>:<div className="rhf-a2__scroll"><table><thead><tr><th>پرونده</th><th>وضعیت</th><th>شرح</th></tr></thead><tbody>{filteredFollowups.map((r,i)=><tr key={r.id||i}><td>{safeLabel(r.caseId??r.case_id)}</td><td><StatusTag value={r.status}/></td><td>{safeLabel(r.note)}</td></tr>)}</tbody></table></div>}
        </article>}
      </div>
      <aside className="rhf-a2__aside" aria-label="راهنمای مدیریت عامل">
        <div className="rhf-a2__aside-title"><span className="rhf-a2__aside-icon"><BrainCircuit size={22}/></span><div><strong>دستیار حکمرانی</strong><small>Decision intelligence</small></div></div>
        <h3>اقدام بعدی چگونه تعیین می‌شود؟</h3>
        <p>عامل ابتدا داده‌ها و شواهد مجاز را بررسی می‌کند؛ پیشنهاد سپس برای بازبینی مستقل به مسئول مربوط ارجاع می‌شود.</p>
        <div className="rhf-a2__aside-sep"/>
        <div className="rhf-a2__aside-item"><ShieldCheck size={16}/> پیشنهاد بدون تأیید اجرا نمی‌شود</div>
        <div className="rhf-a2__aside-item"><Activity size={16}/> ثبت مأموریت، اثبات نتیجه نیست</div>
        <div className="rhf-a2__aside-item"><ArrowUpLeft size={16}/> اقدامات اجرایی فعلاً قفل هستند</div>
        <div className="rhf-a2__aside-footer">RHF · AUDITABLE AI BY DESIGN</div>
      </aside>
    </div>
    <footer className="rhf-a2__footer"><span>داده‌ها از API شهرداری انتخاب‌شده خوانده می‌شوند.</span><span>آخرین به‌روزرسانی: {data.refreshedAt?humanTime(data.refreshedAt):'—'}</span></footer>
  </section>;
}
