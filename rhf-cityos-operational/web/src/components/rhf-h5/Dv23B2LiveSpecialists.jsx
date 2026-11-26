import React,{useEffect,useState} from 'react';
import './dv23b2-live-specialists.css';
const E=encodeURIComponent;
export default function Dv23B2LiveSpecialists({city,actorId,api,surface,expectedTenantId}){
 const key=`${city}:${actorId}:${surface}:${expectedTenantId}`;
 const [state,setState]=useState({key:'',packets:[],enabled:false,canStart:false,error:'',busy:'',results:{}});
 const [epoch,refresh]=useState(0);
 useEffect(()=>{let live=true;setState({key,packets:[],enabled:false,canStart:false,error:'',busy:'',results:{}});
  Promise.all([api(`/cities/${E(city)}/dv23-agent-handoffs?surface=${surface}`),api(`/cities/${E(city)}/dv23-specialist-analysis?surface=${surface}`)])
   .then(([p,c])=>{if(p.schema!=='RHF-DV23B2A-AGENT-HANDOFF-v1'||c.schema!=='RHF-DV23B2B-SPECIALIST-RUNTIME-v1'||[p,c].some(x=>x.cityId!==city||x.tenantId!==expectedTenantId||x.viewerId!==actorId||x.surface!==surface)||!Array.isArray(p.packets)||p.packets.length>20||c.governance?.municipalActionExecuted!==false||c.governance?.valueVerification!=='NOT_ATTESTED')throw Error('DV23B2B_SCOPE_OR_SAFETY_MISMATCH');return {packets:p.packets,enabled:c.enabled===true,canStart:c.canStart===true}})
   .then(x=>{if(live)setState(s=>({...s,...x,key}))}).catch(e=>{if(live)setState(s=>({...s,key,error:String(e.message||e)}))});return()=>{live=false};
 },[key,city,actorId,api,surface,expectedTenantId,epoch]);
 const current=state.key===key?state:null;
 async function start(p){if(!current?.enabled||!current.canStart||current.busy)return;
  if(!window.confirm('چهار تحلیل LangGraph فقط‌خواندنی برای همین پرونده اجرا شوند؟ این اقدام مجوز اجرا، پرداخت یا گواهی خلق ارزش نیست.'))return;
  setState(s=>({...s,busy:p.decisionId,error:''}));
  try{const r=await api(`/cities/${E(city)}/dv23-specialist-analysis?surface=${surface}`,'POST',{decisionId:p.decisionId,handoffFingerprint:p.handoffFingerprint,acknowledgeReadOnly:true});
   if(r.schema!=='RHF-DV23B2B-SPECIALIST-RUNTIME-v1'||r.cityId!==city||r.tenantId!==expectedTenantId||r.decisionId!==p.decisionId||!['QUEUED','ALREADY_REQUESTED'].includes(r.status)||r.governance?.municipalActionExecuted!==false)throw Error('INVALID_WORKFLOW_RECEIPT');
   await status(p);
  }catch(e){setState(s=>({...s,error:String(e.message||e)}))}finally{setState(s=>({...s,busy:''}))}
 }
 async function status(p){setState(s=>({...s,busy:p.decisionId,error:''}));
  try{const r=await api(`/cities/${E(city)}/dv23-specialist-analysis/${E(p.decisionId)}?surface=${surface}`);
   if(r.schema!=='RHF-DV23B2B-SPECIALIST-RUNTIME-v1'||r.cityId!==city||r.tenantId!==expectedTenantId||r.viewerId!==actorId||r.decisionId!==p.decisionId||r.governance?.municipalActionExecuted!==false||r.result?.municipalActionExecuted===true)throw Error('INVALID_ANALYSIS_SCOPE');
   setState(s=>({...s,results:{...s.results,[p.decisionId]:r}}));
  }catch(e){setState(s=>({...s,error:String(e.message||e)}))}finally{setState(s=>({...s,busy:''}))}
 }
 return <section className="rhf-dv23b2b" dir="rtl" data-rhf-dv23b2b="temporal-langgraph-v1"><header><h3>DV2.3B2B · تحلیل چهار ایجنت تخصصی در Worker</h3><button type="button" onClick={()=>refresh(x=>x+1)}>بازخوانی</button></header>
 <p>اجرای LangGraph با Temporal، صرفاً به درخواست انسانی. مدل مولد فراخوانی نمی‌شود؛ خروجی تحلیل، حکم اجرایی یا تأیید ارزش شهری نیست.</p>
 {current?.error&&<p role="alert">{current.error}</p>}
 {!current?.enabled&&<p>اتصال Temporal برای این قابلیت فعال یا قابل تأیید نیست؛ شروع تحلیل مسدود است.</p>}
 {current?.packets.map(p=><article key={p.decisionId}><strong>{p.sector} · {p.decisionId.slice(0,8)}</strong>
  <button type="button" disabled={!current.enabled||!current.canStart||!!current.busy} onClick={()=>start(p)}>شروع تحلیل فقط‌خواندنی</button>
  <button type="button" disabled={!!current.busy} onClick={()=>status(p)}>مشاهده وضعیت</button>
  {current.results[p.decisionId]&&<div><b>وضعیت: {current.results[p.decisionId].status}</b>
   {current.results[p.decisionId].result?.analyses?.map(a=><p key={a.key}>{a.key}: نیازمند بررسی انسانی · {a.checks.join('، ')}</p>)}</div>}
 </article>)}
 {!current?.packets.length&&<p>برای تحلیل، پرونده FEASIBILITY_APPROVED با شواهد معتبر و انتصاب عملیاتی نیاز است.</p>}
 <small>نه مأموریت، نه پرداخت، نه اعزام، نه تغییر عملیات و نه ثبت ارزش تحقق‌یافته انجام نمی‌شود.</small></section>;
}
