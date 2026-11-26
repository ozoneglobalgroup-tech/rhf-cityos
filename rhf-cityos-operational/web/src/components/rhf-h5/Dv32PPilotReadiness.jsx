import React,{useEffect,useMemo,useRef,useState} from 'react';
// Read-only readiness evidence; one signed-in account != three-user acceptance.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const names={mayor:'شهردار',deputy:'معاون خدمات شهری',waste:'مدیرعامل پسماند'};
const labels={ALLOWED:'مجاز',DENIED:'مجاز نیست',SELECT_ORGANIZATION:'انتخاب سازمان لازم',NOT_CHECKED:'بررسی نشده',
 OBSERVED_FOR_CURRENT_IDENTITY:'زنجیره برای هویت فعلی مشاهده شد',DEPENDENCY_NOT_VERIFIED:'وابستگی تأیید نشد',
 TRUNCATED_REQUIRES_RECONCILIATION:'صف ناقص؛ تطبیق لازم',NOT_PROBED:'بررسی نشده',NEEDS_ORGANIZATION:'انتخاب سازمان لازم'};
async function get(url){const r=await fetch(url,{credentials:'same-origin',cache:'no-store'});const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b.error||`HTTP ${r.status}`);return b;}
const field={padding:'7px 8px',borderBottom:'1px solid #e2e8f0',textAlign:'right',verticalAlign:'top'};
export default function Dv32PPilotReadiness({cityId,municipalityId,selectedCityId,activeCityId}){
 const chosen=[cityId,municipalityId,selectedCityId,activeCityId].find(x=>UUID.test(String(x||'')))||'';
 const [city,setCity]=useState(chosen),[cities,setCities]=useState([]),[org,setOrg]=useState(''),[orgs,setOrgs]=useState([]);
 const [report,setReport]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const seq=useRef(0),orgSeq=useRef(0),base=useMemo(()=>UUID.test(city)?`/api/v1/cities/${encodeURIComponent(city)}`:'',[city]);
 useEffect(()=>{if(chosen)setCity(chosen);},[chosen]);
 useEffect(()=>{get('/api/v1/municipalities').then(x=>setCities(Array.isArray(x)?x:[])).catch(()=>{});},[]);
 useEffect(()=>{const n=++orgSeq.current;seq.current++;setOrg('');setOrgs([]);setReport(null);setError('');
  if(base)get(`${base}/dv32g-org-bindings`).then(x=>{if(n===orgSeq.current&&x.access==='ADMIN')setOrgs(Array.isArray(x.eligibleOrganizations)?x.eligibleOrganizations:[]);}).catch(()=>{});
 },[base]);
 useEffect(()=>{seq.current++;setReport(null);setError('');},[org]);
 async function audit(){if(!base)return;const n=++seq.current;setBusy(true);setReport(null);setError('');
  try{const q=UUID.test(org)?`?orgId=${encodeURIComponent(org)}`:'';const x=await get(`${base}/dv32p-readiness-audit${q}`);
   if(n!==seq.current)return;
   if(x.schema!=='RHF-DV32P-PILOT-READINESS-AUDIT-v1'||x.controls?.readOnly!==true||
      x.acceptance?.finalProductAcceptance!=='NOT_CERTIFIED'||!Array.isArray(x.observed)||x.observed.length!==3||
      x.acceptance?.decision!=='NO_GO_PENDING_EVIDENCE_AND_ROLE_UAT')throw Error('UNTRUSTED_AUDIT_REPORT');
   setReport(x);
  }catch(e){if(n===seq.current)setError(String(e.message));}
  finally{if(n===seq.current)setBusy(false);}
 }
 function download(){if(!report)return;const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='rhf-dv32p-pilot-readiness.json';a.click();URL.revokeObjectURL(url);
 }
 return <section dir="rtl" style={{border:'1px solid #94a3b8',borderRadius:12,padding:16,margin:'16px 0',background:'#fff',color:'#0f172a'}}>
  <h3>DV32P | ممیزی شکاف‌ها و آمادگی پایلوت شیراز</h3>
  <p style={{fontSize:13}}>ممیزی فقط‌خواندنی هویت فعلی و مسیر مجاز H → K → I → L. این گزارش معادل آزمون سه کاربر، آزمون مرورگر یا مجوز بهره‌برداری نیست.</p>
  <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'end'}}>
   <label>شهرداری <select value={city} onChange={e=>setCity(e.target.value)}><option value="">انتخاب کنید</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name||c.name_fa||c.id}</option>)}</select></label>
   {orgs.length>0&&<label>سازمان انتخابی مدیر شهرداری <select value={org} onChange={e=>setOrg(e.target.value)}><option value="">بدون انتخاب</option>{orgs.map(o=><option key={o.id} value={o.id}>{o.name_fa||o.code||o.id}</option>)}</select></label>}
   <button type="button" onClick={audit} disabled={!base||busy}>{busy?'در حال ممیزی…':'اجرای ممیزی فعلی'}</button>
   {report&&<button type="button" onClick={download}>دریافت JSON ممیزی</button>}
  </div>
  {report&&<div style={{marginTop:14}}>
   <p><strong>وضعیت کلی: NO-GO تا تکمیل توسعه و UAT واقعی</strong></p>
   <p style={{fontSize:13}}>نقش حساب جاری: {report.inspectedIdentityRole} | زمان UTC: {report.observedAt}</p>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>
    {['میزکار','مشاهده شواهد','صف بررسی','زنجیره حکمرانی','پیشنهادهای قابل تحویل دستی'].map(x=><th key={x} style={field}>{x}</th>)}
   </tr></thead><tbody>{report.observed.map(r=><tr key={r.desk}>
    <td style={field}>{names[r.desk]||r.desk}</td><td style={field}>{labels[r.discovery]||r.discovery}</td>
    <td style={field}>{labels[r.reviewQueue]||r.reviewQueue}</td><td style={field}>{labels[r.chainStatus]||r.chainStatus}</td>
    <td style={field}>{r.manuallyEligibleSuggestions||0} — بدون اجرای خودکار</td>
   </tr>)}</tbody></table></div>
   <h4>شکاف‌های احرازنشده</h4><ul style={{fontSize:13}}>{report.gaps.map(g=><li key={g.id}><b>{g.priority} | {g.id}</b>: {g.description} — {g.nextStep}</li>)}</ul>
   <p style={{fontSize:12}}>آزمون سه هویت مستقل: انجام نشده | آزمون E2E: انجام نشده | تأیید پوشش کامل سازمان‌ها: انجام نشده | پذیرش نهایی: انجام نشده</p>
  </div>}
  {error&&<p role="alert">{error}</p>}
  <small>گزارش میزکار حاوی اطلاعات خصوصی شهروندان، دلایل محرمانه و جزئیات هویت سایر کاربران نیست. وضعیت بدون نتیجه معتبر هرگز PASS نمی‌شود.</small>
 </section>;
}
