// V8 Phase 1: only records explicitly returned by existing scoped RUVOS services.
// Charts count synthetic *software records*, not municipal service deliveries or actual public value.
import {ORGANIZATIONS,NON_WASTE,validateResponse} from './deputy-multi-core.mjs';
export const COMMAND_VERSION='RHF-DEPUTY-COMMAND-V8-P1';
const safeCount=n=>Number.isSafeInteger(n)&&n>=0?n:null;
const WASTE_DOMAINS=['COLLECTION','FLEET','MAINTENANCE','CONTRACTOR','CONTRACT_EVAL','SHIFT','QUALITY','FACILITY','EDUCATION'];
const validWaste=w=>w?.persisted===true&&['ADMIN_SYNTHETIC_PREVIEW','APPOINTMENT_SCOPED_SYNTHETIC'].includes(w.source)&&safeCount(w.records)!==null&&safeCount(w.flows)!==null&&safeCount(w.pending)!==null&&w.verifiedValue===false&&WASTE_DOMAINS.every(k=>safeCount(w.domains?.[k])!==null)&&WASTE_DOMAINS.reduce((n,k)=>n+w.domains[k],0)===w.records;
const validDate=x=>{if(typeof x!=='string'||x.length<10)return null;const t=Date.parse(x);return Number.isFinite(t)?t:null};
export function commandProjection(raw,waste,days=7,now=Date.now()){
 if(![7,30].includes(days))throw Error('TIME_WINDOW_NOT_ALLOWED');
 if(!Number.isFinite(now))throw Error('INVALID_CLOCK');
 if(!raw||!validateResponse(raw)||typeof raw.cityId!=='string'||!raw.cityId)return {mode:'UNAVAILABLE',days,groups:[],daily:[],queue:[],funnel:null,wasteMode:'UNKNOWN'};
 if(raw.partial!==false)return {mode:'PARTIAL',days,groups:[],daily:[],queue:[],funnel:null,wasteMode:'UNKNOWN'};
 const rows=raw.rows;
 const boardWaste=validWaste(waste)?waste:null;
 const group=NON_WASTE.map(o=>{const own=rows.filter(r=>r.orgKey===o.id);return {id:o.id,name:o.name,source:'DEPUTY_SYNTHETIC',records:own.filter(r=>r.kind==='RECORD').length,flows:own.filter(r=>r.kind==='FLOW').length,values:own.filter(r=>r.kind==='VALUE').length,pending:own.filter(r=>r.status==='SUBMITTED').length,total:own.length}});
 const groupWaste={id:'WASTE',name:ORGANIZATIONS.find(o=>o.id==='WASTE').name,source:boardWaste?.source||'UNAVAILABLE',records:boardWaste?.records??null,flows:boardWaste?.flows??null,values:null,pending:boardWaste?.pending??null,total:null};
 const groups=[groupWaste,...group];
 const range=Array.from({length:days},(_,i)=>{const d=new Date(now);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-(days-i-1));return {key:d.toISOString().slice(0,10),label:d.toISOString().slice(5,10),count:0}});
 let undated=0;
 for(const r of rows){const time=validDate(r.createdAt);if(time===null){undated++;continue}const d=new Date(time).toISOString().slice(0,10);const target=range.find(x=>x.key===d);if(target)target.count++}
 const queue=rows.filter(r=>r.status==='SUBMITTED').sort((a,b)=>(validDate(b.createdAt)||0)-(validDate(a.createdAt)||0)).slice(0,8).map(r=>({id:r.id,orgKey:r.orgKey,title:r.title,kind:r.kind,createdAt:r.createdAt,source:'DEPUTY_SYNTHETIC'}));
 const opportunities=rows.filter(r=>r.kind==='VALUE');
 const funnel={all:opportunities.length,submitted:opportunities.filter(r=>r.status==='SUBMITTED').length,reviewed:opportunities.filter(r=>r.status==='REVIEWED').length,rejected:opportunities.filter(r=>r.status==='REJECTED').length,independentlyVerified:false};
 return {mode:'PERSISTED_SYNTHETIC',days,groups,daily:range,queue,funnel,wasteMode:boardWaste?'SCOPED_SYNTHETIC':'UNKNOWN',undated,recordCount:rows.filter(r=>r.kind==='RECORD').length,pending:rows.filter(r=>r.status==='SUBMITTED').length,flowCount:rows.filter(r=>r.kind==='FLOW').length,valueCount:opportunities.length,withData:groups.filter(x=>x.records!==null&&x.records>0).length,scope:'DEPUTY_SYNTHETIC_V710',verifiedPublicValue:false};
}
