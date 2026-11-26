/** Pure, side-effect-free selectors. Never creates sample operational records. */
const FINISHED=new Set(['CLOSED','REJECTED']);
export function classifyCases(cases,now=Date.now()){
 const records=Array.isArray(cases)?cases:[];
 return {
  overdue:records.filter(c=>!FINISHED.has(c.status)&&c.due_at&&Number.isFinite(Date.parse(c.due_at))&&Date.parse(c.due_at)<now),
  waiting:records.filter(c=>c.status==='AWAITING_ACCEPTANCE'),
  urgent:records.filter(c=>!FINISHED.has(c.status)&&['HIGH','CRITICAL'].includes(c.priority)),
 };
}
export function serviceCoverage(modules,services,limit=8){
 if(!Array.isArray(modules))return [];
 const counts=new Map();for(const service of Array.isArray(services)?services:[]){const code=service?.module_code;if(code)counts.set(code,(counts.get(code)||0)+1)}
 return modules.map(m=>({...m,total:counts.get(m.code)||0})).sort((a,b)=>b.total-a.total).slice(0,Math.max(0,limit));
}
export function filterCommands(commands,query,limit=24){
 const q=String(query||'').trim().toLocaleLowerCase();
 return commands.filter(x=>!q||(String(x.title)+' '+String(x.desc)).toLocaleLowerCase().includes(q)).slice(0,Math.max(0,limit));
}
