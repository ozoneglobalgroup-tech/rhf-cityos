import React,{useEffect,useMemo,useRef,useState} from 'react';
import {RefreshCw,ShieldCheck,Workflow} from 'lucide-react';
import {TEMPORAL_UI_VERSION,eligibleToStart,eligibleToRelease,validRuntime,validState,humanPhases} from './agent-temporal-v8p52-core.mjs';
import './agent-temporal-v8p52.css';
const E=x=>encodeURIComponent(String(x||''));
export default function DeputyTemporalV8P52({city,api,role,actorId,missions=[]}){
 const base=useMemo(()=>`/cities/${E(city)}`,[city]),epoch=useRef(0),[runtime,setRuntime]=useState(null),[selected,setSelected]=useState(''),[status,setStatus]=useState(null),[busy,setBusy]=useState(false),[err,setErr]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{epoch.current++;setRuntime(null);setSelected('');setStatus(null);setErr('');setMessage('');return()=>{epoch.current++}},[city,actorId]);
 async function refreshRuntime(){const n=epoch.current;setBusy(true);setErr('');try{
  const r=await api(`${base}/agent-temporal-runtime`);if(!validRuntime(r,city,role))throw Error('پاسخ Temporal یا محدوده شهرداری معتبر نیست');
  if(n!==epoch.current)return;setRuntime(r);
 }catch(e){if(n===epoch.current)setErr(e?.message||'درگاه Temporal در دسترس نیست')}finally{if(n===epoch.current)setBusy(false)}}
 useEffect(()=>{if(city&&role)void refreshRuntime()},[city,actorId,role]);
 async function inspect(id=selected){if(!id||busy)return;const n=epoch.current;setBusy(true);setErr('');try{
  const r=await api(`${base}/agent-temporal-workflows/${E(id)}`);if(!validState(r,city,id))throw Error('پاسخ گردش‌کار معتبر نیست');if(n===epoch.current)setStatus(r);
 }catch(e){if(n===epoch.current){setStatus(null);setErr(e?.message||'گردش‌کار یافت نشد')}}finally{if(n===epoch.current)setBusy(false)}}
 async function perform(action){const m=missions.find(x=>x.id===selected);if(!m||busy||runtime?.state!=='SERVICE_CONNECTED')return;
  if(action==='START'&&!eligibleToStart(m,role)||action==='RELEASE'&&!eligibleToRelease(m,role))return;
  if(!window.confirm(action==='START'?'گردش‌کار Temporal در انتظار مجوز مستقل آغاز می‌شود. هیچ تحلیل خودکار یا عملیات شهری انجام نمی‌شود. ادامه؟':'مجوز مستقل در RUVOS ثبت شده است. اجرای تحلیل فقط‌خواندنی LangGraph آزاد شود؟'))return;
  const n=epoch.current;setBusy(true);setErr('');setMessage('');try{
   const path=action==='START'?`${base}/agent-temporal-workflows`:`${base}/agent-temporal-workflows/${E(selected)}`;
   const payload=action==='START'?{missionId:selected,acknowledgeReadOnly:true}:{action:'RELEASE',acknowledgeReadOnly:true};
   const res=await api(path,'POST',payload);if(!validState(res,city,selected))throw Error('پاسخ Temporal نامعتبر است');
   if(n===epoch.current){setStatus(res);setMessage(action==='START'?'Workflow ایجاد یا بازیابی شد؛ منتظر مجوز انسانی است.':'Signal ثبت شد؛ اجرای Worker باید در وضعیت گردش‌کار تأیید شود.');}
  }catch(e){if(n===epoch.current)setErr(e?.message||'عملیات Temporal انجام نشد')}finally{if(n===epoch.current)setBusy(false)}}
 const eligible=missions.filter(m=>eligibleToStart(m,role));const selectedMission=missions.find(m=>m.id===selected);
 return <section className="at52" data-rhf-temporal={TEMPORAL_UI_VERSION} aria-label="گردش‌کار پایدار Temporal" dir="rtl">
 <header><div><small>RUVOS / TEMPORAL DURABLE ORCHESTRATION — V8P5.2</small><h4><Workflow size={18}/> گردش‌کار پایدار Temporal</h4><p>ایجاد گردش‌کار، انتظار پایدار برای مجوز مستقل، آزادسازی دستی و اجرای LangGraph تحت RLS؛ بدون اعزام یا تخصیص منابع.</p></div><button type="button" onClick={refreshRuntime} disabled={busy}><RefreshCw size={14}/> بررسی اتصال</button></header>
 <div className="at52-status"><span><ShieldCheck size={14}/> وضعیت سرویس: {runtime?.state==='SERVICE_CONNECTED'?'اتصال برقرار':runtime?.state==='DISABLED'?'فعال نشده':'نامشخص'}</span><span>Worker: آزمون مستقل لازم دارد</span><span>اعزام خودکار: صفر</span></div>
 {err&&<p role="alert" className="at52-error">{err}</p>}{message&&<p role="status" className="at52-message">{message}</p>}
 <label>مأموریت شهرداری جاری<select disabled={busy} value={selected} onChange={e=>{setSelected(e.target.value);setStatus(null);setErr('')}}><option value="">انتخاب مأموریت</option>{eligible.map(m=><option key={m.id} value={m.id}>{m.caseSummary||m.caseId} · {m.id.slice(0,8)}</option>)}</select></label>
 <div className="at52-actions"><button type="button" disabled={busy||runtime?.state!=='SERVICE_CONNECTED'||!selectedMission} onClick={()=>perform('START')}>ثبت گردش‌کار در Temporal</button><button type="button" disabled={busy||runtime?.state!=='SERVICE_CONNECTED'||!eligibleToRelease(selectedMission,role)} onClick={()=>perform('RELEASE')}>آزادسازی پس از تأیید انسانی</button><button type="button" disabled={busy||!selected} onClick={()=>inspect()}><RefreshCw size={14}/> مشاهده وضعیت واقعی</button></div>
 {status&&<div className="at52-result"><strong>{humanPhases[status.phase]||status.phase}</strong><small>Temporal: {status.temporalStatus} · Workflow: {status.workflowId.slice(-22)}</small>{status.phase==='COMPLETED'&&<p>برای مشاهده شواهد و رد چهار گره، دفتر اجرای LangGraph را بازخوانی کنید.</p>}</div>}
 <p className="at52-info">این محیط از Temporal Server آزمایشی با SQLite مجزا استفاده می‌کند؛ برای بهره‌برداری تولیدی باید خوشه Temporal، ذخیره‌سازی مقاوم، TLS و پایش مستقل فراهم شود.</p>
 </section>;
}
