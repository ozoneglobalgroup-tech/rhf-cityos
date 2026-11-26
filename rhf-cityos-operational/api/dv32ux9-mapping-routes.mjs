// Source document is operator-supplied; the API cannot certify its authority or validity.
import {ClientError} from './domain.mjs';
import {boundary,scope,validate,validateCatalog,validateReport} from './dv32ux9-mapping-core.mjs';
const refuse=(status,message)=>{throw new ClientError(message,status)};
const run=(client,city,q,a=[])=>client.query(q,[city.tenant_id,city.id,...a]);
const refs=async(client,city)=>{
 const [slots,units,services]=await Promise.all([
  run(client,city,`SELECT slot,title_fa,mapping_status,axis_code FROM public.rhf_dv32q_mission_slots WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY slot`),
  run(client,city,`SELECT id,code,name_fa,active FROM public.org_units WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY code LIMIT 201`),
  run(client,city,`SELECT id,code,name_fa,active,owner_unit_id FROM public.service_definitions WHERE tenant_id=$1 AND municipality_id=$2 ORDER BY code LIMIT 201`)]);
 return {slots:slots.rows,units:units.rows,services:services.rows};
};
export async function dv32ux9MappingRoute({method,resourceId,url,headers,client,city,user,role,readBody,audit}){
 try{boundary({method,resourceId,url,headers})}catch(e){refuse(e.message==='METHOD_NOT_ALLOWED'?405:400,e.message)}
 try{scope(city,role,user,method)}catch(e){refuse(403,e.message)}
 if(method==='POST'){
  let a;try{a=validate(await readBody())}catch(e){refuse(400,e.message)}
  if(a.action==='PROPOSE'){
   const ref=await refs(client,city);
   try{validateCatalog(ref.slots,ref.units.find(x=>x.id===a.ownerUnitId),ref.services.find(x=>x.id===a.serviceId),a.slot)}catch(e){refuse(409,e.message)}
   const row=await run(client,city,`INSERT INTO public.rhf_dv32ux9_mission_proposals
    (id,tenant_id,municipality_id,slot,title_fa,owner_unit_id,service_id,source_reference,source_sha256,rationale,proposed_by)
    VALUES($3,$1,$2,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT DO NOTHING RETURNING id,slot`,[a.requestId,a.slot,a.titleFa,a.ownerUnitId,a.serviceId,a.sourceReference,a.sourceSha256,a.reason,user.id]);
   if(row.rowCount!==1)refuse(409,'PROPOSAL_DUPLICATE_OR_CONFLICT');
   await audit(client,city,user,'DV32UX9_GOVERNED_MAPPING',a.requestId,'OPERATOR_SOURCE_PROPOSAL',
    {slot:a.slot,sourceReference:a.sourceReference,sourceSha256:a.sourceSha256,officiallyCertified:false});
   return {schema:'RHF-DV32UX9-MAPPING-ACTION-v1',cityId:city.id,tenantId:city.tenant_id,proposalId:a.requestId,action:'PROPOSED',officiallyCertified:false,executionAuthority:false,finalGo:'NO_GO'};
  }
  // Second human attestation only; the same proposer may never attest.
  const row=await run(client,city,`INSERT INTO public.rhf_dv32ux9_mission_attestations
    (proposal_id,tenant_id,municipality_id,attested_by,note)
    SELECT p.id,p.tenant_id,p.municipality_id,$4,$5 FROM public.rhf_dv32ux9_mission_proposals p
    JOIN public.org_units u ON u.id=p.owner_unit_id AND u.tenant_id=p.tenant_id AND u.municipality_id=p.municipality_id AND u.active=true
    JOIN public.service_definitions s ON s.id=p.service_id AND s.owner_unit_id=u.id AND s.tenant_id=p.tenant_id AND s.municipality_id=p.municipality_id AND s.active=true
    WHERE p.tenant_id=$1 AND p.municipality_id=$2 AND p.id=$3 AND p.proposed_by<>$4
    ON CONFLICT DO NOTHING RETURNING proposal_id`,[a.proposalId,user.id,a.note]);
  if(row.rowCount!==1)refuse(409,'INDEPENDENT_ATTESTATION_DENIED_OR_ALREADY_DONE');
  await audit(client,city,user,'DV32UX9_GOVERNED_MAPPING',a.proposalId,'SECOND_HUMAN_REFERENCE_ATTESTATION',
   {independent:true,officiallyCertified:false,legalSourceNotMachineVerified:true});
  return {schema:'RHF-DV32UX9-MAPPING-ACTION-v1',cityId:city.id,tenantId:city.tenant_id,proposalId:a.proposalId,action:'SECOND_HUMAN_ATTESTED',officiallyCertified:false,executionAuthority:false,finalGo:'NO_GO'};
 }
 const ref=await refs(client,city);
 const proposalRows=await run(client,city,`SELECT p.id,p.slot,p.title_fa,p.owner_unit_id,p.service_id,p.source_reference,p.source_sha256,p.created_at,
   (a.proposal_id IS NOT NULL) AS independently_attested,(p.proposed_by=$3::uuid) AS own_proposal
   FROM public.rhf_dv32ux9_mission_proposals p
   LEFT JOIN public.rhf_dv32ux9_mission_attestations a ON a.proposal_id=p.id AND a.tenant_id=p.tenant_id AND a.municipality_id=p.municipality_id
   WHERE p.tenant_id=$1 AND p.municipality_id=$2 ORDER BY p.created_at DESC,p.id DESC LIMIT 101`,[user.id]);
 const report={schema:'RHF-DV32UX9-MISSION-MAPPING-v1',cityId:city.id,tenantId:city.tenant_id,
  slots:ref.slots,units:ref.units.slice(0,200),services:ref.services.slice(0,200),
  proposals:proposalRows.rows.slice(0,100).map(x=>({id:x.id,slot:x.slot,titleFa:x.title_fa,ownerUnitId:x.owner_unit_id,serviceId:x.service_id,
   sourceReference:x.source_reference,sourceSha256:x.source_sha256,reviewState:x.independently_attested?'SECOND_HUMAN_ATTESTED':'PENDING_SECOND_REVIEW',ownProposal:x.own_proposal})),
  truncated:ref.units.length>200||ref.services.length>200||proposalRows.rows.length>100,
  canWrite:role==='MUNICIPAL_ADMIN',officiallyCertified:false,executionAuthority:false,verifiedUrbanValue:false,finalGo:'NO_GO'};
 try{return validateReport(report,city,role)}catch(e){refuse(409,e.message)}
}
