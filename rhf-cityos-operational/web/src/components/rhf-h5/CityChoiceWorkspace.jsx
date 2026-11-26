import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {BrainCircuit,Target,ShieldCheck,RefreshCcw,ArrowLeft,Activity,ClipboardList,AlertTriangle,Truck,FileCheck2,DatabaseZap} from 'lucide-react';
import {normalizeCityLens,CITY_LENSES,cityLensSummary,safeRows} from './city-choice-core.mjs';
import {isWasteDemoCity} from './waste-pilot-ui-core.mjs';
import {runnableCases,canSubmitGovernedAction,validBoundedPlan,makeGovernedNote,agentRunIntent} from './governed-run-core.mjs';
import {reconcileWasteEvidence,safeFact,safeStep,canReviewFollowup,actionsForCase,safeReviewNote} from './waste-evidence-review-core.mjs';
import './city-choice.css';
const show=x=>typeof x==='number'?x.toLocaleString('fa-IR'):'—';
const concise=(s)=>typeof s==='string'&&s?s.slice(0,200):'—';
export default function CityChoiceWorkspace({city,cityName,mode,api,access,actorId,navigate,onModeChange,cases=[]}){
 const lens=normalizeCityLens(mode),isAgent=lens==='AGENTIC';
 const [revision,setRevision]=useState(0),[loading,setLoading]=useState(false),[results,setResults]=useState({}),[errors,setErrors]=useState({});
 const [caseId,setCaseId]=useState(''),[running,setRunning]=useState(false),[runError,setRunError]=useState(''),[runNotice,setRunNotice]=useState('');
 const [plan,setPlan]=useState(null),[useModel,setUseModel]=useState(false),[consent,setConsent]=useState(false),[proposalKey,setProposalKey]=useState('');
 const [reviewNotes,setReviewNotes]=useState({}),[reviewBusy,setReviewBusy]=useState(false),[reviewError,setReviewError]=useState(''),[reviewNotice,setReviewNotice]=useState('');
 const currentCity=React.useRef(city);currentCity.current=city;
 const eligible=useMemo(()=>runnableCases(cases,city),[cases,city]);
 const chosen=eligible.find(x=>x.id===caseId)||eligible[0]||null;
 const writer=canSubmitGovernedAction(access);
 useEffect(()=>{setCaseId('');setPlan(null);setRunError('');setRunNotice('');setUseModel(false);setConsent(false);setProposalKey('');setReviewNotes({});setReviewError('');setReviewNotice('')},[city]);
 function chooseCase(id){setCaseId(id);setPlan(null);setRunError('');setRunNotice('');setProposalKey('')}
 async function runBoundedAgent(){
  if(running||!chosen||!city||!results.agentStatus){setRunError('عامل، مجوز یا پرونده آماده نیست.');return}
  if(!writer){setRunError('اجرای تحلیل برای نقش فعلی مجاز نیست.');return}
  if(useModel&&(!consent||results.agentStatus?.modelEnabled!==true)){setRunError('مدل خارجی به فعال بودن سمت سرور و رضایت صریح نیاز دارد.');return}
  const startCity=city,id=chosen.id;setRunning(true);setPlan(null);setProposalKey('');setRunError('');setRunNotice('');
  try{
   const reply=await api(`/cities/${encodeURIComponent(startCity)}/agent-plan`,'POST',{
    caseId:id,intent:agentRunIntent('CAPACITY_OPPORTUNITY'),useModel:useModel===true,externalConsent:useModel===true&&consent===true
   });
   if(currentCity.current!==startCity)return;
   const verified=validBoundedPlan(reply,id);
   setPlan({city:startCity,caseId:id,result:verified});
   setRunNotice('تحلیل روی سرور اجرا و در دفتر حسابرسی ثبت شد. پیشنهاد هنوز ایجاد نشده و هیچ عملیات میدانی انجام نشده است.');
  }catch(e){if(currentCity.current===startCity)setRunError(e?.message||'خطا در تحلیل عامل')}
  finally{if(currentCity.current===startCity)setRunning(false)}
 }
 async function submitHumanProposal(){
  if(running||!writer||!chosen||plan?.city!==city||plan.caseId!==chosen.id)return;
  if(!window.confirm('یک پیشنهاد پیگیری داخلی برای بررسی مستقل ثبت شود؟ این کار مأموریت یا پرداخت ایجاد نمی‌کند.'))return;
  const key=proposalKey||window.crypto?.randomUUID?.();
  if(!key){setRunError('شناسه یکتای امن در مرورگر موجود نیست');return}
  setProposalKey(key);setRunError('');setRunNotice('');setRunning(true);const startCity=city;
  try{
   const note=makeGovernedNote(chosen,plan.result);
   await api(`/cities/${encodeURIComponent(startCity)}/agent-followups`,'POST',{
    caseId:chosen.id,requestKey:key,kind:'CASE_FOLLOWUP',note
   });
   if(currentCity.current!==startCity)return;
   setRunNotice('پیشنهاد در صف تصمیم انسانی ثبت شد. برای تأیید مستقل با حساب دیگری وارد شوید.');
   setPlan(null);setProposalKey('');refresh();
  }catch(e){if(currentCity.current===startCity)setRunError(e?.message||'ثبت پیشنهاد ناموفق بود؛ شناسه تکرار درخواست حفظ شد')}
  finally{if(currentCity.current===startCity)setRunning(false)}
 }
 async function reviewProposal(action,decision){
  const note=(reviewNotes[action.id]||'').trim();
  if(!chosen||!canReviewFollowup(action,access,actorId,chosen.id)||!safeReviewNote(note)) {setReviewError('حساب بازبین مستقل، مجوز و دلیل تصمیم معتبر لازم است.');return;}
  if(!window.confirm('این تصمیم تنها پیگیری داخلی پرونده را بررسی می‌کند؛ هیچ مجوز میدانی، مالی یا تأیید ارزش عمومی صادر نمی‌شود. ادامه می‌دهید؟'))return;
  const startCity=city,startCase=chosen.id;setReviewBusy(true);setReviewError('');setReviewNotice('');
  try{
   await api(`/cities/${encodeURIComponent(startCity)}/agent-followups/${encodeURIComponent(action.id)}`,'PATCH',{action:decision,note});
   if(currentCity.current!==startCity)return;
   setReviewNotes(v=>({...v,[action.id]:''}));setReviewNotice(`تصمیم ${decision==='AUTHORIZE'?'تأیید پیگیری داخلی':'رد پیشنهاد'} ثبت شد؛ این تصمیم مجوز عملیات میدانی نیست.`);
   refresh();
  }catch(e){if(currentCity.current===startCity)setReviewError(e?.message||'ثبت تصمیم مستقل ناموفق بود')}
  finally{setReviewBusy(false)}
 }
 const refresh=useCallback(()=>setRevision(x=>x+1),[]);
 useEffect(()=>{
  let mounted=true;setResults({});setErrors({});
  if(!city||typeof api!=='function')return()=>{mounted=false};
  setLoading(true);
  const paths={agentStatus:'agent-status',followups:'agent-followups',valueSummary:'value-foundation-summary',valueCases:'value-cases'};
  if(isWasteDemoCity(cityName))paths.wasteSuite='waste-suite';
  Promise.allSettled(Object.entries(paths).map(async([name,path])=>[name,await api(`/cities/${encodeURIComponent(city)}/${path}`)]))
   .then(all=>{if(!mounted)return;
    const ok={},bad={};all.forEach((item,i)=>{const name=Object.keys(paths)[i];if(item.status==='fulfilled')ok[name]=item.value[1];else bad[name]=item.reason?.message||'دسترسی یا دریافت داده ناموفق بود'});
    setResults(ok);setErrors(bad);
   }).finally(()=>{if(mounted)setLoading(false)});
  return()=>{mounted=false};
 },[city,cityName,api,revision]);
 const summary=useMemo(()=>cityLensSummary(results),[results]);
 const actions=safeRows(results.followups,50);
 const caseActions=actionsForCase(actions,chosen?.id);
 const wasteEvidence=reconcileWasteEvidence(results.wasteSuite,city,chosen?.id);
 const valueCases=safeRows(results.valueCases,50);
 const synthetic=isWasteDemoCity(cityName);
 const validAgent=!!results.agentStatus, validValue=!!results.valueSummary;
 return <section className="rhfc" dir="rtl" data-rhf-city-choice="V3-AGENTIC-VALUE">
  <header className="rhfc-hero">
    <div><span className="rhfc-tag">RHF ACOS · CITY OPERATING LENS / V3</span>
    <h2>{isAgent?'سیستم‌عامل عامل‌محور شهری':'سیستم‌عامل ارزش‌محور شهری'}</h2>
    <p>شهرداری فعال: {concise(cityName)} · انتخاب شیوه مشاهده و تصمیم، نه تغییر مجوز یا اجرای خودکار</p></div>
    <button type="button" onClick={refresh} disabled={loading}><RefreshCcw size={16}/>{loading?'در حال دریافت':'بازخوانی داده‌ها'}</button>
  </header>
  <nav className="rhfc-modes" aria-label="حالت نمایش سیستم‌عامل شهری">
    {Object.entries(CITY_LENSES).map(([key,info])=><button type="button" key={key} aria-pressed={lens===key} onClick={()=>onModeChange?.(key)}><b>{info.label}</b><small>{info.description}</small></button>)}
  </nav>
  <p className="rhfc-guard"><ShieldCheck size={17}/>{synthetic?'این شهرداری آزمایشی است؛ هیچ نتیجه‌ای به‌عنوان منفعت واقعی شیراز گزارش نمی‌شود.':'داده‌ها متعلق به شهرداری انتخاب‌شده‌اند؛ نتیجه تأییدشده فقط با شواهد مستقل معتبر است.'} اجرا و تخصیص خودکار: غیرفعال.</p>
  {Object.entries(errors).length>0&&<div className="rhfc-errors" role="status"><AlertTriangle size={17}/> {Object.entries(errors).map(([k,e])=><span key={k}>دریافت {({agentStatus:'وضعیت عامل',followups:'اقدامات عامل',valueSummary:'خلاصه ارزش',valueCases:'فرصت‌ها',wasteSuite:'شواهد پسماند'})[k]}: {concise(e)}؛ </span>)}</div>}
  {isAgent?<>
   <div className="rhfc-grid">
    <article><BrainCircuit size={19}/><small>وضعیت عامل</small><strong>{validAgent?(summary.agentReady?'تحلیل محدود / فقط‌خواندنی':'نیازمند بررسی'):'نامشخص'}</strong></article>
    <article><ClipboardList size={19}/><small>پیشنهاد پیگیری ثبت‌شده</small><strong>{show(summary.proposedActions)}</strong></article>
    <article><Activity size={19}/><small>پیگیری‌های قابل مشاهده</small><strong>{show(summary.agentActionCount)}</strong></article>
    <article><ShieldCheck size={19}/><small>اجرای خودکار عامل</small><strong>غیرفعال</strong></article>
   </div>
   <section className="rhfc-run" data-rhf-agent-run="V4-GOVERNED" aria-label="اجرای واقعی تحلیل عامل">
    <header className="rhfc-run-head"><div><span>AGENTIC ACTION / V4</span><h3>اجرای تحلیل عامل روی پرونده شهرداری</h3><p>فراخوانی واقعی API، چهار ابزار محدود سرور، حسابرسی و امکان ثبت پیشنهاد برای بررسی مستقل؛ اجرای خودکار خدمات و AVOS همچنان غیرفعال است.</p></div><BrainCircuit size={26}/></header>
    <div className="rhfc-run-form">
      <label>پرونده باز برای تحلیل
       <select value={chosen?.id||''} onChange={e=>chooseCase(e.target.value)} disabled={running||eligible.length===0}>
         {eligible.length===0?<option value="">پرونده بازی در داده‌های بارگذاری‌شده موجود نیست</option>:eligible.map(x=><option key={x.id} value={x.id}>{x.summary} · {x.status} · {x.id.slice(0,8)}</option>)}
       </select>
      </label>
      <div className="rhfc-consent">
       <label><input type="checkbox" checked={useModel} disabled={running||results.agentStatus?.modelEnabled!==true} onChange={e=>{setUseModel(e.target.checked);setConsent(false)}}/> افزودن تحلیل مدل خارجی (اختیاری)</label>
       {useModel&&<label><input type="checkbox" checked={consent} disabled={running} onChange={e=>setConsent(e.target.checked)}/> رضایت صریح برای ارسال خلاصه محدود شواهد پرونده به مدل فعال‌شده در سرور</label>}
       <small>{results.agentStatus?.modelEnabled===true?'مدل سمت سرور فعال اعلام شده است.':'مدل خارجی در سرور فعال نیست؛ تحلیل قاعده‌محور با شواهد واقعی ممکن است.'}</small>
      </div>
      <button className="rhfc-run-button" type="button" disabled={running||!chosen||!writer||!results.agentStatus||!!useModel&&!consent} onClick={runBoundedAgent}>
       <BrainCircuit size={17}/>{running?'در حال پردازش درخواست…':'اجرای تحلیل واقعی عامل'}</button>
    </div>
    {!writer&&<p className="rhfc-run-message">اجرای این اقدام به نقش مجاز ثبت پیشنهاد نیاز دارد؛ مشاهده اطلاعات مجاز باقی است.</p>}
    {eligible.length===0&&<p className="rhfc-run-message">پرونده بازِ قابل مشاهده موجود نیست. ابتدا وضعیت بارگذاری پرونده‌ها را بررسی کنید؛ نتیجه ساختگی ایجاد نمی‌شود.</p>}
    {runError&&<p className="rhfc-run-error" role="alert">{runError}</p>}
    {runNotice&&<p className="rhfc-run-message" role="status">{runNotice}</p>}
    {plan?.caseId===chosen?.id&&plan.city===city&&<div className="rhfc-run-results">
      <strong>نتیجه اجرای سرور — پرونده {chosen.id}</strong>
      <p>ابزارهای اجراشده: {(plan.result.toolTrace||[]).join('، ')||'نامشخص'}</p>
      <p>مدل زبان استفاده شد: {plan.result.modelUsed?'بله':'خیر؛ عامل قاعده‌محور'} · تغییر عملیاتی خودکار: صفر</p>
      <h4>شواهد تحلیل</h4>
      <div className="rhfc-evidence-grid">{(plan.result.facts||[]).map((f,i)=>{const fact=safeFact(f);return <article key={i}><small>{fact.label}</small><strong>{fact.value}</strong></article>})}</div>
      <h4>اقدامات پیشنهادی</h4>
      {(plan.result.steps||[]).map((step,i)=><p className="rhfc-step" key={i}>{i+1}. {safeStep(step)}</p>)}
      {writer&&<button className="rhfc-propose-button" type="button" disabled={running} onClick={submitHumanProposal}><ClipboardList size={16}/> ثبت پیشنهاد در صف بررسی مستقل</button>}
      <p className="rhfc-run-warning">این پیشنهاد به معنی تأیید مستقل، مأموریت میدانی یا ارزش عمومی تحقق‌یافته نیست.</p>
    </div>}
   </section>
   <section className="rhfc-evidence-panel" data-rhf-waste-evidence="V5-READONLY">
     <div className="rhfc-evidence-head"><div><span>WASTE EVIDENCE / V5</span><h3>تطبیق شواهد پسماند با پرونده منتخب</h3></div><ShieldCheck size={23}/></div>
     <p>منبع: API مجاز «مدیریت جامع پسماند» همان شهرداری. فقط انتساب صریح <code>case_id</code> پذیرفته می‌شود؛ تحلیل A01 فعلاً به‌صورت خودکار این رکوردها را مصرف نمی‌کند.</p>
     {!synthetic?<p>این پنل برای پایلوت آزمایشی شیراز فعال است؛ اتصال شهری دیگر در این نسخه مسدود است.</p>:!chosen?<p>ابتدا پرونده باز انتخاب کنید.</p>:wasteEvidence.state==='NOT_LOADED'?<p>داده پسماند هنوز دریافت نشده است؛ نبود داده فرض نمی‌شود.</p>:wasteEvidence.state!=='READY'?<p role="alert">{wasteEvidence.message}</p>:<>
       <div className="rhfc-evidence-stats"><span>رکورد باسکول منتسب به پرونده: <b>{wasteEvidence.totalLinked}</b></span><span>قبض نمونه بدون انتساب: <b>{wasteEvidence.totalUnlinkedDemo}</b></span></div>
       {wasteEvidence.partial&&<p className="rhfc-run-warning">فهرست سوابق محدود شده است؛ نمی‌توان نبود سایر مدارک را نتیجه گرفت.</p>}
       {wasteEvidence.linked.length===0&&<p>هیچ رکورد باسکول دارای انتساب صریح به این پرونده در نتایج قابل مشاهده نیست.</p>}
       {wasteEvidence.linked.map(r=><article className="rhfc-evidence-row" key={r.id}><b>{r.code}</b><span>وضعیت بررسی داخلی: {r.state} · وزن خالص ثبت‌شده: {r.netKg??'نامشخص'} کیلوگرم</span><small>مرجع: {r.evidenceRef} · سند آزمایشی: {r.synthetic?'بله':'نامشخص'}</small></article>)}
       {wasteEvidence.unlinkedDemo.map(r=><article className="rhfc-evidence-row rhfc-evidence-unlinked" key={r.id}><b>{r.code} — بدون انتساب به پرونده</b><span>وزن آزمایشی: {r.netKg??'نامشخص'} کیلوگرم · وضعیت: {r.state}</span><small>با تطبیق نام قبض، انتساب قانونی یا نرم‌افزاری ایجاد نمی‌شود. اصلاح باید از مسیر مجوزدار، با ثبت حسابرسی و بدون ایجاد وزن تکراری انجام شود.</small></article>)}
       <p className="rhfc-run-warning">{wasteEvidence.message} · جمع وزن‌ها در این پنل ارزش یا عملکرد واقعی تأییدشده نیست.</p>
       <button type="button" onClick={()=>navigate?.('waste-pilot')}>بازکردن میزکار سازمان پسماند <ArrowLeft size={14}/></button>
     </>}
   </section>
   <section className="rhfc-evidence-panel" data-rhf-review-desk="V5-GOVERNED">
     <div className="rhfc-evidence-head"><div><span>INDEPENDENT REVIEW / V5</span><h3>صف تصمیم انسانی پرونده منتخب</h3></div><FileCheck2 size={22}/></div>
     {caseActions.length===0?<p>پیشنهاد مرتبط قابل مشاهده نیست؛ اگر دریافت داده خطا داشته، نبود پیشنهاد فرض نشود.</p>:caseActions.map(a=><article className="rhfc-review-row" key={a.id}><b>{concise(a.kind)} · {concise(a.status)}</b><p>{concise(a.note)}</p><small>ایجادکننده: {concise(a.created_by)} · بررسی‌کننده: {concise(a.approved_by)}</small>
       {canReviewFollowup(a,access,actorId,chosen?.id)?<div className="rhfc-review-control"><label>دلیل مستند تصمیم (حداقل ۳۰ نویسه)<textarea maxLength={500} rows={3} value={reviewNotes[a.id]||''} onChange={e=>setReviewNotes(v=>({...v,[a.id]:e.target.value}))}/></label><div><button type="button" disabled={reviewBusy||!safeReviewNote(reviewNotes[a.id]||'')} onClick={()=>reviewProposal(a,'AUTHORIZE')}>تأیید پیگیری داخلی</button><button type="button" disabled={reviewBusy||!safeReviewNote(reviewNotes[a.id]||'')} onClick={()=>reviewProposal(a,'REJECT')}>رد پیشنهاد</button></div></div>:
       a.status==='PROPOSED'?<p className="rhfc-review-note">تصمیم فقط با حساب بازبین مستقل دارای نقش مجاز قابل ثبت است؛ ایجادکننده حق خودتأییدی ندارد.</p>:<p className="rhfc-review-note">وضعیت ثبت‌شده صرفاً مربوط به پیگیری داخلی است، نه اعزام میدانی یا تأیید نتیجه.</p>}
     </article>)}
     {reviewError&&<p className="rhfc-run-error" role="alert">{reviewError}</p>}{reviewNotice&&<p className="rhfc-run-message" role="status">{reviewNotice}</p>}
     <p className="rhfc-run-warning">تأیید مستقل فقط از مسیر موجود <code>agent-followups</code> و کنترل‌های سمت سرور انجام می‌شود؛ Temporal/O2 هنوز رویداد زنده دریافت نمی‌کند.</p>
   </section>
   <div className="rhfc-layout"><section className="rhfc-panel"><h3>پیگیری و حاکمیت عامل‌ها</h3>
     {!results.followups?<p className="rhfc-empty">{loading?'در حال خواندن…':'اطلاعات معتبر قابل مشاهده نیست؛ صفر فرض نمی‌شود.'}</p>:actions.length===0?<p className="rhfc-empty">پیگیری ثبت‌شده‌ای در محدوده مجاز موجود نیست.</p>:actions.slice(0,10).map(x=><article className="rhfc-item" key={x.id}><b>{concise(x.kind)} · {concise(x.status)}</b><p>{concise(x.note)}</p><small>پرونده: {concise(x.case_id??x.caseId)}</small></article>)}
    </section><section className="rhfc-panel"><h3>مسیر تصمیم انسانی</h3><p>عامل تنها شواهد و پیشنهاد ارائه می‌کند. ثبت پیشنهاد، تأیید مستقل و اجرای مجاز هرکدام گردش‌کار جدا دارند.</p>
    <button type="button" onClick={()=>navigate?.('urban-agent')}>میزکار رسمی عامل‌ها <ArrowLeft size={14}/></button>
    {synthetic&&<button type="button" onClick={()=>navigate?.('waste-pilot')}>عامل‌های سازمان پسماند <ArrowLeft size={14}/></button>}
    <button type="button" onClick={()=>navigate?.('work')}>پیگیری مأموریت‌ها <ArrowLeft size={14}/></button>
    </section></div>
  </>:<>
   <div className="rhfc-grid">
    <article><Target size={19}/><small>فرصت‌های ثبت‌شده</small><strong>{show(summary.valueCaseTotal)}</strong></article>
    <article><FileCheck2 size={19}/><small>فرصت‌های بررسی‌شده</small><strong>{show(summary.independentlyReviewed)}</strong></article>
    <article><DatabaseZap size={19}/><small>نتیجه با وضعیت VERIFIED در داده شهری</small><strong>{synthetic?'آزمایشی / فاقد اثبات میدانی':show(summary.verifiedOutcomeCount)}</strong></article>
    <article><ShieldCheck size={19}/><small>ارزش عمومی قابل انتساب</small><strong>نیازمند شواهد و انتساب مستقل</strong></article>
   </div>
   <div className="rhfc-layout"><section className="rhfc-panel"><h3>فرصت‌ها و زنجیره ارزش</h3>
     {!validValue?<p className="rhfc-empty">{loading?'در حال خواندن…':'خلاصه معتبر دریافت نشد؛ هیچ منفعتی فرض نمی‌شود.'}</p>:valueCases.length===0?<p className="rhfc-empty">هیچ فرصت ثبت‌شده‌ای در فهرست قابل مشاهده نیست.</p>:valueCases.slice(0,10).map(x=><article className="rhfc-item" key={x.id}><b>{concise(x.title)} · {concise(x.status)}</b><p>نیاز عمومی: {concise(x.public_need)}</p><small>خط مبنا: {concise(x.baseline_method)} · مرجع اختیار: {concise(x.authority_reference)}</small></article>)}
    </section><section className="rhfc-panel"><h3>مسیر اعتبارسنجی ارزش</h3><p>نیاز عمومی ← ظرفیت قابل استفاده ← اختیار قانونی ← اقدام مجاز ← خط مبنا و مقایسه ← تأیید مستقل اثر.</p>
    <button type="button" onClick={()=>navigate?.('urban-value')}>حکمرانی فرصت‌ها و تطبیق ظرفیت <ArrowLeft size={14}/></button>
    <button type="button" onClick={()=>navigate?.('outcomes')}>شواهد و پیامدهای عمومی <ArrowLeft size={14}/></button>
    {synthetic&&<button type="button" onClick={()=>navigate?.('waste-pilot')}>ارزش در سازمان پسماند <ArrowLeft size={14}/></button>}
    </section></div>
  </>}
  <footer className="rhfc-foot">تحلیل A01 فقط پس از اقدام صریح کاربر اجرا و حسابرسی می‌شود؛ ثبت پیشنهاد نیازمند تأیید جداگانه است و هیچ مأموریت میدانی یا ارزش واقعی به صورت خودکار ثبت نمی‌شود.</footer>
 </section>;
}
