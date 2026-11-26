// V8P3.4 read-only GET. Appointment and scope use V8P2's authoritative server gate.
import {permitFor} from './deputy-dossier-route.mjs';
import {fail} from './organization-identity-core.mjs';
import {buildOpportunityExchange} from './opportunity-exchange-core.mjs';
export async function readOpportunityExchange({client,city,user,role,method,resourceId,url}){
 if(method!=='GET'||resourceId)fail('بازار فرصت در این مرحله فقط خواندنی است',405);
 const {unit,permit}=await permitFor(client,city,user,role,url);
 const found=await client.query(`SELECT id,org_key,code,title,form_data,status
    FROM rhf_deputy_dossiers WHERE tenant_id=$1 AND municipality_id=$2 AND deputy_unit_id=$3
    ORDER BY created_at DESC,id DESC LIMIT 201`,[city.tenant_id,city.id,unit.id]);
 return buildOpportunityExchange({cityId:city.id,permit,rows:found.rows.slice(0,200).map(r=>({id:r.id,orgKey:r.org_key,code:r.code,title:r.title,fields:r.form_data,status:r.status})),partial:found.rows.length>200});
}
