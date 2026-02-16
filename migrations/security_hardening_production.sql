-- ============================================
-- SECURITY HARDENING - PRODUCTION (public schema)
-- BidEval v2 - February 2026
-- ============================================
-- Run AFTER v2_production_migration.sql
--
-- Fixes:
--   1. Scoring audit log with triggers
--   2. Block anon writes to scoring result tables
--   3. Secure RPC for weight-based score recalculation
--   4. Server-side token expiration enforcement via RLS
-- ============================================

BEGIN;

-- ============================================
-- 1. SCORING AUDIT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.scoring_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    provider_name TEXT,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scoring_audit_log_project ON public.scoring_audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_scoring_audit_log_created ON public.scoring_audit_log(created_at DESC);

-- RLS: read-only for anon (only SECURITY DEFINER functions can write)
ALTER TABLE public.scoring_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read audit log" ON public.scoring_audit_log;
CREATE POLICY "Allow read audit log" ON public.scoring_audit_log
    FOR SELECT USING (true);

-- No INSERT/UPDATE/DELETE policies for anon → only table owner (via SECURITY DEFINER) can write


-- ============================================
-- 2. AUDIT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.log_scoring_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO public.scoring_audit_log (project_id, table_name, operation, provider_name, old_data, new_data)
        VALUES (
            NEW.project_id,
            TG_TABLE_NAME,
            TG_OP,
            CASE WHEN TG_TABLE_NAME = 'ranking_proveedores' THEN NEW.provider_name ELSE NULL END,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb
        );
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.scoring_audit_log (project_id, table_name, operation, provider_name, new_data)
        VALUES (
            NEW.project_id,
            TG_TABLE_NAME,
            TG_OP,
            CASE WHEN TG_TABLE_NAME = 'ranking_proveedores' THEN NEW.provider_name ELSE NULL END,
            row_to_json(NEW)::jsonb
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.scoring_audit_log (project_id, table_name, operation, provider_name, old_data)
        VALUES (
            OLD.project_id,
            TG_TABLE_NAME,
            TG_OP,
            CASE WHEN TG_TABLE_NAME = 'ranking_proveedores' THEN OLD.provider_name ELSE NULL END,
            row_to_json(OLD)::jsonb
        );
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to ranking_proveedores
DROP TRIGGER IF EXISTS trigger_audit_ranking_proveedores ON public.ranking_proveedores;
CREATE TRIGGER trigger_audit_ranking_proveedores
    AFTER INSERT OR UPDATE OR DELETE ON public.ranking_proveedores
    FOR EACH ROW
    EXECUTE FUNCTION public.log_scoring_changes();

-- Apply audit trigger to scoring_weight_configs
DROP TRIGGER IF EXISTS trigger_audit_scoring_weight_configs ON public.scoring_weight_configs;
CREATE TRIGGER trigger_audit_scoring_weight_configs
    AFTER INSERT OR UPDATE OR DELETE ON public.scoring_weight_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.log_scoring_changes();

-- Apply audit trigger to scoring_categories
DROP TRIGGER IF EXISTS trigger_audit_scoring_categories ON public.scoring_categories;
CREATE TRIGGER trigger_audit_scoring_categories
    AFTER INSERT OR UPDATE OR DELETE ON public.scoring_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.log_scoring_changes();


-- ============================================
-- 3. RLS: BLOCK ANON WRITES TO SCORING RESULTS
-- ============================================

-- ranking_proveedores: SELECT only for anon
DROP POLICY IF EXISTS "Allow all on ranking_proveedores" ON public.ranking_proveedores;

DROP POLICY IF EXISTS "Allow read ranking_proveedores" ON public.ranking_proveedores;
CREATE POLICY "Allow read ranking_proveedores" ON public.ranking_proveedores
    FOR SELECT USING (true);

-- No INSERT/UPDATE/DELETE policies → anon cannot write
-- service_role (n8n) bypasses RLS entirely
-- SECURITY DEFINER functions (recalculate RPC) bypass RLS as table owner

-- provider_criterion_scores: SELECT only for anon
DROP POLICY IF EXISTS "Allow all operations on provider_criterion_scores" ON public.provider_criterion_scores;

DROP POLICY IF EXISTS "Allow read provider_criterion_scores" ON public.provider_criterion_scores;
CREATE POLICY "Allow read provider_criterion_scores" ON public.provider_criterion_scores
    FOR SELECT USING (true);


-- ============================================
-- 4. RPC: SECURE WEIGHT-BASED SCORE RECALCULATION
-- ============================================

CREATE OR REPLACE FUNCTION public.recalculate_scores_with_weights(
    p_project_id UUID,
    p_weights JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_provider RECORD;
    v_category RECORD;
    v_criterion RECORD;
    v_individual_scores JSONB;
    v_new_overall DECIMAL(10,4);
    v_category_scores JSONB;
    v_cat_weighted_sum DECIMAL(10,4);
    v_cat_total_weight DECIMAL(10,4);
    v_score DECIMAL(10,4);
    v_weight DECIMAL(10,4);
    v_count INTEGER := 0;
    v_key TEXT;
BEGIN
    -- Validate inputs
    IF p_project_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'project_id is required');
    END IF;
    IF p_weights IS NULL OR p_weights = '{}'::jsonb THEN
        RETURN jsonb_build_object('success', false, 'error', 'weights object is required');
    END IF;

    -- Iterate over each provider ranking for this project
    FOR v_provider IN
        SELECT id, provider_name, individual_scores_json
        FROM public.ranking_proveedores
        WHERE project_id = p_project_id
    LOOP
        v_individual_scores := COALESCE(v_provider.individual_scores_json, '{}'::jsonb);

        -- Calculate new overall score using provided weights
        v_new_overall := 0;
        FOR v_key IN SELECT jsonb_object_keys(p_weights)
        LOOP
            v_score := COALESCE((v_individual_scores->>v_key)::decimal, 0);
            -- Normalize score to 0-10 scale
            IF v_score > 10 THEN v_score := v_score / 10; END IF;
            v_weight := COALESCE((p_weights->>v_key)::decimal, 0);
            v_new_overall := v_new_overall + (v_score * v_weight / 100);
        END LOOP;

        -- Calculate category scores using scoring_categories config
        v_category_scores := '{}'::jsonb;
        FOR v_category IN
            SELECT sc.name, sc.weight AS cat_weight, sc.id AS cat_id
            FROM public.scoring_categories sc
            WHERE sc.project_id = p_project_id
            ORDER BY sc.sort_order
        LOOP
            v_cat_weighted_sum := 0;
            v_cat_total_weight := 0;

            FOR v_criterion IN
                SELECT scr.name, scr.weight AS crit_weight
                FROM public.scoring_criteria scr
                WHERE scr.category_id = v_category.cat_id
                ORDER BY scr.sort_order
            LOOP
                v_score := COALESCE((v_individual_scores->>v_criterion.name)::decimal, 0);
                IF v_score > 10 THEN v_score := v_score / 10; END IF;
                v_weight := (v_criterion.crit_weight * v_category.cat_weight) / 100;
                v_cat_weighted_sum := v_cat_weighted_sum + (v_score * v_weight);
                v_cat_total_weight := v_cat_total_weight + v_weight;
            END LOOP;

            IF v_cat_total_weight > 0 THEN
                v_category_scores := v_category_scores || jsonb_build_object(
                    v_category.name, ROUND(v_cat_weighted_sum / v_cat_total_weight, 2)
                );
            ELSE
                v_category_scores := v_category_scores || jsonb_build_object(v_category.name, 0);
            END IF;
        END LOOP;

        -- Update the provider's scores (bypasses RLS as SECURITY DEFINER)
        UPDATE public.ranking_proveedores
        SET overall_score = ROUND(v_new_overall, 2),
            category_scores_json = v_category_scores,
            technical_score = COALESCE((v_category_scores->>'technical')::decimal, technical_score),
            economic_score = COALESCE((v_category_scores->>'economic')::decimal, economic_score),
            execution_score = COALESCE((v_category_scores->>'execution')::decimal, execution_score),
            hse_compliance_score = COALESCE((v_category_scores->>'hse_compliance')::decimal, hse_compliance_score),
            last_updated = NOW()
        WHERE id = v_provider.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'providers_updated', v_count,
        'project_id', p_project_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 5. SERVER-SIDE TOKEN EXPIRATION ENFORCEMENT
-- ============================================

-- Replace overly permissive policies on supplier_upload_tokens
DROP POLICY IF EXISTS "Allow all on supplier_upload_tokens" ON public.supplier_upload_tokens;

-- SELECT: allow all (frontend needs to distinguish expired vs invalid for UX)
DROP POLICY IF EXISTS "Allow read supplier_upload_tokens" ON public.supplier_upload_tokens;
CREATE POLICY "Allow read supplier_upload_tokens" ON public.supplier_upload_tokens
    FOR SELECT USING (true);

-- INSERT: allow (for creating new tokens from the app)
DROP POLICY IF EXISTS "Allow insert supplier_upload_tokens" ON public.supplier_upload_tokens;
CREATE POLICY "Allow insert supplier_upload_tokens" ON public.supplier_upload_tokens
    FOR INSERT WITH CHECK (true);

-- UPDATE: only allow if token is NOT expired (server-side enforcement)
DROP POLICY IF EXISTS "Allow update non_expired_tokens" ON public.supplier_upload_tokens;
CREATE POLICY "Allow update non_expired_tokens" ON public.supplier_upload_tokens
    FOR UPDATE USING (expires_at > NOW());

-- No DELETE policy for anon

-- Also enforce on qa_response_tokens
DROP POLICY IF EXISTS "Allow update by token" ON public.qa_response_tokens;
DROP POLICY IF EXISTS "Allow update non_expired_qa_tokens" ON public.qa_response_tokens;
CREATE POLICY "Allow update non_expired_qa_tokens" ON public.qa_response_tokens
    FOR UPDATE USING (expires_at > NOW());


COMMIT;

-- ============================================
-- VERIFICATION (run after to confirm)
-- ============================================
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'scoring_audit_log';
-- SELECT proname FROM pg_proc WHERE proname = 'recalculate_scores_with_weights';
-- SELECT polname, cmd FROM pg_policies WHERE tablename = 'ranking_proveedores';
-- SELECT polname, cmd FROM pg_policies WHERE tablename = 'supplier_upload_tokens';
