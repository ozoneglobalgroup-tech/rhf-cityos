import React,{useEffect,useMemo,useState} from 'react';
import {normalizeCityLens,wasteEvidenceReadiness,CITY_LENSES} from './city-choice-core.mjs';
import {Truck,Scale,Users,GraduationCap,ShieldAlert,Landmark,Factory,ClipboardCheck,Clock3,RefreshCw,Send,CheckCircle2,AlertTriangle,Search,FileWarning,PenLine,Route,PackageSearch,BrainCircuit,Target} from 'lucide-react';
import {RECORD_KINDS,validateRecord} from './waste-suite-defs.mjs';
import './waste-suite.css';
const domainIcons={FLEET:Truck,MAINTENANCE:Clock3,COLLECTION:Scale,CONTRACTOR:Users,CONTRACT_EVAL:ClipboardCheck,SHIFT:Route,EDUCATION:GraduationCap,FACILITY:Factory,QUALITY:PackageSearch,VIOLATION:ShieldAlert,LEGAL:Landmark};
const labels={assetCode:'کد خودرو/تجهیز',assetType:'نوع وسیله',plate:'شماره پلاک',capacityKg:'ظرفیت (کیلوگرم)',ownership:'نوع مالکیت',condition:'وضعیت عملیاتی',contractorCode:'کد پیمانکار',zone:'منطقه',odometerKm:'کیلومترشمار',nextService:'سررسید سرویس',maintenanceType:'نوع تعمیر',openedAt:'تاریخ شروع',closedAt:'پایان تعمیر',downtimeHours:'توقف (ساعت)',costMinor:'هزینه (ریال)',workshopRef:'مرجع تعمیرگاه',stream:'جریان پسماند',material:'نوع ماده',netKg:'وزن خالص (کیلوگرم)',grossKg:'وزن ناخالص (کیلوگرم)',tareKg:'وزن خالی خودرو (کیلوگرم)',weighedAt:'تاریخ توزین',scaleTicket:'شماره قبض باسکول',vehicleCode:'کد خودرو',district:'منطقه/محله',routeCode:'کد مسیر',destinationCode:'مقصد/مرکز پردازش',treatment:'روش مدیریت نهایی',sourceMethod:'منبع وزن',name:'نام پیمانکار',contractRef:'شماره قرارداد',serviceType:'نوع خدمت',startDate:'تاریخ شروع قرارداد',endDate:'تاریخ پایان قرارداد',contractStatus:'وضعیت قرارداد',plannedCoverage:'پوشش هدف',periodStart:'شروع دوره',periodEnd:'پایان دوره',plannedServices:'خدمات برنامه‌ریزی‌شده',completedServices:'خدمات انجام‌شده',inspectedServices:'خدمات بازرسی‌شده',passedInspections:'بازرسی‌های پذیرفته‌شده',complaints:'تعداد شکایات',deductionMinor:'کسورات (ریال)',serviceDate:'تاریخ شیفت',shiftName:'نام شیفت',requiredStaff:'نیروی موردنیاز',presentStaff:'نیروی حاضر',absentStaff:'غیبت‌ها',replacementStaff:'جایگزین‌ها',plannedKm:'کیلومتر برنامه',completedKm:'کیلومتر انجام‌شده',heldAt:'تاریخ برنامه',topic:'موضوع آموزش',channel:'شیوه آموزش',audience:'گروه مخاطب',participants:'شرکت‌کنندگان',preScore:'امتیاز پیش‌آزمون',postScore:'امتیاز پس‌آزمون',campaignRef:'کد کمپین',facilityCode:'کد مرکز',facilityType:'نوع مرکز',operatorCode:'بهره‌بردار',capacityTonsPerDay:'ظرفیت تن در روز',controlStatus:'وضعیت کنترل محیط‌زیستی',inspectedAt:'تاریخ بازرسی',inspectedCount:'نمونه‌های بازرسی',passedCount:'نمونه‌های قابل قبول',inspectorRef:'کد بازرس',detectedAt:'زمان کشف',violationType:'نوع تخلف',subjectRef:'شناسه طرف پرونده (غیرشخصی)',noticeRef:'مرجع اخطار',caseStatus:'وضعیت رسیدگی',description:'شرح تخلف',legalRef:'شماره پرونده حقوقی',courtRef:'مرجع قضایی',relatedViolationRef:'شماره تخلف مربوط',stage:'مرحله رسیدگی',hearingAt:'تاریخ جلسه',decisionRef:'شماره رأی/تصمیم',summary:'خلاصه پرونده'};
const enumLabels={WET:'تر',DRY:'خشک',MIXED:'مخلوط',GREEN:'فضای سبز',BULKY:'حجیم',CONSTRUCTION:'ساختمانی',HAZARDOUS:'ویژه/خطرناک',MEDICAL:'پزشکی',OTHER:'سایر',ORGANIC:'آلی',PAPER:'کاغذ',PLASTIC:'پلاستیک',GLASS:'شیشه',METAL:'فلز',TEXTILE:'منسوجات',E_WASTE:'الکترونیکی',WOOD:'چوب',TRANSFER:'انتقال',RECYCLE:'بازیافت',COMPOST:'کمپوست',LANDFILL:'دفن',RECOVERY:'بازیابی',WEIGHBRIDGE:'باسکول',CERTIFIED_IMPORT:'داده واردشده از مرجع معتبر',ESTIMATE:'برآورد (فاقد تأیید تناژ)',STREET_CLEANING:'تنظیف معابر',WET_COLLECTION:'جمع‌آوری تر',DRY_COLLECTION:'جمع‌آوری خشک',SORTING:'تفکیک',IN_PERSON:'حضوری',SCHOOL:'مدرسه',ONLINE:'آنلاین',MEDIA:'رسانه',RECYCLING:'بازیافت',SUBMITTED:'در انتظار بررسی',VERIFIED:'بررسی مستقل ثبت‌شده',REJECTED:'ردشده'};
const display=(v)=>v===null||v===undefined||v===''?'—':typeof v==='number'?v.toLocaleString('fa-IR'):String(enumLabels[v]||v);
const isLegal=k=>['LEGAL','VIOLATION'].includes(k);
function Field({field,type,value,onChange,required}){
 const name=labels[field]||field;const numeric=['positive','nonneg','integer','score'].includes(type);
 if(type.startsWith('enum:'))return <label className="rhws-field">{name}<select required={required} value={value??''} onChange={e=>onChange(field,e.target.value)}><option value="">انتخاب کنید</option>{type.slice(5).split(',').map(x=><option key={x} value={x}>{enumLabels[x]||x}</option>)}</select></label>;
 return <label className="rhws-field">{name}<input required={required} type={numeric?'number':type==='date'?'date':'text'} min={numeric?0:undefined} max={type==='score'?100:undefined} step={type==='integer'||type==='score'?1:numeric?'any':undefined} value={value??''} onChange={e=>onChange(field,numeric?(e.target.value===''?'':Number(e.target.value)):e.target.value)}/></label>;
}
export default function WasteSuiteWorkspace({city,api,role,actorId,cases=[],organizationId,preferredLens='OPERATIONAL',onViewAgents,onViewValue,initialDomain='COLLECTION'}){
 const [domain,setDomain]=useState(initialDomain),[records,setRecords]=useState([]),[stats,setStats]=useState(null),[agentCandidates,setAgentCandidates]=useState([]),[partial,setPartial]=useState(false),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0),[search,setSearch]=useState('');
 const [form,setForm]=useState({}),[caseId,setCaseId]=useState(''),[evidenceRef,setEvidenceRef]=useState(''),[requestKey,setRequestKey]=useState('');
 const [reviewDraft,setReviewDraft]=useState({});
 const [lens,setLens]=useState('OPERATIONAL');
 useEffect(()=>{setLens(normalizeCityLens(preferredLens))},[preferredLens]);
 const evidence=wasteEvidenceReadiness(records,stats);
 const legalRole=['MUNICIPAL_ADMIN','AUDITOR'].includes(role);
 const canWrite=['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR'].includes(role);
 const canReview=['MUNICIPAL_ADMIN','AUDITOR'].includes(role);
 useEffect(()=>{if(Object.hasOwn(RECORD_KINDS,initialDomain))setDomain(initialDomain)},[initialDomain]);
 useEffect(()=>{setRecords([]);setStats(null);setAgentCandidates([]);setError('');setNotice('');setRevision(v=>v+1)},[city,organizationId]);
 useEffect(()=>{let live=true;if(!city||!organizationId)return()=>{live=false};setLoading(true);setError('');api(`/cities/${encodeURIComponent(city)}/waste-suite`).then(r=>{
  if(!live)return;if(r?.mode!=='SYNTHETIC_WASTE_SUITE_V2'||r.organizationId!==organizationId)throw Error('محدوده سازمانی پاسخ معتبر نیست');
  setRecords(Array.isArray(r.rows)?r.rows:[]);setStats(r.stats);setAgentCandidates(Array.isArray(r.agentCandidates)?r.agentCandidates:[]);setPartial(!!r.partial);
 }).catch(e=>{if(live)setError(e.message||'داده‌های دفتر جامع پسماند بارگذاری نشد')}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[city,organizationId,api,revision]);
 const categories=Object.entries(RECORD_KINDS).filter(([k])=>legalRole||!isLegal(k));
 const spec=RECORD_KINDS[domain];
 const selected=useMemo(()=>records.filter(r=>r.record_kind===domain&&`${r.record_code} ${Object.values(r.payload||{}).join(' ')}`.toLocaleLowerCase('fa').includes(search.toLocaleLowerCase('fa'))),[records,domain,search]);
 const change=(field,value)=>{setForm(v=>({...v,[field]:value}));setRequestKey('')};
 async function submit(e){e.preventDefault();if(busy||!canWrite||(isLegal(domain)&&role!=='MUNICIPAL_ADMIN'))return;
  let data;try{data=validateRecord(domain,form)}catch(ex){setError('اطلاعات ناقص یا نامعتبر: '+ex.message);return}
  if(evidenceRef.trim().length<12){setError('مرجع مدرک یا شماره مستند باید حداقل ۱۲ نویسه باشد');return}
  if(!window.confirm('این ثبت صرفاً سابقه آزمایشی «در انتظار بررسی» ایجاد می‌کند؛ نتیجه واقعی تأیید نمی‌شود. ادامه می‌دهید؟'))return;
  const key=requestKey||window.crypto?.randomUUID?.();if(!key){setError('مرورگر شناسه یکتا ایجاد نکرد');return}setRequestKey(key);setBusy(true);setError('');
  try{await api(`/cities/${encodeURIComponent(city)}/waste-suite`,'POST',{kind:domain,requestKey:key,data,caseId:caseId||undefined,evidenceRef:evidenceRef.trim(),sourceKind:'MANUAL'});
   setForm({});setEvidenceRef('');setCaseId('');setRequestKey('');setNotice('رکورد آزمایشی ثبت شد و به بررسی مستقل نیاز دارد.');setRevision(v=>v+1)}catch(ex){setError(ex.message||'ثبت ناموفق بود؛ برای جلوگیری از تکرار شناسه حفظ شد')}finally{setBusy(false)}
 }
 async function review(record,decision){const reason=(reviewDraft[record.id]||'').trim();if(reason.length<25){setError('دلیل بررسی مستقل باید حداقل ۲۵ نویسه باشد');return}
 if(!window.confirm('این تصمیم فقط تأیید/رد داده ثبت‌شده در پایلوت است؛ اثبات اثر واقعی شهری نیست.'))return;setBusy(true);setError('');
 try{await api(`/cities/${encodeURIComponent(city)}/waste-suite/${record.id}`,'PATCH',{decision,reviewNote:reason});setReviewDraft(s=>({...s,[record.id]:''}));setNotice('نتیجه بررسی مستقل ثبت شد.');setRevision(v=>v+1)}catch(e){setError(e.message||'بررسی مستقل ناموفق بود')}finally{setBusy(false)}
 }
 return <section className="rhws" aria-label="دفتر جامع مدیریت پسماند" dir="rtl">
  <header className="rhws-header"><div><span className="rhws-eyebrow">RHF ACOS · WASTE SUITE 02</span><h3>مدیریت جامع پسماند، تنظیف و پیمانکاران</h3><p>ثبت قابل حسابرسی، بررسی مستقل و سنجش عملکرد؛ صرفاً برای سازمان آزمایشی شیراز</p></div><button disabled={loading} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={16}/> به‌روزرسانی</button></header>
  <div className="rhws-caution"><AlertTriangle size={17}/><span>اطلاعات این بخش آزمایشی است. تنها رکوردهای بررسی‌شده در جمع‌های داخلی لحاظ می‌شوند؛ هیچ‌کدام گواه نتیجه واقعی میدانی یا رأی قطعی نیستند.</span></div>
  <div className="rhws-choice" role="group" aria-label="انتخاب تمرکز مدیریت پسماند">
   {Object.entries(CITY_LENSES).map(([key,info])=><button type="button" key={key} aria-pressed={lens===key} onClick={()=>setLens(key)}>{info.label}</button>)}
  </div>
  {lens==='AGENTIC'&&<div className="rhws-focus"><BrainCircuit size={18}/><div><b>نمای عامل‌محور سازمان پسماند</b><p>نامزدهای عامل از رکوردهای تأییدشده داخلی استخراج می‌شوند؛ ثبت پیشنهاد یا تأیید انسانی باید در میزکار رسمی عامل‌ها انجام شود. اجرای خودکار غیرفعال است.</p><strong>نامزدهای مستند فعلی: {stats?agentCandidates.length.toLocaleString('fa-IR'):'نامشخص (در انتظار داده معتبر)'}</strong></div><button type="button" onClick={()=>onViewAgents?.()}>ورود به تصمیم انسانی</button></div>}
  {lens==='VALUE'&&<div className="rhws-focus"><Target size={18}/><div><b>نمای ارزش‌محور سازمان پسماند</b><p>{stats?<>وزن باسکولی بررسی‌شده داخلی: {evidence.approvedMeasurements.toLocaleString('fa-IR')} رکورد؛ وزن برآوردی جدا: {evidence.approvedEstimates.toLocaleString('fa-IR')} رکورد؛ در انتظار بررسی: {evidence.pending.toLocaleString('fa-IR')} رکورد.</>:'تا دریافت داده معتبر از API، تعداد و وزن نامشخص است.'}</p><strong>خط مبنا، مقایسه و انتساب مستقل اثر هنوز لازم است؛ منفعت واقعی اثبات نشده است.</strong></div><button type="button" onClick={()=>onViewValue?.()}>فرصت‌ها و شواهد</button></div>}
  {error&&<div className="rhws-error" role="alert">{error}</div>}{notice&&<div className="rhws-success" role="status">{notice}</div>}
  <div className="rhws-metrics">
   <article><Scale size={19}/><small>وزن پسماند شهری با قبض باسکول بررسی‌شده</small><strong>{Object.keys(stats?.verifiedWeighedKgByStream||{}).length?Object.values(stats.verifiedWeighedKgByStream).reduce((a,b)=>a+b,0).toLocaleString('fa-IR')+' کیلوگرم':'فاقد داده بررسی‌شده'}</strong></article>
   <article><Users size={19}/><small>غیبت‌های تجمیعی بررسی‌شده</small><strong>{stats?.verifiedShiftCount?display(stats.verifiedAbsences):'فاقد داده'}</strong></article>
   <article><ClipboardCheck size={19}/><small>رکوردهای در انتظار بررسی</small><strong>{display(stats?.pendingReview??0)}</strong></article>
   <article><Landmark size={19}/><small>پرونده‌های حقوقی ثبت‌شده</small><strong>{legalRole?display(stats?.legalCases??0):'محدود به نقش مجاز'}</strong></article>
  </div>
  <section className="rhws-agents"><header><ShieldAlert size={19}/><strong>رصد عامل‌های تخصصی پسماند</strong><span>تحلیل قاعده‌محور مستند؛ بدون اقدام خودکار</span></header>
    {agentCandidates.length?<div className="rhws-agent-grid">{agentCandidates.slice(0,6).map((x,i)=><article key={x.recordId+x.code+i}><b>{x.title}</b><p>{x.detail}</p><small>مرجع رکورد: {x.recordId} · تصمیم نهایی: انسان</small></article>)}</div>:
    <p className="rhws-empty">از داده‌های بررسی‌شده فعلی، نامزد قابل استناد برای ارجاع عامل استخراج نشده است؛ این وضعیت به معنی نبود مشکل میدانی نیست.</p>}
  </section>
  <div className="rhws-domains">{categories.map(([key,d])=>{const Icon=domainIcons[key];return <button type="button" key={key} className={domain===key?'active':''} onClick={()=>{setDomain(key);setSearch('');setError('');setNotice('');setForm({});setRequestKey('')}} aria-pressed={domain===key}><Icon size={18}/><span>{d.label}</span><small>{records.filter(r=>r.record_kind===key).length.toLocaleString('fa-IR')}</small></button>})}</div>
  <div className="rhws-panels"><section className="rhws-list"><header><h4>{spec.label}</h4><label><Search size={15}/><input placeholder="جست‌وجو در سوابق" value={search} onChange={e=>setSearch(e.target.value)}/></label></header>
   {loading?<p className="rhws-empty">در حال بارگذاری داده‌های مجاز…</p>:selected.length===0?<p className="rhws-empty">در این بخش رکوردی ثبت نشده است. هیچ مقدار پیش‌فرض یا آزمایشی به‌عنوان عملکرد واقعی ساخته نشده است.</p>:
    <div className="rhws-rows">{selected.map(r=><article key={r.id}><div className="rhws-row-head"><strong>{display(r.record_code)}</strong><span className={'rhws-state '+r.review_state}>{display(r.review_state)}</span></div>
    <div className="rhws-values">{Object.entries(r.payload||{}).slice(0,12).filter(([k])=>k!=='estimateOnly').map(([k,v])=><p key={k}><small>{labels[k]||k}</small><b>{display(v)}</b></p>)}</div>
    <p className="rhws-meta">مرجع مدرک: {r.evidence_ref} · ثبت: {new Date(r.created_at).toLocaleDateString('fa-IR')}</p>
    {r.review_note&&<p className="rhws-meta">نظر بررسی: {r.review_note}</p>}
    {canReview&&r.review_state==='SUBMITTED'&&r.created_by!==actorId&&(!isLegal(domain)||role==='MUNICIPAL_ADMIN')&&<div className="rhws-review"><textarea placeholder="مبنای بررسی مستقل و مرجع شواهد (حداقل ۲۵ نویسه)" value={reviewDraft[r.id]||''} onChange={e=>setReviewDraft(s=>({...s,[r.id]:e.target.value}))} maxLength={1500}/><div><button disabled={busy} onClick={()=>review(r,'VERIFIED')}><CheckCircle2 size={15}/> پذیرش مستند</button><button disabled={busy} className="rhws-secondary" onClick={()=>review(r,'REJECTED')}>رد رکورد</button></div></div>}
    </article>)}</div>}
    {partial&&<p className="rhws-error">نمایش به ۱۰۰۰ رکورد محدود شده است؛ آمار این صفحه ممکن است ناقص باشد.</p>}
   </section>
   <section className="rhws-entry"><header><PenLine size={18}/><h4>ثبت سابقه جدید</h4></header>
    {!canWrite||isLegal(domain)&&role!=='MUNICIPAL_ADMIN'?<p className="rhws-empty">نقش فعلی مجوز ثبت این نوع اطلاعات را ندارد.</p>:<form onSubmit={submit}>
    <div className="rhws-form-grid">{Object.entries(spec.fields).map(([field,type])=><Field key={field} field={field} type={type} value={form[field]} onChange={change} required={spec.required.includes(field)}/>)}</div>
    <label className="rhws-field">پرونده خدمت مرتبط (اختیاری)<select value={caseId} onChange={e=>{setCaseId(e.target.value);setRequestKey('')}}><option value="">بدون انتساب به پرونده</option>{cases.map(c=><option key={c.id} value={c.id}>{c.summary}</option>)}</select></label>
    <label className="rhws-field">مرجع مستند / شماره سند قابل پیگیری<input required minLength={12} maxLength={1000} value={evidenceRef} onChange={e=>{setEvidenceRef(e.target.value);setRequestKey('')}} placeholder="شماره گزارش، قبض باسکول یا مرجع فایل در سامانه اسناد"/></label>
    <div className="rhws-caution"><FileWarning size={16}/>ثبت اطلاعات کارکنان در این نسخه صرفاً به‌شکل تعداد غیبت و حضور است؛ مدارک شخصی باید در HR با مجوز اختصاصی نگهداری شوند.</div>
    <button type="submit" className="rhws-submit" disabled={busy}><Send size={16}/>{busy?'در حال ثبت…':'ثبت برای بررسی مستقل'}</button>
    </form>}
   </section></div>
 </section>;
}
