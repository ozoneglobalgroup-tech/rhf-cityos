/** Aggregate already city-scoped read model by a selected organizational subtree.
 * No cross-municipality data is ever combined by the frontend.
 */
export const METRICS = ['total','open','closed','awaiting','overdue','urgent','without_service','unassigned','closed_on_time','closed_with_sla','active','done','failed','authorized','verified'];
export function treeIds(units=[],rootId='') {
  if(!rootId)return null;
  const children=new Map();
  for(const u of units){const parent=u.parent_id||null; if(!children.has(parent))children.set(parent,[]);children.get(parent).push(u.id);}
  const ids=new Set(), stack=[rootId];
  while(stack.length){const id=stack.pop();if(ids.has(id))continue;ids.add(id);for(const child of children.get(id)||[])stack.push(child);}
  return ids;
}
export function summarizeCockpit(raw={},units=[],unitId=''){
 const subtree=treeIds(units,unitId);
 const included=id=>!subtree||subtree.has(id);
 const total=(key,name)=> (raw[key]||[]).reduce((acc,r)=>{
   if(included(r.unit_id))for(const k of METRICS){const v=Number(r[k]);if(Number.isFinite(v)&&v>0)acc[k]=(acc[k]||0)+v;}
   return acc;
 },{});
 const values=Object.fromEntries((raw.values||[]).map(r=>[r.status,Number(r.total)||0]));
 const attention=(raw.attention||[]).filter(r=>included(r.operational_unit_id));
 const c=total('cases'),m=total('missions'),s=total('services'),i=total('inspections'),cap=total('capacity'),o=total('outcomes');
 return {cases:c,missions:m,services:s,inspections:i,capacity:cap,outcomes:o,
   values:unitId?null:values, attention,
   rate:c.closed_with_sla?Math.round(100*(c.closed_on_time||0)/c.closed_with_sla):null,
   matchedUnitIds:subtree};
}
export function unitRollup(raw={},units=[],id=''){
 const list=units.filter(x=>x.id===id||x.parent_id===id);
 return list.map(x=>({unit:x,summary:summarizeCockpit(raw,units,x.id)}));
}
export function caseDrillScope(unitId='',type='all') {
 return {kind:'cockpit',value:{unitId,type},label:`پرونده‌های ${type==='overdue'?'معوق':type==='urgent'?'اولویت بالا':type==='awaiting'?'منتظر پذیرش':'مرتبط با واحد انتخاب‌شده'}`};
}
export function matchesCockpitCase(c,scope,units=[],services=[]){
 if(!scope||scope.kind!=='cockpit')return true;
 const {unitId='',type='all'}=scope.value||{};
 if(unitId){const subtree=treeIds(units,unitId),serviceOwners=new Map(services.map(s=>[s.id,s.owner_unit_id]));
  if(!subtree.has(c.unit_id)&&!subtree.has(serviceOwners.get(c.service_id)))return false;
 }
 if(type==='overdue')return !!c.due_at&&Date.parse(c.due_at)<Date.now()&&!['CLOSED','REJECTED'].includes(c.status);
 if(type==='urgent')return !['CLOSED','REJECTED'].includes(c.status)&&['HIGH','CRITICAL'].includes(c.priority);
 if(type==='awaiting')return c.status==='AWAITING_ACCEPTANCE';
 return true;
}
