import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Building2,CheckCircle2,RefreshCw,ShieldCheck,UserRoundPlus,LockKeyhole,ArrowLeft,AlertTriangle} from 'lucide-react';
import './waste-role-demo.css';
import {isApprovedCurrentAppointment,canRequestViewerMembership} from './appointment-membership-guard.mjs';
const enc=s=>encodeURIComponent(String(s||''));
const ROLES=[['ORG_CEO','مدیرعامل سازمان پسماند','ORGANIZATION'],['DEPUTY_HEAD','معاون خدمات شهری','DEPUTY'],['MAYOR','شهردار','ROOT']];
const safeDate=()=>new Date().toISOString();
export default function WasteCeoProvisionWizard({city,cityName,api,onOpenReview=()=>{},onOpenCity=()=>{}}){
 const pilotOnly=typeof cityName==='string'&&cityName.includes('شیراز')&&cityName.includes('دمو آزمایشی');
 const loadSequence=useRef(0);
 const [roles,setRoles]=useState([]),[users,setUsers]=useState([]),[units,setUnits]=useState([]),[members,setMembers]=useState([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [position,setPosition]=useState('ORG_CEO'),[orgUnitId,setOrgUnitId]=useState(''),[mode,setMode]=useState('new'),[userId,setUserId]=useState('');
 const [username,setUsername]=useState('shiraz.waste.ceo'),[displayName,setDisplayName]=useState('مدیرعامل آزمایشی سازمان پسماند');
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[approvalRef,setApprovalRef]=useState('DEMO-CEO-APPT-2026-01');
 const category=ROLES.find(r=>r[0]===position)?.[2]||'ORGANIZATION';
 const allowed=useMemo(()=>units.filter(u=>u.active===true&&u.kind===category),[units,category]);
 const selected=roles.filter(r=>r.userId===userId && r.positionCode===position && (r.orgUnitId||'')===(category==='ROOT'?'':orgUnitId)).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))[0];
 const assigned=isApprovedCurrentAppointment(selected);
 const member=members.find(m=>m.id===userId);
 const canGrantViewer=canRequestViewerMembership({pilotOnly,userId,appointment:selected,membership:member});
 async function load(){
  const requestId=++loadSequence.current;
  if(!city)return;
  const requestedCity=city;
  setBusy(true);setError('');
  try{
   const [u,o,a,m]=await Promise.all([api('/users'),api(`/cities/${enc(requestedCity)}/org-units`),api(`/cities/${enc(requestedCity)}/organization-positions`),api(`/cities/${enc(requestedCity)}/memberships`)]);
   if(requestId!==loadSequence.current)return;
   if(!Array.isArray(u)||!Array.isArray(o)||!Array.isArray(m)||!Array.isArray(a.rows))throw Error('پاسخ مدیریت سازمانی نامعتبر است');
   setUsers(u);setUnits(o);setRoles(a.rows);setMembers(m);
  }catch(e){if(requestId===loadSequence.current)setError(e.message||'اطلاعات کاربران دریافت نشد')}
  finally{if(requestId===loadSequence.current)setBusy(false)}
 }
 useEffect(()=>{loadSequence.current++;setUsers([]);setUnits([]);setRoles([]);setMembers([]);setUserId('');setOrgUnitId('');load();return()=>{loadSequence.current++}},[city]);
 useEffect(()=>{if(category!=='ROOT'&&!allowed.some(o=>o.id===orgUnitId))setOrgUnitId('')},[category,units]);
 async function createUser(e){e.preventDefault();setError('');setNotice('');if(!pilotOnly)return setError('این راه‌انداز صرفاً برای شهرداری شیراز — دمو آزمایشی مجاز است');
  if(!/^[a-z][a-z0-9._-]{3,79}$/i.test(username))return setError('شناسه کاربری فقط حروف لاتین، اعداد و نقطه/خط تیره؛ حداقل ۴ نویسه');
  if(displayName.trim().length<5)return setError('نام نمایشی کامل وارد کنید');
  if(password.length<14||password!==confirm)return setError('رمز حداقل ۱۴ نویسه باشد و با تأیید تکرار مطابقت کند');
  setBusy(true);try{const created=await api('/users','POST',{username:username.trim(),displayName:displayName.trim(),password});if(!created?.id)throw Error('رسید ایجاد حساب معتبر نیست');setUserId(created.id);setMode('existing');setNotice('حساب ایجاد شد. هنوز هیچ مجوز یا سمت مدیریتی ندارد. درخواست انتصاب را در مرحله بعد ثبت کنید.');await load();}
  catch(e){setError(e.message||'ایجاد حساب ناموفق بود')}finally{setPassword('');setConfirm('');setBusy(false)}
 }
 async function request(){setError('');setNotice('');if(!pilotOnly)return setError('ثبت آزمایشی فقط در شهرداری شیراز — دمو آزمایشی مجاز است');if(!userId)return setError('ابتدا یک حساب ایجاد یا انتخاب کنید');if(category!=='ROOT'&&!orgUnitId)return setError('واحد سازمانی واقعی مربوط به سمت را انتخاب کنید');if(approvalRef.trim().length<8)return setError('شماره مرجع انتصاب باید حداقل ۸ نویسه باشد');
  if(selected&&['PENDING','APPROVED'].includes(selected.status))return setError('برای همین حساب و سمت، درخواست در انتظار یا تأییدشده وجود دارد؛ درخواست تکراری ثبت نکنید');
  setBusy(true);try{const a=await api(`/cities/${enc(city)}/organization-positions`,'POST',{userId,positionCode:position,orgUnitId:category==='ROOT'?null:orgUnitId,validFrom:safeDate(),validTo:null,approvalRef:approvalRef.trim()});if(!a?.appointment?.id)throw Error('رسید درخواست نامعتبر است');setNotice('درخواست ثبت شد؛ هیچ مجوزی اعطا نشده است. یک بازبین مستقل باید در نشست خودش تصمیم بگیرد.');await load();}catch(e){setError(e.message||'ثبت انتصاب ناموفق')}finally{setBusy(false)}
 }
 async function grantViewer(){setError('');setNotice('');if(!pilotOnly)return setError('عضویت آزمایشی فقط در شهرداری شیراز — دمو آزمایشی مجاز است');if(!canGrantViewer)return setError('عضویت موجود یا انتصاب منقضی/نامعتبر است؛ ایجاد یا تبدیل VIEWER مجاز نیست');if(!window.confirm('برای این حساب فقط نقش VIEWER شهرداری ثبت شود؟ این کار هیچ سمت مدیریتی ایجاد نمی‌کند.'))return;
  setBusy(true);try{const r=await api(`/cities/${enc(city)}/memberships`,'POST',{userId,role:'VIEWER'});if(r?.role!=='VIEWER')throw Error('عضویت VIEWER تأیید نشد');setNotice('عضویت VIEWER ثبت شد. اکنون می‌توان با نام کاربری و رمز انتخابی همان شخص در یک پنجره جدا وارد شد.');await load();}catch(e){setError(e.message||'عضویت ناموفق')}finally{setBusy(false)}
 }
 return <section className="rh77-wizard" dir="rtl" data-rhf-role-setup="V7.7">
  <header className="rh77-heading"><div><small>RHF City OS · مدیریت هویت آزمایشی V7.7</small><h1>راه‌اندازی حساب مدیران و محیط‌های اختصاصی</h1><p>این فرایند از همان APIهای موجود RUVOS استفاده می‌کند. ساخت حساب، تأیید سمت و عضویت، سه اقدام مستقل و قابل حسابرسی هستند.</p></div><button type="button" onClick={load} disabled={busy}><RefreshCw size={16}/> بازخوانی</button></header>
  <div className="rh77-flow"><span>۱. حساب شخصی</span><span>۲. درخواست سمت</span><span>۳. تأیید مستقل</span><span>۴. VIEWER و ورود</span></div>
  {!pilotOnly&&<div className="rh77-error" role="alert">این ابزار فقط برای «شهرداری شیراز — دمو آزمایشی» فعال است. شهرداری درست را از سربرگ انتخاب کنید؛ هیچ تغییر حسابی در این محدوده مجاز نیست.</div>}
  {error&&<div className="rh77-error" role="alert"><AlertTriangle size={17}/>{error}</div>}
  {notice&&<div className="rh77-success" role="status"><CheckCircle2 size={17}/>{notice}</div>}
  <div className="rh77-two">
   <section className="rh77-panel"><h2><UserRoundPlus size={19}/> ۱ — حساب مستقل کاربر</h2><p>برای هر شخص حساب و رمز مخصوص تعیین کنید؛ رمز در مرورگر یا فایل‌های بسته ذخیره نمی‌شود.</p>
    <div className="rh77-switch"><button type="button" className={mode==='new'?'active':''} onClick={()=>{setPassword('');setConfirm('');setUserId('');setMode('new')}}>ساخت حساب جدید</button><button type="button" className={mode==='existing'?'active':''} onClick={()=>{setPassword('');setConfirm('');setMode('existing')}}>استفاده از حساب موجود</button></div>
    {mode==='new'?<form onSubmit={createUser} autoComplete="off" className="rh77-fields"><label>شناسه کاربری لاتین<input required value={username} onChange={e=>setUsername(e.target.value)} autoComplete="off"/></label><label>نام نمایشی آزمایشی<input required value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label><label>رمز اولیه منحصر‌به‌فرد (حداقل ۱۴ نویسه)<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={14} autoComplete="new-password"/></label><label>تأیید رمز<input required type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={14} autoComplete="new-password"/></label><button className="rh77-primary" type="submit" disabled={busy||!pilotOnly}>ایجاد حساب بدون سمت و مجوز</button></form>:
     <div className="rh77-fields"><label>کاربر موجود<select value={userId} onChange={e=>setUserId(e.target.value)}><option value="">انتخاب حساب</option>{users.map(u=><option key={u.id} value={u.id}>{u.username} — {u.display_name}</option>)}</select></label></div>}
   </section>
   <section className="rh77-panel"><h2><Building2 size={19}/> ۲ — درخواست سمت سازمانی</h2><p>شناسه واحد باید از ساختار موجود شهرداری خوانده شود؛ عنوان نمایشی به‌تنهایی اختیار ایجاد نمی‌کند.</p><div className="rh77-fields"><label>سمت<select value={position} onChange={e=>{setPosition(e.target.value);setOrgUnitId('');setUserId('');setApprovalRef('DEMO-APPT-2026-01')}}>{ROLES.map(r=><option key={r[0]} value={r[0]}>{r[1]}</option>)}</select></label>{category!=='ROOT'&&<label>واحد سازمانی مربوط<select value={orgUnitId} onChange={e=>setOrgUnitId(e.target.value)}><option value="">انتخاب از ساختار ثبت‌شده</option>{allowed.map(u=><option key={u.id} value={u.id}>{u.name_fa} ({u.code})</option>)}</select></label>}{category!=='ROOT'&&allowed.length===0&&<p className="rh77-help">هیچ واحد فعالی با نوع {category} ثبت نشده؛ ابتدا ساختار شهرداری را اصلاح کنید.</p>}<label>مرجع حکم / درخواست آزمایشی<input value={approvalRef} onChange={e=>setApprovalRef(e.target.value)}/></label><button className="rh77-primary" type="button" onClick={request} disabled={busy||!pilotOnly||!userId||(category!=='ROOT'&&!orgUnitId)}>ثبت درخواست — بدون اعطای اختیار</button></div></section>
  </div>
  <section className="rh77-panel"><h2><ShieldCheck size={20}/> ۳ — تأیید مستقل و ۴ — ورود با حساب مدیرعامل</h2><div className="rh77-status-grid"><article><small>وضعیت انتصاب انتخابی</small><strong>{selected?.status==='PENDING'?'در انتظار بازبین مستقل':assigned?'تأییدشده و معتبر':selected?.status||'درخواستی ثبت نشده'}</strong></article><article><small>عضویت شهرداری</small><strong>{member?.role||'فاقد عضویت'}</strong>{member&&<small>عضویت موجود نباید خودکار به VIEWER تبدیل شود</small>}</article><article><small>اختیار اجرایی</small><strong>هیچ مجوز اعزام یا پرداختی از این فرایند صادر نمی‌شود</strong></article></div>
   <div className="rh77-actions"><button type="button" onClick={onOpenReview}>ورود به صف بازبینی مستقل <ArrowLeft size={14}/></button><button type="button" onClick={grantViewer} disabled={busy||!canGrantViewer}>ثبت عضویت حداقلی VIEWER</button><button type="button" onClick={onOpenCity}>بازگشت به صفحه آغاز شهرداری</button></div>
   <p className="rh77-help">اگر درخواست را همین حساب مدیر سامانه ثبت کرده، خودتأییدی ممنوع است. بازبین با حساب جداگانه دارای مجوز MUNICIPAL_ADMIN وارد شود، تصمیم را با دلیل ثبت کند؛ سپس مدیر سامانه برای حساب موردنظر VIEWER تعیین کند.</p>
   <p className="rh77-help"><LockKeyhole size={14}/> پس از تأیید و عضویت، از حساب مدیر سامانه خارج شوید و با <b>{users.find(u=>u.id===userId)?.username||'نام کاربری حساب ساخته‌شده'}</b> و رمز اختصاصی‌اش وارد شوید. سمت معتبر مسیر ورود را تعیین می‌کند؛ تغییر منو در سمت کاربر نباید سطح مجوز را تغییر دهد.</p>
  </section>
 </section>
}
