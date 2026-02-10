-- ============================================
-- Migration 001: Schema Audit Fixes (T19)
-- Fixes gaps found in bbdd.sql audit
-- Run AFTER bbdd.sql base schema
-- ============================================

-- 1. Add missing columns to projects table
DO $$
BEGIN
    -- Soft-delete support (queried by frontend useProjectStore.ts)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'is_active') THEN
        ALTER TABLE public.projects ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- Disciplines array
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'disciplines') THEN
        ALTER TABLE public.projects ADD COLUMN disciplines TEXT[] DEFAULT NULL;
    END IF;

    -- Project type for T12 (RFP/RFQ/RFI support)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'project_type') THEN
        ALTER TABLE public.projects ADD COLUMN project_type TEXT DEFAULT 'RFQ' CHECK (project_type IN ('RFP', 'RFQ', 'RFI'));
    END IF;

    -- Deadline fields (names match frontend ProjectSetupWizard.tsx)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'date_opening') THEN
        ALTER TABLE public.projects ADD COLUMN date_opening TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'date_submission_deadline') THEN
        ALTER TABLE public.projects ADD COLUMN date_submission_deadline TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'date_evaluation') THEN
        ALTER TABLE public.projects ADD COLUMN date_evaluation TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'date_award') THEN
        ALTER TABLE public.projects ADD COLUMN date_award TIMESTAMPTZ;
    END IF;

    -- Invited suppliers (simple array for quick reference; relational table below for details)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'invited_suppliers') THEN
        ALTER TABLE public.projects ADD COLUMN invited_suppliers TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Index for is_active filter (most queries filter on this)
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON public.projects(is_active) WHERE is_active = true;

-- 2. Create project_providers relational table (used by ProjectSetupWizard.tsx)
CREATE TABLE IF NOT EXISTS public.project_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,
    provider_email TEXT,
    provider_contact TEXT,
    status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'submitted', 'disqualified')),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_project_provider UNIQUE(project_id, provider_name)
);

CREATE INDEX IF NOT EXISTS idx_project_providers_project ON public.project_providers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_providers_status ON public.project_providers(project_id, status);

-- RLS for project_providers
ALTER TABLE public.project_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on project_providers" ON public.project_providers;
CREATE POLICY "Allow all on project_providers" ON public.project_providers
    FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at on project_providers
CREATE OR REPLACE FUNCTION update_project_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_project_providers_updated ON public.project_providers;
CREATE TRIGGER trigger_project_providers_updated
    BEFORE UPDATE ON public.project_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_project_providers_updated_at();

-- 3. Add missing parent_question_id to qa_audit (for follow-up threads)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'qa_audit' AND column_name = 'parent_question_id') THEN
        ALTER TABLE public.qa_audit ADD COLUMN parent_question_id UUID REFERENCES public.qa_audit(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Index for parent_question_id lookups (thread queries)
CREATE INDEX IF NOT EXISTS idx_qa_audit_parent_question ON public.qa_audit(parent_question_id) WHERE parent_question_id IS NOT NULL;

-- 4. Create qa_notifications table (referenced by frontend useQAStore.ts but missing from bbdd.sql)
CREATE TABLE IF NOT EXISTS public.qa_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('supplier_responded', 'evaluation_updated', 'questions_sent')),
    title TEXT NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Indexes for qa_notifications
CREATE INDEX IF NOT EXISTS idx_qa_notifications_project ON public.qa_notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_qa_notifications_unread ON public.qa_notifications(project_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_qa_notifications_created ON public.qa_notifications(created_at DESC);

-- RLS for qa_notifications
ALTER TABLE public.qa_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on qa_notifications" ON public.qa_notifications;
CREATE POLICY "Allow all on qa_notifications" ON public.qa_notifications
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Add missing indexes on provider_responses (FK join performance)
CREATE INDEX IF NOT EXISTS idx_provider_responses_requirement ON public.provider_responses(requirement_id);
CREATE INDEX IF NOT EXISTS idx_provider_responses_provider ON public.provider_responses(provider_name);

-- 6. Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_qa_audit_project_status ON public.qa_audit(project_id, status);
CREATE INDEX IF NOT EXISTS idx_document_metadata_project_type ON public.document_metadata(project_id, document_type);

-- 7. Soft-delete function for projects (used by frontend useProjectStore.ts)
CREATE OR REPLACE FUNCTION soft_delete_project(p_project_id UUID)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.projects
    SET is_active = false, updated_at = NOW()
    WHERE id = p_project_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Project not found');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- 8. Update project name function (used by frontend useProjectStore.ts)
CREATE OR REPLACE FUNCTION update_project_name(p_project_id UUID, p_new_display_name TEXT)
RETURNS JSONB AS $$
DECLARE
    v_new_name TEXT;
BEGIN
    v_new_name := normalize_project_name(p_new_display_name);

    UPDATE public.projects
    SET display_name = p_new_display_name,
        name = v_new_name,
        updated_at = NOW()
    WHERE id = p_project_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Project not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'name', v_new_name, 'display_name', p_new_display_name);
END;
$$ LANGUAGE plpgsql;

-- 9. Extended get_or_create_project with setup wizard fields
-- Overrides the base function to accept project_type, dates, etc.
CREATE OR REPLACE FUNCTION get_or_create_project(
    p_display_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_project_type TEXT DEFAULT 'RFQ',
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
    v_normalized_name := normalize_project_name(p_display_name);

    -- Check if exists
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
            v_normalized_name, p_display_name, p_description, COALESCE(p_project_type, 'RFQ'),
            p_date_opening, p_date_submission_deadline, p_date_evaluation, p_date_award
        )
        RETURNING id INTO v_project_id;
    ELSE
        -- Update existing project with new fields if provided
        UPDATE public.projects SET
            description = COALESCE(p_description, description),
            project_type = COALESCE(p_project_type, project_type),
            date_opening = COALESCE(p_date_opening, date_opening),
            date_submission_deadline = COALESCE(p_date_submission_deadline, date_submission_deadline),
            date_evaluation = COALESCE(p_date_evaluation, date_evaluation),
            date_award = COALESCE(p_date_award, date_award),
            updated_at = NOW()
        WHERE id = v_project_id;
    END IF;

    RETURN v_project_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Update v_projects_with_stats view to include new columns
CREATE OR REPLACE VIEW v_projects_with_stats AS
SELECT
    p.id,
    p.name,
    p.display_name,
    p.description,
    p.status,
    p.ai_context,
    p.is_active,
    p.project_type,
    p.disciplines,
    p.date_opening,
    p.date_submission_deadline,
    p.date_evaluation,
    p.date_award,
    p.invited_suppliers,
    p.created_at,
    p.updated_at,
    COUNT(DISTINCT dm.id) as document_count,
    COUNT(DISTINCT rim.id) as requirement_count,
    COUNT(DISTINCT qa.id) as qa_count
FROM public.projects p
LEFT JOIN public.document_metadata dm ON dm.project_id = p.id
LEFT JOIN public.rfq_items_master rim ON rim.project_id = p.id
LEFT JOIN public.qa_audit qa ON qa.project_id = p.id
GROUP BY p.id, p.name, p.display_name, p.description, p.status, p.ai_context,
         p.is_active, p.project_type, p.disciplines,
         p.date_opening, p.date_submission_deadline, p.date_evaluation, p.date_award,
         p.invited_suppliers, p.created_at, p.updated_at;
