import React,{useState} from 'react';
import {CheckCircle2,ClipboardCheck,FilePlus2,ShieldCheck} from 'lucide-react';
import {WASTE_FORMS,formToRecord} from './waste-record-forms.mjs';

export function WasteRecordComposer({city,domain,me,api,canCreate,onDone}){
 const spec=WASTE_FORMS[domain];
 const [open,setOpen]=useState(false);
 const [draft,setDraft]=useState({sourceMethod:'ESTIMATE'});
 const [evidence,setEvidence]=useState('');
 const [key,setKey]=useState('');
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 if(!spec||!canCreate)return null;
 async function submit(e){
  e.preventDefault();if(busy)return;
  setBusy(true);setNotice('');
  const id=key||crypto.randomUUID();if(!key)setKey(id);
  try{
   const data=formToRecord(domain,draft);
   await api(`/cities/${encodeURIComponent(city)}/waste-suite`,'POST',{
    kind:domain,requestKey:id,data,evidenceRef:evidence.trim(),sourceKind:'MANUAL'
   });
   setOpen(false);setDraft({sourceMethod:'ESTIMATE'});setEvidence('');setKey('');
   setNotice('رکورد با وضعیت «در انتظار بررسی» ثبت شد؛ این ثبت تأیید میدانی نیست.');onDone?.();
  }catch(err){setNotice(`ثبت انجام نشد: ${err?.message||'خطای سرور'}. برای تکرار امن، کلید درخواست حفظ شده است.`)}
  finally{setBusy(false)}
 }
 return <section className="rhf-w91-composer" aria-label="فرم ثبت رکورد سازمان پسماند">
  <button className="rhf-w9-primary" type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open}><FilePlus2 size={16}/> {open?'بستن فرم':'ثبت سابقه '+spec.title}</button>
  {notice&&<p role="status" className="rhf-w91-notice">{notice}</p>}
  {open&&<form onSubmit={submit} className="rhf-w91-form">
   <p><ShieldCheck size={15}/> ثبت فقط در شهرداری و سازمان فعلی انجام می‌شود؛ بررسی مستقل الزامی است.</p>
   <div className="rhf-w91-fields">{spec.fields.filter(f=>domain!=='COLLECTION'||!['grossKg','tareKg'].includes(f.id)||draft.sourceMethod==='WEIGHBRIDGE').map(f=><label key={f.id}><span>{f.label}</span>
    {f.type==='select'?<select required value={draft[f.id]||''} onChange={e=>setDraft(s=>({...s,[f.id]:e.target.value}))}><option value="">انتخاب کنید</option>{f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:
    <input required type={f.type==='date'?'date':f.type==='number'||f.type==='integer'?'number':'text'} step={f.type==='integer'?'1':f.type==='number'?'any':undefined} min={f.type==='integer'||f.type==='number'?'0':undefined} value={draft[f.id]??''} onChange={e=>setDraft(s=>({...s,[f.id]:e.target.value}))}/>}</label>)}</div>
   <label className="rhf-w91-evidence"><span>مرجع سند و شواهد (حداقل ۱۲ نویسه)</span><input required minLength={12} maxLength={1000} value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="شناسه معتبر سند داخلی/لینک مرجع"/></label>
   <button type="submit" className="rhf-w9-primary" disabled={busy}>{busy?'در حال ثبت…':'ارسال برای بررسی مستقل'} <ClipboardCheck size={16}/></button>
  </form>}
 </section>
}
export function WasteReviewPanel({city,me,api,rows,canReview,onDone}){
 const [id,setId]=useState('');const [note,setNote]=useState('');const [decision,setDecision]=useState('VERIFIED');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const pending=(rows||[]).filter(r=>r.review_state==='SUBMITTED'&&r.created_by!==me?.id);
 if(!canReview||!pending.length)return null;
 async function submit(e){e.preventDefault();if(busy||!id)return;setBusy(true);setMessage('');try{
  await api(`/cities/${encodeURIComponent(city)}/waste-suite/${encodeURIComponent(id)}`,'PATCH',{decision,reviewNote:note.trim()});
  setMessage('تصمیم داخلی ثبت شد؛ تأیید ارزش عمومی یا دستور اجرای خودکار صادر نشده است.');setId('');setNote('');onDone?.();
 }catch(err){setMessage('خطای ثبت بررسی: '+(err?.message||'خطای سرور'))}finally{setBusy(false)}}
 return <form className="rhf-w91-review" onSubmit={submit}><h4><CheckCircle2 size={17}/> بررسی مستقل سوابق ثبت‌شده</h4><p>بازبین نمی‌تواند سابقه ایجادشده توسط خودش را بررسی کند.</p>
  <label>سابقه در انتظار بررسی<select required value={id} onChange={e=>setId(e.target.value)}><option value="">انتخاب سابقه</option>{pending.map(r=><option key={r.id} value={r.id}>{r.record_code||r.id} — {r.record_kind}</option>)}</select></label>
  <label>تصمیم<select value={decision} onChange={e=>setDecision(e.target.value)}><option value="VERIFIED">تأیید بررسی داخلی</option><option value="REJECTED">رد سابقه</option></select></label>
  <label>توضیح مستند (حداقل ۲۵ نویسه)<textarea required minLength={25} maxLength={1500} value={note} onChange={e=>setNote(e.target.value)} rows={3}/></label>
  <button type="submit" className="rhf-w9-primary" disabled={busy||!id}>{busy?'در حال ثبت…':'ثبت تصمیم مستقل'}</button>{message&&<p role="status">{message}</p>}
 </form>
}
