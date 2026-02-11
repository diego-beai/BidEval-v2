-- ============================================
-- Migration 008: Add project_id and score to provider_responses
--
-- Multiple workflow nodes query/insert provider_responses with project_id
-- and score, but both columns were missing from the original schema.
-- project_id is available via requirement_id -> rfq_items_master.project_id
-- but direct access is needed for performance and simplicity.
-- score stores the LLM evaluation score (0-10) per requirement per provider.
-- ============================================

-- 1. Add columns to public schema
ALTER TABLE public.provider_responses
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.provider_responses
    ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

-- 2. Add columns to desarrollo schema
ALTER TABLE desarrollo.provider_responses
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE;

ALTER TABLE desarrollo.provider_responses
    ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

-- 3. Backfill project_id from rfq_items_master (public)
UPDATE public.provider_responses pr
SET project_id = rim.project_id
FROM public.rfq_items_master rim
WHERE pr.requirement_id = rim.id
  AND pr.project_id IS NULL;

-- 4. Backfill project_id from rfq_items_master (desarrollo)
UPDATE desarrollo.provider_responses pr
SET project_id = rim.project_id
FROM desarrollo.rfq_items_master rim
WHERE pr.requirement_id = rim.id
  AND pr.project_id IS NULL;

-- 5. Add indexes (both schemas)
CREATE INDEX IF NOT EXISTS idx_provider_responses_project
    ON public.provider_responses(project_id);

CREATE INDEX IF NOT EXISTS idx_provider_responses_project
    ON desarrollo.provider_responses(project_id);
