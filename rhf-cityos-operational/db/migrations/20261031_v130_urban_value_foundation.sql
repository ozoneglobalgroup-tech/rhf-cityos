-- RHF City OS v1.3.0, incremental. Does NOT create or verify outcomes, funds, approvals or AI agents.
-- 2 new tables scoped to current tenant + municipality. Proposals are NOT actual capacity allocations.
CREATE TABLE IF NOT EXISTS public.urban_value_cases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,municipality_id uuid NOT NULL,case_id uuid NOT NULL,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 200),
 public_need text NOT NULL CHECK(length(btrim(public_need)) BETWEEN 1 AND 2000),
 beneficiaries text NOT NULL CHECK(length(btrim(beneficiaries)) BETWEEN 1 AND 500),
 geography text NOT NULL CHECK(length(btrim(geography)) BETWEEN 1 AND 350),
 barrier text NOT NULL CHECK(barrier IN ('DISCOVERY','LEGAL_ACCESS','QUALITY','SCHEDULING','COORDINATION','FUNDING','OTHER')),
 authority_reference text NOT NULL CHECK(length(btrim(authority_reference)) BETWEEN 1 AND 500),
 baseline_method text NOT NULL CHECK(length(btrim(baseline_method)) BETWEEN 1 AND 1300),
 comparator text NOT NULL CHECK(length(btrim(comparator)) BETWEEN 1 AND 1300),
 value_dimension text NOT NULL CHECK(value_dimension IN ('SERVICE','EQUITY','ENVIRONMENT','FISCAL','TRUST','RESILIENCE','WELLBEING')),
 status text NOT NULL DEFAULT 'DISCOVERY' CHECK(status IN ('DISCOVERY','REVIEWED')),
 review_evidence text NOT NULL DEFAULT '',
 created_by uuid NOT NULL REFERENCES public.users(id),reviewed_by uuid REFERENCES public.users(id),
 reviewed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,municipality_id,id),UNIQUE(tenant_id,municipality_id,case_id),
 FOREIGN KEY(case_id,tenant_id,municipality_id) REFERENCES public.service_cases(id,tenant_id,municipality_id),
 FOREIGN KEY(municipality_id,tenant_id) REFERENCES public.municipalities(id,tenant_id),
 CONSTRAINT uv_case_review_separation CHECK(reviewed_by IS NULL OR reviewed_by<>created_by),
 CONSTRAINT uv_case_review_evidence CHECK(status='DISCOVERY' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND length(btrim(review_evidence))>=1))
);
CREATE TABLE IF NOT EXISTS public.urban_capacity_matches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,municipality_id uuid NOT NULL,
 value_case_id uuid NOT NULL,resource_id uuid NOT NULL,
 requested_quantity numeric(20,3) NOT NULL CHECK(requested_quantity>0 AND requested_quantity<=1000000000000),
 purpose text NOT NULL CHECK(length(btrim(purpose)) BETWEEN 1 AND 1100),
 status text NOT NULL DEFAULT 'PROPOSED' CHECK(status IN ('PROPOSED','FEASIBLE','REJECTED')),
 review_evidence text NOT NULL DEFAULT '',
 created_by uuid NOT NULL REFERENCES public.users(id), reviewed_by uuid REFERENCES public.users(id),
 reviewed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,municipality_id,id),UNIQUE(tenant_id,municipality_id,value_case_id,resource_id),
 FOREIGN KEY(tenant_id,municipality_id,value_case_id) REFERENCES public.urban_value_cases(tenant_id,municipality_id,id),
 FOREIGN KEY(tenant_id,municipality_id,resource_id) REFERENCES public.capacity_resources(tenant_id,municipality_id,id),
 FOREIGN KEY(municipality_id,tenant_id) REFERENCES public.municipalities(id,tenant_id),
 CONSTRAINT uv_match_review_separation CHECK(reviewed_by IS NULL OR reviewed_by<>created_by),
 CONSTRAINT uv_match_review_evidence CHECK(status='PROPOSED' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND length(btrim(review_evidence))>=1))
);
CREATE INDEX IF NOT EXISTS uv_cases_status_idx ON public.urban_value_cases(tenant_id,municipality_id,status);
CREATE INDEX IF NOT EXISTS uv_matches_status_idx ON public.urban_capacity_matches(tenant_id,municipality_id,status);
DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT unnest(ARRAY['urban_value_cases','urban_capacity_matches']) LOOP
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
GRANT SELECT,INSERT,UPDATE ON public.urban_value_cases,public.urban_capacity_matches TO cityos_runtime;
REVOKE DELETE ON public.urban_value_cases,public.urban_capacity_matches FROM cityos_runtime;
COMMENT ON TABLE public.urban_value_cases IS 'Need / capacity barrier / counterfactual framing. REVIEWED = independently screened proposal, NOT verified impact, financial benefit or official legal authorization.';
COMMENT ON TABLE public.urban_capacity_matches IS 'FEASIBLE = nonbinding feasibility check at review time. NOT actual allocation. Future allocation requires normal city capacity API and fresh availability check.';
