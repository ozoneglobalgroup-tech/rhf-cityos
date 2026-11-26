import React,{useEffect,useMemo,useState} from 'react';
// DV32I: separate non-executing review ledger, requiring explicit human actions.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const panel={border:'1px solid #b6c5d7',borderRadius:12,padding:14,background:'#fff',margin:'16px 0'};
async function request(url,{method='GET',body,signal}={}){
 const r=await fetch(url,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json','X-RHF-DV32I-Review-Intent':'HUMAN_REVIEW_NON_EXECUTING'}:{},body:body?JSON.stringify(body):undefined,signal});
 const x=await r.json().catch(()=>({}));if(!r.ok)throw new Error(x.error||`HTTP ${r.status}`);return x;
}
export default function Dv32IHumanReview({cityId,municipalityId,selectedCityId,activeCityId}){
 const propCity=[cityId,municipalityId,selectedCityId,activeCityId].find(x=>uuid.test(String(x||'')))||'';
 const [city,setCity]=useState(propCity),[cities,setCities]=useState([]),[desk,setDesk]=useState('deputy');
 const [access,setAccess]=useState(null),[org,setOrg]=useState(''),[report,setReport]=useState(null),[queue,setQueue]=useState(null);
 const [notes,setNotes]=useState({}),[decisionNotes,setDecisionNotes]=useState({}),[decisionTypes,setDecisionTypes]=useState({});
 const [working,setWorking]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{if(propCity)setCity(propCity);},[propCity]);
 useEffect(()=>{const c=new AbortController();request('/api/v1/municipalities',{signal:c.signal}).then(x=>setCities(Array.isArray(x)?x:[])).catch(()=>{});return()=>c.abort();},[]);
 const base=useMemo(()=>uuid.test(city)?`/api/v1/cities/${encodeURIComponent(city)}`:'',[city]);
 useEffect(()=>{setOrg('');setAccess(null);if(!base)return;const c=new AbortController();request(base+'/dv32g-org-bindings',{signal:c.signal}).then(x=>setAccess(x)).catch(()=>{});return()=>c.abort();},[base]);
 const params=useMemo(()=>{const p=new URLSearchParams({desk});if(desk==='waste'&&access?.access==='ADMIN'&&uuid.test(org))p.set('orgId',org);return p.toString();},[desk,access,org]);
 useEffect(()=>{setError('');setMessage('');setReport(null);setQueue(null);if(!base)return;const c=new AbortController();
  Promise.allSettled([request(`${base}/dv32h-agent-briefing?${params}`,{signal:c.signal}),request(`${base}/dv32i-review-queue?${params}`,{signal:c.signal})])
   .then(results=>{if(c.signal.aborted)return;if(results[0].status==='fulfilled')setReport(results[0].value);
     else setError(`شواهد: ${results[0].reason.message}`);
     if(results[1].status==='fulfilled')setQueue(results[1].value);else setError(e=>`${e} دفتر بررسی: ${results[1].reason.message}`);});
  return()=>c.abort();},[base,params,revision]);
 async function submit(candidateId){if(!base)return;setWorking(true);setError('');setMessage('');try{
  await request(`${base}/dv32i-review-queue?${params}`,{method:'POST',body:{candidateId,rationale:notes[candidateId]||'',confirm:'REQUEST_HUMAN_EVIDENCE_REVIEW'}});
  setMessage('درخواست بررسی شواهد ثبت شد؛ هیچ عملیات میدانی مجاز نشده است.');setRevision(x=>x+1);
 }catch(e){setError(e.message);}finally{setWorking(false);}}
 async function decide(id){if(!base)return;setWorking(true);setError('');setMessage('');try{
  await request(`${base}/dv32i-review-queue/${encodeURIComponent(id)}?${params}`,{method:'POST',body:{decision:decisionTypes[id]||'NEEDS_MORE_EVIDENCE',reason:decisionNotes[id]||'',confirm:'HUMAN_REVIEW_NOT_OPERATIONAL_APPROVAL'}});
  setMessage('تصمیم انسانی ثبت شد؛ تأیید برای برنامه‌ریزی مجوز اعزام یا پرداخت نیست.');setRevision(x=>x+1);
 }catch(e){setError(e.message);}finally{setWorking(false);}}
 return <section dir="rtl" aria-label="DV32I دفتر بررسی انسانی شواهد" style={{...panel,fontFamily:'inherit',color:'#0f172a'}}>
  <h3>DV32I | دفتر پایدار بررسی انسانی فرصت‌های شهری</h3>
  <p style={{fontSize:13,color:'#475569'}}>ثبت درخواست، بازبینی مستقل و تصمیم مستند. بدون اجرای ایجنت، تخصیص، پرداخت یا ارزش‌گذاری تأییدشده.</p>
  <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
   <label>شهرداری <select value={city} onChange={e=>setCity(e.target.value)}><option value="">انتخاب شهرداری</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}{city&&!cities.some(c=>c.id===city)&&<option value={city}>شهرداری انتخابی</option>}</select></label>
   <label>میزکار <select value={desk} onChange={e=>{setDesk(e.target.value);setOrg('');}}><option value="mayor">شهردار</option><option value="deputy">معاون خدمات شهری</option><option value="waste">مدیرعامل پسماند</option></select></label>
   {desk==='waste'&&access?.access==='ADMIN'&&<label>سازمان <select value={org} onChange={e=>setOrg(e.target.value)}><option value="">انتخاب صریح</option>{access.eligibleOrganizations?.map(o=><option key={o.id} value={o.id}>{o.name_fa}</option>)}</select></label>}
   <button type="button" onClick={()=>setRevision(x=>x+1)} disabled={working||!base}>بارگذاری مجدد</button>
  </div>
  {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}{message&&<p role="status" style={{color:'#166534'}}>{message}</p>}
  {(report?.needsOrganizationSelection||queue?.needsOrganizationSelection)&&<p>برای پسماند ابتدا سازمان را به‌صورت صریح انتخاب کنید. مدیرعامل فقط محدوده انتساب معتبر را می‌بیند.</p>}
  <h4>ثبت پیشنهاد برای بررسی</h4>
  {(report?.candidates||[]).map(c=><article key={c.id} style={{...panel,background:'#f8fafc'}}>
   <strong>{c.title}</strong> — <small>{c.priority}</small><p>{c.description}</p>
   <label style={{display:'block'}}>دلیل درخواست (حداقل ۱۶ نویسه)
    <textarea style={{display:'block',width:'100%',minHeight:54}} value={notes[c.id]||''} onChange={e=>setNotes(v=>({...v,[c.id]:e.target.value}))} maxLength={1000} /></label>
   <button type="button" disabled={working||!base||(notes[c.id]||'').trim().length<16} onClick={()=>submit(c.id)}>ثبت درخواست بررسی انسانی</button>
  </article>)}
  <h4>درخواست‌های ثبت‌شده</h4>
  {(queue?.reviews||[]).map(r=><article key={r.id} style={{...panel,background:'#f8fafc'}}>
   <strong>{r.evidence_snapshot?.title||r.candidate_id}</strong> — <code>{r.status}</code>
   <p style={{fontSize:12}}>درخواست‌دهنده: {r.submitted_by} | ثبت: {r.submitted_at} | هش شواهد: {r.evidence_sha256?.slice(0,16)}…</p>
   {queue?.permission?.canDecide&&r.status==='SUBMITTED'&&<div>
    <label>تصمیم <select value={decisionTypes[r.id]||'NEEDS_MORE_EVIDENCE'} onChange={e=>setDecisionTypes(v=>({...v,[r.id]:e.target.value}))}>
     <option value="NEEDS_MORE_EVIDENCE">نیاز به مدارک بیشتر</option><option value="APPROVED_FOR_PLANNING">تأیید صرفاً برای برنامه‌ریزی</option><option value="REJECTED">رد درخواست</option>
    </select></label>
    <label style={{display:'block'}}>دلیل تصمیم (حداقل ۱۶ نویسه)<textarea style={{display:'block',width:'100%',minHeight:54}} maxLength={1000} value={decisionNotes[r.id]||''} onChange={e=>setDecisionNotes(v=>({...v,[r.id]:e.target.value}))}/></label>
    <button type="button" disabled={working||(decisionNotes[r.id]||'').trim().length<16} onClick={()=>decide(r.id)}>ثبت تصمیم با مسئولیت انسانی</button>
   </div>}
  </article>)}
  <p style={{fontSize:12,color:'#475569'}}>تمام درخواست‌ها محدود به شهرداری و سازمان مجاز و مشمول RLS هستند. تصمیم برای برنامه‌ریزی، مجوز شروع عملیات یا اعلام ارزش تحقق‌یافته نیست.</p>
 </section>;
}
