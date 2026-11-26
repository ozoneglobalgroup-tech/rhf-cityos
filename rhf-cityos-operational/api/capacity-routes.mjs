import {ClientError} from './domain.mjs';
import {validateCapacity,assertAllocation,validateOutcome,reviewOutcome,positiveNumber,textRequired,effectiveCapacity} from './capacity-core.mjs';
const isUUID=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
function validId(v,name='شناسه'){if(!isUUID(v))throw new ClientError(`${name} نامعتبر است`,400);return v;}
const manager=role=>['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR'].includes(role);
export const FUTURE_PARTS=['capacities','allocations','outcomes','value-dashboard'];
export async function futureRoute({part,method,resourceId,req,client,city,user,role,readBody,audit}){
 const q=(sql,args=[])=>client.query(sql,args);
 if(part==='capacities'){
  if(method==='GET'){
   const r=await q(`SELECT r.id,r.code,r.name_fa,r.resource_kind,r.unit,r.total_quantity,r.allocatable_bps,r.quality_bps,r.reserve_quantity,r.authorized,r.constraints_note,r.owner_unit_id,r.created_at,u.name_fa AS owner_name,COALESCE(a.used,0) AS allocated_quantity
    FROM capacity_resources r JOIN org_units u ON u.id=r.owner_unit_id
    LEFT JOIN LATERAL(SELECT SUM(quantity) AS used FROM capacity_allocations WHERE resource_id=r.id AND status='RESERVED') a ON true ORDER BY r.created_at DESC LIMIT 300`);
   return r.rows.map(v=>({...v,effective_quantity:effectiveCapacity(v),available_quantity:Math.max(0,Math.floor((effectiveCapacity(v)-Number(v.allocated_quantity))*1000)/1000)}));
  }
  if(method==='POST'){
   if(!manager(role))throw new ClientError('تعریف ظرفیت فقط توسط مدیریت مجاز است',403);
   const b=await readBody(req),s=validateCapacity(b),unitId=validId(b.ownerUnitId,'شناسه واحد');
   if(!(await q('SELECT 1 FROM org_units WHERE id=$1 AND active',[unitId])).rowCount)throw new ClientError('واحد مسئول در این شهرداری یافت نشد',404);
   const r=(await q(`INSERT INTO capacity_resources(tenant_id,municipality_id,code,name_fa,resource_kind,unit,total_quantity,allocatable_bps,quality_bps,reserve_quantity,owner_unit_id,constraints_note,authorized,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,[city.tenant_id,city.id,s.code,s.name,s.kind,s.unit,s.total,s.alloc,s.quality,s.reserve,unitId,s.constraints,s.authorized,user.id])).rows[0];
   await audit(client,city,user,'CAPACITY',r.id,'CREATE',{code:r.code,authorized:r.authorized});return r;
  }
 }
 if(part==='allocations'){
  if(method==='GET')return (await q(`SELECT a.*,r.name_fa AS resource_name,r.unit,c.summary AS case_summary FROM capacity_allocations a JOIN capacity_resources r ON r.id=a.resource_id JOIN service_cases c ON c.id=a.case_id ORDER BY a.created_at DESC LIMIT 300`)).rows;
  if(method==='POST'){
   const b=await readBody(req),resourceId=validId(b.resourceId,'شناسه ظرفیت'),caseId=validId(b.caseId,'شناسه پرونده'),requestKey=validId(b.requestKey,'کلید درخواست');
   const quantity=positiveNumber(b.quantity,'مقدار تخصیص'),justification=textRequired(b.justification,'توجیه تخصیص',600);
   const r=(await q('SELECT * FROM capacity_resources WHERE id=$1 FOR UPDATE',[resourceId])).rows[0];
   if(!r)throw new ClientError('ظرفیت در این شهرداری یافت نشد',404);
   // Under the same resource row lock, the request key is idempotent and allocation cannot overbook.
   const prior=(await q('SELECT * FROM capacity_allocations WHERE request_key=$1',[requestKey])).rows[0];
   if(prior){if(prior.resource_id!==resourceId||prior.case_id!==caseId||Number(prior.quantity)!==quantity)throw new ClientError('کلید درخواست قبلاً با محتوای متفاوت استفاده شده است',409);return prior;}
   const c=(await q('SELECT id,status FROM service_cases WHERE id=$1',[caseId])).rows[0];if(!c)throw new ClientError('پرونده در محدوده شهرداری یافت نشد',404);if(['CLOSED','REJECTED'].includes(c.status))throw new ClientError('تخصیص به پرونده مختومه یا ردشده مجاز نیست',409);
   const used=(await q("SELECT COALESCE(SUM(quantity),0)::numeric AS n FROM capacity_allocations WHERE resource_id=$1 AND status='RESERVED'",[resourceId])).rows[0].n;
   assertAllocation(quantity,r,Number(used));
   const row=(await q(`INSERT INTO capacity_allocations(tenant_id,municipality_id,resource_id,case_id,quantity,request_key,justification,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[city.tenant_id,city.id,resourceId,caseId,quantity,requestKey,justification,user.id])).rows[0];
   await audit(client,city,user,'CAPACITY_ALLOCATION',row.id,'RESERVED',{caseId,resourceId,quantity});return row;
  }
  if(method==='PATCH'&&resourceId){
   const id=validId(resourceId),b=await readBody(req);if(b.status!=='RELEASED')throw new ClientError('فقط آزادسازی تخصیص مجاز است',400);
   let r=(await q('SELECT * FROM capacity_allocations WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!r)throw new ClientError('تخصیص یافت نشد',404);
   if(r.status==='RELEASED')return r;
   r=(await q("UPDATE capacity_allocations SET status='RELEASED',released_at=now() WHERE id=$1 RETURNING *",[id])).rows[0];
   await audit(client,city,user,'CAPACITY_ALLOCATION',id,'RELEASED');return r;
  }
 }
 if(part==='outcomes'){
  if(method==='GET')return (await q(`SELECT o.*,c.summary AS case_summary FROM public_value_outcomes o JOIN service_cases c ON c.id=o.case_id ORDER BY o.created_at DESC LIMIT 300`)).rows;
  if(method==='POST'){
   const b=await readBody(req),caseId=validId(b.caseId,'شناسه پرونده'),s=validateOutcome(b);
   if(!(await q('SELECT 1 FROM service_cases WHERE id=$1',[caseId])).rowCount)throw new ClientError('پرونده در این شهرداری یافت نشد',404);
   const row=(await q(`INSERT INTO public_value_outcomes(tenant_id,municipality_id,case_id,dimension,metric,unit,baseline,target,actual,evidence,source_note,created_by,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,[city.tenant_id,city.id,caseId,s.dimension,s.metric,s.unit,s.baseline,s.target,s.actual,s.evidence,s.sourceNote,user.id,s.actual===null?'DRAFT':'MEASURED'])).rows[0];
   await audit(client,city,user,'PUBLIC_VALUE',row.id,'RECORD',{dimension:s.dimension,status:row.status});return row;
  }
  if(method==='PATCH'&&resourceId){
   const id=validId(resourceId),b=await readBody(req),action=b.action;
   const row=(await q('SELECT * FROM public_value_outcomes WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!row)throw new ClientError('شاخص نتیجه یافت نشد',404);
   if(action==='VERIFY'){
    reviewOutcome(row,user.id,role);
    const r=(await q("UPDATE public_value_outcomes SET status='VERIFIED',verified_by=$2,verified_at=now(),updated_at=now() WHERE id=$1 RETURNING *",[id,user.id])).rows[0];
    await audit(client,city,user,'PUBLIC_VALUE',id,'VERIFY',{dimension:r.dimension});return r;
   }
   if(action==='MEASURE'){
    if(!['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','OPERATOR'].includes(role))throw new ClientError('اختیار ثبت نتیجه وجود ندارد',403);
    if(row.status==='VERIFIED')throw new ClientError('شاخص تأییدشده قابل ویرایش نیست',409);
    const actual=Number(b.actual),ev=textRequired(b.evidence,'شواهد نتیجه',3000);
    if(!Number.isFinite(actual)||Math.abs(actual)>1e12)throw new ClientError('عملکرد عددی نامعتبر است',400);
    const r=(await q("UPDATE public_value_outcomes SET actual=$2,evidence=$3,status='MEASURED',updated_at=now() WHERE id=$1 RETURNING *",[id,actual,ev])).rows[0];
    await audit(client,city,user,'PUBLIC_VALUE',id,'MEASURE');return r;
   }
   throw new ClientError('اقدام نامعتبر است',400);
  }
 }
 if(part==='value-dashboard'&&method==='GET'){
  const a=(await q(`SELECT dimension,status,count(*)::int AS count FROM public_value_outcomes GROUP BY dimension,status ORDER BY dimension,status`)).rows;
  const b=(await q("SELECT count(*)::int AS n FROM capacity_resources WHERE authorized=true")).rows[0].n;
  const c=(await q("SELECT count(*)::int AS n FROM capacity_allocations WHERE status='RESERVED'")).rows[0].n;
  return {dimensions:a,authorizedResources:b,activeAllocations:c,note:'Monetary and nonmonetary results are not combined; only independently verified outcomes count as verified.'};
 }
 throw new ClientError('مسیر API یافت نشد',404);
}
