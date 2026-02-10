-- ============================================
-- MIGRACION: Crear esquema 'desarrollo' como copia de 'public'
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Crear el esquema
CREATE SCHEMA IF NOT EXISTS desarrollo;

-- 2. Copiar tablas con estructura + datos
-- Nota: CREATE TABLE ... (LIKE ... INCLUDING ALL) copia columnas, defaults, constraints, indexes

-- 2a. projects (tabla base, sin FK)
CREATE TABLE desarrollo.projects (LIKE public.projects INCLUDING ALL);
INSERT INTO desarrollo.projects SELECT * FROM public.projects;

-- 2b. organizations (tabla base, sin FK)
CREATE TABLE desarrollo.organizations (LIKE public.organizations INCLUDING ALL);
INSERT INTO desarrollo.organizations SELECT * FROM public.organizations;

-- 2c. organization_members (FK -> organizations)
CREATE TABLE desarrollo.organization_members (LIKE public.organization_members INCLUDING ALL);
-- Re-crear FK apuntando a desarrollo
ALTER TABLE desarrollo.organization_members
    ADD CONSTRAINT fk_org FOREIGN KEY (organization_id) REFERENCES desarrollo.organizations(id) ON DELETE CASCADE;
INSERT INTO desarrollo.organization_members SELECT * FROM public.organization_members;

-- 2d. project_providers (FK -> projects)
CREATE TABLE desarrollo.project_providers (LIKE public.project_providers INCLUDING ALL);
ALTER TABLE desarrollo.project_providers
    ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES desarrollo.projects(id) ON DELETE CASCADE;
INSERT INTO desarrollo.project_providers SELECT * FROM public.project_providers;

-- 2e. document_metadata (FK -> projects)
CREATE TABLE desarrollo.document_metadata (LIKE public.document_metadata INCLUDING ALL);
ALTER TABLE desarrollo.document_metadata
    ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES desarrollo.projects(id) ON DELETE SET NULL;
INSERT INTO desarrollo.document_metadata SELECT * FROM public.document_metadata;

-- 2f. rfq (vector table, no FK)
CREATE TABLE desarrollo.rfq (LIKE public.rfq INCLUDING ALL);
INSERT INTO desarrollo.rfq SELECT * FROM public.rfq;

-- 2g. proposals (vector table, no FK)
CREATE TABLE desarrollo.proposals (LIKE public.proposals INCLUDING ALL);
INSERT INTO desarrollo.proposals SELECT * FROM public.proposals;

-- 2h. rfq_items_master (FK -> document_metadata, projects)
CREATE TABLE desarrollo.rfq_items_master (LIKE public.rfq_items_master INCLUDING ALL);
ALTER TABLE desarrollo.rfq_items_master
    ADD CONSTRAINT fk_file FOREIGN KEY (file_id) REFERENCES desarrollo.document_metadata(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES desarrollo.projects(id) ON DELETE CASCADE;
INSERT INTO desarrollo.rfq_items_master SELECT * FROM public.rfq_items_master;

-- 2i. provider_responses (FK -> rfq_items_master, document_metadata)
CREATE TABLE desarrollo.provider_responses (LIKE public.provider_responses INCLUDING ALL);
ALTER TABLE desarrollo.provider_responses
    ADD CONSTRAINT fk_requirement FOREIGN KEY (requirement_id) REFERENCES desarrollo.rfq_items_master(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_file FOREIGN KEY (file_id) REFERENCES desarrollo.document_metadata(id) ON DELETE CASCADE;
INSERT INTO desarrollo.provider_responses SELECT * FROM public.provider_responses;

-- 2j. qa_audit (FK -> rfq_items_master, projects, self-reference)
CREATE TABLE desarrollo.qa_audit (LIKE public.qa_audit INCLUDING ALL);
ALTER TABLE desarrollo.qa_audit
    ADD CONSTRAINT fk_requirement FOREIGN KEY (requirement_id) REFERENCES desarrollo.rfq_items_master(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES desarrollo.projects(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_parent FOREIGN KEY (parent_question_id) REFERENCES desarrollo.qa_audit(id) ON DELETE SET NULL;
INSERT INTO desarrollo.qa_audit SELECT * FROM public.qa_audit;

-- 2k. qa_notifications (FK -> projects)
CREATE TABLE desarrollo.qa_notifications (LIKE public.qa_notifications INCLUDING ALL);
ALTER TABLE desarrollo.qa_notifications
    ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES desarrollo.projects(id) ON DELETE CASCADE;
INSERT INTO desarrollo.qa_notifications SELECT * FROM public.qa_notifications;

-- 2l. qa_response_tokens (FK -> projects)
CREATE TABLE desarrollo.qa_response_tokens (LIKE public.qa_response_tokens INCLUDING ALL);
ALTER TABLE desarrollo.qa_response_tokens
    ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES desarrollo.projects(id) ON DELETE CASCADE;
INSERT INTO desarrollo.qa_response_tokens SELECT * FROM public.qa_response_tokens;

-- 2m. ranking_proveedores (FK -> projects)
CREATE TABLE desarrollo.ranking_proveedores (LIKE public.ranking_proveedores INCLUDING ALL);
ALTER TABLE desarrollo.ranking_proveedores
    ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES desarrollo.projects(id) ON DELETE CASCADE;
INSERT INTO desarrollo.ranking_proveedores SELECT * FROM public.ranking_proveedores;

-- 2n. scoring_categories (FK -> projects)
CREATE TABLE desarrollo.scoring_categories (LIKE public.scoring_categories INCLUDING ALL);
ALTER TABLE desarrollo.scoring_categories
    ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES desarrollo.projects(id) ON DELETE CASCADE;
INSERT INTO desarrollo.scoring_categories SELECT * FROM public.scoring_categories;

-- 2o. scoring_criteria (FK -> scoring_categories, projects)
CREATE TABLE desarrollo.scoring_criteria (LIKE public.scoring_criteria INCLUDING ALL);
ALTER TABLE desarrollo.scoring_criteria
    ADD CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES desarrollo.scoring_categories(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES desarrollo.projects(id) ON DELETE CASCADE;
INSERT INTO desarrollo.scoring_criteria SELECT * FROM public.scoring_criteria;

-- 2p. provider_criterion_scores (FK -> ranking_proveedores, scoring_criteria, projects)
CREATE TABLE desarrollo.provider_criterion_scores (LIKE public.provider_criterion_scores INCLUDING ALL);
ALTER TABLE desarrollo.provider_criterion_scores
    ADD CONSTRAINT fk_ranking FOREIGN KEY (provider_ranking_id) REFERENCES desarrollo.ranking_proveedores(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_criterion FOREIGN KEY (criterion_id) REFERENCES desarrollo.scoring_criteria(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES desarrollo.projects(id) ON DELETE CASCADE;
INSERT INTO desarrollo.provider_criterion_scores SELECT * FROM public.provider_criterion_scores;

-- 2q. scoring_weight_configs (FK -> projects)
CREATE TABLE desarrollo.scoring_weight_configs (LIKE public.scoring_weight_configs INCLUDING ALL);
ALTER TABLE desarrollo.scoring_weight_configs
    ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES desarrollo.projects(id) ON DELETE CASCADE;
INSERT INTO desarrollo.scoring_weight_configs SELECT * FROM public.scoring_weight_configs;

-- 2r. economic_offers (FK -> projects)
CREATE TABLE desarrollo.economic_offers (LIKE public.economic_offers INCLUDING ALL);
ALTER TABLE desarrollo.economic_offers
    ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES desarrollo.projects(id) ON DELETE CASCADE;
INSERT INTO desarrollo.economic_offers SELECT * FROM public.economic_offers;

-- 2s. project_communications (FK -> projects)
CREATE TABLE desarrollo.project_communications (LIKE public.project_communications INCLUDING ALL);
ALTER TABLE desarrollo.project_communications
    ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES desarrollo.projects(id) ON DELETE CASCADE;
INSERT INTO desarrollo.project_communications SELECT * FROM public.project_communications;

-- 2t. supplier_directory (no FK)
CREATE TABLE desarrollo.supplier_directory (LIKE public.supplier_directory INCLUDING ALL);
INSERT INTO desarrollo.supplier_directory SELECT * FROM public.supplier_directory;

-- 2u. supplier_upload_tokens (FK -> projects)
CREATE TABLE desarrollo.supplier_upload_tokens (LIKE public.supplier_upload_tokens INCLUDING ALL);
ALTER TABLE desarrollo.supplier_upload_tokens
    ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES desarrollo.projects(id) ON DELETE CASCADE;
INSERT INTO desarrollo.supplier_upload_tokens SELECT * FROM public.supplier_upload_tokens;


-- ============================================
-- 3. FUNCIONES (recrear en el schema desarrollo)
-- ============================================

-- update_projects_updated_at
CREATE OR REPLACE FUNCTION desarrollo.update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_projects_updated_at
    BEFORE UPDATE ON desarrollo.projects
    FOR EACH ROW
    EXECUTE FUNCTION desarrollo.update_projects_updated_at();

-- update_economic_offers_updated_at
CREATE OR REPLACE FUNCTION desarrollo.update_economic_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_economic_offers_updated
    BEFORE UPDATE ON desarrollo.economic_offers
    FOR EACH ROW
    EXECUTE FUNCTION desarrollo.update_economic_offers_updated_at();

-- normalize_project_name
CREATE OR REPLACE FUNCTION desarrollo.normalize_project_name(display_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN UPPER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(display_name, '[^\w\s]', '', 'g'),
            '\s+', '_', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- get_or_create_project
CREATE OR REPLACE FUNCTION desarrollo.get_or_create_project(
    p_display_name TEXT,
    p_description TEXT DEFAULT NULL
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
        INSERT INTO desarrollo.projects (name, display_name, description)
        VALUES (v_normalized_name, p_display_name, p_description)
        RETURNING id INTO v_project_id;
    END IF;

    RETURN v_project_id;
END;
$$ LANGUAGE plpgsql;

-- soft_delete_project
CREATE OR REPLACE FUNCTION desarrollo.soft_delete_project(p_project_id UUID)
RETURNS JSONB AS $$
BEGIN
    UPDATE desarrollo.projects
    SET is_active = false, updated_at = NOW()
    WHERE id = p_project_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Project not found');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- update_project_name
CREATE OR REPLACE FUNCTION desarrollo.update_project_name(p_project_id UUID, p_new_display_name TEXT)
RETURNS JSONB AS $$
DECLARE
    v_new_name TEXT;
BEGIN
    v_new_name := desarrollo.normalize_project_name(p_new_display_name);

    UPDATE desarrollo.projects
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

-- calculate_weighted_overall_score
CREATE OR REPLACE FUNCTION desarrollo.calculate_weighted_overall_score()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.individual_scores_json IS NOT NULL
       AND NEW.individual_scores_json != '{}'::jsonb
       AND jsonb_typeof(NEW.individual_scores_json) = 'object'
       AND (SELECT count(*) FROM jsonb_object_keys(NEW.individual_scores_json)) > 0 THEN
        RETURN NEW;
    END IF;

    NEW.technical_score = (
        COALESCE(NEW.scope_facilities_score, 0) * 0.10 +
        COALESCE(NEW.scope_work_score, 0) * 0.10 +
        COALESCE(NEW.deliverables_quality_score, 0) * 0.10
    ) / 0.30 * 10;

    NEW.economic_score = (
        COALESCE(NEW.total_price_score, 0) * 0.15 +
        COALESCE(NEW.price_breakdown_score, 0) * 0.08 +
        COALESCE(NEW.optionals_included_score, 0) * 0.07 +
        COALESCE(NEW.capex_opex_methodology_score, 0) * 0.05
    ) / 0.35 * 10;

    NEW.execution_score = (
        COALESCE(NEW.schedule_score, 0) * 0.08 +
        COALESCE(NEW.resources_allocation_score, 0) * 0.06 +
        COALESCE(NEW.exceptions_score, 0) * 0.06
    ) / 0.20 * 10;

    NEW.hse_compliance_score = (
        COALESCE(NEW.safety_studies_score, 0) * 0.08 +
        COALESCE(NEW.regulatory_compliance_score, 0) * 0.07
    ) / 0.15 * 10;

    NEW.overall_score = (
        COALESCE(NEW.technical_score, 0) * 0.30 +
        COALESCE(NEW.economic_score, 0) * 0.35 +
        COALESCE(NEW.execution_score, 0) * 0.20 +
        COALESCE(NEW.hse_compliance_score, 0) * 0.15
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_weighted_score
    BEFORE INSERT OR UPDATE ON desarrollo.ranking_proveedores
    FOR EACH ROW
    EXECUTE FUNCTION desarrollo.calculate_weighted_overall_score();

-- validate_category_weights
CREATE OR REPLACE FUNCTION desarrollo.validate_category_weights()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_category_weights
    AFTER INSERT OR UPDATE OR DELETE ON desarrollo.scoring_categories
    FOR EACH ROW
    EXECUTE FUNCTION desarrollo.validate_category_weights();

-- validate_criteria_weights
CREATE OR REPLACE FUNCTION desarrollo.validate_criteria_weights()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_criteria_weights
    AFTER INSERT OR UPDATE OR DELETE ON desarrollo.scoring_criteria
    FOR EACH ROW
    EXECUTE FUNCTION desarrollo.validate_criteria_weights();


-- ============================================
-- 4. VISTAS
-- ============================================

CREATE OR REPLACE VIEW desarrollo.v_projects_with_stats AS
SELECT
    p.id, p.name, p.display_name, p.description, p.status, p.ai_context,
    p.is_active, p.project_type, p.disciplines,
    p.date_opening, p.date_submission_deadline, p.date_evaluation, p.date_award,
    p.invited_suppliers, p.created_at, p.updated_at,
    COUNT(DISTINCT dm.id) as document_count,
    COUNT(DISTINCT rim.id) as requirement_count,
    COUNT(DISTINCT qa.id) as qa_count
FROM desarrollo.projects p
LEFT JOIN desarrollo.document_metadata dm ON dm.project_id = p.id
LEFT JOIN desarrollo.rfq_items_master rim ON rim.project_id = p.id
LEFT JOIN desarrollo.qa_audit qa ON qa.project_id = p.id
GROUP BY p.id, p.name, p.display_name, p.description, p.status, p.ai_context,
         p.is_active, p.project_type, p.disciplines,
         p.date_opening, p.date_submission_deadline, p.date_evaluation, p.date_award,
         p.invited_suppliers, p.created_at, p.updated_at;

CREATE OR REPLACE VIEW desarrollo.ranking_proveedores_por_tipo AS
SELECT
    rp.provider_name, rp.project_id,
    ROUND(rp.technical_score::numeric, 2) as technical_score,
    ROUND(rp.economic_score::numeric, 2) as economic_score,
    ROUND(rp.execution_score::numeric, 2) as execution_score,
    ROUND(rp.hse_compliance_score::numeric, 2) as hse_compliance_score,
    ROUND(rp.overall_score::numeric, 2) as overall_score,
    ROUND(rp.compliance_percentage::numeric, 2) as compliance_percentage,
    rp.evaluation_count
FROM desarrollo.ranking_proveedores rp
ORDER BY rp.overall_score DESC;

CREATE OR REPLACE VIEW desarrollo.ranking_proveedores_detailed AS
SELECT
    rp.provider_name, rp.project_id,
    ROUND(rp.scope_facilities_score::numeric, 2) as scope_facilities_score,
    ROUND(rp.scope_work_score::numeric, 2) as scope_work_score,
    ROUND(rp.deliverables_quality_score::numeric, 2) as deliverables_quality_score,
    ROUND(rp.total_price_score::numeric, 2) as total_price_score,
    ROUND(rp.price_breakdown_score::numeric, 2) as price_breakdown_score,
    ROUND(rp.optionals_included_score::numeric, 2) as optionals_included_score,
    ROUND(rp.capex_opex_methodology_score::numeric, 2) as capex_opex_methodology_score,
    ROUND(rp.schedule_score::numeric, 2) as schedule_score,
    ROUND(rp.resources_allocation_score::numeric, 2) as resources_allocation_score,
    ROUND(rp.exceptions_score::numeric, 2) as exceptions_score,
    ROUND(rp.safety_studies_score::numeric, 2) as safety_studies_score,
    ROUND(rp.regulatory_compliance_score::numeric, 2) as regulatory_compliance_score,
    ROUND(rp.technical_score::numeric, 2) as technical_score,
    ROUND(rp.economic_score::numeric, 2) as economic_score,
    ROUND(rp.execution_score::numeric, 2) as execution_score,
    ROUND(rp.hse_compliance_score::numeric, 2) as hse_compliance_score,
    ROUND(rp.overall_score::numeric, 2) as overall_score,
    ROUND(rp.compliance_percentage::numeric, 2) as compliance_percentage,
    rp.evaluation_count, rp.last_updated
FROM desarrollo.ranking_proveedores rp
ORDER BY rp.overall_score DESC;

CREATE OR REPLACE VIEW desarrollo.scoring_configuration_summary AS
SELECT
    sc.project_id,
    sc.id as category_id, sc.name as category_name,
    sc.display_name as category_display_name, sc.display_name_es as category_display_name_es,
    sc.weight as category_weight, sc.color as category_color, sc.sort_order as category_sort_order,
    scr.id as criterion_id, scr.name as criterion_name,
    scr.display_name as criterion_display_name, scr.display_name_es as criterion_display_name_es,
    scr.description as criterion_description, scr.weight as criterion_weight,
    scr.keywords as criterion_keywords, scr.sort_order as criterion_sort_order
FROM desarrollo.scoring_categories sc
LEFT JOIN desarrollo.scoring_criteria scr ON scr.category_id = sc.id
ORDER BY sc.project_id, sc.sort_order, scr.sort_order;

CREATE OR REPLACE VIEW desarrollo.v_economic_comparison AS
SELECT
    eo.project_id, eo.provider_name, eo.total_price, eo.currency,
    eo.discount_percentage, eo.tco_value, eo.tco_period_years, eo.validity_days,
    eo.taxes_included, eo.insurance_included, eo.payment_terms,
    ROUND(eo.total_price * (1 - COALESCE(eo.discount_percentage, 0) / 100), 2) AS net_price,
    RANK() OVER (PARTITION BY eo.project_id ORDER BY eo.total_price ASC) AS price_rank,
    jsonb_array_length(COALESCE(eo.optional_items, '[]'::jsonb)) AS optional_items_count,
    jsonb_array_length(COALESCE(eo.alternative_offers, '[]'::jsonb)) AS alternative_offers_count,
    eo.created_at, eo.updated_at
FROM desarrollo.economic_offers eo
ORDER BY eo.project_id, eo.total_price ASC;

CREATE OR REPLACE VIEW desarrollo.v_supplier_history AS
SELECT
    COALESCE(sd.name, pp.provider_name) AS supplier_name,
    sd.display_name, sd.email, sd.phone, sd.contact_person,
    sd.category, sd.website, sd.notes, sd.tags,
    COUNT(DISTINCT pp.project_id) AS project_count,
    ARRAY_AGG(DISTINCT p.display_name) FILTER (WHERE p.display_name IS NOT NULL) AS project_names,
    AVG(rp.overall_score) AS avg_score,
    MAX(rp.overall_score) AS best_score,
    MIN(rp.overall_score) AS worst_score,
    COUNT(DISTINCT rp.id) AS times_scored,
    MAX(pp.invited_at) AS last_participation,
    ARRAY_AGG(DISTINCT pp.status) FILTER (WHERE pp.status IS NOT NULL) AS statuses
FROM desarrollo.project_providers pp
LEFT JOIN desarrollo.supplier_directory sd ON UPPER(sd.name) = UPPER(pp.provider_name)
LEFT JOIN desarrollo.projects p ON p.id = pp.project_id
LEFT JOIN desarrollo.ranking_proveedores rp ON UPPER(rp.provider_name) = UPPER(pp.provider_name) AND rp.project_id = pp.project_id
GROUP BY COALESCE(sd.name, pp.provider_name), sd.display_name, sd.email, sd.phone, sd.contact_person, sd.category, sd.website, sd.notes, sd.tags;


-- ============================================
-- 5. RLS POLICIES (permisivas para desarrollo)
-- ============================================

ALTER TABLE desarrollo.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.project_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.document_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.rfq ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.rfq_items_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.provider_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.qa_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.qa_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.qa_response_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.ranking_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.scoring_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.provider_criterion_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.scoring_weight_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.economic_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.project_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.supplier_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.supplier_upload_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.organization_members ENABLE ROW LEVEL SECURITY;

-- Politicas permisivas para todas las tablas en desarrollo
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'desarrollo' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow all desarrollo" ON desarrollo.%I', tbl);
        EXECUTE format('CREATE POLICY "Allow all desarrollo" ON desarrollo.%I FOR ALL USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;


-- ============================================
-- 6. GRANT PERMISSIONS
-- Necesario para que el rol anon pueda acceder al schema
-- ============================================

GRANT USAGE ON SCHEMA desarrollo TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA desarrollo TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA desarrollo TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA desarrollo TO anon, authenticated, service_role;

-- Permisos por defecto para tablas futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA desarrollo GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA desarrollo GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA desarrollo GRANT ALL ON ROUTINES TO anon, authenticated, service_role;


-- ============================================
-- RESUMEN
-- ============================================
-- Tablas copiadas: 21
-- Funciones recreadas: 8
-- Vistas recreadas: 6
-- Triggers recreados: 5
-- RLS habilitado en todas las tablas
--
-- IMPORTANTE: Despues de ejecutar este script, hay que:
-- 1. Exponer el schema 'desarrollo' en PostgREST (PGRST_DB_SCHEMAS)
-- 2. Actualizar el frontend para usar schema 'desarrollo'
