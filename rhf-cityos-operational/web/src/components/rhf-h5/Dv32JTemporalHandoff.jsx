import React,{useEffect,useMemo,useState} from 'react';
// DV32J: separate panel in existing RHF app. No operational actions or direct Temporal access.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const panel={border:'1px solid #b6c5d7',borderRadius:12,padding:14,background:'#fff',margin:'16px 0'};
async function request(url,{method='GET',body,signal}={}){
 const r=await fetch(url,{method,credentials:'same-origin',signal,headers:body?{'Content-Type':'application/json','X-RHF-DV32J-Intent':'HUMAN_PLANNING_HANDOFF_ONLY'}:{},body:body?JSON.stringify(body):undefined});
 const x=await r.json().catch(()=>({}));if(!r.ok)throw new Error(x.error||`HTTP ${r.status}`);return x;
}
export default function Dv32JTemporalHandoff({cityId,municipalityId,selectedCityId,activeCityId}){
 const propCity=[cityId,municipalityId,selectedCityId,activeCityId].find(v=>uuid.test(String(v||'')))||'';
 const [city,setCity]=useState(propCity),[desk,setDesk]=useState('deputy'),[org,setOrg]=useState('');
 const [access,setAccess]=useState(null),[cities,setCities]=useState([]),[queue,setQueue]=useState(null);
 const [notes,setNotes]=useState({}),[statuses,setStatuses]=useState({}),[working,setWorking]=useState(false);
 const [message,setMessage]=useState(''),[error,setError]=useState(''),[rev,setRev]=useState(0);
 useEffect(()=>{if(propCity)setCity(propCity);},[propCity]);
 useEffect(()=>{const c=new AbortController();request('/api/v1/municipalities',{signal:c.signal}).then(v=>setCities(Array.isArray(v)?v:[])).catch(()=>{});return()=>c.abort();},[]);
 const base=useMemo(()=>uuid.test(city)?`/api/v1/cities/${encodeURIComponent(city)}`:'',[city]);
 useEffect(()=>{setOrg('');setAccess(null);if(!base)return;const c=new AbortController();request(`${base}/dv32g-org-bindings`,{signal:c.signal}).then(setAccess).catch(()=>{});return()=>c.abort();},[base]);
 const params=useMemo(()=>{const p=new URLSearchParams({desk});if(desk==='waste'&&access?.access==='ADMIN'&&uuid.test(org))p.set('orgId',org);return p.toString();},[desk,access,org]);
 useEffect(()=>{setQueue(null);setError('');if(!base)return;const c=new AbortController();request(`${base}/dv32i-review-queue?${params}`,{signal:c.signal}).then(setQueue).catch(e=>setError(e.message));return()=>c.abort();},[base,params,rev]);
 async function act(reviewId,action){setWorking(true);setMessage('');setError('');try{
  const result=await request(`${base}/dv32j-planning-handoffs/${encodeURIComponent(reviewId)}?${params}`,{method:'POST',body:{action,reason:notes[reviewId]||'',confirm:'TEMPORAL_PLANNING_ONLY_NO_OPERATION'}});
  setMessage(`درخواست ${action==='START'?'ثبت Workflow':'ثبت رسید برنامه‌ریزی'} انجام شد. این اقدام مجوز عملیات نیست.`);
  setStatuses(v=>({...v,[reviewId]:result}));setRev(v=>v+1);
 }catch(e){setError(e.message);}finally{setWorking(false);}}
 async function status(id){setWorking(true);setError('');try{const r=await request(`${base}/dv32j-planning-handoffs/${encodeURIComponent(id)}?${params}`);setStatuses(v=>({...v,[id]:r}));}catch(e){setError(e.message);}finally{setWorking(false);}}
 return <section dir="rtl" aria-label="DV32J اتصال برنامه ریزی به Temporal" style={{...panel,fontFamily:'inherit',color:'#0f172a'}}>
  <h3>DV32J | پیگیری پایدار برنامه‌ریزی با Temporal</h3><p style={{fontSize:13}}>فقط برای پرونده‌های تأییدشده DV32I؛ بدون اعزام، تخصیص منابع، پرداخت یا اعلام ارزش تحقق‌یافته.</p>
  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
   <label>شهرداری <select value={city} onChange={e=>setCity(e.target.value)}><option value="">انتخاب</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label>میزکار <select value={desk} onChange={e=>{setDesk(e.target.value);setOrg('');}}><option value="mayor">شهردار</option><option value="deputy">معاون</option><option value="waste">مدیرعامل پسماند</option></select></label>
   {desk==='waste'&&access?.access==='ADMIN'&&<label>سازمان <select value={org} onChange={e=>setOrg(e.target.value)}><option value="">انتخاب صریح</option>{access.eligibleOrganizations?.map(o=><option key={o.id} value={o.id}>{o.name_fa}</option>)}</select></label>}
   <button type="button" disabled={working} onClick={()=>setRev(v=>v+1)}>بروزرسانی</button>
  </div>
  {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}{message&&<p role="status" style={{color:'#166534'}}>{message}</p>}
  {(queue?.reviews||[]).filter(r=>r.status==='APPROVED_FOR_PLANNING').map(r=><article key={r.id} style={{...panel,background:'#f8fafc'}}>
   <strong>{r.evidence_snapshot?.title||r.candidate_id}</strong><p style={{fontSize:12}}>تصمیم تأییدشده صرفاً برای برنامه‌ریزی — شناسه: {r.id}</p>
   <label style={{display:'block'}}>دلیل ثبت یا تأیید دریافت (حداقل ۱۶ نویسه)<textarea maxLength={1000} style={{display:'block',width:'100%',minHeight:52}} value={notes[r.id]||''} onChange={e=>setNotes(s=>({...s,[r.id]:e.target.value}))}/></label>
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" disabled={working||(notes[r.id]||'').trim().length<16} onClick={()=>act(r.id,'START')}>ثبت Workflow برنامه‌ریزی</button>
    <button type="button" disabled={working||(notes[r.id]||'').trim().length<16} onClick={()=>act(r.id,'ACKNOWLEDGE_PLANNING')}>ثبت دریافت انسانی</button>
    <button type="button" disabled={working} onClick={()=>status(r.id)}>وضعیت Temporal</button></div>
   {statuses[r.id]&&<pre style={{whiteSpace:'pre-wrap',fontSize:12}}>{JSON.stringify(statuses[r.id].status||statuses[r.id],null,2)}</pre>}
  </article>)}
  <p style={{fontSize:12,color:'#475569'}}>Temporal فقط پیگیری اداری برنامه‌ریزی را پایدار می‌کند؛ هر اقدام میدانی همچنان به مجوز مستقل نیاز دارد.</p>
 </section>;
}
