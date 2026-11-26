import React,{useEffect,useMemo,useState} from 'react';
import {Activity,AlertTriangle,ArrowLeft,Building2,CheckCircle2,ClipboardCheck,ClipboardList,Clock3,Database,FileCheck2,Filter,Layers3,MapPinned,RefreshCcw,Route,ShieldCheck,Target,TrendingUp,Users} from 'lucide-react';
import {summarizeCockpit,unitRollup,caseDrillScope} from './deputy-cockpit-core.mjs';
import './deputy-cockpit.css';
const fa=n=>n===null||n===undefined?'—':new Intl.NumberFormat('fa-IR').format(Number(n)||0);
const STATUS={RECEIVED:'دریافت‌شده',TRIAGED:'بررسی اولیه',ASSIGNED:'ارجاع‌شده',IN_PROGRESS:'در اجرا',AWAITING_ACCEPTANCE:'منتظر پذیرش'};
function Kpi({label,value,icon:Icon,caption,onClick,tone=''}) {return <button type="button" className={`dc-kpi ${tone}`} onClick={onClick} title={`ورود به جزئیات ${label}`}><span className="dc-kpi-header"><span>{label}</span><Icon size={19}/></span><strong>{fa(value)}</strong><small>{caption} <ArrowLeft size={14}/></small></button>}
export default function DeputyCockpit({city,cityName,units=[],access,api,navigate,openDetail}){
 const [result,setResult]=useState(null),[pending,setPending]=useState(false),[error,setError]=useState(''),[unitId,setUnitId]=useState(''),[view,setView]=useState('deputy'),[tick,setTick]=useState(0);
 const model=result?.city===city?result.data:null;
 useEffect(()=>{setResult(null);setUnitId('');setError('')},[city]);
 useEffect(()=>{let cancelled=false;async function load(){if(!city)return;setPending(true);setError('');try{const r=await api(`/cities/${city}/deputy-cockpit`);if(!cancelled)setResult({city,data:r})}catch(e){if(!cancelled){setResult(null);setError(e.message)}}finally{if(!cancelled)setPending(false)}}load();return()=>{cancelled=true}},[city,tick,api]);
 const snapshot=useMemo(()=>summarizeCockpit(model||{},units,unitId),[model,units,unitId]);
 const areas=useMemo(()=>units.filter(u=>u.kind==='DISTRICT'||u.kind==='SUBDISTRICT'||u.kind==='ORGANIZATION'||u.kind==='DEPUTY').sort((a,b)=>a.name_fa.localeCompare(b.name_fa,'fa')),[units]);
 const activeArea=units.find(x=>x.id===unitId);
 const rows=useMemo(()=>{
  const focus=unitId?unitRollup(model||{},units,unitId).filter(x=>x.unit.id!==unitId):units.filter(u=>u.kind==='DISTRICT'||u.kind==='ORGANIZATION').map(u=>({unit:u,summary:summarizeCockpit(model||{},units,u.id)}));
  return focus.sort((a,b)=>(b.summary.cases.overdue||0)-(a.summary.cases.overdue||0));
 },[model,units,unitId]);
 const allCases=snapshot.cases;
 const drill=(type='all')=>navigate('cases',caseDrillScope(unitId,type));
 const showCase=row=>openDetail('cases',row);
 return <section className="dc-root" aria-label="میزکار معاون خدمات شهری">
  <div className="dc-hero"><div><span className="dc-overline"><Activity size={15}/> DEPUTY OPERATIONS · CITY VALUE</span><h2>فرماندهی خدمات شهری</h2><p>پایش عملیات، مسئولیت واحدها، کیفیت و ارزش قابل اثبات در {cityName}</p></div><div className="dc-hero-actions"><span className="dc-city"><MapPinned size={16}/>{cityName}</span><button type="button" className="dc-refresh" disabled={pending} onClick={()=>setTick(x=>x+1)}><RefreshCcw size={16}/> نوسازی شاخص‌ها</button></div></div>
  <div className="dc-controls"><div className="dc-views" role="group" aria-label="زاویه دید میزکار"><button aria-pressed={view==='deputy'} className={view==='deputy'?'active':''} onClick={()=>{setView('deputy');setUnitId('')}}><Building2 size={16}/> نمای معاونت</button><button aria-pressed={view==='region'} className={view==='region'?'active':''} onClick={()=>setView('region')}><MapPinned size={16}/> نمای منطقه و سازمان</button><button aria-pressed={view==='operation'} className={view==='operation'?'active':''} onClick={()=>setView('operation')}><Route size={16}/> کنترل عملیات</button></div><label><Filter size={16}/> محدوده سازمانی<select aria-label="انتخاب محدوده سازمانی" value={unitId} onChange={e=>setUnitId(e.target.value)}><option value="">همه شهرداری</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name_fa}</option>)}</select></label></div>
  <div className="dc-scope"><ShieldCheck size={16}/><span>داده‌ها از API شهرداری منتخب دریافت می‌شوند. فیلتر واحد سازمانی، مجوز امنیتی مستقل ایجاد نمی‌کند.</span><span className="dc-role">نقش: {access?.role||'در حال بررسی'}</span></div>
  {pending&&!model&&<div className="dc-msg" role="status">در حال بازیابی آمار واقعی از پایگاه داده...</div>}
  {error&&<div className="dc-msg dc-error" role="alert">خطا در بارگذاری میزکار: {error} <button onClick={()=>setTick(n=>n+1)}>تلاش مجدد</button></div>}
  {model&&<>
   <div className="dc-label"><div><span>{view==='operation'?'CONTROL ROOM':view==='region'?'DISTRICT PERFORMANCE':'EXECUTIVE SCORECARD'}</span><h3>{activeArea?`عملکرد ${activeArea.name_fa}`:'نمای کل شهرداری'}</h3></div><small>شاخص‌ها از تجمیع تمام رکوردهای ثبت‌شده محاسبه شده‌اند</small></div>
   <div className="dc-grid">
    <Kpi label="پرونده‌های باز" value={allCases.open||0} icon={ClipboardList} caption="مشاهده پرونده‌ها" onClick={()=>drill('all')}/>
    <Kpi label="معوقات SLA" value={allCases.overdue||0} icon={Clock3} tone="warn" caption="نمایش پرونده‌های معوق" onClick={()=>drill('overdue')}/>
    <Kpi label="اولویت بالا و بحرانی" value={allCases.urgent||0} icon={AlertTriangle} caption="مشاهده موارد فوری" onClick={()=>drill('urgent')}/>
    <Kpi label="منتظر پذیرش" value={allCases.awaiting||0} icon={ClipboardCheck} caption="ورود به پرونده‌ها" onClick={()=>drill('awaiting')}/>
    <Kpi label="مأموریت‌های باز" value={snapshot.missions.active||0} icon={Route} caption="مشاهده مأموریت‌ها" onClick={()=>navigate('missions')}/>
    <Kpi label="خدمات دارای شناسنامه" value={snapshot.services.total||0} icon={Layers3} caption="مشاهده کاتالوگ خدمات" onClick={()=>navigate('services',unitId?{kind:'ownerTree',value:unitId,label:`خدمات ${activeArea?.name_fa||''}`} :null)}/>
   </div>
   <div className="dc-main-grid">
    <article className="dc-panel"><div className="dc-panel-head"><div><span className="dc-mini">SERVICE OPERATIONS</span><h3>وضعیت تحویل و کیفیت</h3></div><button onClick={()=>navigate('quality')}>پایش کیفیت <ArrowLeft size={15}/></button></div>
     <div className="dc-measures"><div><span>پرونده‌های مختومه</span><b>{fa(allCases.closed||0)}</b></div><div><span>مأموریت‌های انجام‌شده</span><b>{fa(snapshot.missions.done||0)}</b></div><div><span>بازرسی‌های مردود</span><b>{fa(snapshot.inspections.failed||0)}</b></div><div><span>پرونده بدون شناسنامه خدمت</span><b>{fa(allCases.without_service||0)}</b></div></div>
     <div className="dc-rate"><div><span>مختومه در موعد SLA</span><b>{snapshot.rate===null?'داده کافی نیست':`${fa(snapshot.rate)}٪`}</b></div><div className="dc-track"><i style={{width:`${snapshot.rate||0}%`}}/></div><small>مخرج: فقط پرونده‌های مختومه دارای موعد SLA؛ نرخ کل پرونده‌ها نیست.</small></div>
    </article>
    <article className="dc-panel"><div className="dc-panel-head"><div><span className="dc-mini">CAPACITY & PUBLIC VALUE</span><h3>ظرفیت و پیامدهای قابل تأیید</h3></div><button onClick={()=>navigate('capacity')}>مدیریت ظرفیت <ArrowLeft size={15}/></button></div><div className="dc-measures"><div><span>منابع ثبت‌شده</span><b>{fa(snapshot.capacity.total||0)}</b></div><div><span>منابع دارای مجوز</span><b>{fa(snapshot.capacity.authorized||0)}</b></div><div><span>پیامدهای ثبت‌شده</span><b>{fa(snapshot.outcomes.total||0)}</b></div><div><span>پیامدهای تأیید مستقل</span><b>{fa(snapshot.outcomes.verified||0)}</b></div></div><div className="dc-note"><ShieldCheck size={17}/><p>ارزش پولی و غیرپولی تجمیع نمی‌شوند. نتایج اندازه‌گیری‌شده، بدون تأیید مستقل ارزش محقق‌شده محسوب نمی‌شوند.</p></div><button className="dc-secondary" onClick={()=>navigate('outcomes')}>ورود به دفترکل ارزش عمومی <ArrowLeft size={15}/></button></article>
   </div>
   <div className="dc-main-grid">
    <article className="dc-panel"><div className="dc-panel-head"><div><span className="dc-mini">ORGANIZATIONAL DRILL-DOWN</span><h3>عملکرد سازمان‌ها و مناطق</h3></div><button onClick={()=>navigate('org')}>ساختار کامل <ArrowLeft size={15}/></button></div>
      {rows.length?<div className="dc-table"><table><thead><tr><th>واحد</th><th>پرونده</th><th>معوق</th><th>مأموریت باز</th><th>ریز اطلاعات</th></tr></thead><tbody>{rows.slice(0,15).map(({unit,summary:r})=><tr key={unit.id}><td><button className="dc-text" onClick={()=>{setUnitId(unit.id);setView('region')}}>{unit.name_fa}</button></td><td>{fa(r.cases.total||0)}</td><td className={(r.cases.overdue||0)>0?'dc-danger':''}>{fa(r.cases.overdue||0)}</td><td>{fa(r.missions.active||0)}</td><td><button className="dc-row-btn" onClick={()=>navigate('cases',caseDrillScope(unit.id,'all'))}>پرونده‌ها <ArrowLeft size={13}/></button></td></tr>)}</tbody></table></div>:<div className="dc-empty">در این سطح، زیرواحدی با ساختار قابل شناسایی وجود ندارد. ساختار سازمانی را بررسی کنید.</div>}
      <small className="dc-foot">هر شاخه با زیرمجموعه‌هایش تجمیع می‌شود. جمع سطرهای دارای هم‌پوشانی لزوماً برابر جمع کل نیست.</small>
    </article>
    <article className="dc-panel"><div className="dc-panel-head"><div><span className="dc-mini">ACTION PRIORITIES</span><h3>پرونده‌های نیازمند پیگیری</h3></div><button onClick={()=>drill('all')}>فهرست پرونده‌ها <ArrowLeft size={15}/></button></div>
      {snapshot.attention.length?<div className="dc-attention">{snapshot.attention.slice(0,8).map(c=><button key={c.id} onClick={()=>showCase(c)}><span className="dc-attention-indicator"/><span className="dc-attention-text"><b>{c.summary}</b><small>{c.unit_name||'بدون واحد مسئول'} · {c.service_name||'بدون شناسنامه خدمت'} · {STATUS[c.status]||c.status}</small></span><span className="dc-urgency">{c.due_at&&Date.parse(c.due_at)<Date.now()?'معوق':c.priority==='CRITICAL'?'بحرانی':c.priority==='HIGH'?'بالا':'باز'}</span><ArrowLeft size={14}/></button>)}</div>:<div className="dc-empty">پرونده باز قابل نمایش در محدوده انتخاب‌شده وجود ندارد.</div>}
      <small className="dc-foot">نمایش حداکثر ۸ مورد از ۳۵ پرونده اولویت‌دار؛ شمارنده‌های بالای صفحه از کل پایگاه داده محاسبه شده‌اند.</small>
    </article>
   </div>
   <div className="dc-next"><Target size={19}/><div><strong>کنترل عملیات در جریان</strong><p>مسیر پذیرش: درخواست ← واحد مسئول ← مأموریت ← تخصیص ظرفیت ← بازرسی ← تأیید پیامد</p></div><button onClick={()=>navigate('work')}>مرکز اقدام <ArrowLeft size={16}/></button></div>
   <p className="dc-disclaimer">شاخص‌های هزینه و بودجه، قرارداد پیمانکاران، GIS و تخصیص دسترسی در سطح منطقه هنوز به داده و قراردادهای مستقل نیاز دارند؛ هیچ رقم تخمینی به‌جای عملکرد واقعی نمایش داده نشده است. فهرست عمومی پرونده‌ها در نسخه فعلی تا ۳۰۰ رکورد را بازیابی می‌کند و برای شهرهای بزرگ باید صفحه‌بندی سمت سرور اضافه شود.</p>
  </>}
 </section>;
}
