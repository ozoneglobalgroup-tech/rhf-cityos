-- RHF City OS: separate local instance. This migration runs ONLY on a freshly initialized dedicated DB.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE tenants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE municipalities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id), name text NOT NULL, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,name), UNIQUE(id,tenant_id));
CREATE TABLE users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username text NOT NULL UNIQUE, display_name text NOT NULL, password_hash text NOT NULL, is_system_admin boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE memberships(user_id uuid NOT NULL REFERENCES users(id),tenant_id uuid NOT NULL, municipality_id uuid NOT NULL, role text NOT NULL CHECK(role IN ('MUNICIPAL_ADMIN','DEPUTY','DIRECTOR','OPERATOR','AUDITOR','VIEWER')),PRIMARY KEY(user_id,municipality_id),FOREIGN KEY(municipality_id,tenant_id) REFERENCES municipalities(id,tenant_id));
CREATE TABLE sessions(token_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE module_catalog(code text PRIMARY KEY,name_fa text NOT NULL,axis text NOT NULL,value_metric text NOT NULL);
CREATE TABLE org_units(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,municipality_id uuid NOT NULL,
 parent_id uuid,code text NOT NULL,name_fa text NOT NULL,kind text NOT NULL CHECK(kind IN ('MUNICIPALITY','DEPUTY','ORGANIZATION','DIRECTORATE','DEPARTMENT','DISTRICT','SUBDISTRICT','SITE','OPERATION_TEAM','CONTRACTOR_INTERFACE')),
 active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,municipality_id,id),UNIQUE(tenant_id,municipality_id,code),
 FOREIGN KEY(municipality_id,tenant_id) REFERENCES municipalities(id,tenant_id),
 FOREIGN KEY(tenant_id,municipality_id,parent_id) REFERENCES org_units(tenant_id,municipality_id,id));
CREATE TABLE module_activations(tenant_id uuid NOT NULL,municipality_id uuid NOT NULL,code text NOT NULL REFERENCES module_catalog(code),active boolean NOT NULL DEFAULT true,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,municipality_id,code),FOREIGN KEY(municipality_id,tenant_id) REFERENCES municipalities(id,tenant_id));
CREATE TABLE service_cases(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,municipality_id uuid NOT NULL,module_code text NOT NULL REFERENCES module_catalog(code),
 unit_id uuid,summary text NOT NULL,description text NOT NULL DEFAULT '',priority text NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('LOW','NORMAL','HIGH','CRITICAL')),
 evidence text NOT NULL DEFAULT '',acceptance_note text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'RECEIVED' CHECK(status IN ('RECEIVED','TRIAGED','ASSIGNED','IN_PROGRESS','AWAITING_ACCEPTANCE','CLOSED','REJECTED')),
 created_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,tenant_id,municipality_id),FOREIGN KEY(municipality_id,tenant_id) REFERENCES municipalities(id,tenant_id),FOREIGN KEY(tenant_id,municipality_id,unit_id) REFERENCES org_units(tenant_id,municipality_id,id));
CREATE TABLE missions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,municipality_id uuid NOT NULL,case_id uuid NOT NULL,
 title text NOT NULL,assignee text NOT NULL DEFAULT '',evidence text NOT NULL DEFAULT '',status text NOT NULL DEFAULT 'PLANNED' CHECK(status IN ('PLANNED','ACTIVE','DONE','CANCELLED')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(case_id,tenant_id,municipality_id) REFERENCES service_cases(id,tenant_id,municipality_id),FOREIGN KEY(municipality_id,tenant_id) REFERENCES municipalities(id,tenant_id));
CREATE TABLE value_initiatives(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,municipality_id uuid NOT NULL,
 module_code text NOT NULL REFERENCES module_catalog(code),title text NOT NULL,metric text NOT NULL,unit text NOT NULL,
 baseline numeric(20,4) NOT NULL,target numeric(20,4) NOT NULL,actual numeric(20,4),
 direction text NOT NULL CHECK(direction IN ('LOWER','HIGHER')),evidence text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','MEASURED','VERIFIED')),
 benefit_key text NOT NULL,baseline_cost_minor bigint NOT NULL DEFAULT 0 CHECK(baseline_cost_minor>=0),
 actual_cost_minor bigint NOT NULL DEFAULT 0 CHECK(actual_cost_minor>=0),
 implementation_cost_minor bigint NOT NULL DEFAULT 0 CHECK(implementation_cost_minor>=0),
 attribution_bps integer NOT NULL DEFAULT 10000 CHECK(attribution_bps BETWEEN 0 AND 10000),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,municipality_id,benefit_key),FOREIGN KEY(municipality_id,tenant_id) REFERENCES municipalities(id,tenant_id),
 CHECK(status <> 'VERIFIED' OR (actual IS NOT NULL AND length(trim(evidence))>0)));
CREATE TABLE audit_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,tenant_id uuid NOT NULL,municipality_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES users(id),kind text NOT NULL,entity_id text NOT NULL,event text NOT NULL,details jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX case_city_status_idx ON service_cases(tenant_id,municipality_id,status,created_at DESC);
CREATE INDEX mission_city_idx ON missions(tenant_id,municipality_id,created_at DESC);
CREATE INDEX audit_city_idx ON audit_events(tenant_id,municipality_id,created_at DESC);
-- Fail closed: for ALL scoped tables, RLS uses transaction-local GUCs. Runtime is not owner.
DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT unnest(ARRAY['org_units','module_activations','service_cases','missions','value_initiatives','audit_events']) LOOP
   EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
   EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
   EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (tenant_id = NULLIF(current_setting(''app.tenant_id'',true),'''')::uuid AND municipality_id = NULLIF(current_setting(''app.municipality_id'',true),'''')::uuid)',t||'_select',t);
   EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'',true),'''')::uuid AND municipality_id = NULLIF(current_setting(''app.municipality_id'',true),'''')::uuid AND NULLIF(current_setting(''app.actor_id'',true),'''') IS NOT NULL)',t||'_insert',t);
   IF t <> 'audit_events' THEN
     EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (tenant_id = NULLIF(current_setting(''app.tenant_id'',true),'''')::uuid AND municipality_id = NULLIF(current_setting(''app.municipality_id'',true),'''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'',true),'''')::uuid AND municipality_id = NULLIF(current_setting(''app.municipality_id'',true),'''')::uuid AND NULLIF(current_setting(''app.actor_id'',true),'''') IS NOT NULL)',t||'_update',t);
   END IF;
 END LOOP;
END $$;
-- No delete privilege and no DELETE policies: audit and history must not be erased by runtime.
GRANT USAGE ON SCHEMA public TO cityos_runtime;
GRANT SELECT,INSERT,UPDATE ON tenants,municipalities,users,memberships,sessions TO cityos_runtime;
GRANT DELETE ON sessions TO cityos_runtime;
GRANT SELECT ON module_catalog TO cityos_runtime;
GRANT SELECT,INSERT,UPDATE ON org_units,module_activations,service_cases,missions,value_initiatives TO cityos_runtime;
GRANT SELECT,INSERT ON audit_events TO cityos_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO cityos_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
