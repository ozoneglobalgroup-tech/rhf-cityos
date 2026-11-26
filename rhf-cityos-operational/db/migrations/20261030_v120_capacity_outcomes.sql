-- RHF City OS 1.2 | additive, idempotent schema. Apply as cityos_owner in one transaction.
-- Each table is tenant+municipality scoped and FORCE RLS. Does not modify RUVOS.
CREATE TABLE IF NOT EXISTS public.capacity_resources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL, municipality_id uuid NOT NULL,
 code text NOT NULL, name_fa text NOT NULL,
 resource_kind text NOT NULL CHECK(resource_kind IN ('STAFF_HOURS','FLEET_HOURS','EQUIPMENT_HOURS','SPACE_SQM','WATER_M3','BUDGET_MINOR','OTHER')),
 unit text NOT NULL, total_quantity numeric(20,3) NOT NULL CHECK(total_quantity>=0),
 allocatable_bps integer NOT NULL DEFAULT 10000 CHECK(allocatable_bps BETWEEN 0 AND 10000),
 quality_bps integer NOT NULL DEFAULT 10000 CHECK(quality_bps BETWEEN 0 AND 10000),
 reserve_quantity numeric(20,3) NOT NULL DEFAULT 0 CHECK(reserve_quantity>=0),
 owner_unit_id uuid NOT NULL,
 constraints_note text NOT NULL DEFAULT '', authorized boolean NOT NULL DEFAULT false,
 created_by uuid NOT NULL REFERENCES public.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,municipality_id,id), UNIQUE(tenant_id,municipality_id,code),
 FOREIGN KEY(municipality_id,tenant_id) REFERENCES public.municipalities(id,tenant_id),
 FOREIGN KEY(tenant_id,municipality_id,owner_unit_id) REFERENCES public.org_units(tenant_id,municipality_id,id)
);
CREATE TABLE IF NOT EXISTS public.capacity_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,municipality_id uuid NOT NULL,
 resource_id uuid NOT NULL, case_id uuid NOT NULL,
 quantity numeric(20,3) NOT NULL CHECK(quantity>0),
 status text NOT NULL DEFAULT 'RESERVED' CHECK(status IN ('RESERVED','RELEASED')),
 request_key uuid NOT NULL, justification text NOT NULL,
 created_by uuid NOT NULL REFERENCES public.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), released_at timestamptz,
 UNIQUE(tenant_id,municipality_id,request_key),
 FOREIGN KEY(tenant_id,municipality_id,resource_id) REFERENCES public.capacity_resources(tenant_id,municipality_id,id),
 FOREIGN KEY(case_id,tenant_id,municipality_id) REFERENCES public.service_cases(id,tenant_id,municipality_id),
 FOREIGN KEY(municipality_id,tenant_id) REFERENCES public.municipalities(id,tenant_id)
);
CREATE INDEX IF NOT EXISTS capacity_allocations_resource_idx ON public.capacity_allocations(tenant_id,municipality_id,resource_id,status);
CREATE TABLE IF NOT EXISTS public.public_value_outcomes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, municipality_id uuid NOT NULL,
 case_id uuid NOT NULL, dimension text NOT NULL CHECK(dimension IN ('SERVICE','EQUITY','ENVIRONMENT','FISCAL','TRUST','RESILIENCE','WELLBEING')),
 metric text NOT NULL, unit text NOT NULL,
 baseline numeric(20,4), target numeric(20,4), actual numeric(20,4),
 evidence text NOT NULL DEFAULT '', source_note text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','MEASURED','VERIFIED')),
 created_by uuid NOT NULL REFERENCES public.users(id), verified_by uuid REFERENCES public.users(id),
 verified_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,tenant_id,municipality_id),
 FOREIGN KEY(case_id,tenant_id,municipality_id) REFERENCES public.service_cases(id,tenant_id,municipality_id),
 FOREIGN KEY(municipality_id,tenant_id) REFERENCES public.municipalities(id,tenant_id),
 CONSTRAINT outcome_verified_evidence CHECK (status <> 'VERIFIED' OR (actual IS NOT NULL AND length(trim(evidence))>0 AND verified_by IS NOT NULL)),
 CONSTRAINT outcome_independent_verifier CHECK (verified_by IS NULL OR verified_by <> created_by)
);
CREATE INDEX IF NOT EXISTS public_value_outcomes_city_idx ON public.public_value_outcomes(tenant_id,municipality_id,dimension,status);

DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT unnest(ARRAY['capacity_resources','capacity_allocations','public_value_outcomes']) LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',t);
   EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',t||'_select',t);
   EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (tenant_id=NULLIF(current_setting(''app.tenant_id'',true),'''')::uuid AND municipality_id=NULLIF(current_setting(''app.municipality_id'',true),'''')::uuid)',t||'_select',t);
   EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',t||'_insert',t);
   EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (tenant_id=NULLIF(current_setting(''app.tenant_id'',true),'''')::uuid AND municipality_id=NULLIF(current_setting(''app.municipality_id'',true),'''')::uuid AND NULLIF(current_setting(''app.actor_id'',true),'''') IS NOT NULL)',t||'_insert',t);
   EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',t||'_update',t);
   EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (tenant_id=NULLIF(current_setting(''app.tenant_id'',true),'''')::uuid AND municipality_id=NULLIF(current_setting(''app.municipality_id'',true),'''')::uuid) WITH CHECK (tenant_id=NULLIF(current_setting(''app.tenant_id'',true),'''')::uuid AND municipality_id=NULLIF(current_setting(''app.municipality_id'',true),'''')::uuid AND NULLIF(current_setting(''app.actor_id'',true),'''') IS NOT NULL)',t||'_update',t);
 END LOOP;
END $$;
GRANT SELECT,INSERT,UPDATE ON public.capacity_resources,public.capacity_allocations,public.public_value_outcomes TO cityos_runtime;
REVOKE DELETE ON public.capacity_resources,public.capacity_allocations,public.public_value_outcomes FROM cityos_runtime;
COMMENT ON TABLE public.capacity_resources IS 'Verified resource inventory separate from available/usable capacity; reserves preserved for resilience';
COMMENT ON TABLE public.public_value_outcomes IS 'Public value vector: independent review, does not automatically monetize social benefits';
