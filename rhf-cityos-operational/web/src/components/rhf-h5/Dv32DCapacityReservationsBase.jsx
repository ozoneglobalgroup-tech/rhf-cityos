import React,{useEffect,useRef,useState} from 'react';
import {Activity,RefreshCcw,ShieldCheck} from 'lucide-react';
import './dv32d-capacity-reservations.css';
const E=encodeURIComponent;
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const fresh=()=>({resourcePlanId:'',resourceId:'',quantity:'1.000',requestKey:null,justification:'درخواست رزرو ظرفیت تجمیعی برای مأموریت مصوب است؛ تخصیص شخص یا خودرو مشخص، تداخل شیفت و اعزام هنوز بررسی نشده است.'});
function verify(d,city,actor,surface,tenant){if(d?.schema!=='RHF-DV32D-GOVERNED-CAPACITY-v1'||d?.cityId!==city||d?.viewerId!==actor||d?.surface!==surface||(tenant&&d.tenantId!==tenant)||!uuid.test(d?.tenantId||'')||!Array.isArray(d.plans)||!Array.isArray(d.resources)||!Array.isArray(d.requests)||d.governance?.actualPoolReservation!==true||d.governance?.fieldDispatch!==false||d.governance?.verifiedPublicValue!==false||d.governance?.productionReady!==false)throw Error('DV32D_SCOPE_OR_GOVERNANCE_INVALID');return d}
export default function Dv32DCapacityReservations({city,actorId,api,surface='deputy',expectedTenantId}){
 const key=[city,actorId,surface,expectedTenantId].join(':');const activeKey=useRef(key);activeKey.current=key;
 const [tick,refresh]=useState(0),[state,setState]=useState({key:'',loading:false,data:null,error:''}),[form,setForm]=useState(fresh),[notes,setNotes]=useState({}),[busy,setBusy]=useState(false),[info,setInfo]=useState('');
 useEffect(()=>{let active=true;setState({key,loading:true,data:null,error:''});setForm(fresh());setNotes({});setInfo('');if(!uuid.test(city||'')||!uuid.test(actorId||'')||typeof api!=='function'){setState({key,loading:false,data:null,error:'نشست معتبر نیست'});return()=>{active=false}}
  api(`/cities/${E(city)}/dv32-capacity-reservations?surface=${E(surface)}`).then(d=>verify(d,city,actorId,surface,expectedTenantId)).then(data=>{if(active)setState({key,data,error:'',loading:false})}).catch(e=>{if(active)setState({key,data:null,error:String(e?.message||e),loading:false})});return()=>{active=false};},[key,city,actorId,api,surface,expectedTenantId,tick]);
 const d=state.key===key?state.data:null;
 const selected=d?.plans.find(x=>x.id===form.resourcePlanId);
 const available=d?.resources.filter(x=>x.targetOrgId===selected?.targetOrgId)||[];
 const path=`/cities/${E(city)}/dv32-capacity-reservations?surface=${E(surface)}`;
 async function submit(ev){ev.preventDefault();if(!d?.access?.canRequest||busy||!selected||!available.some(r=>r.id===form.resourceId))return;
  if(!window.confirm('درخواست بررسی مستقل رزرو ظرفیت ثبت شود؟ هنوز هیچ ظرفیت واقعی رزرو نمی‌شود.'))return;
  const old=key,requestKey=form.requestKey||crypto.randomUUID();setForm(x=>({...x,requestKey}));setBusy(true);
  try{const res=await api(path,'POST',{...form,requestKey});if(activeKey.current!==old)return;if(res?.schema!=='RHF-DV32D-GOVERNED-CAPACITY-v1'||res?.governance?.fieldDispatch!==false)throw Error('پاسخ API نامعتبر است');setInfo('درخواست ثبت شد؛ منتظر بررسی مستقل.');setForm(fresh());refresh(x=>x+1)}catch(e){if(activeKey.current===old)setInfo(String(e?.message||e))}finally{if(activeKey.current===old)setBusy(false)}
 }
 async function decide(row,action){if(busy||!d?.access?.canDecide||!['SUBMITTED','RESERVED'].includes(row.status)||row.createdBy===actorId)return;
  const n=(notes[row.id]||'').trim();if(n.length<30)return setInfo('توضیح تصمیم باید حداقل ۳۰ نویسه داشته باشد.');
  if(!window.confirm(action==='APPROVE_RESERVATION'?'رزرو واقعی ظرفیت تجمیعی انجام شود؟ این اقدام به معنی اعزام نیست.':action==='RELEASE'?'ظرفیت رزروشده آزاد شود؟':'درخواست رزرو رد شود؟'))return;
  const old=key;setBusy(true);try{const out=await api(`/cities/${E(city)}/dv32-capacity-reservations/${E(row.id)}?surface=${E(surface)}`,'PATCH',{action,version:row.version,note:n});if(activeKey.current!==old)return;if(out?.schema!=='RHF-DV32D-GOVERNED-CAPACITY-v1'||out?.governance?.fieldDispatch!==false)throw Error('پاسخ API نامعتبر است');setInfo('تصمیم در حسابرسی ثبت شد؛ وضعیت جدید: '+out.request?.status);refresh(x=>x+1)}catch(e){if(activeKey.current===old)setInfo(String(e?.message||e))}finally{if(activeKey.current===old)setBusy(false)}}
 return <section dir="rtl" className="rhf-dv32d" aria-label="تخصیص و رزرو ظرفیت تجمیعی مأموریت">
  <header><h3><Activity size={19}/> DV3.2D — رزرو کنترل‌شده ظرفیت منابع مأموریت</h3><button type="button" onClick={()=>refresh(x=>x+1)} disabled={busy||state.loading}><RefreshCcw size={15}/> بازخوانی</button></header>
  <p>رزرو ظرفیت به واحدهای ساعت کار، ساعت ناوگان یا ساعت تجهیزات محدود است؛ این بخش خودرو یا فرد مشخص، شیفت زمانی، اعزام یا خلق ارزش را تأیید نمی‌کند.</p>
  {state.loading&&<p role="status">در حال بررسی ظرفیت‌های ثبت‌شده و مجوز جاری…</p>}
  {state.error&&<p role="alert" className="error">دسترسی یا آمادگی کافی نیست: {state.error}</p>}
  {d&&<>
   <p className="trust"><ShieldCheck size={17}/> اطلاعات شهر، سازمان و کاربر جاری تطبیق شد. رزرو فقط پس از بررسی مستقل ثبت می‌شود.</p>
   <div className="metrics"><span>طرح منابع واجد شرایط: <b>{d.plans.length}</b></span><span>ظرفیت مجاز قابل مشاهده: <b>{d.resources.length}</b></span><span>درخواست رزرو: <b>{d.requests.length}</b></span></div>
   {d.access?.canRequest&&<form onSubmit={submit} className="fields">
    <label>طرح مصوب منابع<select required value={form.resourcePlanId} onChange={e=>setForm(x=>({...x,resourcePlanId:e.target.value,resourceId:'',requestKey:null}))}><option value="">انتخاب کنید</option>{d.plans.map(p=><option key={p.id} value={p.id}>مأموریت {p.missionId.slice(0,8)} · نیاز نیرو {p.personnelRequired} · ناوگان {p.vehiclesRequired}</option>)}</select></label>
    <label>منبع قابل رزرو<select required value={form.resourceId} onChange={e=>setForm(x=>({...x,resourceId:e.target.value,requestKey:null}))}><option value="">انتخاب کنید</option>{available.map(r=><option key={r.id} value={r.id}>{r.title} ({r.kind}) · ظرفیت محاسبه‌شده {r.available} {r.unit}</option>)}</select></label>
    <label>مقدار منبع به واحد ثبت‌شده<input required value={form.quantity} pattern="[0-9]+([.][0-9]{1,3})?" onChange={e=>setForm(x=>({...x,quantity:e.target.value,requestKey:null}))} dir="ltr"/></label>
    <label>دلیل و شواهد درخواست<textarea required minLength={30} maxLength={1200} value={form.justification} onChange={e=>setForm(x=>({...x,justification:e.target.value,requestKey:null}))}/></label>
    <button type="submit" disabled={busy||!available.length||!selected}>ارسال درخواست برای تأیید مستقل</button>
   </form>}
   <h4>سوابق درخواست‌های رزرو</h4>
   {!d.requests.length&&<p>در این محدوده هنوز درخواست رزرو ثبت نشده است.</p>}
   {d.requests.map(r=><article className="request" key={r.id}><strong>{r.status}</strong><small>مأموریت: {r.missionId.slice(0,8)} · مقدار {r.quantity} · نسخه {r.version}</small>
    {d.access?.canDecide&&((r.status==='SUBMITTED'&&r.createdBy!==actorId)||(r.status==='RESERVED'&&r.createdBy!==actorId&&r.reviewedBy!==actorId))&&<div><textarea placeholder="توضیح تصمیم مستقل (حداقل ۳۰ نویسه)" value={notes[r.id]||''} onChange={e=>setNotes(x=>({...x,[r.id]:e.target.value}))}/>
     {r.status==='SUBMITTED'?<><button type="button" disabled={busy} onClick={()=>decide(r,'APPROVE_RESERVATION')}>تأیید و رزرو ظرفیت</button><button type="button" disabled={busy} onClick={()=>decide(r,'REJECT')}>رد درخواست</button></>:<button type="button" disabled={busy} onClick={()=>decide(r,'RELEASE')}>آزادسازی ظرفیت رزروشده</button>}
    </div>}</article>)}
   {d.truncated&&<p>فقط بخشی از سوابق نمایش داده شده است؛ این فهرست برای گزارش‌گیری جامع نیست.</p>}
   {info&&<p role="status" className="notice">{info}</p>}
  </>}
 </section>
}
