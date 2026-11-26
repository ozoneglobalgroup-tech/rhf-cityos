-- RHF ACOS 1.3.1: AI-native read-only analysis; no autonomous actions or unapproved source transfer.
-- Two additive, tenant/municipality scoped tables. No external provider enabled by default.
CREATE TABLE IF NOT EXISTS public.ai_knowledge_cards (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL, municipality_id uuid NOT NULL,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 160),
 source_ref text NOT NULL CHECK(length(btrim(source_ref)) BETWEEN 1 AND 350),
 body text NOT NULL CHECK(length(btrim(body)) BETWEEN 30 AND 1600),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','APPROVED','REJECTED')),
 created_by uuid NOT NULL REFERENCES public.users(id),
 reviewed_by uuid REFERENCES public.users(id),
 review_note text NOT NULL DEFAULT '', reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,municipality_id,id),
 FOREIGN KEY(municipality_id,tenant_id) REFERENCES public.municipalities(id,tenant_id),
 CONSTRAINT ai_knowledge_separation CHECK(reviewed_by IS NULL OR reviewed_by<>created_by),
 CONSTRAINT ai_knowledge_review_check CHECK(status='DRAFT' OR (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND length(btrim(review_note)) BETWEEN 8 AND 800))
);
CREATE TABLE IF NOT EXISTS public.ai_interactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL, municipality_id uuid NOT NULL,
 actor_id uuid NOT NULL REFERENCES public.users(id),
 requested_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL CHECK(status IN ('COMPLETED','FAILED')),
 model text NOT NULL CHECK(length(model) BETWEEN 1 AND 80),
 source_refs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(source_refs)='array'),
 request_sha256 char(64) NOT NULL,
 response_sha256 char(64),
 latency_ms integer NOT NULL CHECK(latency_ms BETWEEN 0 AND 600000),
 UNIQUE(tenant_id,municipality_id,id),
 FOREIGN KEY(municipality_id,tenant_id) REFERENCES public.municipalities(id,tenant_id)
);
CREATE INDEX IF NOT EXISTS ai_knowledge_city_review_idx ON public.ai_knowledge_cards(tenant_id,municipality_id,status,reviewed_at DESC);
CREATE INDEX IF NOT EXISTS ai_interactions_city_idx ON public.ai_interactions(tenant_id,municipality_id,requested_at DESC);
DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT unnest(ARRAY['ai_knowledge_cards','ai_interactions']) LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',t||'_read',t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (tenant_id=NULLIF(current_setting(''app.tenant_id'',true),'''')::uuid AND municipality_id=NULLIF(current_setting(''app.municipality_id'',true),'''')::uuid)',t||'_read',t);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',t||'_insert',t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (tenant_id=NULLIF(current_setting(''app.tenant_id'',true),'''')::uuid AND municipality_id=NULLIF(current_setting(''app.municipality_id'',true),'''')::uuid AND NULLIF(current_setting(''app.actor_id'',true),'''') IS NOT NULL)',t||'_insert',t);
 END LOOP;
END $$;
DROP POLICY IF EXISTS ai_knowledge_cards_update ON public.ai_knowledge_cards;
CREATE POLICY ai_knowledge_cards_update ON public.ai_knowledge_cards FOR UPDATE
 USING (tenant_id=NULLIF(current_setting('app.tenant_id',true),'')::uuid AND municipality_id=NULLIF(current_setting('app.municipality_id',true),'')::uuid)
 WITH CHECK (tenant_id=NULLIF(current_setting('app.tenant_id',true),'')::uuid AND municipality_id=NULLIF(current_setting('app.municipality_id',true),'')::uuid AND NULLIF(current_setting('app.actor_id',true),'') IS NOT NULL);
GRANT SELECT,INSERT,UPDATE ON public.ai_knowledge_cards TO cityos_runtime;
GRANT SELECT,INSERT ON public.ai_interactions TO cityos_runtime;
REVOKE DELETE ON public.ai_knowledge_cards,public.ai_interactions FROM cityos_runtime;
REVOKE UPDATE ON public.ai_interactions FROM cityos_runtime;
COMMENT ON TABLE public.ai_knowledge_cards IS 'Curated contextual evidence. Only independently APPROVED cards may be included in external AI requests with individual explicit consent.';
COMMENT ON TABLE public.ai_interactions IS 'Hash-only audit of explicit AI inference. No raw prompts, model outputs, API keys or cookies stored. This table is not a financial/benefit outcome ledger.';
