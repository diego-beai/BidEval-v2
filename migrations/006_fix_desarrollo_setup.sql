ALTER TABLE desarrollo.projects
    ADD COLUMN IF NOT EXISTS reference_code TEXT,
    ADD COLUMN IF NOT EXISTS owner_name TEXT,
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
    ADD COLUMN IF NOT EXISTS date_questions_deadline TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS date_questions_response TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION desarrollo.get_or_create_project(
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
    v_normalized_name := desarrollo.normalize_project_name(p_display_name);

    SELECT id INTO v_project_id
    FROM desarrollo.projects
    WHERE name = v_normalized_name OR display_name = p_display_name
    LIMIT 1;

    IF v_project_id IS NULL THEN
        INSERT INTO desarrollo.projects (name, display_name, description, project_type, date_opening, date_submission_deadline, date_evaluation, date_award)
        VALUES (v_normalized_name, p_display_name, p_description, p_project_type, p_date_opening, p_date_submission_deadline, p_date_evaluation, p_date_award)
        RETURNING id INTO v_project_id;
    END IF;

    RETURN v_project_id;
END;
$$ LANGUAGE plpgsql;

DROP VIEW IF EXISTS desarrollo.v_projects_with_stats;

CREATE VIEW desarrollo.v_projects_with_stats AS
SELECT
    p.id, p.name, p.display_name, p.description, p.status, p.ai_context,
    p.is_active, p.project_type, p.disciplines, p.currency,
    p.date_opening, p.date_submission_deadline, p.date_evaluation, p.date_award,
    p.date_questions_deadline, p.date_questions_response,
    p.reference_code, p.owner_name,
    p.invited_suppliers, p.created_at, p.updated_at,
    COUNT(DISTINCT dm.id) as document_count,
    COUNT(DISTINCT rim.id) as requirement_count,
    COUNT(DISTINCT qa.id) as qa_count
FROM desarrollo.projects p
LEFT JOIN desarrollo.document_metadata dm ON dm.project_id = p.id
LEFT JOIN desarrollo.rfq_items_master rim ON rim.project_id = p.id
LEFT JOIN desarrollo.qa_audit qa ON qa.project_id = p.id
GROUP BY p.id, p.name, p.display_name, p.description, p.status, p.ai_context,
         p.is_active, p.project_type, p.disciplines, p.currency,
         p.date_opening, p.date_submission_deadline, p.date_evaluation, p.date_award,
         p.date_questions_deadline, p.date_questions_response,
         p.reference_code, p.owner_name,
         p.invited_suppliers, p.created_at, p.updated_at;
