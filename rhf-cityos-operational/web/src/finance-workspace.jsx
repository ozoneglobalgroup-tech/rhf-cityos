import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Wallet,FileSignature,ClipboardCheck,RefreshCcw,Plus,ShieldCheck,ArrowLeft,Landmark,AlertTriangle} from 'lucide-react';
import './finance-workspace.css';
const rial=v=>{try{return new Intl.NumberFormat('fa-IR').format(BigInt(v??0))+' ریال'}catch{return '— ریال'}};
const fa=n=>new Intl.NumberFormat('fa-IR').format(Number(n)||0);
const freshKey=()=>{if(!globalThis.crypto?.randomUUID)throw Error('مرورگر از شناسه تصادفی امن پشتیبانی نمی‌کند');return globalThis.crypto.randomUUID()};
const STATUS={DRAFT:'پیش‌نویس',APPROVED:'مصوب',ACTIVE:'فعال',CLOSED:'پایان‌یافته',SUBMITTED:'ارسال‌شده',CERTIFIED:'گواهی‌شده',REJECTED:'برگشتی',ISSUED:'ابلاغ‌شده',DELIVERED:'تحویل‌شده',ACCEPTED:'پذیرفته‌شده'};
const rowStatus=x=><span className={'fn-tag '+(x==='ACTIVE'||x==='APPROVED'||x==='CERTIFIED'?'fn-green':x==='REJECTED'?'fn-red':'')}>{STATUS[x]||x}</span>;
const initial={};
const emptyBudget=()=>({code:'',title:'',fiscalPeriod:'1405',appropriationReference:'',amountRial:''});
const emptyContract=()=>({reference:'',title:'',budgetId:'',contractorId:'',ceilingRial:'',startDate:'2026-10-31',endDate:'2027-10-31'});
const tabs=[['summary','نمای مالی'],['budgets','بودجه مصوب'],['contracts','قراردادها'],['links','ارتباط دستورکار'],['statements','صورت‌وضعیت‌ها']];
function Input({label,children}){return <label className="fn-field"><span>{label}</span>{children}</label>}
function Note({children}){return <p className="fn-note">{children}</p>}
export default function FinanceWorkspace({city,api,access,actorId,navigate,jump}){
 const seq=useRef(0);
 const [tab,setTab]=useState('summary'),[data,setData]=useState({}),[contractors,setContractors]=useState([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [form,setForm]=useState(''),[draft,setDraft]=useState(initial),[evidence,setEvidence]=useState({}),[contractId,setContractId]=useState(''),[eligible,setEligible]=useState([]),[picked,setPicked]=useState([]);
 useEffect(()=>{if(jump?.tab&&['summary','budgets','contracts','links','statements'].includes(jump.tab)){setTab(jump.tab);setForm('')}},[jump]);
 useEffect(()=>{if(!jump?.id||!jump?.tab||tab!==jump.tab)return;const h=window.setTimeout(()=>document.getElementById('fn-record-'+jump.id)?.scrollIntoView({block:'center',behavior:'smooth'}),120);return()=>window.clearTimeout(h)},[jump?.id,jump?.tab,tab,data]);
 const base=`/cities/${city}`;
 const manage=!!access?.canManage||access?.role==='DIRECTOR';
 const setField=(k,v)=>setDraft(x=>({...x,[k]:v}));
 const reload=useCallback(async()=>{
  if(!city)return;const n=++seq.current;setLoading(true);
  try{
   const [summary,budgets,contracts,orders,statements,ct]=await Promise.all([
    api(base+'/finance-summary'),api(base+'/finance-budgets'),api(base+'/finance-contracts'),api(base+'/finance-orders'),api(base+'/finance-statements'),api(base+'/contractors')]);
   if(n!==seq.current)return;
   setData({summary,budgets,contracts,orders,statements});setContractors(ct);
  }catch(e){if(n===seq.current)setError(e.message)}finally{if(n===seq.current)setLoading(false)}
 },[city,api]);
 useEffect(()=>{seq.current++;setData({});setContractors([]);setContractId('');setEligible([]);setPicked([]);setForm('');setError('');setNotice('');reload();},[city,reload]);
 useEffect(()=>{let cancelled=false;setEligible([]);setPicked([]);if(!contractId||!city)return;
  api(base+'/finance-eligible?contractId='+encodeURIComponent(contractId)).then(d=>{if(!cancelled)setEligible(d)}).catch(e=>{if(!cancelled)setError(e.message)});
  return()=>{cancelled=true};
 },[city,contractId,api,data.statements]);
 const run=async(task)=>{setBusy(true);setError('');setNotice('');try{await task();setNotice('ثبت انجام شد؛ نتیجه در دفتر عملیاتی ثبت و حسابرسی شد.');setForm('');setDraft({});setPicked([]);await reload();}catch(e){setError(e.message)}finally{setBusy(false)}};
 const change=async(part,id,status,body={})=>run(()=>api(base+'/'+part+'/'+id,'PATCH',{status,...body}));
 const requestApproval=(part,id,status,label)=>{const ev=(evidence[id]||'').trim();if(ev.length<5){setError('مستند یا یادداشت بازبینی باید حداقل پنج کاراکتر داشته باشد.');return}change(part,id,status,status==='APPROVED'||status==='ACTIVE'?{evidence:ev}:{reviewNote:ev});};
 const sumStatus=(rows,status)=>rows?.find(x=>x.status===status)?.rial||'0';
 const isAuditor=access?.role==='AUDITOR';
 if(access&&!manage&&!isAuditor)return <div className="fn-empty">دسترسی مالی این میزکار فقط برای مدیران شهرداری و حسابرس تعریف شده است.</div>;
 return <div className="fn-workspace" dir="rtl">
  <div className="fn-hero"><div><span className="fn-kicker"><Landmark size={15}/> RHF CITY OS · FINANCIAL GOVERNANCE</span><h2>بودجه، قرارداد و صورت‌وضعیت خدمات شهری</h2><p>ردیابی تعهدات قراردادی از بودجه مصوب تا هزینه‌های عملیاتی پذیرفته‌شده؛ تأیید مستقل و ثبت ردپای حسابرسی.</p></div><button className="fn-refresh" disabled={busy||loading} onClick={reload}><RefreshCcw size={16}/> بازخوانی</button></div>
  {jump?.id&&<div className="fn-note">رکورد انتخابی در فهرست مالی با حاشیه مشخص شده است. اگر در ۵۰۰ رکورد اخیر نباشد، جزئیات آن در مرکز کنترل مالی همچنان قابل مشاهده است.</div>}
  <div className="fn-caution"><AlertTriangle size={18}/><span>ثبت مرجع مصوبه یا قرارداد در این سامانه به معنی اعتبارسنجی حقوقی امضا نیست. «گواهی‌شده» به معنی پرداخت، صورتحساب مالیاتی یا ثبت حسابداری نیست. تمام مبالغ به ریال است.</span></div>
  {error&&<div role="alert" className="fn-alert">{error}<button onClick={()=>setError('')}>بستن</button></div>}{notice&&<div role="status" className="fn-success">{notice}</div>}
  <div className="fn-tabs" role="tablist" aria-label="زیرمجموعه‌های مالی">{tabs.map(([id,title])=><button role="tab" aria-selected={tab===id} key={id} className={tab===id?'fn-active':''} onClick={()=>{setTab(id);setError('');setForm('')}}>{title}</button>)}</div>
  {loading&&!data.summary?<div className="fn-empty">در حال دریافت اطلاعات مالی شهرداری منتخب…</div>:<>
   {tab==='summary'&&<>
    <div className="fn-cards">
     <div><span>بودجه مصوب</span><strong>{rial(sumStatus(data.summary?.budgets,'APPROVED'))}</strong><small>تعهد مجاز، نه هزینه انجام‌شده</small></div>
     <div><span>سقف قراردادهای فعال و بسته‌شده</span><strong>{rial(BigInt(sumStatus(data.summary?.contracts,'ACTIVE'))+BigInt(sumStatus(data.summary?.contracts,'CLOSED')))}</strong><small>تعهدات بودجه‌ای قابل پیگیری</small></div>
     <div><span>صورت‌وضعیت‌های گواهی‌شده</span><strong>{rial(sumStatus(data.summary?.statements,'CERTIFIED'))}</strong><small>فاقد وضعیت پرداخت بانکی</small></div>
     <div><span>در انتظار گواهی</span><strong>{rial(sumStatus(data.summary?.statements,'SUBMITTED'))}</strong><small>مبالغ ارسال‌شده برای بازبین</small></div>
    </div>
    <section className="fn-panel"><h3>گردش مالی و تعهدات</h3><div className="fn-path">{['ثبت اعتبار بودجه','تصویب مستقل','ثبت قرارداد','فعال‌سازی مستقل','اتصال دستورکار پذیرفته‌شده','انتخاب هزینه تأییدشده','گواهی صورت‌وضعیت'].map((v,i)=><div key={v}><b>{fa(i+1)}</b><span>{v}</span></div>)}</div><Note>در گزارش‌ها ارقام جمع‌آوری‌شده از کل پایگاه داده شهرداری محاسبه می‌شوند؛ فهرست‌های انتخاب رکورد فعلاً حداکثر ۵۰۰ ردیف نشان می‌دهند.</Note></section>
   </>}
   {tab==='budgets'&&<section className="fn-panel"><header><div><h3>دفتر بودجه‌های مصوب شهرداری</h3><p>هر بودجه دارای مرجع مصوبه، دوره مالی و سقف ثابت است.</p></div>{manage&&<button className="fn-primary" onClick={()=>{setForm(form==='budget'?'':'budget');setDraft(emptyBudget())}}><Plus size={15}/> ثبت بودجه</button>}</header>
    {form==='budget'&&<form className="fn-form" onSubmit={e=>{e.preventDefault();run(()=>api(base+'/finance-budgets','POST',draft))}}>
     <Input label="کد بودجه"><input required pattern="[A-Za-z0-9_-]{3,60}" value={draft.code||''} onChange={e=>setField('code',e.target.value)}/></Input>
     <Input label="عنوان مصوبه"><input required minLength="3" value={draft.title||''} onChange={e=>setField('title',e.target.value)}/></Input>
     <Input label="دوره مالی"><input required value={draft.fiscalPeriod||''} onChange={e=>setField('fiscalPeriod',e.target.value)}/></Input>
     <Input label="شماره مصوبه/مرجع"><input required value={draft.appropriationReference||''} onChange={e=>setField('appropriationReference',e.target.value)}/></Input>
     <Input label="سقف اعتبار (ریال)"><input required type="number" min="1" step="1" max="900000000000000" value={draft.amountRial||''} onChange={e=>setField('amountRial',e.target.value)}/></Input>
     <button className="fn-primary" disabled={busy}>ثبت بودجه پیش‌نویس</button><button type="button" className="fn-secondary" onClick={()=>setForm('')}>انصراف</button></form>}
    {(data.budgets||[]).length?(data.budgets||[]).map(b=><article className={"fn-row "+(jump?.id===b.id?"fn-focused":"")} id={"fn-record-"+b.id} key={b.id}><div><b>{b.title}</b>{rowStatus(b.status)}<p>{b.code} · دوره {b.fiscal_period} · مصوبه {b.appropriation_reference}</p><p>بودجه: {rial(b.amount_rial)} · تعهد: {rial(b.committed_rial)}</p></div>{manage&&b.status==='DRAFT'&&actorId!==b.created_by&&<div className="fn-review"><textarea placeholder="مستند تأیید مستقل بودجه" value={evidence[b.id]||''} onChange={e=>setEvidence(s=>({...s,[b.id]:e.target.value}))}/><button disabled={busy} onClick={()=>requestApproval('finance-budgets',b.id,'APPROVED')}>تصویب مستقل</button></div>}</article>):<div className="fn-empty">هیچ بودجه‌ای در این شهرداری ثبت نشده است.</div>}
   </section>}
   {tab==='contracts'&&<section className="fn-panel"><header><div><h3>ثبت و کنترل سقف قراردادها</h3><p>قرارداد در ابتدا پیش‌نویس است؛ تعهد بودجه فقط پس از فعال‌سازی مستقل منظور می‌شود.</p></div>{manage&&<button className="fn-primary" onClick={()=>{setForm(form==='contract'?'':'contract');setDraft(emptyContract())}}><Plus size={15}/> قرارداد جدید</button>}</header>
    {form==='contract'&&<form className="fn-form" onSubmit={e=>{e.preventDefault();run(()=>api(base+'/finance-contracts','POST',draft))}}>
     <Input label="ردیف بودجه"><select required value={draft.budgetId||''} onChange={e=>setField('budgetId',e.target.value)}><option value="">انتخاب</option>{(data.budgets||[]).map(b=><option key={b.id} value={b.id}>{b.title} — {STATUS[b.status]}</option>)}</select></Input>
     <Input label="پیمانکار"><select required value={draft.contractorId||''} onChange={e=>setField('contractorId',e.target.value)}><option value="">انتخاب</option>{contractors.filter(x=>x.active).map(ct=><option key={ct.id} value={ct.id}>{ct.name_fa}</option>)}</select></Input>
     <Input label="شماره/شناسه قرارداد"><input required value={draft.reference||''} onChange={e=>setField('reference',e.target.value)}/></Input>
     <Input label="عنوان قرارداد"><input required value={draft.title||''} onChange={e=>setField('title',e.target.value)}/></Input>
     <Input label="سقف قرارداد (ریال)"><input required type="number" min="1" max="900000000000000" value={draft.ceilingRial||''} onChange={e=>setField('ceilingRial',e.target.value)}/></Input>
     <Input label="تاریخ شروع (میلادی)"><input required type="date" value={draft.startDate||''} onChange={e=>setField('startDate',e.target.value)}/></Input>
     <Input label="تاریخ پایان (میلادی)"><input required type="date" value={draft.endDate||''} onChange={e=>setField('endDate',e.target.value)}/></Input>
     <button className="fn-primary" disabled={busy}>ثبت پیش‌نویس قرارداد</button><button type="button" className="fn-secondary" onClick={()=>setForm('')}>انصراف</button></form>}
    {(data.contracts||[]).length?(data.contracts||[]).map(c=><article className={"fn-row "+(jump?.id===c.id?"fn-focused":"")} id={"fn-record-"+c.id} key={c.id}><div><b>{c.title}</b>{rowStatus(c.status)}<p>{c.reference} · {c.contractor_name} · بودجه: {c.budget_title}</p><p>سقف: {rial(c.ceiling_rial)} · تعهد دستورکارها: {rial(c.linked_ceiling_rial)} · صورت‌وضعیت گواهی‌شده: {rial(c.certified_rial)}</p></div>{manage&&c.status==='DRAFT'&&actorId!==c.created_by&&<div className="fn-review"><textarea placeholder="مرجع قرارداد امضاشده، شماره سند و شواهد اختیار امضا" value={evidence[c.id]||''} onChange={e=>setEvidence(s=>({...s,[c.id]:e.target.value}))}/><button disabled={busy} onClick={()=>requestApproval('finance-contracts',c.id,'ACTIVE')}>فعال‌سازی مستقل قرارداد</button></div>}{manage&&c.status==='ACTIVE'&&<button className="fn-secondary" disabled={busy} onClick={()=>change('finance-contracts',c.id,'CLOSED')}>بستن قرارداد</button>}</article>):<div className="fn-empty">قراردادی برای این شهرداری ثبت نشده است. ابتدا پیمانکار را در «دستورکار و هزینه عملیات» ثبت کنید.</div>}
   </section>}
   {tab==='links'&&<section className="fn-panel"><header><div><h3>اتصال دستورکار اجرایی به قرارداد</h3><p>دستورکار باید صادرشده و متعلق به همان پیمانکار باشد؛ مجموع سقف دستورکارها نباید از سقف قرارداد عبور کند.</p></div><button className="fn-secondary" onClick={()=>navigate('execution')}>میزکار دستورکار <ArrowLeft size={15}/></button></header>
    {manage&&<form className="fn-form" onSubmit={e=>{e.preventDefault();run(()=>api(base+'/finance-orders','POST',draft))}}>
     <Input label="قرارداد فعال"><select required value={draft.contractId||''} onChange={e=>setField('contractId',e.target.value)}><option value="">انتخاب قرارداد</option>{(data.contracts||[]).filter(c=>c.status==='ACTIVE').map(c=><option key={c.id} value={c.id}>{c.reference} — {c.contractor_name}</option>)}</select></Input>
     <Input label="دستورکار صادرشده، بدون قرارداد"><select required value={draft.workOrderId||''} onChange={e=>setField('workOrderId',e.target.value)}><option value="">انتخاب دستورکار</option>{(data.orders||[]).filter(o=>!o.contract_id&&['ISSUED','DELIVERED','ACCEPTED'].includes(o.status)).map(o=><option key={o.id} value={o.id}>{o.title} — {o.contractor_name||'بدون پیمانکار'}</option>)}</select></Input>
     <button className="fn-primary" disabled={busy}>ثبت ارتباط با قرارداد</button></form>}
    {(data.orders||[]).filter(x=>x.contract_id).map(o=><article className="fn-row" key={o.id}><div><b>{o.title}</b>{rowStatus(o.status)}<p>قرارداد: {o.contract_reference} · پیمانکار: {o.contractor_name}</p><p>سقف دستورکار: {rial(o.ceiling_rial)}</p></div><button className="fn-secondary" onClick={()=>navigate('execution',{kind:'recordId',value:o.case_id,label:'پرونده دستورکار'})}>جزئیات پرونده <ArrowLeft size={14}/></button></article>)}
   </section>}
   {tab==='statements'&&<section className="fn-panel"><header><div><h3>صورت‌وضعیت عملیاتی و گواهی مستقل</h3><p>تنها هزینه‌های تأییدشده، مربوط به دستورکار پذیرفته‌شده و قرارداد فعال قابل انتخاب هستند.</p></div></header>
    {manage&&<form className="fn-statement-builder" onSubmit={e=>{e.preventDefault();run(()=>api(base+'/finance-statements','POST',{requestKey:draft.requestKey||freshKey(),contractId,reference:draft.reference,costIds:picked}))}}>
     <div className="fn-form"><Input label="قرارداد فعال"><select required value={contractId} onChange={e=>{setContractId(e.target.value);setDraft(x=>({...x,requestKey:freshKey()}))}}><option value="">انتخاب قرارداد</option>{(data.contracts||[]).filter(c=>c.status==='ACTIVE').map(c=><option key={c.id} value={c.id}>{c.reference} — {c.contractor_name}</option>)}</select></Input>
     <Input label="شماره صورت‌وضعیت"><input required minLength="3" value={draft.reference||''} onChange={e=>setField('reference',e.target.value)}/></Input></div>
     <Note>هر صورت‌وضعیت می‌تواند چند ردیف هزینه **از یک دستورکار** را پوشش دهد. هر ردیف هزینه فقط در یک صورت‌وضعیت ثبت می‌شود؛ مبلغ صورت‌وضعیت از انتخاب‌های شما محاسبه می‌شود.</Note>
     <div className="fn-eligible">{eligible.length?eligible.map(c=><label key={c.id} className="fn-cost-option"><input type="checkbox" checked={picked.includes(c.id)} onChange={e=>setPicked(v=>e.target.checked?[...v,c.id]:v.filter(x=>x!==c.id))}/><span><b>{c.description}</b><small>{c.order_title}</small></span><strong>{rial(c.amount_rial)}</strong></label>):<div className="fn-empty">برای این قرارداد، هزینه تأییدشده و تخصیص‌نیافته در دستورکار پذیرفته‌شده موجود نیست.</div>}</div>
     <div className="fn-form-bottom"><b>{fa(picked.length)} هزینه انتخابی</b><strong>{rial(eligible.filter(x=>picked.includes(x.id)).reduce((sum,x)=>sum+BigInt(x.amount_rial),0n))}</strong><button className="fn-primary" disabled={busy||!contractId||!picked.length}>ایجاد پیش‌نویس صورت‌وضعیت</button></div>
    </form>}
    {(data.statements||[]).length?(data.statements||[]).map(s=><article className={"fn-row "+(jump?.id===s.id?"fn-focused":"")} id={"fn-record-"+s.id} key={s.id}><div><b>{s.reference}</b>{rowStatus(s.status)}<p>قرارداد: {s.contract_reference} · دستورکار: {s.order_title}</p><p>{rial(s.amount_rial)} · {fa(s.line_count)} ردیف هزینه {s.review_note?'· بازبین: '+s.review_note:''}</p></div>
      {manage&&((s.status==='DRAFT'||s.status==='REJECTED')&&actorId===s.created_by||s.status==='SUBMITTED'&&actorId!==s.created_by)&&<div className="fn-review"><textarea placeholder={s.status==='SUBMITTED'?'یادداشت بازبین مستقل و مرجع رسیدگی':'شواهد و مرجع صورت‌وضعیت'} value={evidence[s.id]||''} onChange={e=>setEvidence(v=>({...v,[s.id]:e.target.value}))}/><div className="fn-buttons">{['DRAFT','REJECTED'].includes(s.status)&&actorId===s.created_by&&<button disabled={busy} onClick={()=>{let ev=(evidence[s.id]||'').trim();if(ev.length<5){setError('شواهد ارسال الزامی است');return}change('finance-statements',s.id,'SUBMITTED',{evidence:ev})}}>ارسال به بازبین</button>}{s.status==='SUBMITTED'&&actorId!==s.created_by&&<><button disabled={busy} onClick={()=>requestApproval('finance-statements',s.id,'CERTIFIED')}>گواهی مستقل</button><button disabled={busy} onClick={()=>requestApproval('finance-statements',s.id,'REJECTED')}>برگشت برای اصلاح</button></>}</div></div>}
    </article>):<div className="fn-empty">صورت‌وضعیتی ثبت نشده است.</div>}
   </section>}
  </>}
  <footer className="fn-footer"><ShieldCheck size={16}/> تفکیک شهرداری و کنترل مستقل تأیید در API/SQL اجرا می‌شود؛ این نسخه محاسبات را به حسابداری، پرداخت یا تأیید خودکار ارزش شهری متصل نمی‌کند.</footer>
 </div>
}
