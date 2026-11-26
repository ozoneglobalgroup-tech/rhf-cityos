import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Landmark,ShieldCheck,AlertTriangle,Clock3,Wallet,FileText,RefreshCcw,ArrowLeft,Building2,TrendingUp,Filter,ClipboardList} from 'lucide-react';
import './finance-control-room.css';
const money=(v)=>{try{return new Intl.NumberFormat('fa-IR').format(BigInt(String(v??0)))+' ریال'}catch{return '—'}};
const num=(v)=>new Intl.NumberFormat('fa-IR').format(Number(v)||0);
const STAT={DRAFT:'پیش‌نویس',APPROVED:'مصوب',ACTIVE:'فعال',CLOSED:'بسته‌شده',SUBMITTED:'منتظر گواهی',CERTIFIED:'گواهی‌شده'};
const views=[['alerts','هشدارها'],['budgets','بودجه‌ها'],['contracts','قراردادها'],['statements','صف صورت‌وضعیت']];
function Meter({bps}){const pct=Math.max(0,Math.min(100,Number(bps||0)/100));return <div className="fcr-meter" role="meter" aria-label="میزان تعهد" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{width:pct+'%'}}/></div>}
export default function FinanceControlRoom({city,api,access,navigate}){
 const seq=useRef(0);
 const [report,setReport]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[tab,setTab]=useState('alerts'),[selected,setSelected]=useState(null),[filter,setFilter]=useState('');
 const load=useCallback(async()=>{if(!city)return;const request=++seq.current;setBusy(true);setError('');try{const d=await api(`/cities/${city}/finance-control`);if(request===seq.current)setReport({...d,_city:city})}catch(e){if(request===seq.current){setError(e.message);setReport(null)}}finally{if(request===seq.current)setBusy(false)}},[api,city]);
 useEffect(()=>{let cancelled=false;const request=++seq.current;setReport(null);setSelected(null);setFilter('');setError('');setBusy(true);api(`/cities/${city}/finance-control`).then(d=>{if(!cancelled&&request===seq.current)setReport({...d,_city:city})}).catch(e=>{if(!cancelled&&request===seq.current)setError(e.message)}).finally(()=>{if(!cancelled&&request===seq.current)setBusy(false)});return()=>{cancelled=true}},[city,api]);
 const allowed=['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','AUDITOR'].includes(access?.role);
 const visible=report?._city===city?report:null;
 const t=visible?.totals||{};
 const go=(tab,id)=>navigate('finance',{kind:'financeFocus',tab,id,label:'رکورد مالی انتخابی'});
 const riskPriority={CRITICAL:'فوری',WARNING:'هشدار',INFO:'پیگیری'};
 const search=(rows)=>rows.filter(x=>!filter||[x.title,x.label,x.reference,x.code,x.contractor_name,x.contract_reference].some(s=>String(s||'').includes(filter)));
 const detail=(row,type)=>{setSelected({row,type});};
 if(access&&!allowed)return <div className="fcr-message">دسترسی به مرکز کنترل مالی برای نقش فعلی مجاز نیست.</div>;
 return <div className="fcr" dir="rtl">
  <header className="fcr-hero"><div><span className="fcr-eyebrow"><Landmark size={15}/> RHF CITY OS / FINANCIAL CONTROL ROOM</span><h2>مرکز کنترل مالی معاونت خدمات شهری</h2><p>تصویر یکپارچه بودجه، سقف تعهد قراردادها، گردش صورت‌وضعیت و هشدارهای مدیریتی در شهرداری انتخاب‌شده</p></div><button onClick={load} disabled={busy}><RefreshCcw size={16}/>{busy?'در حال دریافت…':'بازخوانی داده‌ها'}</button></header>
  <div className="fcr-disclaimer"><ShieldCheck size={18}/><span>همه مبالغ به ریال و تجمیع همه دوره‌های مالی هستند؛ مانده هر ردیف بودجه مستقل است. «تعهد قراردادی» هزینه قطعی نیست و «صورت‌وضعیت گواهی‌شده» پرداخت، تسویه یا ارزش عمومی محقق‌شده محسوب نمی‌شود. این میزکار فقط خواندنی است.</span></div>
  {error&&<p className="fcr-error" role="alert">خطای دریافت داده: {error}</p>}
  {!visible&&!error&&<div className="fcr-message">در حال دریافت محاسبات واقعی شهرداری…</div>}
  {visible&&<>
   <div className="fcr-stats">
    <button onClick={()=>setTab('budgets')}><span><Wallet size={18}/> بودجه مصوب</span><strong>{money(t.approved_budget_rial)}</strong><small>فقط بودجه‌های تصویب‌شده</small></button>
    <button onClick={()=>setTab('contracts')}><span><Building2 size={18}/> تعهد قراردادها</span><strong>{money(t.committed_rial)}</strong><small>قراردادهای فعال و بسته‌شده</small></button>
    <button onClick={()=>setTab('budgets')}><span><TrendingUp size={18}/> مانده قابل تعهد</span><strong>{money(t.availableRial)}</strong><small>{Number(t.oversubscribedRial)>0?'نیازمند بررسی اضافه‌تعهد':'مانده تجمیعی؛ نه اعتبار قابل انتقال'}</small></button>
    <button onClick={()=>setTab('statements')}><span><Clock3 size={18}/> در انتظار گواهی</span><strong>{money(t.submitted_rial)}</strong><small>{num(t.submitted_count)} صورت‌وضعیت ارسال‌شده</small></button>
   </div>
   <div className="fcr-secondary-stats">
    <div><b>{money(t.certified_rial)}</b><span>صورت‌وضعیت گواهی‌شده؛ وضعیت پرداخت ثبت نشده است</span></div>
    <div><b>{num(t.unlinked_order_count)}</b><span>دستورکار صادرشده بدون پیوند قرارداد</span></div>
    <div><b>{num(t.eligible_cost_count)}</b><span>هزینه تأییدشده قابل انتخاب برای صورت‌وضعیت</span></div>
    <div><b>{money(t.eligible_cost_rial)}</b><span>مبلغ هزینه قابل انتخاب؛ نه طلب گواهی‌شده</span></div>
   </div>
   {t.utilizationBps!==null&&<div className="fcr-util"><div><strong>نسبت تعهد بودجه‌ای</strong><span>{num((Number(t.utilizationBps)/100).toFixed(1))}٪ از مجموع بودجه مصوب</span></div><Meter bps={t.utilizationBps}/></div>}
   <div className="fcr-panel">
    <div className="fcr-toolbar"><div className="fcr-tabs" role="tablist" aria-label="بخش‌های مرکز کنترل مالی">{views.map(([id,name])=><button role="tab" key={id} aria-selected={tab===id} className={tab===id?'active':''} onClick={()=>{setTab(id);setSelected(null);setFilter('')}}>{name}{id==='alerts'&&<small>{num(visible.alerts.length)}</small>}</button>)}</div><label className="fcr-search"><Filter size={16}/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="جست‌وجو در ردیف‌های نمایشی" aria-label="جست‌وجو"/></label></div>
    {tab==='alerts'&&<div className="fcr-alerts">{search(visible.alerts).length?search(visible.alerts).map((a,i)=><article className={'fcr-alert '+a.priority.toLowerCase()} key={a.type+'-'+a.referenceId+'-'+i}><div className="fcr-alert-icon"><AlertTriangle size={17}/></div><div><b>{a.label}</b><p>{a.message}</p><span>{riskPriority[a.priority]}</span></div><button onClick={()=>{if(a.referenceId){const x=[...visible.budgets,...visible.contracts,...visible.statements].find(r=>r.id===a.referenceId);if(x){setTab(a.financeTab);detail(x,a.financeTab)}else go(a.financeTab,a.referenceId)}else go(a.financeTab,null)}}>بررسی <ArrowLeft size={14}/></button></article>):<div className="fcr-message">{filter?'هشداری مطابق عبارت جستجو یافت نشد.':'هشدار محاسبه‌شده‌ای در رکوردهای قابل مشاهده وجود ندارد. این وضعیت به‌معنی نبود هر نوع ریسک مالی نیست.'}</div>}</div>}
    {tab==='budgets'&&<div className="fcr-list">{search(visible.budgets).map(b=><button key={b.id} className="fcr-row" onClick={()=>detail(b,'budgets')}><div><b>{b.title}</b><small>{b.code} · {b.fiscal_period} · {STAT[b.status]||b.status}</small></div><div><strong>{money(b.amount_rial)}</strong><small>تعهد: {money(b.committed_rial)}</small></div><div className="fcr-row-meter"><Meter bps={b.utilizationBps}/><small>{b.utilizationBps===null?'بدون سقف':num((b.utilizationBps/100).toFixed(1))+'٪'} تعهد</small></div><ArrowLeft size={17}/></button>)}{!visible.budgets.length&&<div className="fcr-message">بودجه‌ای برای این شهرداری ثبت نشده است.</div>}</div>}
    {tab==='contracts'&&<div className="fcr-list">{search(visible.contracts).map(c=><button key={c.id} className="fcr-row" onClick={()=>detail(c,'contracts')}><div><b>{c.title}</b><small>{c.reference} · {c.contractor_name} · {STAT[c.status]||c.status}</small></div><div><strong>{money(c.ceiling_rial)}</strong><small>سقف دستورکارهای مرتبط: {money(c.linked_ceiling_rial)}</small></div><div><small>پایان قرارداد: {c.end_date}</small><small>گواهی‌شده: {money(c.certified_rial)}</small></div><ArrowLeft size={17}/></button>)}{!visible.contracts.length&&<div className="fcr-message">قراردادی برای این شهرداری ثبت نشده است.</div>}</div>}
    {tab==='statements'&&<div className="fcr-list">{search(visible.statements).map(s=><button key={s.id} className="fcr-row" onClick={()=>detail(s,'statements')}><div><b>{s.reference}</b><small>{s.contract_reference} · {s.contractor_name} · در انتظار گواهی</small></div><div><strong>{money(s.amount_rial)}</strong><small>ارسال: {new Date(s.updated_at).toLocaleDateString('fa-IR')}</small></div><ArrowLeft size={17}/></button>)}{!visible.statements.length&&<div className="fcr-message">صورت‌وضعیت ارسال‌شده و منتظر گواهی وجود ندارد.</div>}</div>}
    {visible.truncated[tab]&&<p className="fcr-footnote">در این فهرست فقط ۲۰۰ رکورد نخست نمایش داده می‌شود؛ جمع‌های مدیریتی از تمام رکوردهای همان شهرداری محاسبه شده‌اند. هشدارهای ردیفی ممکن است محدود باشند.</p>}
   </div>
   {selected&&<section className="fcr-detail" aria-label="جزئیات رکورد مالی"><div className="fcr-detail-header"><h3>جزئیات {selected.type==='budgets'?'بودجه':selected.type==='contracts'?'قرارداد':'صورت‌وضعیت'}</h3><button onClick={()=>setSelected(null)} aria-label="بستن جزئیات">بستن</button></div><h4>{selected.row.title||selected.row.reference}</h4><div className="fcr-detail-grid">{Object.entries(selected.row).filter(([k])=>!['id','created_at','updated_at','created_by'].includes(k)).map(([k,v])=><div key={k}><small>{({'amount_rial':'مبلغ (ریال)','committed_rial':'تعهد (ریال)','availableRial':'مانده قابل تعهد (ریال)','linked_ceiling_rial':'سقف دستورکارهای متصل (ریال)','certified_rial':'مبلغ گواهی‌شده (ریال)','title':'عنوان','reference':'شماره مرجع','status':'وضعیت','contractor_name':'پیمانکار','end_date':'پایان قرارداد','budget_code':'کد بودجه','fiscal_period':'دوره مالی','appropriation_reference':'مرجع مصوبه','contract_reference':'قرارداد','created_at':'ایجاد','oversubscribedRial':'مازاد تعهد','code':'کد بودجه'})[k]||k}</small><b>{k.endsWith('_rial')||k==='availableRial'||k==='oversubscribedRial'?money(v):String(v??'—')}</b></div>)}</div><button className="fcr-open" onClick={()=>go(selected.type,selected.row.id)}>بازکردن دفتر مالی و پرونده مرتبط <ArrowLeft size={16}/></button></section>}
   <footer className="fcr-footer"><FileText size={15}/> اطلاعات برای شهرداری فعلی و نقش مجاز از API دریافت می‌شود. جزئیات هر فهرست حداکثر ۲۰۰ ردیف دارد و دادهٔ ساختگی یا پرداخت فرضی تولید نمی‌شود.</footer>
  </>}
 </div>;
}
