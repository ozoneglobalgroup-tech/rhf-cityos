// Browser-level validation never substitutes for server authorization.
export const TEMPORAL_UI_VERSION='RHF-TEMPORAL-V8P5.2';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const validUuid=x=>typeof x==='string'&&uuid.test(x);
export const eligibleToStart=(m,role)=>['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR'].includes(role)&&validUuid(m?.id)&&['PROPOSED','AUTHORIZED'].includes(m.status);
export const eligibleToRelease=(m,role)=>eligibleToStart(m,role)&&m.status==='AUTHORIZED'&&m.version===2&&m.createdBy!==m.reviewedBy&&validUuid(m.reviewedBy);
export function validRuntime(r,city,role){return r?.scope===city&&r?.role===role&&r?.version===TEMPORAL_UI_VERSION&&r?.engine==='TEMPORAL_TS_1_25_0'&&['SERVICE_CONNECTED','DISABLED'].includes(r?.state)&&r?.municipalDispatch===false;}
export function validState(x,city,missionId){return x?.scope===city&&x?.missionId===missionId&&typeof x?.workflowId==='string'&&x.workflowId.length<160&&x?.municipalDispatch===false&&x?.autoWrites===0&&x?.verifiedPublicValue===false&&typeof x?.phase==='string';}
export const humanPhases={AWAITING_HUMAN_AUTHORIZATION:'در انتظار مجوز انسانی',AUTHORIZED_FOR_READ_ONLY:'آزادسازی تحلیل مجاز',ANALYZING:'تحلیل در جریان',COMPLETED:'تحلیل ثبت شد',FAILED:'تحلیل ناموفق',EXPIRED:'مهلت انتظار تمام شد',UNAVAILABLE:'وضعیت موقتاً نامشخص'};
