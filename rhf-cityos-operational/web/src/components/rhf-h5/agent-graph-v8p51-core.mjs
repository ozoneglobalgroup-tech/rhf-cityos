export const GRAPH_UI_VERSION='RHF-AGENT-GRAPH-V8P5.1';
export const graphRunLabels=Object.freeze({RUNNING:'در حال پردازش',COMPLETED:'تحلیل تکمیل‌شده',FAILED:'تحلیل ناموفق'});
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const validUUID=x=>typeof x==='string'&&ID.test(x);
export function canStartGraphRun(m,role){return !!m&&m.status==='AUTHORIZED'&&m.version===2&&validUUID(m.id)&&['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR'].includes(role)}
export function validateGraphRuntime(r,city,role){return !!r&&r.scope===city&&r.role===role&&r.version===GRAPH_UI_VERSION&&r.graphEngine==='LANGGRAPH_JS_1_7_2'&&r.mode==='AUTHORIZED_READ_ONLY_IN_PROCESS'&&r.autoDispatch===false&&r.noMunicipalWrites===true&&r.temporal==='NOT_CONNECTED'}
export function validateGraphRunList(r,city){return !!r&&r.scope===city&&Array.isArray(r.rows)&&r.rows.length<=100&&r.rows.every(x=>validUUID(x.id)&&validUUID(x.missionId)&&x.scope===city&&/^[0-9a-f]{64}$/.test(x.evidenceSha256||'')&&x.externalModelInvoked===false&&x.autoWrites===0&&x.dispatched===false&&x.verifiedPublicValueCreated===false&&['RUNNING','COMPLETED','FAILED'].includes(x.status)&&Array.isArray(x.trace)&&x.trace.length<=4)}
