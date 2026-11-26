import React,{useEffect,useMemo,useState,useCallback,useRef} from 'react';
import {ClipboardCheck,BriefcaseBusiness,Coins,AlertTriangle,RefreshCcw,CheckCircle2,ArrowLeft,Plus,ShieldCheck,Truck,FileCheck2,LockKeyhole} from 'lucide-react';
import './execution-workspace.css';
const IRR=n=>{try{return new Intl.NumberFormat('fa-IR').format(BigInt(n??0))+' ریال'}catch{return '— ریال'}};
const fa=n=>new Intl.NumberFormat('fa-IR').format(Number(n)||0);
const STAT={DRAFT:'پیش‌نویس',ISSUED:'صادرشده',DELIVERED:'تحویل‌شده',ACCEPTED:'پذیرفته‌شده',CANCELLED:'لغوشده',SUBMITTED:'ارسال برای بررسی',APPROVED:'هزینه تأییدشده',REJECTED:'ردشده',CLOSED:'مختومه',IN_PROGRESS:'در اجرا',AWAITING_ACCEPTANCE:'منتظر پذیرش'};
const CATS={STAFF:'نیروی انسانی',FUEL:'سوخت',EQUIPMENT:'ماشین‌آلات',MATERIAL:'مصالح و مواد',CONTRACTOR:'پیمانکار',OTHER:'سایر'};
const key=()=>{if(!globalThis.crypto?.randomUUID)throw new Error('مرورگر از شناسه امن درخواست پشتیبانی نمی‌کند');return globalThis.crypto.randomUUID()};
function FormField({label,children}){return <label className="ex-field"><span>{label}</span>{children}</label>}
function Status({value}){return <span className={'ex-state ex-'+String(value||'').toLowerCase()}>{STAT[value]||value}</span>}
function Empty({children}){return <div className="ex-empty">{children||'برای این پرونده اطلاعاتی ثبت نشده است.'}</div>}
export default function ExecutionWorkspace({city,cases=[],access,api,initialCaseId='',navigate,actorId=''}){
 const loadToken=useRef(0);
 const [selected,setSelected]=useState(''),[contractors,setContractors]=useState([]),[caseLedger,setCaseLedger]=useState(null),[summary,setSummary]=useState(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[form,setForm]=useState(''),[draft,setDraft]=useState({}),[notes,setNotes]=useState({});
 const write=!!access?.canWrite,manage=!!access?.canManage;
 const base=`/cities/${city}`;
 const updateDraft=(field,value)=>setDraft(d=>({...d,[field]:value}));
 const refresh=useCallback(async()=>{
  if(!city)return;
  const requestToken=++loadToken.current;
  const [ct,s,ledger]=await Promise.all([api(base+'/contractors'),api(base+'/execution-ledger'),selected?api(base+'/execution-ledger?caseId='+encodeURIComponent(selected)):Promise.resolve(null)]);
  if(requestToken!==loadToken.current)return;
  setContractors(ct);setSummary(s);setCaseLedger(ledger);
 },[city,selected,api]);
 useEffect(()=>{loadToken.current++;setSelected('');setCaseLedger(null);setSummary(null);setError('');setNotice('')},[city]);
 useEffect(()=>{if(/^[0-9a-f-]{36}$/i.test(initialCaseId))setSelected(initialCaseId)},[initialCaseId,cases]);
 useEffect(()=>{let cancelled=false;setError('');(async()=>{try{await refresh()}catch(e){if(!cancelled)setError(e.message)}})();return()=>{cancelled=true}},[refresh]);
 const run=async(task)=>{setBusy(true);setError('');setNotice('');try{await task();await refresh();setForm('');setDraft({});setNotice('عملیات با ثبت ردپای حسابرسی انجام شد.')}catch(e){setError(e.message)}finally{setBusy(false)}};
 const addContractor=(e)=>{e.preventDefault();run(()=>api(base+'/contractors','POST',{code:draft.code,name:draft.name}))};
 const addOrder=(e)=>{e.preventDefault();run(()=>api(base+'/work-orders','POST',{requestKey:draft.requestKey||key(),caseId:selected,missionId:draft.missionId||null,contractorId:draft.contractorId||null,title:draft.title,reference:draft.reference||'',description:draft.description||'',ceilingRial:draft.ceilingRial||'0'}))};
 const addCost=(e)=>{e.preventDefault();run(()=>api(base+'/work-costs','POST',{requestKey:draft.requestKey||key(),caseId:selected,workOrderId:draft.workOrderId||null,category:draft.category||'STAFF',description:draft.description,amountRial:draft.amountRial}))};
 const change=async(table,id,status,isCost=false)=>{let payload={status};let n=notes[id]||{};
  if(status==='ISSUED'||status==='CANCELLED'){}else if(status==='DELIVERED'||status==='ACCEPTED'||status==='SUBMITTED'){
   if(!n.evidence?.trim()){setError('شواهد تحویل، پذیرش یا مستند هزینه را ابتدا در همان ردیف بنویسید.');return}
   payload.evidence=n.evidence.trim();
  }else if(status==='APPROVED'||status==='REJECTED'){
   if(!n.reviewNote?.trim()){setError('یادداشت بازبینی الزامی است.');return}payload.reviewNote=n.reviewNote.trim();
  }
  await run(()=>api(base+'/'+table+'/'+id,'PATCH',payload));
 };
 const ledger=caseLedger,orders=ledger?.orders||[],costs=ledger?.costs||[];
 const tally=useMemo(()=>costs.reduce((a,c)=>{const n=BigInt(c.amount_rial||0);if(c.status==='APPROVED')a.approved+=n;else if(c.status==='SUBMITTED')a.review+=n;else if(c.status==='DRAFT')a.draft+=n;return a},{approved:0n,review:0n,draft:0n}),[costs]);
 return <div className="ex-root" dir="rtl">
  <div className="ex-hero"><div className="ex-hero-icon"><BriefcaseBusiness size={27}/></div><div><span className="ex-eyebrow">END-TO-END SERVICE EXECUTION</span><h2>دستورکار، پیمانکار و کنترل هزینه خدمت</h2><p>ردیابی از پرونده و مأموریت تا تحویل، پذیرش و ثبت هزینه مستند؛ هیچ ردیف بدون تأیید به‌عنوان هزینه قطعی یا ارزش عمومی محاسبه نمی‌شود.</p></div><button className="ex-outline" onClick={()=>refresh()} disabled={busy}><RefreshCcw size={16}/> به‌روزرسانی</button></div>
  {error&&<div className="ex-alert" role="alert"><AlertTriangle size={17}/>{error}<button onClick={()=>setError('')}>×</button></div>}
  {notice&&<div className="ex-notice" role="status"><CheckCircle2 size={17}/>{notice}</div>}
  <div className="ex-cards">
   <div><span>دستورکارهای ثبت‌شده در شهرداری</span><strong>{fa((summary?.orders||[]).reduce((a,x)=>a+Number(x.count),0))}</strong><small>شامل پیش‌نویس و بسته‌شده</small></div>
   <div><span>هزینه‌های ارسال‌شده برای بررسی</span><strong>{IRR((summary?.costs||[]).find(x=>x.status==='SUBMITTED')?.rial||0)}</strong><small>هنوز تأیید نشده</small></div>
   <div><span>هزینه‌های تأیید عملیاتی</span><strong>{IRR((summary?.costs||[]).find(x=>x.status==='APPROVED')?.rial||0)}</strong><small>نه معادل پرداخت یا منفعت اقتصادی</small></div>
  </div>
  <section className="ex-panel"><div className="ex-head"><div><h3>انتخاب پرونده خدمت شهری</h3><p>اطلاعات این صفحه تنها برای شهرداری انتخاب‌شده بازیابی می‌شود.</p></div>{write&&<div className="ex-actions"><button className="ex-outline" onClick={()=>{setDraft({});setForm(form==='contractor'?'':'contractor')}}><Plus size={16}/> ثبت پیمانکار</button></div>}</div>
   <div className="ex-select-row"><select value={selected} onChange={e=>{setSelected(e.target.value);setForm('');setDraft({})}}><option value="">پرونده را انتخاب کنید</option>{selected&&!cases.some(c=>c.id===selected)&&<option value={selected}>پرونده انتخاب‌شده از جزئیات</option>}{cases.map(c=><option key={c.id} value={c.id}>{c.summary} — {STAT[c.status]||c.status}</option>)}</select><span>فهرست انتخاب پرونده در هسته فعلی حداکثر ۳۰۰ ردیف است؛ شمارنده‌های شهرداری مستقل محاسبه می‌شوند.</span></div>
   {form==='contractor'&&<form className="ex-form" onSubmit={addContractor}><FormField label="کد یکتای پیمانکار (لاتین)"><input required minLength={3} maxLength={60} pattern="[A-Za-z0-9_-]{3,60}" value={draft.code||''} onChange={e=>updateDraft('code',e.target.value)}/></FormField><FormField label="نام پیمانکار"><input required minLength={2} maxLength={180} value={draft.name||''} onChange={e=>updateDraft('name',e.target.value)}/></FormField><button disabled={busy} className="ex-primary" type="submit">ثبت پیمانکار</button><button type="button" className="ex-outline" onClick={()=>setForm('')}>انصراف</button></form>}
  </section>
  {!selected?<div className="ex-placeholder"><FileCheck2 size={29}/><b>پرونده‌ای انتخاب نشده است</b><p>یک پرونده انتخاب کنید تا دستورکارها، بازرسی‌ها، تخصیص منابع و ردیف‌های هزینه مرتبط نمایش داده شوند.</p></div>:!ledger?<div className="ex-placeholder">در حال دریافت زنجیره پرونده...</div>:<>
   <section className="ex-panel ex-case"><div className="ex-head"><div><span className="ex-eyebrow">CASE TRACEABILITY</span><h3>{ledger.case.summary}</h3><p>{ledger.case.service_name||'خدمت مشخص نشده'} · <Status value={ledger.case.status}/></p></div><button className="ex-outline" onClick={()=>navigate('cases',{kind:'recordId',value:selected,label:'پرونده مرتبط'})}>جزئیات پرونده <ArrowLeft size={15}/></button></div>
    <div className="ex-flow">{[['پرونده','ثبت‌شده'],['مأموریت',ledger.missions.length+' مورد'],['تخصیص ظرفیت',ledger.allocations.length+' مورد'],['بازرسی',ledger.inspections.length+' مورد'],['پذیرش',ledger.case.status==='CLOSED'?'پرونده مختومه':'در جریان']].map(([t,v])=><div key={t}><span>{t}</span><b>{v}</b></div>)}</div>
    <div className="ex-sublist"><b>مأموریت‌های مرتبط</b>{ledger.missions.length?<ul>{ledger.missions.map(m=><li key={m.id}>{m.title} <Status value={m.status}/></li>)}</ul>:<Empty/>}</div>
    <div className="ex-sublist"><b>منابع تخصیص‌یافته</b>{ledger.allocations.length?<ul>{ledger.allocations.map(a=><li key={a.id}>{a.resource_name} — {fa(a.quantity)} {a.unit} · {a.status}</li>)}</ul>:<Empty/>}</div>
   </section>
   <section className="ex-panel"><div className="ex-head"><div><h3>دستورکار اجرایی و پیمانکار</h3><p>دستورکار داخلی جایگزین قرارداد رسمی یا دستور پرداخت نیست؛ تحویل و پذیرش جداگانه ثبت می‌شود.</p></div>{write&&!['CLOSED','REJECTED'].includes(ledger.case.status)&&<button className="ex-primary" onClick={()=>{setForm(form==='order'?'':'order');setDraft({requestKey:key()})}}><Plus size={16}/> دستورکار جدید</button>}</div>
    {form==='order'&&<form className="ex-form" onSubmit={addOrder}>
     <FormField label="عنوان دستورکار"><input required minLength={3} maxLength={240} value={draft.title||''} onChange={e=>updateDraft('title',e.target.value)}/></FormField>
     <FormField label="شماره مرجع یا ابلاغ"><input maxLength={200} value={draft.reference||''} onChange={e=>updateDraft('reference',e.target.value)}/></FormField>
     <FormField label="پیمانکار مرتبط (اختیاری)"><select value={draft.contractorId||''} onChange={e=>updateDraft('contractorId',e.target.value)}><option value="">اجرای داخلی / تعیین نشده</option>{contractors.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name_fa}</option>)}</select></FormField>
     <FormField label="مأموریت مرتبط"><select value={draft.missionId||''} onChange={e=>updateDraft('missionId',e.target.value)}><option value="">بدون اتصال به مأموریت</option>{ledger.missions.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></FormField>
     <FormField label="سقف مجاز هزینه (ریال)"><input required type="number" min="0" step="1" max="900000000000000" value={draft.ceilingRial??'0'} onChange={e=>updateDraft('ceilingRial',e.target.value)}/></FormField>
     <FormField label="شرح عملیات"><textarea value={draft.description||''} onChange={e=>updateDraft('description',e.target.value)}/></FormField>
     <button disabled={busy} className="ex-primary" type="submit">ثبت پیش‌نویس دستورکار</button><button type="button" className="ex-outline" onClick={()=>setForm('')}>انصراف</button>
    </form>}
    {orders.length?<div className="ex-records">{orders.map(o=><article key={o.id} className="ex-record"><header><b>{o.title}</b><Status value={o.status}/></header><p>پیمانکار: {o.contractor_name||'اجرای داخلی'} · سقف: {IRR(o.ceiling_rial)} · مرجع: {o.reference||'ثبت نشده'}</p>
     {write&&['DRAFT','ISSUED','DELIVERED'].includes(o.status)&&<div className="ex-controls">{o.status!=='DRAFT'&&<textarea placeholder={o.status==='ISSUED'?'شواهد تحویل / گزارش اجرا':'مستند پذیرش مستقل'} value={notes[o.id]?.evidence||''} onChange={e=>setNotes(a=>({...a,[o.id]:{...a[o.id],evidence:e.target.value}}))}/>}<div className="ex-actions">{o.status==='DRAFT'&&<><button disabled={busy} onClick={()=>change('work-orders',o.id,'ISSUED')}>صدور دستورکار</button><button disabled={busy} onClick={()=>change('work-orders',o.id,'CANCELLED')}>لغو پیش‌نویس</button></>}{o.status==='ISSUED'&&<button disabled={busy} onClick={()=>change('work-orders',o.id,'DELIVERED')}>ثبت تحویل</button>}{o.status==='DELIVERED'&&manage&&actorId!==o.created_by&&<button disabled={busy} onClick={()=>change('work-orders',o.id,'ACCEPTED')}>تأیید پذیرش مستقل</button>}</div></div>}
    </article>)}</div>:<Empty>دستورکاری برای این پرونده وجود ندارد.</Empty>}
   </section>
   <section className="ex-panel"><div className="ex-head"><div><h3>دفتر هزینه‌های عملیات</h3><p>مبلغ‌ها به ریال و بدون تبدیل به تومان ثبت می‌شوند. تأیید هزینه، پرداخت یا ارزش مالی محقق‌شده نیست.</p></div>{write&&<button className="ex-primary" onClick={()=>{setDraft({category:'STAFF',requestKey:key()});setForm(form==='cost'?'':'cost')}}><Plus size={16}/> ثبت هزینه</button>}</div>
    <div className="ex-cards ex-costcards"><div><span>پیش‌نویس</span><strong>{IRR(tally.draft)}</strong></div><div><span>منتظر بررسی</span><strong>{IRR(tally.review)}</strong></div><div><span>تأیید عملیاتی</span><strong>{IRR(tally.approved)}</strong></div></div>
    {form==='cost'&&<form className="ex-form" onSubmit={addCost}>
     <FormField label="نوع هزینه"><select value={draft.category||'STAFF'} onChange={e=>updateDraft('category',e.target.value)}>{Object.entries(CATS).map(([v,t])=><option value={v} key={v}>{t}</option>)}</select></FormField>
     <FormField label="شرح هزینه"><input required minLength={3} maxLength={300} value={draft.description||''} onChange={e=>updateDraft('description',e.target.value)}/></FormField>
     <FormField label="مبلغ (ریال)"><input required type="number" min="1" step="1" max="900000000000000" value={draft.amountRial||''} onChange={e=>updateDraft('amountRial',e.target.value)}/></FormField>
     <FormField label="دستورکار مرتبط"><select value={draft.workOrderId||''} onChange={e=>updateDraft('workOrderId',e.target.value)}><option value="">بدون دستورکار مرتبط</option>{orders.map(o=><option key={o.id} value={o.id}>{o.title}</option>)}</select></FormField>
     <button disabled={busy} className="ex-primary" type="submit">ثبت پیش‌نویس هزینه</button><button type="button" className="ex-outline" onClick={()=>setForm('')}>انصراف</button>
    </form>}
    {costs.length?<div className="ex-records">{costs.map(c=><article className="ex-record" key={c.id}><header><b>{c.description}</b><Status value={c.status}/></header><p>{CATS[c.category]} · {IRR(c.amount_rial)}{c.review_note?' · نظر بازبین: '+c.review_note:''}</p>
     {write&&['DRAFT','SUBMITTED'].includes(c.status)&&<div className="ex-controls"><textarea placeholder={c.status==='DRAFT'?'شماره مدرک، فاکتور یا شاهد ثبت هزینه':'نظر مکتوب بازبین مستقل'} value={c.status==='DRAFT'?(notes[c.id]?.evidence||''):(notes[c.id]?.reviewNote||'')} onChange={e=>setNotes(a=>({...a,[c.id]:{...a[c.id],[c.status==='DRAFT'?'evidence':'reviewNote']:e.target.value}}))}/><div className="ex-actions">{c.status==='DRAFT'&&<button disabled={busy} onClick={()=>change('work-costs',c.id,'SUBMITTED')}>ارسال برای بازبینی</button>}{c.status==='SUBMITTED'&&manage&&actorId!==c.created_by&&<><button disabled={busy} onClick={()=>change('work-costs',c.id,'APPROVED')}>تأیید هزینه</button><button disabled={busy} onClick={()=>change('work-costs',c.id,'REJECTED')}>رد هزینه</button></>}</div></div>}
    </article>)}</div>:<Empty>هزینه‌ای برای این پرونده ثبت نشده است.</Empty>}
    <div className="ex-guardrail"><LockKeyhole size={18}/><p>تأیید توسط شخص دیگری انجام می‌شود؛ پرونده باید مختومه و آخرین بازرسی خدمت موفق باشد. هزینه مرتبط با دستورکار فقط پس از پذیرش دستورکار و در محدوده سقف مصوب تأیید می‌شود.</p></div>
   </section>
  </>}
 </div>
}
