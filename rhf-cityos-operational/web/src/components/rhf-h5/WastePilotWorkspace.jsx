import WasteSuiteWorkspace from './WasteSuiteWorkspace.jsx';
import WasteCommandWorkspace from './WasteCommandWorkspace.jsx';
import {selectedPilotTab} from './city-choice-core.mjs';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Recycle,RefreshCcw,ArrowLeft,ClipboardList,Activity,BrainCircuit,ShieldCheck,Target,Truck,FileCheck2,AlertTriangle,CheckCircle2,FolderOpen,Search,Send,Layers3,LockKeyhole} from 'lucide-react';
import {safeAgentResult} from './a01-discovery-core.mjs';
import {safeFact} from './waste-evidence-review-core.mjs';
import {isWasteDemoCity,selectOpenCase,datasetRows,canIndependentlyReview,canIndependentlyReviewValue} from './waste-pilot-ui-core.mjs';
import './waste-pilot.css';
const fmt=x=>Number.isSafeInteger(x)?x.toLocaleString('fa-IR'):'—';
const short=x=>typeof x==='string'&&x?x:'—';
const canPropose=new Set(['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR']);
const defaultValueForm={title:'',publicNeed:'',beneficiaries:'',geography:'',barrier:'DISCOVERY',authorityReference:'',baselineMethod:'',comparator:'',valueDimension:'ENVIRONMENT'};
const valueDimensions=[['ENVIRONMENT','محیط‌زیست'],['SERVICE','کیفیت خدمت'],['EQUITY','عدالت'],['FISCAL','منابع مالی'],['TRUST','اعتماد'],['RESILIENCE','تاب‌آوری'],['WELLBEING','رفاه']];
const barriers=[['DISCOVERY','شناسایی نیاز'],['LEGAL_ACCESS','اختیار و دسترسی قانونی'],['QUALITY','کیفیت داده'],['SCHEDULING','زمان‌بندی'],['COORDINATION','هماهنگی'],['FUNDING','تأمین منابع'],['OTHER','سایر']];
function Info({title,children}){return <div className="rhw-info"><strong>{title}</strong><div>{children}</div></div>}
function DatasetSection({title,rows,render,empty='داده‌ای برای این سازمان ثبت نشده است.'}){
 return <section className="rhw-dataset"><h3>{title} <small>{fmt(rows.length)}</small></h3>
  {!rows.length?<p className="rhw-muted">{empty}</p>:<div className="rhw-stack">{rows.map(row=><article key={row.id} className="rhw-datarow">{render(row)}</article>)}</div>}
 </section>;
}
export default function WastePilotWorkspace({city,cityName,actorId,api,access,navigate,preferredLens='OPERATIONAL',focus=null}){
 const [snapshot,setSnapshot]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [revision,setRevision]=useState(0),[tab,setTab]=useState('command'),[suiteDomain,setSuiteDomain]=useState('COLLECTION'),[selected,setSelected]=useState(''),[search,setSearch]=useState('');
 const [busy,setBusy]=useState(false),[plan,setPlan]=useState(null),[followupNote,setFollowupNote]=useState(''),[followupKey,setFollowupKey]=useState('');
 const [reviewNote,setReviewNote]=useState(''),[valueNote,setValueNote]=useState(''),[valueForm,setValueForm]=useState(defaultValueForm);
 const demo=isWasteDemoCity(cityName);
 const previousLens=useRef(preferredLens);
 useEffect(()=>{if(previousLens.current!==preferredLens){previousLens.current=preferredLens;setTab(selectedPilotTab(preferredLens))}},[preferredLens]);
 const refresh=()=>setRevision(x=>x+1);
 useEffect(()=>{setSnapshot(null);setSelected('');setPlan(null);setFollowupNote('');setFollowupKey('');setSearch('');setTab('command');setSuiteDomain('COLLECTION');setError('');setNotice('')},[city]);
 useEffect(()=>{if(focus?.kind==='wasteDomain'&&['COLLECTION','FLEET','MAINTENANCE','CONTRACTOR','CONTRACT_EVAL','SHIFT','EDUCATION','FACILITY','QUALITY','VIOLATION','LEGAL'].includes(focus.value)){setSuiteDomain(focus.value);setTab('suite')}},[focus?.kind,focus?.value,city]);
 useEffect(()=>{
  let active=true;
  if(!city||!demo||typeof api!=='function')return()=>{active=false};
  setLoading(true);setError('');
  api(`/cities/${encodeURIComponent(city)}/waste-pilot`).then(r=>{
   if(!active)return;
   if(r?.mode!=='SYNTHETIC_WASTE_READ_ONLY'||r?.city?.id!==city)throw Error('قرارداد پاسخ پایلوت معتبر نیست');
   setSnapshot(r);setSelected(v=>datasetRows(r,'cases').some(c=>c.id===v)?v:selectOpenCase(datasetRows(r,'cases')));
  }).catch(e=>{if(active){setSnapshot(null);setError(e?.message||'دریافت اطلاعات سازمان ناموفق بود')}})
   .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[city,demo,revision,api]);
 const activeSnapshot=snapshot?.city?.id===city?snapshot:null;
 const rows=datasetRows(activeSnapshot,'cases');
 const chosen=rows.find(c=>c.id===selected)||null;
 const selectedMissions=datasetRows(activeSnapshot,'missions').filter(x=>x.case_id===selected);
 const selectedActions=datasetRows(activeSnapshot,'followups').filter(x=>x.case_id===selected);
 const selectedValues=datasetRows(activeSnapshot,'valueCases').filter(x=>x.case_id===selected);
 const selectedOutcomes=datasetRows(activeSnapshot,'outcomes').filter(x=>x.case_id===selected);
 const selectedInspections=datasetRows(activeSnapshot,'inspections').filter(x=>x.case_id===selected);
 const selectedAllocations=datasetRows(activeSnapshot,'allocations').filter(x=>x.case_id===selected);
 const valueIds=new Set(selectedValues.map(x=>x.id));
 const selectedMatches=datasetRows(activeSnapshot,'matches').filter(x=>valueIds.has(x.value_case_id));
 const filtered=useMemo(()=>rows.filter(c=>`${c.summary} ${c.id} ${c.status}`.toLocaleLowerCase('fa').includes(search.toLocaleLowerCase('fa'))),[rows,search]);
 const role=activeSnapshot?.role||access?.role||'';
 const writer=canPropose.has(role)&&!!access?.canWrite;
 async function run(action){
  if(busy||!chosen)return;
  setBusy(true);setError('');setNotice('');
  try{await action();refresh()}catch(e){setError(e?.message||'عملیات ناموفق بود')}finally{setBusy(false)}
 }
 async function analyze(){
  if(!chosen||busy)return;
  setBusy(true);setError('');setNotice('');setPlan(null);
  try{
   const response=await api(`/cities/${encodeURIComponent(city)}/agent-plan`,'POST',{
    caseId:chosen.id,intent:'CAPACITY_OPPORTUNITY',useModel:false,externalConsent:false
   });
   const clean=safeAgentResult(response,chosen.id);
   setPlan({caseId:chosen.id,result:clean});
   setFollowupNote(`A01 | پایلوت آزمایشی پسماند | بررسی شواهد و فرصت پرونده ${chosen.id}. ارجاع برای بررسی مستقل؛ بدون اجرای میدانی یا ادعای منفعت تأییدشده.`.slice(0,600));
   setNotice('تحلیل عامل با شواهد محدود اجرا شد. ثبت پیشنهاد و تأیید آن کاملاً جدا هستند.');
  }catch(e){setError(e?.message||'تحلیل عامل ناموفق بود')}finally{setBusy(false)}
 }
 async function proposeFollowup(){
  if(!writer||!plan||plan.caseId!==chosen?.id||followupNote.trim().length<12||followupNote.trim().length>600)return;
  if(!window.confirm('صرفاً یک پیشنهاد پیگیری داخلی ثبت شود؟ این عمل مأموریت میدانی یا تخصیص منبع نیست.'))return;
  const key=followupKey||window.crypto?.randomUUID?.();
  if(!key){setError('مرورگر امکان ایجاد شناسه یکتا ندارد');return}
  setFollowupKey(key);
  await run(async()=>{
   await api(`/cities/${encodeURIComponent(city)}/agent-followups`,'POST',{
    caseId:chosen.id,requestKey:key,kind:'CASE_FOLLOWUP',note:followupNote.trim()
   });
   setPlan(null);setFollowupNote('');setFollowupKey('');setNotice('پیشنهاد برای بررسی مستقل ثبت شد؛ اجرا انجام نشده است.');
  });
 }
 async function decideAction(row,action){
  if(reviewNote.trim().length<8){setError('یادداشت تصمیم حداقل هشت نویسه باشد');return}
  if(!window.confirm('تصمیم مستقل برای پیگیری داخلی ثبت شود؟'))return;
  await run(async()=>{await api(`/cities/${encodeURIComponent(city)}/agent-followups/${encodeURIComponent(row.id)}`,'PATCH',{action,note:reviewNote.trim()});setReviewNote('')});
 }
 async function registerValue(e){
  e.preventDefault();if(!writer||!chosen)return;
  if(!window.confirm('فرصت پیشنهادی برای پرونده آزمایشی ثبت شود؟ این عمل ارزش واقعی را تأیید نمی‌کند.'))return;
  await run(async()=>{
   await api(`/cities/${encodeURIComponent(city)}/value-cases`,'POST',{
    caseId:chosen.id,...valueForm
   });setValueForm(defaultValueForm);setNotice('فرصت در وضعیت کشف ثبت شد؛ بررسی مستقل لازم است.');
  });
 }
 async function reviewValue(row){
  if(valueNote.trim().length<8){setError('مستند بررسی مستقل را کامل کنید');return}
  if(!window.confirm('بررسی مستقل فرصت آزمایشی ثبت شود؟ این اقدام اثبات ارزش عمومی نیست.'))return;
  await run(async()=>{await api(`/cities/${encodeURIComponent(city)}/value-cases/${encodeURIComponent(row.id)}`,'PATCH',{action:'REVIEW',reviewEvidence:valueNote.trim()});setValueNote('')});
 }
 if(!demo)return <section className="rhw-guard" dir="rtl"><LockKeyhole size={22}/> پایلوت پسماند فقط در شهرداری «شیراز — دمو آزمایشی» قابل مشاهده است؛ داده‌های شهرداری واقعی تغییر نمی‌کنند.</section>;
 return <section dir="rtl" className="rhw" data-rhf-waste-pilot="v1" aria-label="میزکار یکپارچه سازمان مدیریت پسماند">
  <header className="rhw-hero"><div><span className="rhw-overline"><Recycle size={17}/> RHF ACOS / WASTE OPERATING SYSTEM V6</span>
    <h2>سازمان مدیریت پسماند شیراز</h2><p>متصل به معاونت خدمات شهری و محیط‌زیست · عملیات، عامل‌ها و فرصت‌های خلق ارزش با داده مستند</p>
    <span className="rhw-synthetic"><AlertTriangle size={15}/> صرفاً داده آزمایشی؛ هیچ نتیجه میدانی یا منفعت واقعی احراز نشده است</span>
   </div><button type="button" className="rhw-refresh" disabled={loading||busy} onClick={refresh}><RefreshCcw size={17}/> بازخوانی اطلاعات</button></header>
  {error&&<div role="alert" className="rhw-error"><AlertTriangle size={18}/>{error}</div>}
  {notice&&<div role="status" className="rhw-note"><CheckCircle2 size={17}/>{notice}</div>}
  {loading&&!snapshot?<div className="rhw-loading">در حال دریافت داده‌های سازمان از API دارای احراز هویت…</div>:null}
  {activeSnapshot&&<>
    <div className="rhw-kpis">
      {[['پرونده‌های سازمان',activeSnapshot.stats.cases,ClipboardList],['مأموریت ثبت‌شده',activeSnapshot.stats.missions,Activity],['پیگیری‌های عامل',activeSnapshot.stats.followups,BrainCircuit],['فرصت‌های ارزش',activeSnapshot.stats.opportunities,Target],['منابع دارای مالکیت',activeSnapshot.stats.resources,Truck],['نتیجه واقعی تأییدشده','—',ShieldCheck]].map(([label,value,Icon])=><article key={label}><Icon size={19}/><small>{label}</small><strong>{typeof value==='number'?fmt(value):value}</strong></article>)}
    </div>
    <div className="rhw-policy"><ShieldCheck size={18}/><div><strong>دامنه سازمانی مستند: {activeSnapshot.organization.name_fa}</strong>
     <p>بالادستی: {activeSnapshot.organization.parent_name_fa} · شناسه مدیر ثبت‌شده: {short(activeSnapshot.organization.manager_user_id)} · سند تشکیلاتی: {short(activeSnapshot.organization.charter_reference)} · تأیید رسمی تغییرات تشکیلاتی: {activeSnapshot.policy.orgFormalApprovalProven?'سابقه تصویب در پروفایل موجود است':'در پروفایل احراز نشده'} · AVOS اجرایی: غیرفعال</p>
     {activeSnapshot.partial?.length>0&&<p className="rhw-warning">برخی داده‌ها به سقف ۲۰۰ ردیف رسیده‌اند: {activeSnapshot.partial.join('، ')}. جمع‌های این صفحه کامل نیستند.</p>}
    </div></div>
    <div className="rhw-tabs" role="tablist" aria-label="بخش‌های میزکار پسماند">
     {[['command','سیستم‌عامل جامع پسماند',BrainCircuit],['operations','عملیات و پرونده‌ها',ClipboardList],['suite','مدیریت جامع پسماند',Truck],['agents','عامل‌ها و تصمیم انسانی',BrainCircuit],['value','ارزش و شواهد',Target],['resources','خدمات و ظرفیت',Layers3]].map(([id,label,Icon])=><button type="button" role="tab" key={id} aria-selected={tab===id} onClick={()=>setTab(id)}><Icon size={16}/>{label}</button>)}
    </div>
    {tab==='command'?<WasteCommandWorkspace city={city} cityName={cityName} organizationId={activeSnapshot.organization.id} actorId={actorId} role={role} access={access} api={api} cases={rows} navigate={navigate} preferredLens={preferredLens} openSuite={d=>{setSuiteDomain(d);setTab('suite')}}/>:tab==='suite'?<WasteSuiteWorkspace initialDomain={suiteDomain} city={city} api={api} actorId={actorId} role={role} cases={rows} organizationId={activeSnapshot.organization.id} preferredLens={preferredLens} onViewAgents={()=>setTab('agents')} onViewValue={()=>setTab('value')}/>:<div className="rhw-content">
      <aside className="rhw-case-list"><h3>پرونده‌های مرتبط</h3><label className="rhw-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="جست‌وجو در پرونده‌ها" aria-label="جست‌وجوی پرونده‌ها"/></label>
        {filtered.length===0?<p className="rhw-muted">پرونده‌ای یافت نشد.</p>:filtered.map(c=><button type="button" key={c.id} className={`rhw-case ${c.id===selected?'rhw-case--selected':''}`} aria-pressed={c.id===selected} onClick={()=>{setSelected(c.id);setPlan(null);setFollowupNote('');setFollowupKey('');setError('')}}><strong>{c.summary}</strong><span>{c.status} · {c.priority} · {c.module_code}</span></button>)}
       <button className="rhw-text-button" onClick={()=>navigate?.('cases',{kind:'caseTree',value:activeSnapshot.organization.id,label:'پرونده‌های سازمان پسماند و تابعه'})}>فهرست کامل پرونده‌ها <ArrowLeft size={15}/></button>
      </aside>
      <div className="rhw-detail">{!chosen?<div className="rhw-empty"><FolderOpen size={26}/> پرونده‌ای را انتخاب کنید.</div>:<>
       <div className="rhw-record-head"><div><small>شناسه شاهد: {chosen.id}</small><h3>{chosen.summary}</h3><p>{chosen.unit_name} · وضعیت {chosen.status} · اولویت {chosen.priority}</p></div><button onClick={()=>navigate?.('cases',{kind:'recordId',value:chosen.id,label:`پرونده ${chosen.summary}`})}>پرونده اصلی <ArrowLeft size={14}/></button></div>
       {tab==='operations'&&<>
        <div className="rhw-two"><Info title="شرح درخواست">{short(chosen.description)}</Info><Info title="خدمت مسئول / SLA">{short(chosen.service_name)} · موعد {chosen.due_at?new Date(chosen.due_at).toLocaleString('fa-IR'):'—'}</Info><Info title="شواهد عملیات">{short(chosen.evidence)}</Info><Info title="یادداشت پذیرش">{short(chosen.acceptance_note)}</Info></div>
        <DatasetSection title="مأموریت‌های وابسته" rows={selectedMissions} render={m=><><b>{m.title}</b><span>{m.status} · {short(m.assignee)}</span><p>شواهد: {short(m.evidence)}</p><button onClick={()=>navigate?.('missions',{kind:'caseId',value:chosen.id,label:'مأموریت‌های این پرونده'})}>جزئیات در سامانه <ArrowLeft size={14}/></button></>}/>
        <button type="button" className="rhw-text-button" onClick={()=>navigate?.('execution',{kind:'recordId',value:chosen.id,label:`دستورکار مرتبط با ${chosen.summary}`})}>مشاهده دفتر اجرای خدمت و هزینه‌های مرتبط <ArrowLeft size={14}/></button>
        <DatasetSection title="بازرسی و کنترل کیفیت" rows={selectedInspections} render={r=><><b>{r.result}</b><span>{r.created_at?new Date(r.created_at).toLocaleString('fa-IR'):'—'}</span><p>شاهد: {short(r.evidence)}</p></>}/>
       </>}
       {tab==='agents'&&<>
         <div className="rhw-accent"><BrainCircuit size={19}/><div><strong>A01 — تحلیل فرصت از شواهد همین پرونده</strong><p>چهار ابزار فقط‌خواندنی سرور؛ ثبت رویداد حسابرسی، بدون اجرای مأموریت یا تخصیص خودکار.</p></div><button type="button" disabled={busy} onClick={analyze}>تحلیل پرونده</button></div>
         {plan?.caseId===chosen.id&&<div className="rhw-plan"><strong>گزارش عامل (پیشنهاد، نه تصمیم)</strong>{(plan.result.facts||[]).map((f,i)=><p key={i}>{(()=>{const fact=safeFact(f);return <><b>{fact.label}: </b>{fact.value}</>})()}</p>)}<p>ابزارهای بررسی: {(plan.result.toolTrace||[]).join('، ')||'—'}</p><p>ارزش واقعی اثبات‌شده: خیر</p></div>}
         {writer&&plan?.caseId===chosen.id&&<div className="rhw-form"><label>متن پیشنهاد پیگیری داخلی<textarea value={followupNote} maxLength={600} onChange={e=>{setFollowupNote(e.target.value);setFollowupKey('')}} rows={3}/></label><button disabled={busy||followupNote.trim().length<12} onClick={proposeFollowup}><Send size={16}/> ثبت پیشنهاد برای تأیید مستقل</button></div>}
         <DatasetSection title="اقدامات عامل و مجوزهای انسانی" rows={selectedActions} render={a=><><b>{short(a.kind)} · {short(a.status)}</b><p>{a.note}</p><span>ثبت‌کننده: {short(a.created_by)} · بررسی‌کننده: {short(a.approved_by)}</span>{a.review_note&&<p>یادداشت بررسی: {a.review_note}</p>}
           {canIndependentlyReview(a,role,actorId)&&<div className="rhw-review"><label>دلیل تصمیم مستقل<textarea rows={2} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} maxLength={500}/></label><div><button disabled={busy||reviewNote.trim().length<8} onClick={()=>decideAction(a,'AUTHORIZE')}>تأیید پیگیری داخلی</button><button disabled={busy||reviewNote.trim().length<8} onClick={()=>decideAction(a,'REJECT')}>رد پیشنهاد</button></div></div>}
           {a.status==='AUTHORIZED'&&writer&&<div className="rhw-review"><label>مدرک پیگیری داخلی<textarea rows={2} value={reviewNote} maxLength={500} onChange={e=>setReviewNote(e.target.value)}/></label><button disabled={busy||reviewNote.trim().length<8} onClick={()=>decideAction(a,'EXECUTE')}>ثبت انجام پیگیری داخلی (نه اجرا در میدان)</button></div>}
          </>}/>
       </>}
       {tab==='value'&&<>
         <div className="rhw-accent"><Target size={19}/><div><strong>فرصت‌های خلق ارزش شهری</strong><p>خط مبنا و شواهد از پرونده ثبت می‌شود؛ بررسی مستقل، ادعای اثر واقعی یا صرفه‌جویی نیست.</p></div></div>
         <DatasetSection title="فرصت‌های ثبت‌شده" rows={selectedValues} render={v=><><b>{v.title} · {v.status}</b><p>نیاز: {short(v.public_need)}</p><p>روش خط مبنا: {short(v.baseline_method)}</p><span>بعد ارزش: {v.value_dimension} · مانع: {v.barrier}</span>{v.review_evidence&&<p>بررسی مستقل: {v.review_evidence}</p>}{canIndependentlyReviewValue(v,role,actorId)&&<div className="rhw-review"><label>سند بررسی مستقل<textarea rows={2} value={valueNote} maxLength={1600} onChange={e=>setValueNote(e.target.value)}/></label><button disabled={busy||valueNote.trim().length<8} onClick={()=>reviewValue(v)}>ثبت بررسی مستقل فرصت</button></div>}</>}/>
         <DatasetSection title="نتایج سنجش و مستندات" rows={selectedOutcomes} render={o=><><b>{short(o.metric)} · {short(o.status)}</b><p>خط مبنا: {short(o.baseline)} · هدف: {short(o.target)} · مقدار: {short(o.actual)} {short(o.unit)}</p><p>شاهد: {short(o.evidence)}</p><span>تأیید ثبت‌شده در دمو: {o.verified_at?'بله (صرفاً آزمایشی)':'خیر'}</span></>}/>
         <DatasetSection title="تطبیق فرصت با ظرفیت" rows={selectedMatches} render={m=><><b>{short(m.resource_name)} · {m.status}</b><p>مقدار پیشنهادی: {m.requested_quantity}</p><span>تطبیق، تخصیص واقعی منابع نیست.</span></>}/>
         {writer&&selectedValues.length===0&&<form className="rhw-value-form" onSubmit={registerValue}><h3>ثبت فرصت جدید برای این پرونده</h3>
           {[['title','عنوان فرصت'],['publicNeed','نیاز عمومی'],['beneficiaries','ذی‌نفعان'],['geography','محدوده جغرافیایی'],['authorityReference','مرجع اختیار قانونی'],['baselineMethod','روش تعیین خط مبنا'],['comparator','مبنای مقایسه با وضع موجود']].map(([k,label])=><label key={k}>{label}<input required maxLength={k==='publicNeed'?2000:k==='baselineMethod'||k==='comparator'?1300:500} value={valueForm[k]} onChange={e=>setValueForm(s=>({...s,[k]:e.target.value}))}/></label>)}
           <label>مانع اصلی<select value={valueForm.barrier} onChange={e=>setValueForm(s=>({...s,barrier:e.target.value}))}>{barriers.map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label>
           <label>بعد ارزش<select value={valueForm.valueDimension} onChange={e=>setValueForm(s=>({...s,valueDimension:e.target.value}))}>{valueDimensions.map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label>
           <button type="submit" disabled={busy}>ثبت فرصت در وضعیت کشف</button></form>}
         <button type="button" className="rhw-text-button" onClick={()=>navigate?.('urban-value')}>ورود به میزکار حاکمیت ارزش و تطبیق ظرفیت <ArrowLeft size={14}/></button>
         <p className="rhw-muted">طرح‌های عمومی `value_initiatives` به دلیل فقدان کلید سازمانی به این سازمان منتسب نشده‌اند.</p>
       </>}
       {tab==='resources'&&<>
         <button className="rhw-text-button" type="button" onClick={()=>navigate?.('capacity')}>مشاهده سامانه ظرفیت‌ها و منابع <ArrowLeft size={14}/></button>
         <DatasetSection title="خدمات تعریف‌شده سازمان و واحدهای تابعه" rows={datasetRows(activeSnapshot,'services')} render={s=><><b>{s.name_fa}</b><span>{s.code} · SLA: {s.sla_hours??'—'} ساعت · {s.active?'فعال':'غیرفعال'}</span><p>شاخص: {short(s.outcome_metric)}</p><p>شرح خدمت: {short(s.description)}</p></>}/>
         <DatasetSection title="منابع و ظرفیت‌های تحت مالکیت" rows={datasetRows(activeSnapshot,'resources')} render={r=><><b>{r.name_fa}</b><span>{r.resource_kind} · {r.total_quantity} {r.unit} · مجوز استفاده: {r.authorized?'دارد':'ندارد'}</span><p>محدودیت‌ها: {short(r.constraints_note)}</p></>}/>
         <DatasetSection title="تخصیص منابع به پرونده انتخابی" rows={selectedAllocations} render={r=><><b>{r.status}</b><span>شناسه منبع: {r.resource_id} · مقدار: {r.quantity}</span><p>{short(r.justification)}</p></>}/>
         <DatasetSection title="واحدهای ساختار سازمانی" rows={datasetRows(activeSnapshot,'units')} render={u=><><b>{u.name_fa}</b><span>{u.kind} · عمق زیرمجموعه: {fmt(u.depth)}</span></>}/>
       </>}
       </>}
      </div>
    </div>
    }
    <footer className="rhw-foot"><FileCheck2 size={17}/> همه عملیات ثبت و تصمیم‌ها از API موجود و کنترل‌های سمت سرور عبور می‌کنند؛ هیچ رکورد آزمایشی خودکار ساخته نمی‌شود. AVOS مستقل و غیرفعال است.</footer>
  </>}
 </section>;
}
