import {fixture} from './demo-fixture.js';

// Create only an explicitly named demonstration municipality, never the real city.
// Idempotent and resumable: a failed run may be retried without duplicating records.
const TAG=fixture.tag;
const DEMO=fixture.city;
const ep=(id,part,resource)=>`/cities/${id}/${part}`+(resource?`/${resource}`:'');
const inCity=(rows,field,value)=>rows.find(x=>x[field]===value);
const assert=(condition,message)=>{if(!condition)throw Error(message);};

export async function seedDemoCity(api,onProgress=()=>{}){
  const cities=await api('/municipalities');
  const found=cities.filter(c=>c.name===DEMO);
  assert(found.length<=1,'چند شهرداری دمو با نام یکسان پیدا شد؛ بررسی دستی لازم است');
  let demo=found[0];
  if(!demo){onProgress('ایجاد شهرداری دمو');demo=await api('/municipalities','POST',{name:DEMO});}
  const city=demo.id;
  onProgress('بررسی واحدهای سازمانی');
  const existingUnits=await api(ep(city,'org-units'));
  const unitByCode=Object.fromEntries(existingUnits.map(x=>[x.code,x]));
  for(const [code,name,kind,parent] of fixture.org){
    let row=unitByCode[code];
    if(row){assert(row.name_fa===`${TAG} ${name}`&&row.kind===kind,`مغایرت کد واحد آزمایشی ${code}`);}
    else {row=await api(ep(city,'org-units'),'POST',{code,name:`${TAG} ${name}`,kind,parentId:parent?unitByCode[parent]?.id:null});}
    unitByCode[code]=row;
  }
  onProgress('تعریف شناسنامه خدمات و SLA');
  const services=await api(ep(city,'services'));
  const serviceByCode=Object.fromEntries(services.map(x=>[x.code,x]));
  for(const [code,module,title,owner,sla,metric] of fixture.services){
    let row=serviceByCode[code];
    if(row){assert(row.name_fa===`${TAG} ${title}`&&row.module_code===module,`مغایرت کد خدمت آزمایشی ${code}`);}
    else row=await api(ep(city,'services'),'POST',{code,moduleCode:module,name:`${TAG} ${title}`,ownerUnitId:unitByCode[owner].id,slaHours:sla,outcomeMetric:`${TAG} ${metric}`,description:'داده ساختگی آموزشی؛ فاقد ارزش عملیاتی یا حقوقی'});
    serviceByCode[code]=row;
  }
  const initialCases=await api(ep(city,'cases'));
  const caseByTitle=Object.fromEntries(initialCases.map(x=>[x.summary,x]));
  let missionRows=await api(ep(city,'missions'));
  let inspectionRows=await api(ep(city,'inspections'));
  async function missionFor(caseRow,code,desired){
    if(!desired)return;
    const title=`${TAG} مأموریت آزمایشی DEMO-${code} — ${caseRow.summary}`;
    let m=missionRows.find(x=>x.case_id===caseRow.id && x.title===title);
    if(!m){m=await api(ep(city,'missions'),'POST',{caseId:caseRow.id,title,assignee:'اکیپ آزمایشی'});missionRows.push(m);}
    if(desired!=='PLANNED'&&m.status==='PLANNED')m=await api(ep(city,'missions',m.id),'PATCH',{status:'ACTIVE'});
    if(desired==='DONE'&&m.status==='ACTIVE')m=await api(ep(city,'missions',m.id),'PATCH',{status:'DONE',evidence:`${TAG} گزارش اجرای ساختگی DEMO-${code}`});
    missionRows=missionRows.map(x=>x.id===m.id?m:x);
  }
  async function inspect(caseRow,code,result){
    if(inspectionRows.some(x=>x.case_id===caseRow.id && x.result===result && String(x.evidence||'').includes(`DEMO-${code}`)))return;
    const inspection=await api(ep(city,'inspections'),'POST',{caseId:caseRow.id,result,evidence:`${TAG} سند ساختگی بازرسی DEMO-${code}; فاقد ارزش واقعی`,notes:'صرفاً آزمون آموزشی محیط DEMO'});
    inspectionRows.push(inspection);
  }
  const order=['RECEIVED','TRIAGED','ASSIGNED','IN_PROGRESS','AWAITING_ACCEPTANCE','CLOSED'];
  onProgress('ثبت پرونده‌ها، مأموریت‌ها و بازرسی‌های ساختگی');
  for(const [code,serviceCode,title,priority,desired,mission,inspection] of fixture.cases){
    const summary=`${TAG} DEMO-${code} — ${title}`;
    let row=caseByTitle[summary];
    if(row)assert(row.service_id===serviceByCode[serviceCode].id,'مغایرت پرونده دمو با خدمت '+summary);
    if(!row){row=await api(ep(city,'cases'),'POST',{summary,moduleCode:serviceByCode[serviceCode].module_code,serviceId:serviceByCode[serviceCode].id,priority,description:`${TAG} پرونده ساختگی؛ شهروند و عملیات واقعی وجود ندارد`});caseByTitle[summary]=row;}
    if(desired==='REJECTED'){
      if(row.status==='RECEIVED')row=await api(ep(city,'cases',row.id),'PATCH',{status:'REJECTED'});
      continue;
    }
    const target=order.indexOf(desired);
    assert(target>=0,'وضعیت نامعتبر در داده دمو');
    let at=order.indexOf(row.status);
    if(at<0 || at>target)continue;
    if(at===target){await missionFor(row,code,mission);if(inspection&&row.status==='AWAITING_ACCEPTANCE')await inspect(row,code,inspection);continue;}
    for(let i=at+1;i<=target;i++){
      const next=order[i];
      if(next==='AWAITING_ACCEPTANCE')await missionFor(row,code,mission);
      if(next==='CLOSED')await inspect(row,code,'PASS');
      const payload={status:next};
      if(next==='AWAITING_ACCEPTANCE')payload.evidence=`${TAG} شواهد اجرای ساختگی DEMO-${code}`;
      if(next==='CLOSED')payload.acceptanceNote=`${TAG} پذیرش نمایشی DEMO-${code}`;
      row=await api(ep(city,'cases',row.id),'PATCH',payload);
    }
    if(mission && !['AWAITING_ACCEPTANCE','CLOSED'].includes(desired))await missionFor(row,code,mission);
    if(inspection&&desired==='AWAITING_ACCEPTANCE')await inspect(row,code,inspection);
  }
  onProgress('ایجاد طرح‌های ارزش بدون منفعت تأییدشده');
  const values=await api(ep(city,'values'));
  const byKey=Object.fromEntries(values.map(v=>[v.benefit_key,v]));
  for(const [key,module,title,metric,unit,baseline,target,actual,direction] of fixture.values){
    const benefitKey=`DEMO_${key}`;
    let v=byKey[benefitKey];
    if(v)assert(v.title.startsWith(TAG),'تعارض شناسه طرح ارزش آزمایشی: '+benefitKey);
    else v=await api(ep(city,'values'),'POST',{title:`${TAG} ${title}`,moduleCode:module,metric:`${TAG} ${metric}`,unit,baseline,target,direction,benefitKey,baselineCostMinor:0,actualCostMinor:0,implementationCostMinor:0,attributionBps:0});
    if(actual!==null&&v.status==='DRAFT')await api(ep(city,'values',v.id),'PATCH',{status:'MEASURED',actual,evidence:`${TAG} شبیه‌سازی DEMO_${key}; تأییدنشده و غیرقابل استناد`});
  }
  onProgress('پایان ورود داده و آماده‌سازی داشبورد');
  return demo;
}
