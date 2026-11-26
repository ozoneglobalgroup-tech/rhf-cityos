/** H8 RUVOS native GET-only inbox, scoped by existing withScope + RLS.
 * No user ID, reviewer role or municipality scope is accepted from query/body.
 */
import {ClientError} from './domain.mjs';
import {MY_WORK_PARTS,MY_WORK_ROLES,MAX_ITEMS,isReviewer,shapeWorkInbox} from './my-work-core.mjs';
export {MY_WORK_PARTS};

const BASE=`SELECT a.id,a.case_id,a.status,a.kind,a.note,a.created_by,a.approved_by,
 a.created_at,a.approved_at,c.summary AS case_summary
 FROM agent_followup_actions a JOIN service_cases c
 ON c.id=a.case_id AND c.tenant_id=a.tenant_id AND c.municipality_id=a.municipality_id
 WHERE a.tenant_id=$1 AND a.municipality_id=$2`;

export async function myWorkRoute({part,method,resourceId,cityId,user,withScope,json}) {
 if(part!=='my-work')throw new ClientError('مسیر کار من معتبر نیست',404);
 if(method!=='GET')throw new ClientError('صندوق کار من فقط خواندنی است',405);
 if(resourceId)throw new ClientError('شناسه زیرمسیر پشتیبانی نمی‌شود',404);
 if(!user?.id)throw new ClientError('هویت کاربر معتبر نیست',401);
 return json(200,await withScope(cityId,user,'read',async(client,city,role)=>{
  if(!MY_WORK_ROLES.includes(role))throw new ClientError('این نقش دسترسی به صندوق اقدام عامل ندارد',403);
  const own=(await client.query(`${BASE} AND a.created_by=$3
     ORDER BY a.created_at DESC,a.id DESC LIMIT ${MAX_ITEMS+1}`,
     [city.tenant_id,city.id,user.id])).rows;
  let approvals=[];
  if(isReviewer(role)){
    approvals=(await client.query(`${BASE} AND a.status='PROPOSED' AND a.created_by<>$3
      ORDER BY a.created_at ASC,a.id ASC LIMIT ${MAX_ITEMS+1}`,
      [city.tenant_id,city.id,user.id])).rows;
  }
  return shapeWorkInbox({city,role,own,approvals});
 }));
}
