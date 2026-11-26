import React,{useEffect,useMemo,useState} from 'react';
import {Activity,AlertTriangle,ArrowLeft,Building2,CheckCircle2,ClipboardCheck,ClipboardList,FileCheck2,GraduationCap,Landmark,Layers3,LockKeyhole,RefreshCw,Scale,Search,ShieldCheck,Truck,Users} from 'lucide-react';
import {buildWasteOSOverview,canReviewWasteFollowup,canReviewWasteRecord,findingAppliesToCase,validReviewNote,safeProposeNote,finalUATDefinitions} from './waste-os-core.mjs';
import './waste-command.css';
const IC={FLEET:Truck,MAINTENANCE:Activity,COLLECTION:Scale,CONTRACTOR:Users,CONTRACT_EVAL:ClipboardCheck,SHIFT:Users,EDUCATION:GraduationCap,FACILITY:Building2,QUALITY:ClipboardList,VIOLATION:AlertTriangle,LEGAL:Landmark};
const TABS=[['overview','فرماندهی'],['domains','۱۱ حوزه تخصصی'],['evidence','زنجیره شواهد'],['agents','عامل‌ها و هشدارها'],['reviews','صف تصمیم و بازرسی'],['value','حکمرانی ارزش'],['uat','آزمون نهایی']];
const l=x=>x===undefined||x===null||x===''?'—':typeof x==='number'?x.toLocaleString('fa-IR'):String(x).slice(0,160);
const trim=x=>typeof x==='string'?x.slice(0,500):'';
const fmt=x=>Number.isFinite(x)?x.toLocaleString('fa-IR',{maximumFractionDigits:2}):'نامشخص';
const OPTIONS={SUBMITTED:'در انتظار بررسی',VERIFIED:'بررسی داخلی ثبت‌شده',REJECTED:'ردشده',PROPOSED:'پیشنهاد',AUTHORIZED:'پیگیری داخلی مجاز',REJECTED_ACTION:'ردشده'};
const modeLabel={OPERATIONAL:'عملیات‌محور',AGENTIC:'عامل‌محور',VALUE:'ارزش‌محور'};
function SectionHeader({children,detail}){return <div className="rw6-section-head"><h3>{children}</h3>{detail&&<p>{detail}</p>}</div>}
function StateTag({value}){return <span className={'rw6-state rw6-state-'+String(value||'UNKNOWN').toLowerCase()}>{OPTIONS[value]||l(value)}</span>}
function InlineStat({label,value,sub}){return <article className="rw6-stat"><small>{label}</small><strong>{value}</strong>{sub&&<p>{sub}</p>}</article>}
function Issue({title,detail,kind='info'}){return <div className={'rw6-callout rw6-'+kind}><AlertTriangle size={17}/><div><b>{title}</b>{detail&&<p>{detail}</p>}</div></div>}
export default function WasteCommandWorkspace({city,cityName,organizationId,actorId,role,access,api,cases=[],navigate,openSuite,preferredLens='OPERATIONAL'}){
 const [tab,setTab]=useState('overview'),[kind,setKind]=useState('COLLECTION'),[selectedCase,setSelectedCase]=useState('');
 const [suite,setSuite]=useState(null),[followups,setFollowups]=useState(null),[agentStatus,setAgentStatus]=useState(null),[errors,setErrors]=useState({}),[loading,setLoading]=useState(false),[rev,setRev]=useState(0);
 const [notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[note,setNote]=useState({}),[pendingKeys,setPendingKeys]=useState({}),[search,setSearch]=useState('');
 const [testResults,setTestResults]=useState({}),[testNote,setTestNote]=useState('');
 const mountedRef=React.useRef(city);mountedRef.current=city;
 const refresh=()=>setRev(x=>x+1);
 useEffect(()=>{setSuite(null);setFollowups(null);setAgentStatus(null);setErrors({});setSelectedCase('');setTab('overview');setNote({});setError('');setNotice('');setTestResults({})},[city,organizationId]);
 useEffect(()=>{setTab(preferredLens==='AGENTIC'?'agents':preferredLens==='VALUE'?'value':'overview')},[preferredLens]);
 useEffect(()=>{
  let active=true;if(!city||!organizationId||typeof api!=='function')return ()=>{active=false};
  setLoading(true);setErrors({});
  const root=`/cities/${encodeURIComponent(city)}`;
  Promise.allSettled([api(`${root}/waste-suite`),api(`${root}/agent-followups`),api(`${root}/agent-status`)]).then(all=>{
   if(!active||mountedRef.current!==city)return;
   const names=['suite','followups','agentStatus'];const bad={};
   all.forEach((r,i)=>{
    if(r.status==='fulfilled'){
      if(i===0)setSuite(r.value);
      if(i===1)setFollowups(r.value);
      if(i===2)setAgentStatus(r.value);
    }else{bad[names[i]]=r.reason?.message||'دریافت اطلاعات ناموفق بود';if(i===0)setSuite(null);if(i===1)setFollowups(null);if(i===2)setAgentStatus(null)}
   });setErrors(bad);
  }).finally(()=>{if(active)setLoading(false)});
  return ()=>{active=false};
 },[city,organizationId,api,rev]);
 const actionRows=useMemo(()=>Array.isArray(followups?.rows)?followups.rows:Array.isArray(followups?.actions)?followups.actions:null,[followups]);
 const chosenCase=cases.find(c=>c.id===selectedCase)||cases.find(c=>c.status==='IN_PROGRESS')||cases[0]||null;
 const chosenId=chosenCase?.id||null;
 const base=useMemo(()=>buildWasteOSOverview(suite,{city,organizationId,role,caseId:chosenId,followups:actionRows}),[suite,city,organizationId,role,chosenId,actionRows]);
 const canPropose=!!access?.canWrite&&['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR'].includes(role)&&['OPEN','IN_PROGRESS','NEW','PENDING'].includes(chosenCase?.status);
 const visible=useMemo(()=>base.state==='READY'?suite.rows.filter(r=>r.record_kind===kind).filter(r=>`${r.record_code} ${r.evidence_ref} ${r.case_id||''} ${Object.values(r.payload||{}).join(' ')}`.toLocaleLowerCase('fa').includes(search.toLocaleLowerCase('fa'))):[],[base.state,suite,kind,search]);
 const followupCaseRows=Array.isArray(base.caseFollowups)?base.caseFollowups:[];
 const followupWindowPartial=Array.isArray(actionRows)&&actionRows.length>=Number(followups?.limit||50);
 async function saveReview(row,decision){
  const message=note[row.id]||'';
  if(!canReviewWasteRecord(row,{role,canWrite:!!access?.canWrite,actorId})||!validReviewNote(message,25)){setError('مجوز بازبین مستقل یا متن تصمیم معتبر نیست.');return}
  if(!window.confirm('این تصمیم فقط وضعیت بررسی داخلی داده آزمایشی را تغییر می‌دهد؛ ارزش عمومی یا عملیات واقعی تأیید نمی‌شود.'))return;
  setBusy(true);setError('');setNotice('');const startCity=city;
  try{await api(`/cities/${encodeURIComponent(city)}/waste-suite/${encodeURIComponent(row.id)}`,'PATCH',{decision,reviewNote:message.trim()});
   if(mountedRef.current!==startCity)return;setNote(p=>({...p,[row.id]:''}));setNotice('تصمیم بررسی داخلی از API مجاز ثبت شد.');refresh();
  }catch(e){setError(e?.message||'ثبت تصمیم شواهد ناموفق بود')}finally{setBusy(false)}
 }
 async function saveFollowupDecision(row,decision){
  const message=note[row.id]||'';
  if(!canReviewWasteFollowup(row,{role,canWrite:!!access?.canWrite,actorId,caseId:chosenId})||!validReviewNote(message,30)){setError('حساب مستقل، مجوز بازبینی و دلیل کافی لازم است.');return}
  if(!window.confirm('این تصمیم صرفاً پیگیری داخلی را بررسی می‌کند؛ به Temporal اجرایی، اعزام یا پرداخت مجوز نمی‌دهد.'))return;
  setBusy(true);setError('');setNotice('');const startCity=city;
  try{await api(`/cities/${encodeURIComponent(city)}/agent-followups/${encodeURIComponent(row.id)}`,'PATCH',{action:decision,note:message.trim()});
   if(mountedRef.current!==startCity)return;setNote(p=>({...p,[row.id]:''}));setNotice('تصمیم مستقل برای پیگیری داخلی ثبت و بازخوانی شد.');refresh();
  }catch(e){setError(e?.message||'تصمیم مستقل ناموفق بود')}finally{setBusy(false)}
 }
 async function createFollowup(finding){
  if(!canPropose||!chosenId||!findingAppliesToCase(finding,chosenId)||base.partial||!actionRows||followupWindowPartial){setError('ایجاد پیشنهاد به پرونده، اطلاعات کامل و مجوز معتبر نیاز دارد.');return}
  if(followupCaseRows.some(x=>x.status==='PROPOSED'&&String(x.note||'').includes(finding.code))){setError('برای این نوع هشدار یک پیشنهاد در انتظار بررسی دیده می‌شود؛ از ثبت تکراری خودداری کنید.');return}
  const text=safeProposeNote(finding,chosenId);
  if(!window.confirm('برای این پرونده فقط درخواست بررسی داخلی شواهد ثبت شود؟ داده آزمایشی به سند واقعی تبدیل نمی‌شود.'))return;
  const key=pendingKeys[finding.code]||window.crypto?.randomUUID?.();if(!key){setError('شناسه یکتا ایجاد نشد');return}
  setPendingKeys(p=>({...p,[finding.code]:key}));setBusy(true);setError('');setNotice('');const startCity=city;
  try{await api(`/cities/${encodeURIComponent(city)}/agent-followups`,'POST',{caseId:chosenId,requestKey:key,kind:'CASE_FOLLOWUP',note:text});
   if(mountedRef.current!==startCity)return;setNotice('درخواست پیگیری در RUVOS ثبت شد و منتظر بررسی مستقل است.');setPendingKeys(p=>({...p,[finding.code]:''}));refresh();
  }catch(e){setError(e?.message||'ثبت پیشنهاد ناموفق بود؛ کلید جلوگیری از تکرار حفظ شد')}finally{setBusy(false)}
 }
 function report(){
  const items=finalUATDefinitions();const lines=items.map(x=>`${testResults[x.id]||'NOT_RUN'}\t${x.id}\t${x.label}`);
  const result=['RHF ACOS WASTE OS V6 - FINAL UAT','City: '+city,'Organization: '+organizationId,'Case: '+(chosenId||'NOT_SELECTED'),'Synthetic only: YES','Date: '+new Date().toISOString(),...lines,'Notes: '+testNote].join('\n');
  if(window.navigator?.clipboard?.writeText)window.navigator.clipboard.writeText(result).then(()=>setNotice('گزارش آزمون در کلیپ‌بورد کپی شد.')).catch(()=>setError('کپی خودکار ممکن نشد؛ گزارش را از صفحه انتخاب کنید.'));
  else setError('Clipboard API در مرورگر در دسترس نیست');
 }
 const countResults=v=>Object.values(testResults).filter(x=>x===v).length;
 return <section className="rw6" dir="rtl" data-rhf-waste-os="V6-INTEGRATED">
   <header className="rw6-hero"><div><span className="rw6-kicker">RHF ACOS / WASTE OPERATING SYSTEM V6</span><h2>مرکز فرماندهی یکپارچه سازمان مدیریت پسماند</h2><p>{l(cityName)} · عملیات، ۱۱ حوزه تخصصی، عوامل، تصمیم انسانی و حکمرانی ارزش بر یک داده مشترک</p></div><button disabled={loading||busy} onClick={refresh}><RefreshCw size={17}/>{loading?'در حال دریافت':'بازخوانی داده‌ها'}</button></header>
   <Issue kind="warn" title="محیط صرفاً آزمایشی" detail="این نما به API واقعی پایلوت شیراز متصل است، اما شواهد میدانی تأیید نشده‌اند. Temporal و LangGraph فعلاً به RUVOS زنده متصل نیستند؛ تأیید داخلی به معنی ارزش شهری یا مجوز اعزام نیست."/>
   {Object.keys(errors).length>0&&<Issue kind="error" title="برخی منابع دریافت نشدند" detail={Object.entries(errors).map(([k,v])=>`${k}: ${trim(v)}`).join('؛ ')}/>}
   {error&&<Issue kind="error" title="خطا" detail={error}/>}{notice&&<div className="rw6-notice" role="status"><CheckCircle2 size={17}/>{notice}</div>}
   <div className="rw6-toolbar"><label>پرونده تحت بررسی<select value={chosenId||''} onChange={e=>setSelectedCase(e.target.value)}>{cases.map(c=><option key={c.id} value={c.id}>{l(c.summary)} · {l(c.status)}</option>)}</select></label><span>شیوه کاری: {modeLabel[preferredLens]||modeLabel.OPERATIONAL}</span><span className="rw6-scope">شهرداری و سازمان از نشست مجاز API کنترل می‌شوند</span></div>
   <nav className="rw6-tabs" aria-label="بخش‌های سیستم‌عامل سازمان پسماند">{TABS.map(([id,label])=><button key={id} type="button" aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
   {base.state!=='READY'?<div className="rw6-empty"><LockKeyhole size={22}/><b>نمایش داده‌های سازمان فعلاً ممکن نیست</b><p>{base.message}{loading?' — در حال دریافت پاسخ':''}</p></div>:<>
    {base.partial&&<Issue kind="warn" title="اطلاعات محدود به ۱۰۰۰ ردیف" detail="شاخص‌های موجود، نمای کامل کل سازمان نیستند؛ از نبود رکورد یا مقدار نتیجه قطعی نگیرید."/>}
    {tab==='overview'&&<>
      <SectionHeader detail="شاخص‌ها از همان دفتر V2 محاسبه می‌شوند؛ فقط رکوردهای VERIFIED داخلی مجاز به ورود در محاسبات‌اند.">میز فرماندهی و سلامت داده</SectionHeader>
      <div className="rw6-stats">
       <InlineStat label="کل سوابق مجاز" value={fmt(base.counts.all)} sub="هر ۱۱ حوزه مطابق نقش"/>
       <InlineStat label="منتظر بررسی" value={fmt(base.counts.pending)} sub="نیازمند بازبین مستقل"/>
       <InlineStat label="بررسی داخلی شده" value={fmt(base.counts.verified)} sub="نه تأیید واقعیت میدانی"/>
       <InlineStat label="سوابق صریحاً متصل به پرونده" value={fmt(base.counts.linked)} sub={chosenCase?.summary||'پرونده انتخاب نشده'}/>
      </div>
      <SectionHeader detail="دسترسی هر بخش و داده واقعی آن در قالب یک سیستم‌عامل واحد؛ بدون ساخت ماژول یا جدول تکراری.">پوشش ۱۱ حوزه تخصصی</SectionHeader>
      <div className="rw6-domain-grid">{base.domains.map(d=>{const Icon=IC[d.id]||Layers3;return <button key={d.id} onClick={()=>{setKind(d.id);setTab('domains');setSearch('')}}><Icon size={20}/><b>{d.title}</b><small>{d.locked?'فقط نقش مجاز':`${fmt(d.count)} سابقه · ${fmt(d.pending)} در انتظار`}</small><span>{d.owner}</span></button>})}</div>
      <SectionHeader detail="اولویت‌ها از قواعد مشخص و داده‌های دارای منشأ تولید می‌شوند؛ نتیجه بازبینی نهایی نیستند.">اقدام‌های نیازمند توجه</SectionHeader>
      {base.findings.length===0?<p className="rw6-muted">از داده‌های قابل مشاهده، هشدار مستند استخراج نشده است؛ به معنی نبود مشکل شهری نیست.</p>:<div className="rw6-findings">{base.findings.slice(0,7).map((f,i)=><article key={f.code+(f.recordId||'')+i}><b>{f.title}</b><p>{f.description}</p><small>حوزه {f.domain} · انسان تصمیم می‌گیرد</small></article>)}</div>}
    </>}
    {tab==='domains'&&<>
     <SectionHeader detail="جزئیات از API رسمی waste-suite خوانده می‌شوند. ثبت، اصلاح و بررسی با مسیر مجاز دفتر تخصصی انجام می‌شود.">دفتر عملیاتی ۱۱ حوزه</SectionHeader>
     <div className="rw6-domains">{base.domains.map(d=><button key={d.id} aria-pressed={kind===d.id} onClick={()=>{setKind(d.id);setSearch('')}}>{d.title}<span>{d.locked?'قفل':fmt(d.count)}</span></button>)}</div>
     {base.domains.filter(d=>d.id===kind).map(d=><div key={d.id} className="rw6-domain-detail"><div><b>{d.title}</b><p>مسئول حوزه: {d.owner}</p>{d.locked&&<p>این حوزه برای نقش فعلی فقط به‌صورت عنوان قابل مشاهده است؛ داده محرمانه نمایش داده نمی‌شود.</p>}<p>معیار کنترل: {d.metric.value===null?'فاقد داده قابل محاسبه':`${fmt(d.metric.value)} ${d.metric.unit}`}</p><small>{d.metric.detail}</small></div><div><b>سابقه: {fmt(d.count)}</b><span>بررسی‌شده: {fmt(d.verified)}</span><span>در انتظار: {fmt(d.pending)}</span><span>ردشده: {fmt(d.rejected)}</span></div></div>)}
     <div className="rw6-row-head"><label><Search size={16}/><input placeholder="کد، مستند یا شناسه پرونده" value={search} onChange={e=>setSearch(e.target.value)}/></label><button disabled={base.domains.some(d=>d.id===kind&&d.locked)} onClick={()=>openSuite?.(kind)}>ثبت و بررسی در دفتر رسمی <ArrowLeft size={14}/></button></div>
     {visible.length===0?<p className="rw6-muted">رکورد قابل مشاهده‌ای وجود ندارد؛ داده ساخته نمی‌شود.</p>:<div className="rw6-records">{visible.slice(0,35).map(r=><article key={r.id}><div><b>{l(r.record_code)}</b><StateTag value={r.review_state}/></div><p>پرونده: {r.case_id?(caseLinkLabel(r.case_id,chosenId)):'بدون انتساب'}</p><p>مرجع مستند: {l(r.evidence_ref)}</p><small>{Object.entries(r.payload||{}).slice(0,6).map(([key,v])=>`${key}: ${l(v)}`).join(' · ')}</small></article>)}</div>}
     {visible.length>35&&<p className="rw6-muted">۳۵ ردیف نخست نمایش داده می‌شود؛ برای فهرست کامل به دفتر تخصصی مراجعه کنید.</p>}
    </>}
    {tab==='evidence'&&<>
     <SectionHeader detail="اتصال فقط با شناسه صریح case_id انجام می‌شود. مشابهت عنوان، کد خودرو یا قبض، جایگزین رابطه ثبت‌شده نیست.">زنجیره شواهد پرونده</SectionHeader>
     <div className="rw6-stats"><InlineStat label="انتساب صریح به پرونده" value={fmt(base.counts.linked)} sub="سوابق همه حوزه‌ها"/><InlineStat label="قبض دمو بدون انتساب" value={fmt(base.counts.unlinked)} sub="ثبت‌شده؛ نه قابل انتساب حدسی"/><InlineStat label="ارزش عمومی تأییدشده" value="احراز نشده" sub="دروازه تأیید مستقل برقرار نیست"/></div>
     {base.linked.length===0?<Issue title="هیچ سابقه مرتبط در داده قابل مشاهده نیست" detail="با فرض کامل‌بودن فهرست، باید هنگام ثبت مدرک بعدی پرونده را صریح انتخاب کرد. تغییر خودکار یا بازنویسی سابقه مجاز نیست."/>:<div className="rw6-records">{base.linked.slice(0,40).map(r=><article key={r.id}><b>{l(r.record_code)} · {l(r.record_kind)}</b><StateTag value={r.review_state}/><p>سند: {l(r.evidence_ref)}</p><small>case_id: {r.case_id}</small></article>)}</div>}
     {base.unlinked.length>0&&<><SectionHeader detail="این سوابق تنها برای رفع ابهام نمایش داده شده‌اند و به پرونده انتخاب‌شده منتسب نیستند.">اسناد آزمایشی بدون انتساب</SectionHeader><div className="rw6-records">{base.unlinked.slice(0,15).map(r=><article key={r.id}><b>{l(r.record_code)}</b><StateTag value={r.review_state}/><p>وزن ادعایی آزمایشی: {l(r.payload?.netKg)} kg</p><small>منشأ: {l(r.evidence_ref)} · case_id وجود ندارد</small></article>)}</div></>}
     <button className="rw6-primary" onClick={()=>openSuite?.('COLLECTION')}><Scale size={16}/> مشاهده دفتر باسکول و سوابق</button>
    </>}
    {tab==='agents'&&<>
     <SectionHeader detail="عامل قاعده‌محور فقط شواهد ثبت‌شده را تحلیل می‌کند. هیچ اتصال زنده‌ای از O2 به Temporal یا LangGraph ادعا نمی‌شود.">مرکز فرصت‌یابی و عوامل تخصصی</SectionHeader>
     <div className="rw6-stats"><InlineStat label="هشدارهای مبتنی بر داده" value={fmt(base.findings.length)} sub="پیشنهاد، نه تصمیم"/><InlineStat label="پیشنهادهای پرونده" value={actionRows?fmt(followupCaseRows.length):'نامشخص'} sub="همان API معتبر RUVOS"/><InlineStat label="اجرای خودکار" value="غیرفعال" sub="AVOS مستقل و محافظت‌شده"/></div>
     {base.findings.length===0?<p className="rw6-muted">هشداری از داده‌های معتبر استخراج نشد.</p>:<div className="rw6-findings">{base.findings.map((f,i)=><article key={f.code+(f.recordId||'')+i}><b>{f.title}</b><p>{f.description}</p><small>مالک تحلیل: {f.domain} · سند: {f.recordId||'نیازمند جمع‌آوری مستند'} · نتیجه: پیگیری انسانی</small>{canPropose&&chosenId&&findingAppliesToCase(f,chosenId)&&<button disabled={busy||base.partial||!actionRows||followupWindowPartial} onClick={()=>createFollowup(f)}><ClipboardCheck size={15}/> درخواست بررسی مستند برای پرونده منتخب</button>}</article>)}</div>}
     <div className="rw6-links"><button onClick={()=>navigate?.('city-choice')}>تحلیل A01 و تصمیم انسانی در سیستم‌عامل شهر <ArrowLeft size={14}/></button><button onClick={()=>navigate?.('urban-value')}>فرصت‌های خلق ارزش <ArrowLeft size={14}/></button></div>
     <Issue title="مرز Agentic" detail="O1-LangGraph و O1-Temporal تنها با داده مصنوعی آزمایش شده‌اند. O2 به RUVOS متصل نیست؛ هیچ سیگنال یا مجوز واقعی از این نما صادر نمی‌شود."/>
    </>}
    {tab==='reviews'&&<>
     <SectionHeader detail="برای هر بررسی باید ایجادکننده و بازبین مستقل باشند. تصمیم از API معتبر ثبت و حسابرسی می‌شود.">صف بازبینی سوابق و پیشنهادها</SectionHeader>
     <h4>سوابق در انتظار بررسی ({base.counts.pending.toLocaleString('fa-IR')})</h4>
     {suite.rows.filter(r=>r.review_state==='SUBMITTED').length===0?<p className="rw6-muted">رکوردی برای بازبینی وجود ندارد.</p>:<div className="rw6-review-list">{suite.rows.filter(r=>r.review_state==='SUBMITTED').slice(0,40).map(r=><article key={r.id}><b>{l(r.record_code)} · {l(r.record_kind)}</b><p>مرجع: {l(r.evidence_ref)} · پرونده: {l(r.case_id)}</p>{canReviewWasteRecord(r,{role,canWrite:!!access?.canWrite,actorId})?<><label>مبنای بررسی مستقل<textarea value={note[r.id]||''} onChange={e=>setNote(p=>({...p,[r.id]:e.target.value}))} placeholder="فقط صحت و انطباق سابقه نرم‌افزاری؛ مدرک آزمایشی، سند میدانی نیست" maxLength={500}/></label><div><button disabled={busy||!validReviewNote(note[r.id],25)} onClick={()=>saveReview(r,'VERIFIED')}>بررسی داخلی</button><button disabled={busy||!validReviewNote(note[r.id],25)} onClick={()=>saveReview(r,'REJECTED')}>رد سابقه</button></div></>:<p className="rw6-muted">نقش فعلی یا استقلال بازبین برای تصمیم کافی نیست.</p>}</article>)}</div>}
     <h4>اقدامات عامل برای پرونده انتخابی</h4>
     {!actionRows?<p className="rw6-muted">پاسخ معتبر صف پیشنهادها دریافت نشده؛ نبود پیشنهاد قابل استنتاج نیست.</p>:followupCaseRows.length===0?<p className="rw6-muted">در فهرست دریافتی، پیشنهادی برای پرونده منتخب دیده نشد.</p>:<div className="rw6-review-list">{followupCaseRows.map(r=><article key={r.id}><b>{l(r.kind)} <StateTag value={r.status}/></b><p>{trim(r.note)}</p>{canReviewWasteFollowup(r,{role,canWrite:!!access?.canWrite,actorId,caseId:chosenId})?<><label>دلیل تصمیم انسانی<textarea value={note[r.id]||''} onChange={e=>setNote(p=>({...p,[r.id]:e.target.value}))} maxLength={500}/></label><div><button disabled={busy||!validReviewNote(note[r.id],30)} onClick={()=>saveFollowupDecision(r,'AUTHORIZE')}>مجازکردن پیگیری داخلی</button><button disabled={busy||!validReviewNote(note[r.id],30)} onClick={()=>saveFollowupDecision(r,'REJECT')}>رد پیشنهاد</button></div></>:<p className="rw6-muted">این پیشنهاد یا بررسی‌شده است یا به بازبین مستقلی با اختیار معتبر نیاز دارد.</p>}</article>)}</div>}
    </>}
    {tab==='value'&&<>
     <SectionHeader detail="ارزش قابل انتساب به شهر باید از نیاز و ظرفیت مجاز تا اثر مستقل تأییدشده زنجیره مدرک داشته باشد.">سیستم‌عامل خلق و حکمرانی ارزش</SectionHeader>
     <div className="rw6-value-flow">{['نیاز و مسئله شهری','ظرفیت قابل استفاده','دسترسی و مجوز','اقدام مجاز','شواهد قبل و بعد','تأیید مستقل ارزش'].map((x,i)=><div key={i}><span>{i+1}</span><b>{x}</b><small>{i===5?'در داده آزمایشی احراز نشده':'نیازمند مدرک پرونده'}</small></div>)}</div>
     <Issue kind="warn" title="ارزش عمومی در این پایلوت تأیید نشده است" detail="وزن باسکول ساختگی، گزارش عملکرد پیمانکار، تأیید داخلی و حتی تصمیم AUTHORIZE هیچ‌کدام به‌تنهایی منفعت محیط‌زیستی یا صرفه‌جویی واقعی نیستند."/>
     <div className="rw6-links"><button onClick={()=>navigate?.('urban-value')}>حکمرانی فرصت‌ها <ArrowLeft size={14}/></button><button onClick={()=>navigate?.('outcomes')}>پیامدها و راستی‌آزمایی <ArrowLeft size={14}/></button><button onClick={()=>navigate?.('capacity')}>ظرفیت‌ها و منابع <ArrowLeft size={14}/></button></div>
    </>}
    {tab==='uat'&&<>
     <SectionHeader detail="آزمون‌های این قسمت در پایان توسعه انجام می‌شوند؛ موفقیت باید با مشاهده واقعی ثبت شود، نه علامت‌گذاری خودکار.">ماتریس آزمون نهایی سازمان پسماند</SectionHeader>
     <div className="rw6-stats"><InlineStat label="PASS" value={fmt(countResults('PASS'))}/><InlineStat label="FAIL" value={fmt(countResults('FAIL'))}/><InlineStat label="NOT RUN" value={fmt(finalUATDefinitions().length-countResults('PASS')-countResults('FAIL'))}/></div>
     <div className="rw6-uat-list">{finalUATDefinitions().map((test,i)=><div key={test.id}><b>{(i+1).toLocaleString('fa-IR')}. {test.label}</b><select aria-label={`نتیجه ${test.label}`} value={testResults[test.id]||'NOT_RUN'} onChange={e=>setTestResults(p=>({...p,[test.id]:e.target.value}))}><option value="NOT_RUN">اجرا نشده</option><option value="PASS">موفق</option><option value="FAIL">ناموفق</option></select></div>)}</div>
     <label className="rw6-uat-note">یادداشت‌ها / شماره خطا<textarea value={testNote} maxLength={2000} onChange={e=>setTestNote(e.target.value)}/></label>
     <button className="rw6-primary" onClick={report}><FileCheck2 size={17}/> کپی گزارش پذیرش برای ارسال</button>
     <p className="rw6-muted">نتایج تست تنها در این نشست مرورگر نگهداری می‌شوند؛ برای بایگانی از دکمه کپی استفاده کنید. گزارش خودکار PASS صادر نمی‌شود.</p>
    </>}
   </>}
   <footer className="rw6-foot"><ShieldCheck size={17}/>RUVOS مرجع داده و اختیار است؛ عامل‌ها فقط پیشنهاد می‌دهند، Temporal زمان‌بندی و انتظار را مدیریت می‌کند و ارزش شهری تنها با شواهد مستقل قابل احراز است.</footer>
 </section>;
}
function caseLinkLabel(id,chosenId){return id===chosenId?'متصل به پرونده انتخابی':`شناسه متفاوت: ${String(id).slice(0,12)}…`}
