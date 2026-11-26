import React,{useMemo,useState} from 'react';
import {ArrowLeft,Bot,CheckCircle2,ClipboardList,FilePlus2,GitBranch,LockKeyhole,RefreshCw,ShieldAlert,Sparkles} from 'lucide-react';
import {safeDossierResponse} from './deputy-dossier-schema.mjs';
import {discoverOpportunities,proposalFromOpportunity,deterministicRequestKey,authorityView,OPPORTUNITY_VERSION} from './deputy-agentic-opportunity-v8p32-core.mjs';
import './deputy-agentic-opportunity-v8p32.css';
const E=v=>encodeURIComponent(String(v||''));
const f=n=>new Intl.NumberFormat('fa-IR').format(n);
export default function DeputyAgenticOpportunityV8P32({board,city,api,assignmentId=null,isSystemAdmin=false,onOpenRecord=()=>{},onRefresh=()=>{}}){
 const opportunities=useMemo(()=>discoverOpportunities(board),[board]);
 const authority=useMemo(()=>authorityView(board),[board]);
 const [selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const active=opportunities.find(x=>x.id===selected)||opportunities[0]||null;
 const auth=assignmentId&&!isSystemAdmin?`?assignmentId=${E(assignmentId)}`:'';
 async function createDraft(item){
  if(!board.canCreate||busy)return;
  if(!window.confirm('فقط یک پیش‌نویس SYNTHETIC برای بررسی انسانی در دفتر V8P2 ثبت شود؟ هیچ اعزام، تخصیص یا تأیید ارزش انجام نمی‌شود.'))return;
  setBusy(true);setError('');setNotice('');
  try{
   const requestKey=await deterministicRequestKey(city,item.id);
   const body={...proposalFromOpportunity(board,item),requestKey};
   const result=await api(`/cities/${E(city)}/org-deputy-dossiers${auth}`,'POST',body);
   const checked=safeDossierResponse(result,city);
   if(!checked||checked.rows.length!==1||checked.rows[0].status!=='DRAFT'||checked.rows[0].orgKey!==item.orgKey||checked.rows[0].verifiedPublicValue!==false)throw Error('پاسخ ذخیره پیش‌نویس معتبر نیست');
   setNotice(result.idempotent?'این پیش‌نویس پیش‌تر ثبت شده بود؛ همان رکورد باز شد.':'پیش‌نویس در PostgreSQL ثبت شد؛ برای ارسال و بررسی مستقل به دفتر تخصصی بروید.');
   onRefresh();
   onOpenRecord(item.orgKey,checked.rows[0].id);
  }catch(e){setError(e?.message||'ثبت پرونده آزمایشی ناموفق بود؛ تغییری را فرض نکنید.')}finally{setBusy(false)}
 }
 return <section className="ao32" dir="rtl" data-rhf-agentic-opportunity={OPPORTUNITY_VERSION}>
  <header className="ao32-head"><div><small>AI-NATIVE DESIGN · EVIDENCE FIRST · V8P3.2</small><h3><Sparkles size={19}/> کارتابل کشف فرصت و حکمرانی اقدام</h3><p>الگوهای عملیاتی الهام‌گرفته از پلتفرم‌های پیشرو؛ در این نسخه موتور تحلیل کاملاً <b>قاعده‌محور</b> است، نه مدل مولد خودمختار.</p></div><span className="ao32-status">SYNTHETIC · VALUE NOT VERIFIED</span></header>
  <div className="ao32-stats"><div><strong>{f(opportunities.length)}</strong><span>فرصت دارای منبع داده</span></div><div><strong>{f(board.pending.length)}</strong><span>پرونده در انتظار بررسی مستقل</span></div><div><strong>۰</strong><span>اقدام اجرایی خودکار</span></div><div><strong>—</strong><span>ارزش عمومی قابل اثبات از این نما</span></div></div>
  {board.partial&&<p className="ao32-caution"><ShieldAlert size={17}/> پاسخ API به ۲۰۰ پرونده محدود است؛ کشف فرصت کامل شهری نیست.</p>}
  <div className="ao32-policy"><LockKeyhole size={17}/><div><strong>گراف اختیار (نمای اولیه)</strong><p>مشاهده: مجاز · ثبت پیش‌نویس: {authority.createDraft?'مجاز با API':'غیرمجاز'} · بازبینی مستقل: {authority.reviewSeparate?'حسب کنترل سرور':'غیرمجاز'} · اعزام، تخصیص منابع یا صدور دستور: غیرفعال</p><small>{authority.note}</small></div></div>
  <div className="ao32-main"><div className="ao32-queue"><h4><Bot size={17}/> فرصت‌های قابل بررسی</h4>{opportunities.length===0&&<p className="ao32-empty">فرصتی از فرم‌های مجاز شناسایی نشد؛ این به معنی نبود نیاز واقعی در شهر نیست.</p>}{opportunities.slice(0,30).map(o=><button key={o.id} type="button" className={active?.id===o.id?'is-active':''} onClick={()=>setSelected(o.id)}><strong>{o.title}</strong><span>{o.measure}: {f(o.quantity)} · {o.sourceStatus}</span><small>{o.sourceCode}</small><ArrowLeft size={14}/></button>)}{opportunities.length>30&&<small>۳۰ فرصت نخست نمایش داده می‌شوند؛ نتایج از API محدود است.</small>}</div>
  <div className="ao32-detail"><h4><GitBranch size={17}/> زنجیره تصمیم با نظارت انسانی</h4>{active?<><p><b>نیاز آزمایشی:</b> {active.measure} · مقدار فرم {f(active.quantity)}</p><p><b>پیشنهاد قابل توضیح:</b> {active.proposal}</p><p><b>منبع:</b> {active.sourceCode} · {f(active.evidenceCount)} ارجاع سند DEMO</p><div className="ao32-steps"><span><CheckCircle2 size={15}/> کشف قاعده‌محور</span><span><ClipboardList size={15}/> پیش‌نویس با کلید یکتا</span><span><LockKeyhole size={15}/> ارسال و بازبین مستقل</span><span><ShieldAlert size={15}/> ارزیابی میدانی و راستی‌آزمایی: انجام‌نشده</span></div><div className="ao32-actions"><button type="button" onClick={()=>onOpenRecord(active.orgKey,active.id)}>مشاهده منبع <ArrowLeft size={15}/></button><button type="button" className="ao32-primary" disabled={!board.canCreate||busy} onClick={()=>createDraft(active)}><FilePlus2 size={15}/>{busy?'در حال ثبت...':'ایجاد پیش‌نویس فرصت'}</button></div></>:<p className="ao32-empty">ابتدا داده تخصصی آزمایشی را با اختیار مجاز در دفتر V8P2 ثبت یا بارگذاری کنید.</p>}</div></div>
  {error&&<p className="ao32-error" role="alert">{error}</p>}{notice&&<p className="ao32-ok" role="status">{notice}</p>}
  <footer>این نما نه گراف حقوقی معتبر، نه تخصیص ظرفیت، نه مدل AI مولد، نه اجرای Temporal/LangGraph و نه سنجش مستقل ارزش عمومی است. چرخه عملیاتی فقط تا ثبت پیش‌نویس و ارجاع به گردش‌کار موجود V8P2 فعال است.</footer>
 </section>;
}
