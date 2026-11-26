-- v1.1 additive migration, rerunnable. Must execute using cityos_owner with -1 and ON_ERROR_STOP.
CREATE TABLE IF NOT EXISTS public.service_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,municipality_id uuid NOT NULL,
 module_code text NOT NULL REFERENCES public.module_catalog(code),code text NOT NULL,name_fa text NOT NULL,
 description text NOT NULL DEFAULT '',owner_unit_id uuid,sla_hours integer NOT NULL CHECK(sla_hours BETWEEN 1 AND 8760),
 outcome_metric text NOT NULL,active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,tenant_id,municipality_id), UNIQUE(tenant_id,municipality_id,code),
 FOREIGN KEY(municipality_id,tenant_id) REFERENCES public.municipalities(id,tenant_id),
 FOREIGN KEY(tenant_id,municipality_id,owner_unit_id) REFERENCES public.org_units(tenant_id,municipality_id,id)
);
ALTER TABLE public.service_cases ADD COLUMN IF NOT EXISTS service_id uuid;
ALTER TABLE public.service_cases ADD COLUMN IF NOT EXISTS due_at timestamptz;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_service_case_definition' AND conrelid='public.service_cases'::regclass) THEN
  ALTER TABLE public.service_cases ADD CONSTRAINT fk_service_case_definition
  FOREIGN KEY(service_id,tenant_id,municipality_id) REFERENCES public.service_definitions(id,tenant_id,municipality_id);
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS service_cases_sla_idx ON public.service_cases(tenant_id,municipality_id,due_at) WHERE due_at IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.service_inspections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,municipality_id uuid NOT NULL,
 case_id uuid NOT NULL,result text NOT NULL CHECK(result IN ('PASS','FAIL')),
 evidence text NOT NULL CHECK(length(trim(evidence))>0),notes text NOT NULL DEFAULT '',
 inspector_id uuid NOT NULL REFERENCES public.users(id),created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(case_id,tenant_id,municipality_id) REFERENCES public.service_cases(id,tenant_id,municipality_id),
 FOREIGN KEY(municipality_id,tenant_id) REFERENCES public.municipalities(id,tenant_id)
);
CREATE INDEX IF NOT EXISTS service_inspections_case_idx ON public.service_inspections(tenant_id,municipality_id,case_id,created_at DESC);
DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT unnest(ARRAY['service_definitions','service_inspections']) LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',t);
   EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',t||'_select',t);
   EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (tenant_id=NULLIF(current_setting(''app.tenant_id'',true),'''')::uuid AND municipality_id=NULLIF(current_setting(''app.municipality_id'',true),'''')::uuid)',t||'_select',t);
   EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',t||'_insert',t);
   EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (tenant_id=NULLIF(current_setting(''app.tenant_id'',true),'''')::uuid AND municipality_id=NULLIF(current_setting(''app.municipality_id'',true),'''')::uuid AND NULLIF(current_setting(''app.actor_id'',true),'''') IS NOT NULL)',t||'_insert',t);
 END LOOP;
END $$;
DROP POLICY IF EXISTS service_definitions_update ON public.service_definitions;
CREATE POLICY service_definitions_update ON public.service_definitions FOR UPDATE
 USING (tenant_id=NULLIF(current_setting('app.tenant_id',true),'')::uuid AND municipality_id=NULLIF(current_setting('app.municipality_id',true),'')::uuid)
 WITH CHECK (tenant_id=NULLIF(current_setting('app.tenant_id',true),'')::uuid AND municipality_id=NULLIF(current_setting('app.municipality_id',true),'')::uuid AND NULLIF(current_setting('app.actor_id',true),'') IS NOT NULL);
GRANT SELECT,INSERT,UPDATE ON public.service_definitions TO cityos_runtime;
GRANT SELECT,INSERT ON public.service_inspections TO cityos_runtime;
REVOKE UPDATE,DELETE ON public.service_inspections FROM cityos_runtime;
COMMENT ON TABLE public.service_definitions IS 'Version 1.1 municipality-specific services with SLA and owner unit';
