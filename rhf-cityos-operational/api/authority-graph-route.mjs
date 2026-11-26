// Reuse V8P2's server-side appointment/municipality authorization; never trust frontend flags.
import {permitFor} from './deputy-dossier-route.mjs';
import {fail} from './organization-identity-core.mjs';
import {buildAuthorityGraph} from './authority-graph-core.mjs';
export async function readAuthorityGraph({client,city,user,role,method,resourceId,url}){
 if(method!=='GET'||resourceId)fail('نمای اختیار صرفاً خواندنی است',405);
 const {unit,permit}=await permitFor(client,city,user,role,url);
 const q=await client.query(`SELECT id,parent_id,name_fa,kind,code FROM org_units
 WHERE tenant_id=$1 AND municipality_id=$2 AND active=true AND (id=$3 OR parent_id=$3)
 ORDER BY CASE WHEN id=$3 THEN 0 ELSE 1 END,kind,id LIMIT 102`,[city.tenant_id,city.id,unit.id]);
 const partial=q.rows.length>101;
 return buildAuthorityGraph({city,unit,permit,rows:q.rows.slice(0,101),partial});
}
