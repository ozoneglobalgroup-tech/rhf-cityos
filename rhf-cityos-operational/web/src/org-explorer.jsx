import React,{useMemo,useState,useEffect} from 'react';
import {ChevronDown,ChevronLeft,Building2,ClipboardList,Layers3,Network,ArrowLeft} from 'lucide-react';
import {organizationSnapshot} from './org-explorer-core.mjs';
import './org-explorer.css';

export default function OrganizationExplorer({cityId,units=[],services=[],cases=[],onDetail,onNavigate}){
  const nodes=useMemo(()=>organizationSnapshot(units,services,cases),[units,services,cases]);
  const [collapsed,setCollapsed]=useState(()=>new Set());
  useEffect(()=>setCollapsed(new Set()),[cityId]);
  const hidden = new Set();
  const byId=new Map(nodes.map(x=>[x.id,x]));
  const shown=nodes.filter(x=>{
    let p=x.parent_id, seen=new Set();
    while(p && byId.has(p) && !seen.has(p)){
      if(collapsed.has(p))return false;
      seen.add(p); p=byId.get(p).parent_id;
    }
    return true;
  });
  return <section className="org-explorer" aria-label="مرور ساختار سازمانی">
    <header className="org-explorer-header"><div><Network size={20}/><b>نقشه سلسله‌مراتب سازمانی</b><small>هر تعداد و پیوند فقط به اطلاعات شهرداری انتخاب‌شده متکی است</small></div><span>{nodes.length} واحد</span></header>
    {nodes.length===0?<p className="org-empty">هنوز واحد سازمانی ثبت نشده است.</p>:<div className="org-tree" role="tree">
      {shown.map(row=><div role="treeitem" aria-level={row.depth+1} key={row.id} className="org-node" style={{paddingInlineStart:`${Math.min(row.depth,10)*19+12}px`}}>
        <button type="button" className="org-expand" disabled={!row.childrenCount} aria-label={collapsed.has(row.id)?'باز کردن زیرمجموعه':'بستن زیرمجموعه'} aria-expanded={!!row.childrenCount&&!collapsed.has(row.id)} onClick={()=>setCollapsed(s=>{const n=new Set(s);n.has(row.id)?n.delete(row.id):n.add(row.id);return n})}>
          {row.childrenCount?(collapsed.has(row.id)?<ChevronLeft size={16}/>:<ChevronDown size={16}/>):<Building2 size={14}/>}</button>
        <button className="org-node-name" type="button" onClick={()=>onDetail(row)} title="نمایش مشخصات واحد"><b>{row.name_fa}</b><small>{row.code} · {row.kind}</small></button>
        <button className="org-stat" type="button" onClick={()=>onNavigate('services',{kind:'ownerTree',value:row.id,label:`خدمات واحد ${row.name_fa} و زیرمجموعه‌ها`})}><Layers3 size={14}/>{row.servicesCount} خدمت <ArrowLeft size={13}/></button>
        <button className="org-stat" type="button" onClick={()=>onNavigate('cases',{kind:'caseTree',value:row.id,label:`پرونده‌های واحد ${row.name_fa} و زیرمجموعه‌ها`})}><ClipboardList size={14}/>{row.casesCount} پرونده <ArrowLeft size={13}/></button>
      </div>)}
    </div>}
  </section>;
}
