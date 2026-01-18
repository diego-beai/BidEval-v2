-- ============================================
-- MIGRATION: Update Scoring Criteria
-- Version: 2.1
-- Description: Migrate from old scoring criteria to new RFQ-aligned criteria
-- ============================================

-- Step 0: Drop dependent views first (they will be recreated at the end)
-- ============================================
DROP VIEW IF EXISTS public.ranking_proveedores_por_tipo CASCADE;
DROP VIEW IF EXISTS public.ranking_proveedores_detailed CASCADE;
DROP VIEW IF EXISTS public.ranking_proveedores_simple CASCADE;

-- Step 1: Add new columns to ranking_proveedores
-- ============================================

-- Category scores (if not exists)
ALTER TABLE public.ranking_proveedores
    ADD COLUMN IF NOT EXISTS economic_score DECIMAL(4,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS execution_score DECIMAL(4,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hse_compliance_score DECIMAL(4,2) DEFAULT 0;

-- TECHNICAL COMPLETENESS individual scores (30% total)
ALTER TABLE public.ranking_proveedores
    ADD COLUMN IF NOT EXISTS scope_facilities_score DECIMAL(4,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS scope_work_score DECIMAL(4,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deliverables_quality_score DECIMAL(4,2) DEFAULT 0;

-- ECONOMIC COMPETITIVENESS individual scores (35% total)
ALTER TABLE public.ranking_proveedores
    ADD COLUMN IF NOT EXISTS total_price_score DECIMAL(4,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS price_breakdown_score DECIMAL(4,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS optionals_included_score DECIMAL(4,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS capex_opex_methodology_score DECIMAL(4,2) DEFAULT 0;

-- EXECUTION CAPABILITY individual scores (20% total)
ALTER TABLE public.ranking_proveedores
    ADD COLUMN IF NOT EXISTS schedule_score DECIMAL(4,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS resources_allocation_score DECIMAL(4,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS exceptions_score DECIMAL(4,2) DEFAULT 0;

-- HSE & COMPLIANCE individual scores (15% total)
ALTER TABLE public.ranking_proveedores
    ADD COLUMN IF NOT EXISTS safety_studies_score DECIMAL(4,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS regulatory_compliance_score DECIMAL(4,2) DEFAULT 0;

-- Add compliance_percentage if not exists
ALTER TABLE public.ranking_proveedores
    ADD COLUMN IF NOT EXISTS compliance_percentage DECIMAL(5,2) DEFAULT 0;

-- Step 2: Migrate data from old columns to new (if applicable)
-- ============================================
-- Note: These updates are wrapped in DO blocks to handle cases where old columns don't exist

-- Map old technical_score to new technical completeness criteria (distribute evenly)
DO $$
BEGIN
    UPDATE public.ranking_proveedores
    SET
        scope_facilities_score = COALESCE(technical_score, 0),
        scope_work_score = COALESCE(technical_score, 0),
        deliverables_quality_score = COALESCE(technical_score, 0)
    WHERE scope_facilities_score = 0 AND technical_score > 0;
EXCEPTION WHEN undefined_column THEN
    RAISE NOTICE 'Column technical_score does not exist, skipping migration';
END $$;

-- Map old economical_score to new economic criteria (handle both spellings)
DO $$
BEGIN
    -- Try economical_score first
    UPDATE public.ranking_proveedores
    SET
        total_price_score = COALESCE(economical_score, 0),
        price_breakdown_score = COALESCE(economical_score, 0),
        optionals_included_score = COALESCE(economical_score, 0),
        capex_opex_methodology_score = COALESCE(economical_score, 0),
        economic_score = COALESCE(economical_score, 0)
    WHERE total_price_score = 0 AND economical_score > 0;
EXCEPTION WHEN undefined_column THEN
    RAISE NOTICE 'Column economical_score does not exist, skipping';
END $$;

-- Map old pre_feed_score and feed_score to execution criteria
DO $$
BEGIN
    UPDATE public.ranking_proveedores
    SET
        schedule_score = COALESCE((pre_feed_score + feed_score) / 2, 0),
        resources_allocation_score = COALESCE((pre_feed_score + feed_score) / 2, 0),
        exceptions_score = COALESCE((pre_feed_score + feed_score) / 2, 0),
        execution_score = COALESCE((pre_feed_score + feed_score) / 2, 0)
    WHERE schedule_score = 0 AND (pre_feed_score > 0 OR feed_score > 0);
EXCEPTION WHEN undefined_column THEN
    RAISE NOTICE 'Columns pre_feed_score/feed_score do not exist, skipping migration';
END $$;

-- Map cumplimiento_porcentual to compliance_percentage
DO $$
BEGIN
    UPDATE public.ranking_proveedores
    SET compliance_percentage = COALESCE(cumplimiento_porcentual, 0)
    WHERE compliance_percentage = 0 AND cumplimiento_porcentual > 0;
EXCEPTION WHEN undefined_column THEN
    RAISE NOTICE 'Column cumplimiento_porcentual does not exist, skipping migration';
END $$;

-- Step 3: Drop old columns
-- ============================================
-- WARNING: Uncomment these lines only after verifying data migration is correct!

-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS economical_score;
-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS pre_feed_score;
-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS feed_score;
-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS cumplimiento_porcentual;
-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS efficiency_bop_score;
-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS degradation_lifetime_score;
-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS flexibility_score;
-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS purity_pressure_score;
-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS capex_score;
-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS opex_score;
-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS warranties_score;
-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS delivery_time_score;
-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS track_record_score;
-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS provider_strength_score;
-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS safety_atex_score;
-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS sustainability_score;
-- ALTER TABLE public.ranking_proveedores DROP COLUMN IF EXISTS hse_esg_score;

-- Step 4: Create/Update the weighted score calculation function
-- ============================================

CREATE OR REPLACE FUNCTION calculate_weighted_overall_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate category scores from individual criteria

    -- TECHNICAL COMPLETENESS (30%)
    IF (COALESCE(NEW.scope_facilities_score, 0) + COALESCE(NEW.scope_work_score, 0) + COALESCE(NEW.deliverables_quality_score, 0)) > 0 THEN
        NEW.technical_score = (
            COALESCE(NEW.scope_facilities_score, 0) * 0.10 +
            COALESCE(NEW.scope_work_score, 0) * 0.10 +
            COALESCE(NEW.deliverables_quality_score, 0) * 0.10
        ) / 0.30 * 10;
    END IF;

    -- ECONOMIC COMPETITIVENESS (35%)
    IF (COALESCE(NEW.total_price_score, 0) + COALESCE(NEW.price_breakdown_score, 0) +
        COALESCE(NEW.optionals_included_score, 0) + COALESCE(NEW.capex_opex_methodology_score, 0)) > 0 THEN
        NEW.economic_score = (
            COALESCE(NEW.total_price_score, 0) * 0.15 +
            COALESCE(NEW.price_breakdown_score, 0) * 0.08 +
            COALESCE(NEW.optionals_included_score, 0) * 0.07 +
            COALESCE(NEW.capex_opex_methodology_score, 0) * 0.05
        ) / 0.35 * 10;
    END IF;

    -- EXECUTION CAPABILITY (20%)
    IF (COALESCE(NEW.schedule_score, 0) + COALESCE(NEW.resources_allocation_score, 0) +
        COALESCE(NEW.exceptions_score, 0)) > 0 THEN
        NEW.execution_score = (
            COALESCE(NEW.schedule_score, 0) * 0.08 +
            COALESCE(NEW.resources_allocation_score, 0) * 0.06 +
            COALESCE(NEW.exceptions_score, 0) * 0.06
        ) / 0.20 * 10;
    END IF;

    -- HSE & COMPLIANCE (15%)
    IF (COALESCE(NEW.safety_studies_score, 0) + COALESCE(NEW.regulatory_compliance_score, 0)) > 0 THEN
        NEW.hse_compliance_score = (
            COALESCE(NEW.safety_studies_score, 0) * 0.08 +
            COALESCE(NEW.regulatory_compliance_score, 0) * 0.07
        ) / 0.15 * 10;
    END IF;

    -- Calculate overall weighted score
    NEW.overall_score = (
        COALESCE(NEW.technical_score, 0) * 0.30 +
        COALESCE(NEW.economic_score, 0) * 0.35 +
        COALESCE(NEW.execution_score, 0) * 0.20 +
        COALESCE(NEW.hse_compliance_score, 0) * 0.15
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Update/Create the trigger
-- ============================================

DROP TRIGGER IF EXISTS trigger_update_overall_score ON public.ranking_proveedores;
DROP TRIGGER IF EXISTS trigger_calculate_weighted_score ON public.ranking_proveedores;

CREATE TRIGGER trigger_calculate_weighted_score
    BEFORE INSERT OR UPDATE ON public.ranking_proveedores
    FOR EACH ROW
    EXECUTE FUNCTION calculate_weighted_overall_score();

-- Step 6: Create new index for overall_score ordering
-- ============================================

DROP INDEX IF EXISTS idx_ranking_cumplimiento;
CREATE INDEX IF NOT EXISTS idx_ranking_overall_score ON public.ranking_proveedores(overall_score DESC);

-- Step 7: Add unique constraint for provider per project
-- ============================================

-- First, remove duplicates if any exist
DELETE FROM public.ranking_proveedores a
USING public.ranking_proveedores b
WHERE a.id > b.id
  AND a.provider_name = b.provider_name
  AND a.project_id = b.project_id;

-- Add constraint (will fail if duplicates exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_provider_project'
    ) THEN
        ALTER TABLE public.ranking_proveedores
            ADD CONSTRAINT unique_provider_project UNIQUE(provider_name, project_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Step 8: Update views
-- ============================================

CREATE OR REPLACE VIEW public.ranking_proveedores_por_tipo AS
SELECT
    rp.provider_name,
    rp.project_id,
    -- Category scores
    ROUND(rp.technical_score::numeric, 2) as technical_score,
    ROUND(rp.economic_score::numeric, 2) as economic_score,
    ROUND(rp.execution_score::numeric, 2) as execution_score,
    ROUND(rp.hse_compliance_score::numeric, 2) as hse_compliance_score,
    -- Overall score
    ROUND(rp.overall_score::numeric, 2) as overall_score,
    ROUND(rp.compliance_percentage::numeric, 2) as compliance_percentage,
    rp.evaluation_count
FROM public.ranking_proveedores rp
ORDER BY rp.overall_score DESC;

CREATE OR REPLACE VIEW public.ranking_proveedores_detailed AS
SELECT
    rp.provider_name,
    rp.project_id,
    -- TECHNICAL COMPLETENESS (30%)
    ROUND(rp.scope_facilities_score::numeric, 2) as scope_facilities_score,
    ROUND(rp.scope_work_score::numeric, 2) as scope_work_score,
    ROUND(rp.deliverables_quality_score::numeric, 2) as deliverables_quality_score,
    -- ECONOMIC COMPETITIVENESS (35%)
    ROUND(rp.total_price_score::numeric, 2) as total_price_score,
    ROUND(rp.price_breakdown_score::numeric, 2) as price_breakdown_score,
    ROUND(rp.optionals_included_score::numeric, 2) as optionals_included_score,
    ROUND(rp.capex_opex_methodology_score::numeric, 2) as capex_opex_methodology_score,
    -- EXECUTION CAPABILITY (20%)
    ROUND(rp.schedule_score::numeric, 2) as schedule_score,
    ROUND(rp.resources_allocation_score::numeric, 2) as resources_allocation_score,
    ROUND(rp.exceptions_score::numeric, 2) as exceptions_score,
    -- HSE & COMPLIANCE (15%)
    ROUND(rp.safety_studies_score::numeric, 2) as safety_studies_score,
    ROUND(rp.regulatory_compliance_score::numeric, 2) as regulatory_compliance_score,
    -- Aggregated
    ROUND(rp.technical_score::numeric, 2) as technical_score,
    ROUND(rp.economic_score::numeric, 2) as economic_score,
    ROUND(rp.execution_score::numeric, 2) as execution_score,
    ROUND(rp.hse_compliance_score::numeric, 2) as hse_compliance_score,
    ROUND(rp.overall_score::numeric, 2) as overall_score,
    ROUND(rp.compliance_percentage::numeric, 2) as compliance_percentage,
    rp.evaluation_count,
    rp.last_updated
FROM public.ranking_proveedores rp
ORDER BY rp.overall_score DESC;

-- Update legacy view
CREATE OR REPLACE VIEW public.ranking_proveedores_simple AS
SELECT
  m.project_id,
  r.provider_name,
  count(r.id) as total_items_evaluados,
  sum(r.score) as puntos_totales,
  round(
    sum(r.score)::numeric / (NULLIF(count(r.id), 0) * 10)::numeric * 100::numeric,
    2
  ) as compliance_percentage
FROM
  rfq_items_master m
  JOIN provider_responses r ON m.id = r.requirement_id
GROUP BY
  m.project_id,
  r.provider_name
ORDER BY compliance_percentage DESC;

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- Check new columns exist
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'ranking_proveedores'
-- ORDER BY ordinal_position;

-- Check data migration
-- SELECT provider_name, technical_score, economic_score, execution_score,
--        hse_compliance_score, overall_score, compliance_percentage
-- FROM ranking_proveedores
-- ORDER BY overall_score DESC;

-- Test trigger
-- UPDATE ranking_proveedores
-- SET scope_facilities_score = 8, scope_work_score = 7, deliverables_quality_score = 9
-- WHERE provider_name = (SELECT provider_name FROM ranking_proveedores LIMIT 1);

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- To rollback, you would need to:
-- 1. Drop the new columns
-- 2. Restore the old trigger function
-- 3. Drop the new views
-- This is NOT included here as it's destructive
