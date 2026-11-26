/** DV2.2: attributable urban need/capacity registry. Not certified urban value. */
export const DV22_SCHEMA='RHF-DV22-NEED-CAPACITY-v1';
export const DV22_KINDS=Object.freeze(['NEED','CAPACITY']);
export const DV22_SECTORS=Object.freeze(['WASTE','PUBLIC_SERVICES','GREEN_SPACES','ENVIRONMENT','HSE','CEMETERIES','MARKETS','FLEET','EDUCATION','OTHER']);
export const DV22_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class DV22Error extends Error{constructor(msg,status=400){super(msg);this.status=status;this.rhfIamError=true;}}
const fail=(msg,status=400)=>{throw new DV22Error(msg,status)};
const exact=(x,allowed)=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!allowed.includes(k)))fail('DV22_INVALID_FIELDS')};
const text=(v,min,max,label)=>{if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)fail('DV22_INVALID_'+label);return v.trim()};
export function validateSubmission(body){
 exact(body,['kind','sector','ownerOrgId','title','description','quantity','unit','evidenceRef','requestKey']);
 if(!DV22_KINDS.includes(body.kind)||!DV22_SECTORS.includes(body.sector))fail('DV22_KIND_OR_SECTOR');
 if(!DV22_UUID.test(body.ownerOrgId||'')||!DV22_UUID.test(body.requestKey||''))fail('DV22_UUID_REQUIRED');
 const raw=body.quantity;
 if(raw!==null&&raw!==undefined&&raw!==''&&typeof raw!=='number')fail('DV22_INVALID_QUANTITY_TYPE');
 const quantity=raw===null||raw===undefined||raw===''?null:raw;
 if(quantity!==null&&(!Number.isFinite(quantity)||quantity<0||quantity>1e12||Math.abs(quantity*1000-Math.round(quantity*1000))>1e-7))fail('DV22_INVALID_QUANTITY');
 const unit=body.unit===undefined||body.unit===null?'':String(body.unit).trim();
 if((quantity!==null&&!unit)||(quantity===null&&unit)||unit.length>60)fail('DV22_QUANTITY_UNIT_PAIR');
 return {kind:body.kind,sector:body.sector,ownerOrgId:body.ownerOrgId,
  title:text(body.title,8,160,'TITLE'),description:text(body.description,35,2000,'DESCRIPTION'),
  quantity,unit:unit||null,evidenceRef:text(body.evidenceRef,12,500,'EVIDENCE'),requestKey:body.requestKey};
}
export function validateDecision(body){
 exact(body,['decision','note']);
 if(!['REVIEWED','REJECTED'].includes(body.decision))fail('DV22_INVALID_DECISION');
 return {decision:body.decision,note:text(body.note,25,1000,'REVIEW_NOTE')};
}
export function maySubmit({surface,role,systemAdmin,approvedDeputy,approvedWaste,operationalWaste}){
 if(systemAdmin)return false;
 if(surface==='deputy')return role==='DEPUTY'&&approvedDeputy===true;
 return surface==='waste'&&approvedWaste===true&&operationalWaste===true;
}
export function mayReview({role,systemAdmin,createdBy,reviewerId}){
 return !systemAdmin&&['MUNICIPAL_ADMIN','AUDITOR'].includes(role)&&createdBy!==reviewerId;
}
export function validateReceipt(row,city){
 if(!row||row.tenant_id!==city.tenant_id||row.municipality_id!==city.id)fail('DV22_RECEIPT_SCOPE_MISMATCH',500);
 return row;
}
export function present(row){return {id:row.id,kind:row.kind,sector:row.sector,ownerOrgId:row.owner_org_id,
 title:row.title,description:row.description,quantity:row.quantity===null?null:String(row.quantity),unit:row.unit,
 evidenceRef:row.evidence_ref,status:row.status,createdBy:row.created_by,reviewNote:row.review_note,
 createdAt:row.created_at,reviewedAt:row.reviewed_at,origin:'MANUAL_UNVERIFIED_VALUE'};}
