-- Migration: Add project setup fields for wizard (T2, T3, T4)
-- Adds project_type, deadline dates, and project_providers table

-- Add new columns to projects table
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'RFP' CHECK (project_type IN ('RFP', 'RFQ', 'RFI')),
    ADD COLUMN IF NOT EXISTS date_opening TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS date_submission_deadline TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS date_evaluation TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS date_award TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Table for invited providers per project
CREATE TABLE IF NOT EXISTS public.project_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,
    provider_email TEXT,
    provider_contact TEXT,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'submitted')),
    CONSTRAINT unique_project_provider UNIQUE(project_id, provider_name)
);

CREATE INDEX IF NOT EXISTS idx_project_providers_project ON public.project_providers(project_id);

-- RLS policies for project_providers
ALTER TABLE public.project_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on project_providers" ON public.project_providers;
CREATE POLICY "Allow all on project_providers" ON public.project_providers
    FOR ALL USING (true) WITH CHECK (true);

-- Update get_or_create_project to support new fields
CREATE OR REPLACE FUNCTION get_or_create_project(
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
    v_normalized_name := normalize_project_name(p_display_name);

    SELECT id INTO v_project_id
    FROM public.projects
    WHERE name = v_normalized_name OR display_name = p_display_name
    LIMIT 1;

    IF v_project_id IS NULL THEN
        INSERT INTO public.projects (name, display_name, description, project_type, date_opening, date_submission_deadline, date_evaluation, date_award)
        VALUES (v_normalized_name, p_display_name, p_description, p_project_type, p_date_opening, p_date_submission_deadline, p_date_evaluation, p_date_award)
        RETURNING id INTO v_project_id;
    END IF;

    RETURN v_project_id;
END;
$$ LANGUAGE plpgsql;
