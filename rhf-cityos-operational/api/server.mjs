import {createIndependentMunicipality} from './tenant-onboarding.mjs';
import {MUNICIPAL_BRANDING_PARTS,municipalityBrandingRoute} from './municipality-branding-routes.mjs';
import {WASTE_SUITE_PARTS,wasteSuiteRoute} from './waste-suite-routes.mjs';
import {WASTE_PILOT_PARTS,wastePilotRoute} from './waste-pilot-routes.mjs';
import {MY_WORK_PARTS,myWorkRoute} from './my-work-routes.mjs';
import {AVOS_PARTS,avosNativeRoute} from './avos-native-routes.mjs';
import {ORG_IDENTITY_PARTS,organizationIdentityRoute,denyLegacyForScoped} from './organization-identity-routes.mjs';
import http from 'node:http';
import {dv32ux18ProofRoute} from './dv32ux18-proof-routes.mjs'; // RHF_DV32UX18_IMPORT
import {dv32ux17ChainRoute} from './dv32ux17-chain-routes.mjs'; // RHF_DV32UX17_IMPORT
import {dv32ux13PortfolioRoute} from './dv32ux13-portfolio-routes.mjs'; // RHF_DV32UX13_IMPORT
import {dv32ux11WorkRoute} from './dv32ux11-work-routes.mjs'; // RHF_DV32UX11_IMPORT
import {dv32ux12HandoffRoute} from './dv32ux12-handoff-routes.mjs'; // RHF_DV32UX12_IMPORT
import {dv32ux9MappingRoute} from './dv32ux9-mapping-routes.mjs'; // RHF_DV32UX9_IMPORT
import {dv32ux10RevisionRoute} from './dv32ux10-revision-routes.mjs'; // RHF_DV32UX10_IMPORT
import {dv32ux8PlanningRoute} from './dv32ux8-planning-routes.mjs'; // RHF_DV32UX8_IMPORT
import {dv32ux7ReviewRoute} from './dv32ux7-review-routes.mjs'; // RHF_DV32UX7_IMPORT
import {dv32ux6CaseIntakeRoute} from './dv32ux6-case-routes.mjs'; // RHF_DV32UX6_IMPORT
import {dv32q7OperationalCatalogRoute} from './dv32q7-catalog-routes.mjs'; // RHF_DV32Q7_IMPORT
import {dv32q6SyntheticLifecycleRoute} from './dv32q6-sim-routes.mjs'; // RHF_DV32Q6_IMPORT
import {dv32q5SyntheticPilotRoute} from './dv32q5-demo-routes.mjs'; // RHF_DV32Q5_IMPORT
import {dv32q4MappingWorklistRoute} from './dv32q4-routes.mjs'; // RHF_DV32Q4_IMPORT
import {dv32q3MissionTraceRoute} from './dv32q3-routes.mjs'; // RHF_DV32Q3_IMPORT
import {dv32q2CaseTerritoryRoute} from './dv32q2-routes.mjs'; // RHF_DV32Q2_IMPORT
import {dv32qCoverageRoute} from './dv32q-coverage-routes.mjs'; // RHF_DV32Q_IMPORT
import {dv32pPilotAuditRoute} from './dv32p-readiness-routes.mjs'; // RHF_DV32P_IMPORT
import {dv32oAccessMatrixRoute} from './dv32o-access-routes.mjs'; // RHF_DV32O_IMPORT
import {dv32nDossierRoute} from './dv32n-dossier-routes.mjs'; // RHF_DV32N_IMPORT
import {dv32mTemporalStatusRoute} from './dv32m-temporal-routes.mjs'; // RHF_DV32M_IMPORT
import {dv32lPipelineRoute} from './dv32l-pipeline-routes.mjs'; // RHF_DV32L_IMPORT
import {dv32kGraphRoute} from './dv32k-routes.mjs'; // RHF_DV32K_IMPORT
import {dv32jHandoffRoute} from './dv32j-routes.mjs'; // RHF_DV32J_IMPORT
import {dv32iReviewRoute} from './dv32i-review-routes.mjs'; // RHF_DV32I_IMPORT
import {dv32hAgentRoute} from './dv32h-agent-routes.mjs'; // RHF_DV32H_IMPORT
import {dv32gBindingRoute,dv32gWasteRoute} from './dv32g-org-routes.mjs'; // RHF_DV32G_IMPORT
import {dv32fExecutiveRoute} from './dv32f-executive-routes.mjs'; // RHF_DV32F_IMPORT
import {DV32E_PARTS,dv32eReadRoute} from './dv32e-capacity-routes.mjs'; // RHF_DV32E_ROUTE_IMPORT
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,scrypt as scryptCb,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import pg from 'pg';
import {FUTURE_PARTS,futureRoute} from './capacity-routes.mjs';
import {readDeputyCockpit} from './deputy-cockpit.mjs';
import {EXECUTION_PARTS,executionRoute} from './execution-routes.mjs';
import {FINANCE_PARTS,financeRoute} from './finance-routes.mjs';
import {readFinancialControl} from './finance-control.mjs';
import {readAcceptanceTrace} from './acceptance-trace.mjs';
import {readPilotFinanceAudit} from './pilot-finance-audit.mjs';
import {URBAN_VALUE_PARTS,urbanValueRoute} from './urban-value-routes.mjs';
import {VALUE_BRIDGE_PARTS,valueBridgeRoute} from './urban-value-bridge-routes.mjs';
import {DV2_READINESS_PARTS,dv2ReadinessRoute} from './dv2-readiness-routes.mjs';
import {DV21_ORG_PARTS,dv21OrgRoute} from './dv21-org-routes.mjs';
import {DV24_ORG_PARTS,dv24OrgRoute} from './dv24-org-routes.mjs';
import {DV25_MISSION_PARTS,dv25MissionRoute} from './dv25-mission-routes.mjs';
import {DV31_PARTS,dv31IntakeRoute} from './dv31-intake-routes.mjs';
import {DV32_PARTS,dv32DispatchRoute} from './dv32-dispatch-routes.mjs';
import {DV32B_PARTS,dv32bMissionRoute} from './dv32b-mission-routes.mjs';
import {DV32C_PARTS,dv32cResourceRoute} from './dv32c-resource-routes.mjs';
import {DV32D_PARTS,dv32dCapacityRoute} from './dv32d-capacity-routes.mjs';
import {DV22_PARTS,dv22RegistryRoute} from './dv22-registry-routes.mjs';
import {DV23_PARTS,dv23OpportunityRoute} from './dv23-opportunity-routes.mjs';
import {DV23B_PARTS,dv23bDecisionRoute} from './dv23b-decision-routes.mjs';
import {DV23B2A_PARTS,dv23b2aAgentHandoffRoute} from './dv23b2a-agent-handoff-routes.mjs';
import {DV23B2B_PARTS,dv23b2bSpecialistRoute} from './dv23b2b-specialist-routes.mjs';
import {AI_PARTS,aiRoute} from './ai-routes.mjs';
import {AGENT_PARTS,urbanAgentRoute} from './urban-agent-routes.mjs';
import {ACTION_PARTS,agentActionRoute} from './agent-action-routes.mjs';
import {MISSION_PARTS,agentMissionRoute} from './agent-mission-routes.mjs';
import {SPECIALIST_PARTS,agentSpecialistRoute} from './agent-specialist-routes.mjs';
import {AGENT_BRIEF_PARTS,agentBriefingRoute} from './agent-briefing-routes.mjs';
import {HANDOFF_PARTS,agentHandoffRoute} from './agent-handoff-routes.mjs';
import {GRAPH_PARTS,agentGraphRoute} from './agent-graph-routes.mjs';
import {TEMPORAL_PARTS,agentTemporalRoute} from './agent-temporal-routes.mjs';
import {PERFORMANCE_PARTS,performanceConnectorRoute} from './performance-connector-routes.mjs';
import {TWIN_PARTS,twinRoute} from './twin-routes.mjs';
import {TWIN_SOURCE_PARTS,twinSourceRoute} from './twin-source-routes.mjs';
import {PULL_PARTS,twinPullRoute} from './twin-pull-routes.mjs';
import {ClientError,VALID_ROLES,canWrite,canManage,CASE_TRANSITIONS,MISSION_TRANSITIONS,transition,requiredString,uuid,choice,amount,number,valueOf,validateService,validateInspection} from './domain.mjs';
import {evaluateMembershipMutation} from './membership-policy.mjs'; // RHF_DV32UX33_IAM_IMPORT
const scrypt=promisify(scryptCb);
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:10,connectionTimeoutMillis:7000});
const port=Number(process.env.PORT||3210);
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const publicDir=path.resolve(__dirname,'public');
const SESSION_COOKIE='rhf_cityos_session';
const U_TYPES=['MUNICIPALITY','DEPUTY','ORGANIZATION','DIRECTORATE','DEPARTMENT','DISTRICT','SUBDISTRICT','SITE','OPERATION_TEAM','CONTRACTOR_INTERFACE'];
const PRIORITIES=['LOW','NORMAL','HIGH','CRITICAL'];
const loginAttempts=new Map();
function loginGate(key,valid){const now=Date.now();if(loginAttempts.size>5000){for(const [k,v] of loginAttempts)if(now-v.since>900000)loginAttempts.delete(k);}
 const prev=loginAttempts.get(key);if(valid){loginAttempts.delete(key);return;}const n=prev&&now-prev.since<900000?prev.count+1:1;
 loginAttempts.set(key,{count:n,since:prev&&now-prev.since<900000?prev.since:now});}
function loginBlocked(key){const a=loginAttempts.get(key);return !!a&&Date.now()-a.since<900000&&a.count>=10;}

async function hashPassword(password){let salt=randomBytes(24).toString('hex');let derived=await scrypt(password,salt,64);return `${salt}:${derived.toString('hex')}`;}
async function verifyPassword(password,stored){if(typeof stored!=='string'||!stored.includes(':'))return false;const [salt,digest]=stored.split(':');const a=Buffer.from(digest||'','hex');if(a.length!==64)return false;let b=await scrypt(password,salt,64);return timingSafeEqual(a,b);}
function sha(s){return createHash('sha256').update(s).digest('hex');}
function json(res,status,value){let text=JSON.stringify(value);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(text),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(text);}
function error(res,e){let status=(e instanceof ClientError||e?.rhfIamError===true)?e.status:500;console.error('REQUEST_ERROR',status,e.message);json(res,status,{error:status===500?'خطای داخلی سرویس':e.message});}
async function readBody(req){let buffers=[];let size=0;for await(const part of req){size+=part.length;if(size>200000)throw new ClientError('حجم درخواست بیش از حد مجاز است',413);buffers.push(part);}let str=Buffer.concat(buffers).toString('utf8');if(!str)return {};try {let x=JSON.parse(str);if(!x||typeof x!=='object'||Array.isArray(x))throw 0;return x;}catch {throw new ClientError('JSON نامعتبر است');}}
function getCookie(req){const all=req.headers.cookie||'';for(let kv of all.split(';')){let ix=kv.indexOf('=');if(ix<0)continue;if(kv.slice(0,ix).trim()===SESSION_COOKIE)return kv.slice(ix+1).trim();}return '';}
async function authenticate(req){let token=getCookie(req);if(!/^[a-f0-9]{64}$/.test(token))throw new ClientError('ابتدا وارد سامانه شوید',401);
const r=await pool.query(`SELECT u.id,u.username,u.display_name,u.is_system_admin FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,[sha(token)]);
if(!r.rows.length)throw new ClientError('نشست منقضی شده است',401);return r.rows[0];}
function cookieHeader(req,token,maxAge){const secure=process.env.PUBLIC_HTTPS==='true'?'; Secure':'';return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;}
async function bootstrap(){if((process.env.ADMIN_PASSWORD||'').length<16)throw new Error('ADMIN_PASSWORD must be at least 16 characters');
 const username=process.env.ADMIN_USERNAME||'admin';const city=(process.env.INITIAL_CITY||'شهرداری شیراز').trim();
 const client=await pool.connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(31729219)');
 // Resolve the tenant from the *same* city row: the first tenant can differ after onboarding.
 let m=await client.query('SELECT id,tenant_id FROM municipalities ORDER BY created_at,id LIMIT 1');
 if(!m.rows.length){let c=await client.query('SELECT id FROM tenants ORDER BY created_at,id LIMIT 1');if(!c.rows.length){c=await client.query('INSERT INTO tenants(name) VALUES($1) RETURNING id',['RHF City OS']);}
   m=await client.query('INSERT INTO municipalities(tenant_id,name) VALUES($1,$2) RETURNING id,tenant_id',[c.rows[0].id,city]);}
 let tenant=m.rows[0].tenant_id,municipality=m.rows[0].id;
 let u=await client.query('SELECT id FROM users WHERE username=$1',[username]);if(!u.rows.length){const h=await hashPassword(process.env.ADMIN_PASSWORD);u=await client.query('INSERT INTO users(username,display_name,password_hash,is_system_admin) VALUES($1,$2,$3,true) RETURNING id',[username,'مدیر سامانه',h]);}
 await client.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.municipality_id',$2,true),set_config('app.actor_id',$3,true)",[tenant,municipality,u.rows[0].id]);
 await client.query(`INSERT INTO module_activations(tenant_id,municipality_id,code,active) SELECT $1,$2,code,true FROM module_catalog ON CONFLICT DO NOTHING`,[tenant,municipality]);
 await client.query('COMMIT');console.log('BOOTSTRAP_READY');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
async function withScope(municipalityId,user,minimum,fn){uuid(municipalityId,'شناسه شهرداری');let m=await pool.query('SELECT id,tenant_id,name FROM municipalities WHERE id=$1 AND active=true',[municipalityId]);if(!m.rows.length)throw new ClientError('شهرداری یافت نشد',404);
let city=m.rows[0];let role='MUNICIPAL_ADMIN';if(!user.is_system_admin){let r=await pool.query('SELECT role FROM memberships WHERE user_id=$1 AND tenant_id=$2 AND municipality_id=$3',[user.id,city.tenant_id,city.id]);if(!r.rows.length)throw new ClientError('دسترسی به این شهرداری مجاز نیست',403);role=r.rows[0].role;}
if(minimum==='write'&&!canWrite(role))throw new ClientError('اختیار ویرایش وجود ندارد',403);
if(minimum==='manage'&&!canManage(role))throw new ClientError('اختیار مدیریت وجود ندارد',403);
if(minimum==='audit'&&!user.is_system_admin&&!['MUNICIPAL_ADMIN','AUDITOR'].includes(role))throw new ClientError('دسترسی به حسابرسی مجاز نیست',403);
let client=await pool.connect();try{await client.query('BEGIN');await client.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.municipality_id',$2,true),set_config('app.actor_id',$3,true)",[city.tenant_id,city.id,user.id]);let result=await fn(client,city,role);await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
async function audit(client,city,user,kind,id,event,details={}){await client.query('INSERT INTO audit_events(tenant_id,municipality_id,actor_id,kind,entity_id,event,details) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)',[city.tenant_id,city.id,user.id,kind,String(id),event,JSON.stringify(details)]);}
async function main(req,res){const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);const p=u.pathname;const method=req.method||'GET';
 if(p==='/healthz'){await pool.query('SELECT 1');return json(res,200,{status:'ok',version:'1.3.6',service:'RHF City OS operational foundation'});}
 if(p.startsWith('/api/')){
  if(!['GET','HEAD'].includes(method)&&req.headers.origin){let origin=new URL(req.headers.origin);let host=req.headers.host;if(origin.host!==host)throw new ClientError('Origin mismatch',403);}
  if(p==='/api/v1/auth/login'&&method==='POST'){const body=await readBody(req);let username=requiredString(body.username,'نام کاربری',120);let password=requiredString(body.password,'رمز عبور',500);const key=sha(username.toLowerCase()+'|'+(req.socket.remoteAddress||''));if(loginBlocked(key))throw new ClientError('تلاش‌های ورود بیش از حد مجاز است؛ ۱۵ دقیقه دیگر تلاش کنید',429);
      const r=await pool.query('SELECT id,password_hash FROM users WHERE username=$1',[username]);const ok=r.rows.length?await verifyPassword(password,r.rows[0].password_hash):false;
      loginGate(key,ok);if(!ok)throw new ClientError('اطلاعات ورود نامعتبر است',401);const token=randomBytes(32).toString('hex');await pool.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",[sha(token),r.rows[0].id]);res.setHeader('Set-Cookie',cookieHeader(req,token,28800));return json(res,200,{ok:true});}
  if(p==='/api/v1/auth/logout'&&method==='POST'){let token=getCookie(req);if(/^[a-f0-9]{64}$/.test(token))await pool.query('DELETE FROM sessions WHERE token_hash=$1',[sha(token)]);res.setHeader('Set-Cookie',cookieHeader(req,'',0));return json(res,200,{ok:true});}
  const user=await authenticate(req);
  if(p==='/api/v1/auth/change-password'&&method==='POST'){let b=await readBody(req);let old=requiredString(b.oldPassword,'رمز فعلی',500),next=requiredString(b.newPassword,'رمز جدید',500);if(next.length<14)throw new ClientError('رمز جدید حداقل ۱۴ کاراکتر باشد');let r=await pool.query('SELECT password_hash FROM users WHERE id=$1',[user.id]);if(!(await verifyPassword(old,r.rows[0].password_hash)))throw new ClientError('رمز فعلی اشتباه است',403);let h=await hashPassword(next);await pool.query('UPDATE users SET password_hash=$2 WHERE id=$1',[user.id,h]);await pool.query('DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2',[user.id,sha(getCookie(req))]);return json(res,200,{ok:true});}
  if(p==='/api/v1/auth/me'&&method==='GET'){return json(res,200,{user:{id:user.id,username:user.username,displayName:user.display_name,systemAdmin:user.is_system_admin}});}
  if(p==='/api/v1/module-catalog'&&method==='GET'){return json(res,200,(await pool.query('SELECT code,name_fa,axis,value_metric FROM module_catalog ORDER BY code')).rows);}
  if(p==='/api/v1/users'&&method==='GET'){if(!user.is_system_admin)throw new ClientError('فقط مدیر سامانه مجاز است',403);return json(res,200,(await pool.query('SELECT id,username,display_name,created_at FROM users ORDER BY created_at DESC')).rows);}
  if(p==='/api/v1/users'&&method==='POST'){if(!user.is_system_admin)throw new ClientError('فقط مدیر سامانه مجاز است',403);let b=await readBody(req);let username=requiredString(b.username,'نام کاربری',100),display=requiredString(b.displayName,'نام',160),password=requiredString(b.password,'رمز عبور',500);if(password.length<14)throw new ClientError('رمز عبور حداقل ۱۴ کاراکتر باشد');let h=await hashPassword(password);let r=await pool.query('INSERT INTO users(username,display_name,password_hash) VALUES($1,$2,$3) RETURNING id,username,display_name',[username,display,h]);return json(res,201,r.rows[0]);}
  if(p==='/api/v1/municipalities'&&method==='GET'){let query=user.is_system_admin?'SELECT id,tenant_id,name FROM municipalities WHERE active=true ORDER BY name':'SELECT m.id,m.tenant_id,m.name FROM municipalities m JOIN memberships mm ON mm.municipality_id=m.id AND mm.tenant_id=m.tenant_id WHERE mm.user_id=$1 AND m.active=true ORDER BY m.name';let result=await pool.query(query,user.is_system_admin?[]:[user.id]);return json(res,200,result.rows);}
  if(p==='/api/v1/municipalities'&&method==='POST'){if(!user.is_system_admin)throw new ClientError('فقط مدیر سامانه مجاز است',403);let body=await readBody(req);let name=requiredString(body.name,'نام شهرداری',150);let created=await createIndependentMunicipality({pool,user,name,conflict:(message)=>new ClientError(message,409),audit});return json(res,201,created);}
  let segments=p.split('/').filter(Boolean);if(segments[0]!=='api'||segments[1]!=='v1'||segments[2]!=='cities'||!segments[3])throw new ClientError('مسیر API یافت نشد',404);
  const cityId=segments[3],part=segments[4],resourceId=segments[5];
    // RHF_DV32UX18_OPERATOR_TEMPORAL_PROOF_ROUTE: city RLS + explicit human operator.
    if (part === 'dv32ux18-temporal-operator') {
      if(!['GET','POST'].includes(method)) throw new ClientError('METHOD_NOT_ALLOWED',405);
      const minimum=method==='POST'?'manage':'read';
      const result=await withScope(cityId,user,minimum,async(client,city,role) =>
        dv32ux18ProofRoute({method,resourceId,client,city,user,role,url:u,headers:req.headers,
          readBody:()=>readBody(req),audit}));
      return json(res,200,result);
    }
    // RHF_DV32UX17_CASE_CHAIN_READONLY_ROUTE: existing current-account RLS only.
    if (part === 'dv32ux17-case-chain-assurance') {
      if(method !== 'GET') throw new ClientError('READ_ONLY',405);
      const result=await withScope(cityId,user,'read',async(client,city,role) =>
        dv32ux17ChainRoute({method,resourceId,client,city,user,role,url:u}));
      return json(res,200,result);
    }
    // RHF_DV32UX13X15_PORTFOLIO_ROUTE: current-account RLS read, NO verified urban value.
    if (part === 'dv32ux13-portfolio-evidence') {
      if(method !== 'GET') throw new ClientError('READ_ONLY',405);
      const result=await withScope(cityId,user,'read',async(client,city,role) =>
        dv32ux13PortfolioRoute({method,resourceId,client,city,user,role,url:u}));
      return json(res,200,result);
    }
    // RHF_DV32UX11X12_ROUTES: human-only proposals/clearance and operator handoff intents.
    if (part === 'dv32ux11-work-orders') {
      const min=method === 'GET' ? 'read' : 'manage';
      const result=await withScope(cityId,user,min,async(client,city,role) =>
        dv32ux11WorkRoute({method,resourceId,client,city,user,role,url:u,headers:req.headers,
          readBody:()=>readBody(req),audit}));
      return json(res,200,result);
    }
    if (part === 'dv32ux12-temporal-handoff') {
      const min=method === 'GET' ? 'read' : 'manage';
      const result=await withScope(cityId,user,min,async(client,city,role) =>
        dv32ux12HandoffRoute({method,resourceId,client,city,user,role,url:u,headers:req.headers,
          readBody:()=>readBody(req),audit}));
      return json(res,200,result);
    }
    // RHF_DV32UX9X10_ROUTES: source proposals and returned-case revisions; no execution.
    if (part === 'dv32ux9-mission-mapping') {
      const min=method === 'GET' ? 'read' : 'manage';
      const result=await withScope(cityId,user,min,async(client,city,role) =>
        dv32ux9MappingRoute({method,resourceId,client,city,user,role,url:u,headers:req.headers,
          readBody:()=>readBody(req),audit}));
      return json(res,200,result);
    }
    if (part === 'dv32ux10-case-revisions') {
      const min=method === 'GET' ? 'read' : 'manage';
      const result=await withScope(cityId,user,min,async(client,city,role) =>
        dv32ux10RevisionRoute({method,resourceId,client,city,user,role,url:u,headers:req.headers,
          readBody:()=>readBody(req),audit}));
      return json(res,200,result);
    }
    // RHF_DV32UX8_ROUTE: approved real case planning draft, no dispatch or reservations.
    if (part === 'dv32ux8-case-planning') {
      const min=method === 'GET' ? 'read' : 'manage';
      const result=await withScope(cityId,user,min,async(client,city,role) =>
        dv32ux8PlanningRoute({method,resourceId,client,city,user,role,url:u,headers:req.headers,
          readBody:()=>readBody(req),audit}));
      return json(res,200,result);
    }
    // RHF_DV32UX7_ROUTE: independent case evidence review; never operational execution.
    if (part === 'dv32ux7-real-case-review') {
      const min=method === 'GET' ? 'read' : 'manage';
      const result=await withScope(cityId,user,min,async(client,city,role) =>
        dv32ux7ReviewRoute({method,resourceId,client,city,user,role,url:u,headers:req.headers,
          readBody:()=>readBody(req),audit}));
      return json(res,200,result);
    }
    // RHF_DV32UX6_ROUTE: current-identity human-authorized REAL DRAFT service case only.
    if (part === 'dv32ux6-governed-case-intake') {
      const min=method === 'GET' ? 'read' : 'manage';
      const result=await withScope(cityId,user,min,async(client,city,role) =>
        dv32ux6CaseIntakeRoute({method,resourceId,client,city,user,role,url:u,headers:req.headers,
          readBody:()=>readBody(req),audit}));
      return json(res,200,result);
    }
    // RHF_DV32Q7_ROUTE: explicit operator-attested REAL reference catalog; no automatic data creation.
    if (part === 'dv32q7-operational-catalog') {
      const min=method === 'GET' ? 'read' : 'manage';
      const result=await withScope(cityId,user,min,async(client,city,role) =>
        dv32q7OperationalCatalogRoute({method,resourceId,client,city,user,role,url:u,headers:req.headers,
          readBody:()=>readBody(req),audit}));
      return json(res,200,result);
    }
    // RHF_DV32Q6_ROUTE: append-only isolated simulation, never operational dispatch.
    if (part === 'dv32q6-synthetic-lifecycle') {
      const min=method === 'GET' ? 'read' : 'manage';
      const result=await withScope(cityId,user,min,async(client,city,role) =>
        dv32q6SyntheticLifecycleRoute({method,resourceId,client,city,user,role,url:u,headers:req.headers,
          readBody:()=>readBody(req),audit}));
      return json(res,200,result);
    }
    // RHF_DV32Q5_ROUTE: read-only isolated synthetic pilot cases (NOT operational records).
    if (part === 'dv32q5-synthetic-pilot') {
      if (method !== 'GET') throw new ClientError('GET_ONLY', 405);
      const result=await withScope(cityId,user,'read',async(client,city,role) =>
        dv32q5SyntheticPilotRoute({method,resourceId,client,city,user,role,url:u}));
      return json(res,200,result);
    }
    // RHF_DV32Q4_ROUTE: read-only, live city mapping worklist.
    if (part === 'dv32q4-mapping-worklist') {
      if (method !== 'GET') throw new ClientError('GET_ONLY', 405);
      const result=await withScope(cityId,user,'read',async(client,city,role) =>
        dv32q4MappingWorklistRoute({method,resourceId,client,city,user,role,url:u}));
      return json(res,200,result);
    }
    // RHF_DV32Q3_ROUTE: explicit human draft-case mission trace.
    if (part === 'dv32q3-mission-case-trace') {
      const min=method === 'GET' ? 'read' : 'manage';
      const result=await withScope(cityId,user,min,async(client,city,role) =>
        dv32q3MissionTraceRoute({method,resourceId,client,city,user,role,url:u,headers:req.headers,
          readBody:()=>readBody(req),audit}));
      return json(res,200,result);
    }
    // RHF_DV32Q2_ROUTE: additive draft-only case-to-territory labeling.
    if (part === 'dv32q2-territory-cases') {
      const min=method === 'GET' ? 'read' : 'manage';
      const result=await withScope(cityId,user,min,async(client,city,role) =>
        dv32q2CaseTerritoryRoute({method,resourceId,client,city,user,role,url:u,headers:req.headers,
          readBody:()=>readBody(req),audit}));
      return json(res,200,result);
    }
    // RHF_DV32Q_ROUTE: authenticated, RLS scoped draft catalog and explicit human mapping only.
    if (part === 'dv32q-shiraz-coverage') {
      const min=method === 'GET' ? 'read' : 'manage';
      const result=await withScope(cityId,user,min,async(client,city,role) =>
        dv32qCoverageRoute({method,resourceId,client,city,user,role,url:u,headers:req.headers,
          readBody:()=>readBody(req),audit}));
      return json(res,200,result);
    }
    // RHF_DV32P_ROUTE: scoped and authenticated; GET-only pilot gap audit.
    if (part === 'dv32p-readiness-audit') {
      const result=await withScope(cityId,user,'read',async(client,city,role) =>
        dv32pPilotAuditRoute({method,resourceId,client,city,user,role,url:u}));
      return json(res,200,result);
    }
    // RHF_DV32O_ROUTE: GET-only, current identity, RLS-scoped access evidence.
    if (part === 'dv32o-access-matrix') {
      const result=await withScope(cityId,user,'read',async(client,city,role) =>
        dv32oAccessMatrixRoute({method,resourceId,client,city,user,role,url:u}));
      return json(res,200,result);
    }
    // RHF_DV32N_ROUTE: GET-only, scoped dossier with optional validated Temporal observation.
    if (part === 'dv32n-evidence-dossier') {
      const result=await withScope(cityId,user,'read',async(client,city,role) =>
        dv32nDossierRoute({method,resourceId,client,city,user,role,url:u}));
      return json(res,200,result);
    }
    // RHF_DV32M_ROUTE: GET-only, scoped, actual Temporal observation after DV32L and DV32J gates.
    if (part === 'dv32m-temporal-status') {
      const result=await withScope(cityId,user,'read',async(client,city,role) =>
        dv32mTemporalStatusRoute({method,resourceId,client,city,user,role,url:u}));
      return json(res,200,result);
    }
    // RHF_DV32L_ROUTE: GET-only evidence -> LangGraph -> human review -> manual Temporal readiness.
    if (part === 'dv32l-governed-readiness') {
      const result=await withScope(cityId,user,'read',async(client,city,role) =>
        dv32lPipelineRoute({method,resourceId,client,city,user,role,url:u}));
      return json(res,200,result);
    }
    // RHF_DV32K_ROUTE: GET-only LangGraph evidence council, no Temporal/DB/operational action.
    if (part === 'dv32k-langgraph-brief') {
      const result=await withScope(cityId,user,'read',async(client,city,role) =>
        dv32kGraphRoute({method,resourceId,client,city,user,role,url:u}));
      return json(res,200,result);
    }
    // RHF_DV32J_ROUTE: explicit human planning handoff, never field execution.
    if (part === 'dv32j-planning-handoffs') {
      const min = method === 'GET' ? 'read' : 'manage';
      const result = await withScope(cityId,user,min,async(client,city,role) =>
        dv32jHandoffRoute({method,resourceId,client,city,user,role,url:u,
          readBody:()=>readBody(req),audit,headers:req.headers}));
      return json(res,200,result);
    }
    // RHF_DV32I_ROUTE: human-reviewed evidence only, no operational authorization.
    if (part === 'dv32i-review-queue') {
      const min = method === 'GET' ? 'read' : 'manage';
      const result = await withScope(cityId,user,min,async(client,city,role) =>
        dv32iReviewRoute({method,resourceId,client,city,user,role,url:u,
          readBody:()=>readBody(req),audit,headers:req.headers}));
      return json(res,200,result);
    }
    // RHF_DV32H_ROUTE: authenticated, city/tenant RLS-scoped, read-only.
    if (part === 'dv32h-agent-briefing') {
      const result = await withScope(cityId,user,'read',async(client,city,role) =>
        dv32hAgentRoute({method,resourceId,client,city,user,role,url:u}));
      return json(res,200,result);
    }
    // RHF_DV32G_ROUTE: authenticated; scoped transaction mandatory for reads AND writes.
    if (part === 'dv32g-org-bindings' || part === 'dv32g-waste-command') {
      const min = (part === 'dv32g-org-bindings' && method !== 'GET') ? 'manage' : 'read';
      const result = await withScope(cityId,user,min,async(client,city,role) => {
        if (part === 'dv32g-org-bindings') return dv32gBindingRoute({method,resourceId,client,city,user,role,
          readBody:()=>readBody(req),audit});
        return dv32gWasteRoute({method,resourceId,client,city,user,role,url:u});
      });
      return json(res,200,result);
    }
    // RHF_DV32F_ROUTE: authenticated + transaction-local city scope, GET-only.
    if (part === 'dv32f-executive-command') {
      if (method !== 'GET' || resourceId) throw new ClientError('Method not allowed', 405);
      const report = await withScope(cityId, user, 'read',
        (client,city,role) => dv32fExecutiveRoute({client,city,role,url:u}));
      return json(res,200,report);
    }
    // RHF_DV32E_GOVERNANCE_ROUTE: authenticated, RLS-scoped GET only.
    if (DV32E_PARTS.includes(part)) {
      if (method !== 'GET') throw new ClientError('Method not allowed', 405);
      const dv32eResult = await withScope(cityId, user, 'read',
        (client,city,role) => dv32eReadRoute({part,client,city,role}));
      return json(res, 200, dv32eResult);
    }
  if(ORG_IDENTITY_PARTS.includes(part))return organizationIdentityRoute({part,method,resourceId,req,url:u,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});
  if(MUNICIPAL_BRANDING_PARTS.includes(part))return municipalityBrandingRoute({part,resourceId,method,req,res,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit,canManage});
  await denyLegacyForScoped({cityId,user,withScope});
  if(AI_PARTS.includes(part))return aiRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});
  if(AGENT_PARTS.includes(part))return urbanAgentRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});
  if(VALUE_BRIDGE_PARTS.includes(part))return valueBridgeRoute({part,method,resourceId,url:u,cityId,user,withScope,json:(status,value)=>json(res,status,value)});
  if(DV2_READINESS_PARTS.includes(part))return dv2ReadinessRoute({part,method,resourceId,url:u,cityId,user,withScope,json:(status,value)=>json(res,status,value)});
  if(DV21_ORG_PARTS.includes(part))return dv21OrgRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});
  if(DV24_ORG_PARTS.includes(part)){if(segments.length!==5)throw new ClientError('DV24_INVALID_PATH',404);return dv24OrgRoute({part,method,resourceId,url:u,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});}
  if(DV25_MISSION_PARTS.includes(part)){if(segments.length!==5)throw new ClientError('DV25_INVALID_PATH',404);return dv25MissionRoute({part,method,resourceId,url:u,cityId,user,withScope,json:(status,value)=>json(res,status,value)});}
  if(DV31_PARTS.includes(part)){if(segments.length!==5)throw new ClientError('DV31_INVALID_PATH',404);return dv31IntakeRoute({part,method,resourceId,url:u,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});}
  if(DV32_PARTS.includes(part)){if(segments.length!==(resourceId?6:5))throw new ClientError('DV32_INVALID_PATH',404);return dv32DispatchRoute({part,method,resourceId,url:u,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});}
  if(DV32B_PARTS.includes(part)){if(segments.length!==(resourceId?6:5))throw new ClientError('DV32B_INVALID_PATH',404);return dv32bMissionRoute({part,method,resourceId,url:u,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});}
  if(DV32C_PARTS.includes(part)){if(segments.length!==(resourceId?6:5))throw new ClientError('DV32C_INVALID_PATH',404);return dv32cResourceRoute({part,method,resourceId,url:u,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});}
  if(DV32D_PARTS.includes(part)){if(segments.length!==(resourceId?6:5))throw new ClientError('DV32D_INVALID_PATH',404);return dv32dCapacityRoute({part,method,resourceId,url:u,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});}
  if(DV22_PARTS.includes(part))return dv22RegistryRoute({part,method,resourceId,url:u,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});
  if(DV23_PARTS.includes(part))return dv23OpportunityRoute({part,method,resourceId,url:u,cityId,user,withScope,json:(status,value)=>json(res,status,value)});
  if(DV23B_PARTS.includes(part))return dv23bDecisionRoute({part,method,resourceId,url:u,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});
  if(DV23B2A_PARTS.includes(part))return dv23b2aAgentHandoffRoute({part,method,resourceId,url:u,cityId,user,withScope,json:(status,value)=>json(res,status,value)});
  if(DV23B2B_PARTS.includes(part)){if(segments.length!==(resourceId?6:5))throw new ClientError('DV23B2B_PATH_INVALID',404);return dv23b2bSpecialistRoute({part,method,resourceId,url:u,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});}
  if(ACTION_PARTS.includes(part))return agentActionRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});
  if(AGENT_BRIEF_PARTS.includes(part))return agentBriefingRoute({part,method,resourceId,cityId,user,withScope,json:(status,value)=>json(res,status,value)});
  if(HANDOFF_PARTS.includes(part))return agentHandoffRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});
  if(SPECIALIST_PARTS.includes(part))return agentSpecialistRoute({part,method,resourceId,cityId,user,withScope,json:(status,value)=>json(res,status,value)});
  if(MISSION_PARTS.includes(part))return agentMissionRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});
  if(GRAPH_PARTS.includes(part))return agentGraphRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});
  if(TEMPORAL_PARTS.includes(part))return agentTemporalRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});
  if(PERFORMANCE_PARTS.includes(part))return performanceConnectorRoute({part,method,resourceId,cityId,user,withScope,json:(status,value)=>json(res,status,value)});
  if(WASTE_PILOT_PARTS.includes(part))return wastePilotRoute({part,method,resourceId,cityId,user,withScope,json:(status,value)=>json(res,status,value)});
  if(WASTE_SUITE_PARTS.includes(part))return wasteSuiteRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});
  if(MY_WORK_PARTS.includes(part))return myWorkRoute({part,method,resourceId,cityId,user,withScope,json:(status,value)=>json(res,status,value)});
  if(AVOS_PARTS.includes(part))return avosNativeRoute({part,method,resourceId,req,cityId,user,withScope,readBody,json:(status,value)=>json(res,status,value),audit});
  if(PULL_PARTS.includes(part))return twinPullRoute({part,method,resourceId,cityId,user,withScope,json:(status,value)=>json(res,status,value),audit});
  const min=method==='GET'?(part==='audit'?'audit':'read'):(part==='outcomes'&&method==='PATCH'?'read':(['modules','org-units','services','contractors'].includes(part)?'manage':'write'));
  let result=await withScope(cityId,user,min,async(client,city,role)=>{
    const q=(sql,params=[])=>client.query(sql,params);
     if(TWIN_SOURCE_PARTS.includes(part))return twinSourceRoute({part,method,resourceId,req,url:u,client,city,user,role,readBody,audit});
     if(TWIN_PARTS.includes(part))return twinRoute({part,method,resourceId,req,url:u,client,city,user,role,readBody,audit});
     if(URBAN_VALUE_PARTS.includes(part))return urbanValueRoute({part,method,resourceId,req,client,city,user,role,readBody,audit});
     if(FUTURE_PARTS.includes(part))return futureRoute({part,method,resourceId,req,client,city,user,role,readBody,audit});
    if(EXECUTION_PARTS.includes(part))return executionRoute({part,method,resourceId,req,url:u,client,city,user,role,readBody,audit});
    if(FINANCE_PARTS.includes(part))return financeRoute({part,method,resourceId,req,url:u,client,city,user,role,readBody,audit});
    if(part==='finance-control'&&method==='GET'&&!resourceId)return readFinancialControl({client,role});
    if(part==='acceptance-trace'&&method==='GET'&&!resourceId)return readAcceptanceTrace({client,role});
    if(part==='pilot-finance-audit'&&method==='GET'&&!resourceId)return readPilotFinanceAudit({client,role});
    if(part==='deputy-cockpit'&&method==='GET')return readDeputyCockpit(q);
    if(part==='access'&&method==='GET')return {role,canWrite:canWrite(role),canManage:canManage(role),systemAdmin:!!user.is_system_admin};
    if(part==='memberships'&&method==='GET'){
      if(!user.is_system_admin&&role!=='MUNICIPAL_ADMIN')throw new ClientError('فقط مدیر شهرداری مجاز است',403);
      return (await q('SELECT u.id,u.username,u.display_name,mm.role FROM memberships mm JOIN users u ON u.id=mm.user_id WHERE mm.tenant_id=$1 AND mm.municipality_id=$2 ORDER BY u.username',[city.tenant_id,city.id])).rows;
    }
    if(part==='memberships'&&method==='POST'){
      // RHF_DV32UX33_IAM_GUARD: no implicit overwrite of an existing city membership.
      if(!user.is_system_admin&&role!=='MUNICIPAL_ADMIN')throw new ClientError('فقط مدیر شهرداری مجاز است',403);
      const b=await readBody(req);
      const uid=uuid(b.userId,'کاربر');
      const requested=choice(b.role,VALID_ROLES,'نقش');
      const exists=await q('SELECT id FROM users WHERE id=$1',[uid]);
      if(!exists.rows.length)throw new ClientError('کاربر موجود نیست',404);
      // FOR UPDATE prevents concurrent changes while decision and write are in one scoped transaction.
      const current=await q('SELECT role FROM memberships WHERE user_id=$1 AND tenant_id=$2 AND municipality_id=$3 FOR UPDATE',[uid,city.tenant_id,city.id]);
      const oldRole=current.rows[0]?.role??null;
      const decision=evaluateMembershipMutation({actor:user,actorRole:role,targetUserId:uid,requestedRole:requested,existingRole:oldRole,action:b.action,expectedRole:b.expectedRole,reason:b.reason});
      if(decision.kind==='UNCHANGED')return {user_id:uid,municipality_id:city.id,role:oldRole,unchanged:true};
      // RHF_DV32UX34_ONBOARDING_APPOINTMENT_GATE: municipal admins cannot grant even
      // initial VIEWER membership unless the target has a current approved city appointment.
      // Lock its appointment row until this membership transaction commits; revocation
      // cannot race ahead of the decision. System-admin grants remain explicit/audited.
      let onboardingApproval=null;
      if(decision.kind==='GRANT'&&!user.is_system_admin){
        const approved=await q(`SELECT a.id,a.position_code FROM rhf_organization_appointments a
          LEFT JOIN org_units o ON o.id=a.org_unit_id AND o.tenant_id=a.tenant_id AND o.municipality_id=a.municipality_id
          WHERE a.tenant_id=$1 AND a.municipality_id=$2 AND a.user_id=$3
            AND a.status='APPROVED' AND a.valid_from<=now()
            AND (a.valid_to IS NULL OR a.valid_to>now())
            AND ((a.position_code='MAYOR' AND a.org_unit_id IS NULL)
              OR (a.position_code<>'MAYOR' AND a.org_unit_id IS NOT NULL AND o.active IS TRUE))
          ORDER BY a.reviewed_at DESC NULLS LAST,a.id LIMIT 1 FOR SHARE OF a`,[city.tenant_id,city.id,uid]);
        if(approved.rows.length!==1)throw new ClientError('عضویت اولیه نیازمند انتصاب معتبر، فعال و تأییدشده در همین شهرداری است',403);
        onboardingApproval=approved.rows[0];
      }
      let row;
      if(decision.kind==='GRANT'){
        const inserted=await q('INSERT INTO memberships(user_id,tenant_id,municipality_id,role) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,municipality_id) DO NOTHING RETURNING user_id,municipality_id,role',[uid,city.tenant_id,city.id,requested]);
        if(inserted.rows.length!==1)throw new ClientError('عضویت هم‌زمان ایجاد شده است؛ ابتدا بازخوانی کنید',409);
        row=inserted.rows[0];
      }else{
        const updated=await q('UPDATE memberships SET role=$4 WHERE user_id=$1 AND tenant_id=$2 AND municipality_id=$3 AND role=$5 RETURNING user_id,municipality_id,role',[uid,city.tenant_id,city.id,requested,oldRole]);
        if(updated.rows.length!==1)throw new ClientError('نقش در حین تغییر به‌روزرسانی شده است',409);
        row=updated.rows[0];
      }
      await audit(client,city,user,'MEMBERSHIP',uid,decision.kind==='GRANT'?'GRANT_ROLE':'CHANGE_ROLE',{previousRole:decision.previousRole,newRole:decision.nextRole,reason:decision.reason||'Initial VIEWER onboarding',approvalAppointmentId:onboardingApproval?.id||null,approvalPositionCode:onboardingApproval?.position_code||null});
      return row;
    }
    if(part==='dashboard'&&method==='GET'){
      let [cases,missions,values,org,mods]=await Promise.all([
       q('SELECT status,count(*)::int AS n FROM service_cases GROUP BY status'),q('SELECT status,count(*)::int AS n FROM missions GROUP BY status'),
       q('SELECT status,baseline_cost_minor,actual_cost_minor,implementation_cost_minor,attribution_bps FROM value_initiatives'),q('SELECT count(*)::int AS n FROM org_units'),q('SELECT count(*)::int AS n FROM module_activations WHERE active')]);
      const operational=await q(`SELECT (SELECT count(*)::int FROM service_definitions WHERE active) AS services,
        (SELECT count(*)::int FROM service_cases WHERE due_at < now() AND status NOT IN ('CLOSED','REJECTED')) AS overdue,
        (SELECT count(*)::int FROM service_cases WHERE status='AWAITING_ACCEPTANCE') AS awaiting,
        (SELECT count(*)::int FROM service_inspections WHERE result='FAIL') AS failed_inspections`);
      return {city:city.name,cases:cases.rows,missions:missions.rows,units:org.rows[0].n,activeModules:mods.rows[0].n,valueInitiatives:values.rows.length,verifiedBenefitMinor:values.rows.reduce((s,row)=>s+valueOf(row),0),...operational.rows[0]};
    }
    if(part==='org-units'&&method==='GET')return (await q('SELECT id,parent_id,code,name_fa,kind,active,created_at FROM org_units ORDER BY kind,name_fa')).rows;
    if(part==='org-units'&&method==='POST'){
      const b=await readBody(req);let code=requiredString(b.code,'کد واحد',60),name=requiredString(b.name,'نام واحد',200);let kind=choice(b.kind,U_TYPES,'نوع واحد');let parent=b.parentId?uuid(b.parentId):null;
      if(parent){let x=await q('SELECT 1 FROM org_units WHERE id=$1',[parent]);if(!x.rows.length)throw new ClientError('واحد بالادستی در این شهرداری یافت نشد',400);}
      let row=(await q('INSERT INTO org_units(tenant_id,municipality_id,parent_id,code,name_fa,kind) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,parent_id,code,name_fa,kind,active',[city.tenant_id,city.id,parent,code,name,kind])).rows[0];
      await audit(client,city,user,'ORG',row.id,'CREATE');return row;
    }
    if(part==='modules'&&method==='GET')return (await q('SELECT c.code,c.name_fa,c.axis,c.value_metric,COALESCE(a.active,false) AS active FROM module_catalog c LEFT JOIN module_activations a ON a.code=c.code AND a.tenant_id=$1 AND a.municipality_id=$2 ORDER BY c.name_fa',[city.tenant_id,city.id])).rows;
    if(part==='modules'&&method==='PUT'&&resourceId){let code=requiredString(resourceId,'کد ماژول',64);let b=await readBody(req);if(typeof b.active!=='boolean')throw new ClientError('وضعیت باید درست یا نادرست باشد');let row=(await q('INSERT INTO module_activations(tenant_id,municipality_id,code,active) VALUES($1,$2,$3,$4) ON CONFLICT (tenant_id,municipality_id,code) DO UPDATE SET active=EXCLUDED.active,updated_at=now() RETURNING code,active',[city.tenant_id,city.id,code,b.active])).rows[0];await audit(client,city,user,'MODULE',row.code,'SET',{active:row.active});return row;}
    // Version 1.1: municipality-specific service definitions and measurable SLAs.
    if(part==='services'&&method==='GET')return (await q(`SELECT s.*,u.name_fa AS owner_name,c.name_fa AS module_name,
      (SELECT count(*)::int FROM service_cases sc WHERE sc.service_id=s.id) AS case_count
      FROM service_definitions s LEFT JOIN org_units u ON u.id=s.owner_unit_id
      JOIN module_catalog c ON c.code=s.module_code ORDER BY s.created_at DESC LIMIT 400`)).rows;
    if(part==='services'&&method==='POST'){
      const b=await readBody(req);const spec=validateService(b);
      if(spec.ownerUnitId){const owner=await q('SELECT 1 FROM org_units WHERE id=$1 AND active',[uuid(spec.ownerUnitId,'واحد مسئول')]);if(!owner.rows.length)throw new ClientError('واحد مسئول در شهرداری فعال نیست',400);}
      const active=await q('SELECT 1 FROM module_activations WHERE code=$1 AND active',[spec.moduleCode]);if(!active.rows.length)throw new ClientError('حوزه خدماتی انتخابی فعال نیست',409);
      const row=(await q(`INSERT INTO service_definitions(tenant_id,municipality_id,module_code,code,name_fa,description,owner_unit_id,sla_hours,outcome_metric)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[city.tenant_id,city.id,spec.moduleCode,spec.code,spec.name,spec.description,spec.ownerUnitId,spec.slaHours,spec.outcomeMetric])).rows[0];
      await audit(client,city,user,'SERVICE',row.id,'CREATE',{code:row.code,slaHours:row.sla_hours});return row;
    }
    if(part==='services'&&method==='PATCH'&&resourceId){uuid(resourceId,'شناسه خدمت');const b=await readBody(req);
      if(typeof b.active!=='boolean')throw new ClientError('وضعیت معتبر نیست');const row=(await q('UPDATE service_definitions SET active=$2,updated_at=now() WHERE id=$1 RETURNING *',[resourceId,b.active])).rows[0];
      if(!row)throw new ClientError('خدمت یافت نشد',404);await audit(client,city,user,'SERVICE',row.id,'SET_ACTIVE',{active:b.active});return row;
    }
    if(part==='quality'&&method==='GET'){
      const rows=await q(`SELECT s.id,s.name_fa,s.code,s.sla_hours,
        count(c.id)::int AS total,
        count(c.id) FILTER (WHERE c.status='CLOSED')::int AS closed,
        count(c.id) FILTER (WHERE c.due_at < now() AND c.status NOT IN ('CLOSED','REJECTED'))::int AS overdue,
        count(c.id) FILTER (WHERE c.status='AWAITING_ACCEPTANCE')::int AS awaiting,
        count(c.id) FILTER (WHERE c.status='CLOSED' AND c.updated_at<=c.due_at)::int AS closed_on_time
        FROM service_definitions s LEFT JOIN service_cases c ON c.service_id=s.id
        GROUP BY s.id,s.name_fa,s.code,s.sla_hours ORDER BY s.name_fa`);
      return rows.rows;
    }
    if(part==='inspections'&&method==='GET')return (await q(`SELECT i.id,i.case_id,i.result,i.evidence,i.notes,i.inspector_id,i.created_at,c.summary AS case_summary
        FROM service_inspections i JOIN service_cases c ON c.id=i.case_id
        ORDER BY i.created_at DESC LIMIT 300`)).rows;
    if(part==='inspections'&&method==='POST'){
      if(!['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR'].includes(role))throw new ClientError('ثبت بازرسی کیفیت فقط برای مسئول مجاز است',403);
      const b=await readBody(req);const record=validateInspection(b);
      const c=await q('SELECT id,status,service_id FROM service_cases WHERE id=$1 FOR UPDATE',[record.caseId]);
      if(!c.rows.length)throw new ClientError('پرونده در این شهرداری یافت نشد',404);
      if(c.rows[0].status!=='AWAITING_ACCEPTANCE')throw new ClientError('بازرسی فقط در مرحله انتظار پذیرش قابل ثبت است',409);
      if(!c.rows[0].service_id)throw new ClientError('پرونده به خدمت تعریف‌شده مرتبط نیست',409);
      const row=(await q(`INSERT INTO service_inspections(tenant_id,municipality_id,case_id,result,evidence,notes,inspector_id)
        VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[city.tenant_id,city.id,record.caseId,record.result,record.evidence,record.notes,user.id])).rows[0];
      await audit(client,city,user,'INSPECTION',row.id,row.result,{caseId:record.caseId});return row;
    }

    if(part==='cases'&&method==='GET')return (await q('SELECT c.*,u.name_fa AS unit_name,s.name_fa AS service_name FROM service_cases c LEFT JOIN org_units u ON u.id=c.unit_id LEFT JOIN service_definitions s ON s.id=c.service_id ORDER BY c.created_at DESC LIMIT 300')).rows;
    if(part==='cases'&&method==='POST'){
      let b=await readBody(req);let summary=requiredString(b.summary,'موضوع',300),module=requiredString(b.moduleCode,'حوزه خدمت',64);let priority=choice(b.priority||'NORMAL',PRIORITIES,'اولویت');let active=await q('SELECT 1 FROM module_activations WHERE code=$1 AND active=true',[module]);if(!active.rows.length)throw new ClientError('این ماژول در شهرداری فعال نیست',409);
      let serviceId=b.serviceId?uuid(b.serviceId,'شناسه خدمت'):null;
      let svc=null;
      if(serviceId){let rs=await q('SELECT id,module_code,owner_unit_id,sla_hours FROM service_definitions WHERE id=$1 AND active',[serviceId]);if(!rs.rows.length)throw new ClientError('خدمت انتخابی در شهرداری فعال نیست',400);svc=rs.rows[0];if(svc.module_code!==module)throw new ClientError('حوزه خدمت با کاتالوگ مغایرت دارد',400);}
      let unit=b.unitId?uuid(b.unitId):svc?.owner_unit_id||null;
      if(unit){let exists=await q('SELECT 1 FROM org_units WHERE id=$1 AND active',[unit]);if(!exists.rows.length)throw new ClientError('واحد مسئول در شهرداری انتخابی فعال نیست');}
      let row=(await q(`INSERT INTO service_cases(tenant_id,municipality_id,module_code,unit_id,service_id,due_at,summary,description,priority,created_by)
         VALUES($1,$2,$3,$4,$5,CASE WHEN $6::integer IS NULL THEN NULL ELSE now()+($6::integer * interval '1 hour') END,$7,$8,$9,$10) RETURNING *`,
         [city.tenant_id,city.id,module,unit,serviceId,svc?.sla_hours||null,summary,String(b.description||'').slice(0,3000),priority,user.id])).rows[0];await audit(client,city,user,'CASE',row.id,'RECEIVED');return row;
    }
    if(part==='cases'&&method==='PATCH'&&resourceId){uuid(resourceId);let b=await readBody(req);let r=await q('SELECT * FROM service_cases WHERE id=$1 FOR UPDATE',[resourceId]);if(!r.rows.length)throw new ClientError('پرونده یافت نشد',404);let old=r.rows[0];let to=choice(b.status,Object.keys(CASE_TRANSITIONS),'وضعیت');transition(old.status,to,CASE_TRANSITIONS);let evidence=typeof b.evidence==='string'?b.evidence.slice(0,2500):old.evidence;let acceptance=typeof b.acceptanceNote==='string'?b.acceptanceNote.slice(0,1000):old.acceptance_note;
      if(['AWAITING_ACCEPTANCE','CLOSED'].includes(to)&&!evidence.trim())throw new ClientError('ثبت شواهد اجرای مأموریت الزامی است');if(to==='CLOSED'&&!acceptance.trim())throw new ClientError('تأیید نهایی و یادداشت پذیرش الزامی است');if(to==='CLOSED'&&!['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR'].includes(role))throw new ClientError('تأیید نهایی فقط توسط مقام مجاز',403);
      if(to==='CLOSED'&&old.service_id){const last=(await q('SELECT result FROM service_inspections WHERE case_id=$1 AND created_at >= $2 ORDER BY created_at DESC,id DESC LIMIT 1',[resourceId,old.updated_at])).rows[0];if(!last||last.result!=='PASS')throw new ClientError('بستن پرونده دارای خدمت مستلزم آخرین بازرسی موفق است',409);}
      if(to==='AWAITING_ACCEPTANCE'&&old.service_id){const outstanding=(await q("SELECT count(*)::int AS n FROM missions WHERE case_id=$1 AND status NOT IN ('DONE','CANCELLED')",[resourceId])).rows[0].n;if(outstanding>0)throw new ClientError('پیش از درخواست پذیرش، مأموریت‌های باز باید تکمیل شوند',409);}
      let row=(await q('UPDATE service_cases SET status=$2,evidence=$3,acceptance_note=$4,updated_at=now() WHERE id=$1 RETURNING *',[resourceId,to,evidence,acceptance])).rows[0];await audit(client,city,user,'CASE',row.id,'STATUS',{from:old.status,to});return row;
    }
    if(part==='missions'&&method==='GET')return (await q('SELECT m.*,c.summary AS case_summary FROM missions m JOIN service_cases c ON c.id=m.case_id ORDER BY m.created_at DESC LIMIT 300')).rows;
    if(part==='missions'&&method==='POST'){let b=await readBody(req);let caseId=uuid(b.caseId,'شناسه پرونده');let x=await q('SELECT id FROM service_cases WHERE id=$1',[caseId]);if(!x.rows.length)throw new ClientError('پرونده در این شهرداری موجود نیست',404);let title=requiredString(b.title,'عنوان مأموریت',250);
      let row=(await q('INSERT INTO missions(tenant_id,municipality_id,case_id,title,assignee) VALUES($1,$2,$3,$4,$5) RETURNING *',[city.tenant_id,city.id,caseId,title,String(b.assignee||'').slice(0,150)])).rows[0];await audit(client,city,user,'MISSION',row.id,'CREATE');return row;
    }
    if(part==='missions'&&method==='PATCH'&&resourceId){uuid(resourceId);let b=await readBody(req);let r=await q('SELECT * FROM missions WHERE id=$1 FOR UPDATE',[resourceId]);if(!r.rows.length)throw new ClientError('مأموریت یافت نشد',404);let prev=r.rows[0];let to=choice(b.status,Object.keys(MISSION_TRANSITIONS),'وضعیت');transition(prev.status,to,MISSION_TRANSITIONS);let evidence=typeof b.evidence==='string'?b.evidence.slice(0,2500):prev.evidence;if(to==='DONE'&&!evidence.trim())throw new ClientError('برای تکمیل مأموریت شواهد الزامی است');let row=(await q('UPDATE missions SET status=$2,evidence=$3,updated_at=now() WHERE id=$1 RETURNING *',[resourceId,to,evidence])).rows[0];await audit(client,city,user,'MISSION',row.id,'STATUS',{from:prev.status,to});return row;}
    if(part==='values'&&method==='GET')return (await q('SELECT * FROM value_initiatives ORDER BY created_at DESC LIMIT 300')).rows.map(v=>({...v,verifiedBenefitMinor:valueOf(v)}));
    if(part==='values'&&method==='POST'){let b=await readBody(req);let title=requiredString(b.title,'عنوان طرح',250);let code=requiredString(b.moduleCode,'ماژول',64);let metric=requiredString(b.metric,'شاخص',150),unit=requiredString(b.unit,'واحد',70);let direction=choice(b.direction||'LOWER',['LOWER','HIGHER'],'جهت شاخص');let baseline=number(b.baseline,'خط مبنا'),target=number(b.target,'هدف');let benefitKey=requiredString(b.benefitKey,'شناسه منفعت',100);
      let x=await q('SELECT 1 FROM module_activations WHERE code=$1 AND active=true',[code]);if(!x.rows.length)throw new ClientError('ماژول فعال نیست',409);
      let vals=['baselineCostMinor','actualCostMinor','implementationCostMinor'].map(k=>amount(b[k]??0,k));let attribution=amount(b.attributionBps??10000,'سهم انتساب');if(attribution>10000)throw new ClientError('سهم انتساب بیش از ۱۰۰٪ است');
      let row=(await q(`INSERT INTO value_initiatives(tenant_id,municipality_id,module_code,title,metric,unit,baseline,target,direction,benefit_key,baseline_cost_minor,actual_cost_minor,implementation_cost_minor,attribution_bps) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,[city.tenant_id,city.id,code,title,metric,unit,baseline,target,direction,benefitKey,...vals,attribution])).rows[0];await audit(client,city,user,'VALUE',row.id,'CREATE');return row;}
    if(part==='values'&&method==='PATCH'&&resourceId){uuid(resourceId);let b=await readBody(req);let x=await q('SELECT * FROM value_initiatives WHERE id=$1 FOR UPDATE',[resourceId]);if(!x.rows.length)throw new ClientError('طرح ارزش یافت نشد',404);let old=x.rows[0];if(old.status==='VERIFIED')throw new ClientError('ارزش تأییدشده قابل ویرایش نیست',409);let status=choice(b.status,['MEASURED','VERIFIED'],'وضعیت');let actual=number(b.actual,'عملکرد واقعی');let evidence=requiredString(b.evidence,'شواهد',2000);
      if(status==='VERIFIED'&&!['MUNICIPAL_ADMIN','DEPUTY','DIRECTOR'].includes(role))throw new ClientError('تأیید ارزش فقط توسط مدیر مجاز',403);
      let row=(await q('UPDATE value_initiatives SET actual=$2,evidence=$3,status=$4,updated_at=now() WHERE id=$1 RETURNING *',[resourceId,actual,evidence,status])).rows[0];await audit(client,city,user,'VALUE',row.id,status);return {...row,verifiedBenefitMinor:valueOf(row)};
    }
    if(part==='audit'&&method==='GET')return (await q('SELECT id,actor_id,kind,entity_id,event,details,created_at FROM audit_events ORDER BY created_at DESC LIMIT 150')).rows;
    throw new ClientError('مسیر API یافت نشد',404);
  });return json(res,method==='POST'?201:200,result);
 }
 if(method!=='GET'&&method!=='HEAD')throw new ClientError('Method not allowed',405);
 let file=p==='/'?'index.html':p.replace(/^\//,'');if(file.includes('..')||file.startsWith('.'))throw new ClientError('Not found',404);
 let target=path.resolve(publicDir,file);if(!target.startsWith(publicDir+path.sep)&&target!==path.join(publicDir,'index.html'))throw new ClientError('Not found',404);
 let data;try{data=await fs.readFile(target);}catch{if(p.includes('.'))throw new ClientError('Not found',404);data=await fs.readFile(path.join(publicDir,'index.html'));file='index.html';}
 const type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'application/octet-stream';
 res.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':file==='index.html'?'no-cache':'public, max-age=86400','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"});if(method==='HEAD')res.end();else res.end(data);
}
await bootstrap();
const server=http.createServer((req,res)=>{main(req,res).catch(err=>error(res,err));});
server.listen(port,'0.0.0.0',()=>console.log(`RHF_CITYOS_READY port=${port}`));
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>server.close(async()=>{await pool.end();process.exit(0)}));
