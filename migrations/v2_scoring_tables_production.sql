-- ============================================
-- MIGRACION: Scoring Tables + RPC para produccion
-- Fecha: 2026-02-17
-- Arregla:
--   1. scoring_categories table (400)
--   2. scoring_criteria table
--   3. get_or_create_project RPC con firma extendida (404)
--   4. Trigger log_scoring_changes que falla con provider_name
--   5. Vista scoring_configuration_summary
-- ============================================

BEGIN;

-- ============================================
-- 1. TABLAS DE SCORING CONFIG
-- ============================================

CREATE TABLE IF NOT EXISTS public.scoring_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    display_name_es TEXT,
    weight DECIMAL(5,2) NOT NULL CHECK (weight >= 0 AND weight <= 100),
    color VARCHAR(7) DEFAULT '#12b5b0',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_category_name_project UNIQUE(project_id, name)
);

CREATE TABLE IF NOT EXISTS public.scoring_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.scoring_categories(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    display_name_es TEXT,
    description TEXT,
    weight DECIMAL(5,2) NOT NULL CHECK (weight >= 0 AND weight <= 100),
    keywords TEXT[],
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_criterion_name_category UNIQUE(category_id, name)
);

CREATE TABLE IF NOT EXISTS public.provider_criterion_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_ranking_id UUID REFERENCES public.ranking_proveedores(id) ON DELETE CASCADE,
    criterion_id UUID REFERENCES public.scoring_criteria(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    score DECIMAL(4,2) DEFAULT 0 CHECK (score >= 0 AND score <= 10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_provider_criterion UNIQUE(provider_ranking_id, criterion_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_scoring_categories_project_id ON public.scoring_categories(project_id);
CREATE INDEX IF NOT EXISTS idx_scoring_criteria_category_id ON public.scoring_criteria(category_id);
CREATE INDEX IF NOT EXISTS idx_scoring_criteria_project_id ON public.scoring_criteria(project_id);
CREATE INDEX IF NOT EXISTS idx_provider_criterion_scores_project ON public.provider_criterion_scores(project_id);

-- RLS: anon puede leer
ALTER TABLE public.scoring_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_criterion_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on scoring_categories" ON public.scoring_categories;
CREATE POLICY "Allow all on scoring_categories" ON public.scoring_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on scoring_criteria" ON public.scoring_criteria;
CREATE POLICY "Allow all on scoring_criteria" ON public.scoring_criteria FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on provider_criterion_scores" ON public.provider_criterion_scores;
CREATE POLICY "Allow all on provider_criterion_scores" ON public.provider_criterion_scores FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- 2. VISTA scoring_configuration_summary
-- ============================================

CREATE OR REPLACE VIEW public.scoring_configuration_summary AS
SELECT
    sc.project_id,
    sc.id as category_id,
    sc.name as category_name,
    sc.display_name as category_display_name,
    sc.display_name_es as category_display_name_es,
    sc.weight as category_weight,
    sc.color as category_color,
    sc.sort_order as category_sort_order,
    scr.id as criterion_id,
    scr.name as criterion_name,
    scr.display_name as criterion_display_name,
    scr.display_name_es as criterion_display_name_es,
    scr.description as criterion_description,
    scr.weight as criterion_weight,
    scr.keywords as criterion_keywords,
    scr.sort_order as criterion_sort_order
FROM public.scoring_categories sc
LEFT JOIN public.scoring_criteria scr ON scr.category_id = sc.id
ORDER BY sc.project_id, sc.sort_order, scr.sort_order;


-- ============================================
-- 3. FIX: Trigger log_scoring_changes
--    El trigger generico falla en tablas sin provider_name
-- ============================================

CREATE OR REPLACE FUNCTION public.log_scoring_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_provider TEXT;
    v_new_json JSONB;
    v_old_json JSONB;
BEGIN
    -- Safely extract provider_name via JSON (avoids compile-time column check)
    IF TG_OP != 'DELETE' THEN
        v_new_json := row_to_json(NEW)::jsonb;
        v_provider := v_new_json ->> 'provider_name';
    ELSE
        v_old_json := row_to_json(OLD)::jsonb;
        v_provider := v_old_json ->> 'provider_name';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        v_old_json := row_to_json(OLD)::jsonb;
        INSERT INTO public.scoring_audit_log (project_id, table_name, operation, provider_name, old_data, new_data)
        VALUES (NEW.project_id, TG_TABLE_NAME, TG_OP, v_provider, v_old_json, v_new_json);
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.scoring_audit_log (project_id, table_name, operation, provider_name, new_data)
        VALUES (NEW.project_id, TG_TABLE_NAME, TG_OP, v_provider, v_new_json);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.scoring_audit_log (project_id, table_name, operation, provider_name, old_data)
        VALUES (OLD.project_id, TG_TABLE_NAME, TG_OP, v_provider, v_old_json);
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 4. RPC: get_or_create_project con firma extendida
-- ============================================

-- Drop old signatures
DROP FUNCTION IF EXISTS public.get_or_create_project(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_project(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;

CREATE OR REPLACE FUNCTION public.get_or_create_project(
    p_display_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_project_type TEXT DEFAULT 'RFP',
    p_date_opening TIMESTAMPTZ DEFAULT NULL,
    p_date_submission_deadline TIMESTAMPTZ DEFAULT NULL,
    p_date_evaluation TIMESTAMPTZ DEFAULT NULL,
    p_date_award TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_project_id UUID;
    v_normalized_name TEXT;
BEGIN
    v_normalized_name := public.normalize_project_name(p_display_name);

    SELECT id INTO v_project_id
    FROM public.projects
    WHERE name = v_normalized_name OR display_name = p_display_name
    LIMIT 1;

    IF v_project_id IS NULL THEN
        INSERT INTO public.projects (
            name, display_name, description, project_type,
            date_opening, date_submission_deadline, date_evaluation, date_award
        )
        VALUES (
            v_normalized_name, p_display_name, p_description, p_project_type,
            p_date_opening, p_date_submission_deadline, p_date_evaluation, p_date_award
        )
        RETURNING id INTO v_project_id;
    END IF;

    RETURN v_project_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 5. Re-apply audit triggers (safe)
-- ============================================

DROP TRIGGER IF EXISTS trigger_audit_scoring_categories ON public.scoring_categories;
CREATE TRIGGER trigger_audit_scoring_categories
    AFTER INSERT OR UPDATE OR DELETE ON public.scoring_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.log_scoring_changes();

DROP TRIGGER IF EXISTS trigger_audit_scoring_criteria ON public.scoring_criteria;
CREATE TRIGGER trigger_audit_scoring_criteria
    AFTER INSERT OR UPDATE OR DELETE ON public.scoring_criteria
    FOR EACH ROW
    EXECUTE FUNCTION public.log_scoring_changes();


COMMIT;
