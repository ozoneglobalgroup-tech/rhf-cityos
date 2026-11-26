import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,BookOpen,HelpCircle,Info,Keyboard,Search,ShieldCheck,X} from 'lucide-react';
import {guideForControl,guideTopic,helpKeyFromText,HELP56_CATALOG,HELP56_MENU_IDS,HELP56_VERSION,helpSearch} from './deputy-help-v8p56-core.mjs';
import './deputy-help-v8p56.css';
const CONTROL_SELECTOR='button,a[href],input:not([type="hidden"]),select,textarea,summary';
function controlName(el){
 if(el.dataset?.rhfGuideSkip==='true')return '';
 const fallback=({INPUT:'فیلد ورودی',SELECT:'انتخاب گزینه',TEXTAREA:'متن درخواست',SUMMARY:'نمایش جزئیات',BUTTON:'ابزار این صفحه',A:'پیوند راهنما'})[el.tagName]||'ابزار این صفحه';
 const text=el.getAttribute('aria-label')||el.querySelector(':scope > strong')?.textContent||el.textContent||el.getAttribute('placeholder')||el.getAttribute('title')||el.closest('label')?.textContent||fallback;
 return String(text).replace(/\s+/g,' ').trim().slice(0,100);
}
// Screen-local metadata only. This never submits, mutates, or queries user records.
export function applyGuideHints(root){
 if(!root)return 0;
 let count=0;
 for(const el of root.querySelectorAll(CONTROL_SELECTOR)){
  if(el.closest('[data-rhf-guide-panel="true"]'))continue;
  const name=controlName(el);
  if(!name)continue;
  const help=guideForControl({key:el.getAttribute('data-rhf-help-key'),text:name,kind:el.tagName.toLowerCase()});
  if(!el.hasAttribute('data-rhf-help-key'))el.setAttribute('data-rhf-guide-topic',help.key);
  if(!el.hasAttribute('title')||el.getAttribute('data-rhf-guide-title')==='auto'){
   const next=`${name} — ${help.summary}`;
   if(el.getAttribute('title')!==next)el.setAttribute('title',next);
   el.setAttribute('data-rhf-guide-title','auto');
  }
  count++;
 }
 return count;
}
export default function DeputyContextGuideV8P56({openTopic=null,onClose=()=>{},onTopic=()=>{},activeTab='dashboard',rootRef}){
 const [query,setQuery]=useState(''),[focusedKey,setFocusedKey]=useState(null);
 const dialogRef=useRef(null),closeRef=useRef(null),previousFocus=useRef(null);
 const active=guideTopic(openTopic)||guideTopic(activeTab)||guideTopic('dashboard');
 const matches=useMemo(()=>helpSearch(query),[query]);
 useEffect(()=>{
  const root=rootRef?.current;if(!root)return;
  const update=()=>applyGuideHints(root);
  update();const observer=new MutationObserver(update);observer.observe(root,{childList:true,subtree:true});
  const shortcut=e=>{
   if(e.key!=='F1')return;
   const t=e.target?.closest?.(CONTROL_SELECTOR);
   if(!t||!root.contains(t)||t.closest('[data-rhf-guide-panel="true"]'))return;
   e.preventDefault();e.stopPropagation();
   const key=t.getAttribute('data-rhf-help-key')||t.getAttribute('data-rhf-guide-topic')||helpKeyFromText(controlName(t));
   setFocusedKey(key);onTopic(key);
  };
  root.addEventListener('keydown',shortcut,true);
  return()=>{observer.disconnect();root.removeEventListener('keydown',shortcut,true)};
 },[rootRef,onTopic]);
 useEffect(()=>{
  if(!openTopic)return;
  previousFocus.current=document.activeElement;
  setQuery('');closeRef.current?.focus();
  const trap=e=>{
   if(e.key==='Escape'){e.preventDefault();onClose();return}
   if(e.key!=='Tab')return;
   const nodes=Array.from(dialogRef.current?.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')||[]);
   if(!nodes.length)return;
   const first=nodes[0],last=nodes[nodes.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
   if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  };
  document.addEventListener('keydown',trap,true);
  return()=>{document.removeEventListener('keydown',trap,true);previousFocus.current?.focus?.()};
 },[openTopic,onClose]);
 if(!openTopic)return null;
 return <div className="ux56-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}} data-rhf-guide-panel="true">
  <aside ref={dialogRef} className="ux56-guide" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="ux56-heading" data-rhf-help-hub={HELP56_VERSION}>
   <header className="ux56-guide-head"><div className="ux56-guide-icon"><BookOpen size={22}/></div><div><small>RHF CITY OS · HELP CENTER</small><h2 id="ux56-heading">راهنمای منوها و ابزارها</h2></div><button ref={closeRef} type="button" className="ux56-icon-button" aria-label="بستن راهنما" data-rhf-guide-skip="true" onClick={onClose}><X size={20}/></button></header>
   <div className="ux56-search"><Search size={17}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} aria-label="جست‌وجو در راهنمای برنامه" placeholder="جست‌وجو در منوها، عملکرد، ایجنت‌ها و ابزارها"/></div>
   <div className="ux56-selected" aria-live="polite"><div className="ux56-guide-tag"><Info size={14}/> راهنمای زمینه‌ای {focusedKey&&focusedKey===active.id?'· انتخاب‌شده با F1':''}</div><h3>{active.title}</h3><p>{active.summary}</p><ol>{active.steps.map((step,i)=><li key={i}>{step}</li>)}</ol><div className="ux56-guard"><ShieldCheck size={17}/><span>{active.caveat}</span></div></div>
   <div className="ux56-guide-list-head"><strong>راهنمای همه بخش‌ها</strong><span>{matches.length} موضوع</span></div>
   <nav className="ux56-guide-list" aria-label="فهرست راهنماها">{matches.length?matches.map(topic=><button type="button" key={topic.id} aria-current={topic.id===active.id?'true':undefined} onClick={()=>{setFocusedKey(null);onTopic(topic.id)}}><span>{topic.title}</span><ArrowLeft size={14}/></button>):<p role="status">برای این عبارت موضوعی پیدا نشد؛ یک عبارت کوتاه‌تر جست‌وجو کنید.</p>}</nav>
   <footer className="ux56-guide-footer"><Keyboard size={16}/> روی هر منو یا ابزار فوکوس کنید و <kbd>F1</kbd> بزنید. این راهنما فقط توضیح می‌دهد و هیچ داده‌ای ثبت نمی‌کند.</footer>
  </aside>
 </div>;
}
