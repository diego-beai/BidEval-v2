-- ============================================
-- MIGRACION COMPLETA: desarrollo → public
-- BidEval v2 - Febrero 2026
-- ============================================
--
-- CONTEXTO:
--   public tiene schema v1 (incompatible con v2)
--   desarrollo tiene schema v2 (el correcto)
--   Datos de public v1 se DESCARTAN
--   Tablas legacy (developers, use_cases, etc.) NO se tocan
--
-- EJECUTAR EN: Supabase SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- SECCION 1: PREREQUISITOS
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- SECCION 2: DROP TABLAS BIDEVAL v1 EN PUBLIC
-- (No toca tablas legacy: developers, use_cases, etc.)
-- ============================================

-- Primero vistas que dependen de las tablas
DROP VIEW IF EXISTS public.v_projects_with_stats CASCADE;
DROP VIEW IF EXISTS public.v_projects_with_stats_optimized CASCADE;
DROP VIEW IF EXISTS public.ranking_proveedores_por_tipo CASCADE;
DROP VIEW IF EXISTS public.ranking_proveedores_detailed CASCADE;
DROP VIEW IF EXISTS public.scoring_configuration_summary CASCADE;
DROP VIEW IF EXISTS public.v_economic_comparison CASCADE;
DROP VIEW IF EXISTS public.v_supplier_history CASCADE;

-- Tablas hoja (sin dependientes) primero
DROP TABLE IF EXISTS public.scoring_audit_log CASCADE;
DROP TABLE IF EXISTS public.provider_criterion_scores CASCADE;
DROP TABLE IF EXISTS public.scoring_criteria CASCADE;
DROP TABLE IF EXISTS public.scoring_categories CASCADE;
DROP TABLE IF EXISTS public.scoring_weight_configs CASCADE;
DROP TABLE IF EXISTS public.provider_responses CASCADE;
DROP TABLE IF EXISTS public.rfq_items_master CASCADE;
DROP TABLE IF EXISTS public.qa_notifications CASCADE;
DROP TABLE IF EXISTS public.qa_response_tokens CASCADE;
DROP TABLE IF EXISTS public.qa_audit CASCADE;
DROP TABLE IF EXISTS public.ranking_proveedores CASCADE;
DROP TABLE IF EXISTS public.economic_offers CASCADE;
DROP TABLE IF EXISTS public.project_communications CASCADE;
DROP TABLE IF EXISTS public.supplier_upload_tokens CASCADE;
DROP TABLE IF EXISTS public.supplier_directory CASCADE;
DROP TABLE IF EXISTS public.document_metadata CASCADE;
DROP TABLE IF EXISTS public.rfq CASCADE;
DROP TABLE IF EXISTS public.proposals CASCADE;
DROP TABLE IF EXISTS public.project_providers CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

RAISE NOTICE 'Tablas BidEval v1 eliminadas de public.';

-- ============================================
-- SECCION 3: CREAR TABLAS CLONANDO ESTRUCTURA DE DESARROLLO
-- Usa LIKE para copiar definicion exacta de columnas,
-- defaults, check constraints e indices.
-- FKs se añaden manualmente despues.
-- ============================================

-- Orden de creacion: tablas raiz primero, luego dependientes

-- 3.1 organizations (sin FKs)
CREATE TABLE public.organizations
    (LIKE desarrollo.organizations INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.2 projects (FK → organizations)
CREATE TABLE public.projects
    (LIKE desarrollo.projects INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.3 organization_members (FK → organizations)
CREATE TABLE public.organization_members
    (LIKE desarrollo.organization_members INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.4 project_providers (FK → projects)
CREATE TABLE public.project_providers
    (LIKE desarrollo.project_providers INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.5 supplier_directory (sin FKs)
CREATE TABLE public.supplier_directory
    (LIKE desarrollo.supplier_directory INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.6 document_metadata (FK → projects)
CREATE TABLE public.document_metadata
    (LIKE desarrollo.document_metadata INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.7 rfq (sin FKs directas)
CREATE TABLE public.rfq
    (LIKE desarrollo.rfq INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.8 proposals (sin FKs directas)
CREATE TABLE public.proposals
    (LIKE desarrollo.proposals INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.9 rfq_items_master (FK → document_metadata, projects)
CREATE TABLE public.rfq_items_master
    (LIKE desarrollo.rfq_items_master INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.10 provider_responses (FK → rfq_items_master, document_metadata)
CREATE TABLE public.provider_responses
    (LIKE desarrollo.provider_responses INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.11 qa_audit (FK → rfq_items_master, projects, self-ref)
CREATE TABLE public.qa_audit
    (LIKE desarrollo.qa_audit INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.12 qa_notifications (FK → projects)
CREATE TABLE public.qa_notifications
    (LIKE desarrollo.qa_notifications INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.13 qa_response_tokens (FK → projects)
CREATE TABLE public.qa_response_tokens
    (LIKE desarrollo.qa_response_tokens INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.14 ranking_proveedores (FK → projects)
CREATE TABLE public.ranking_proveedores
    (LIKE desarrollo.ranking_proveedores INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.15 scoring_categories (FK → projects)
CREATE TABLE public.scoring_categories
    (LIKE desarrollo.scoring_categories INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.16 scoring_criteria (FK → scoring_categories, projects)
CREATE TABLE public.scoring_criteria
    (LIKE desarrollo.scoring_criteria INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.17 provider_criterion_scores (FK → ranking_proveedores, scoring_criteria, projects)
CREATE TABLE public.provider_criterion_scores
    (LIKE desarrollo.provider_criterion_scores INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.18 scoring_weight_configs (FK → projects)
CREATE TABLE public.scoring_weight_configs
    (LIKE desarrollo.scoring_weight_configs INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.19 economic_offers (FK → projects)
CREATE TABLE public.economic_offers
    (LIKE desarrollo.economic_offers INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.20 project_communications (FK → projects)
CREATE TABLE public.project_communications
    (LIKE desarrollo.project_communications INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.21 supplier_upload_tokens (FK → projects)
CREATE TABLE public.supplier_upload_tokens
    (LIKE desarrollo.supplier_upload_tokens INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

-- 3.22 scoring_audit_log (FK → projects)
CREATE TABLE public.scoring_audit_log
    (LIKE desarrollo.scoring_audit_log INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING GENERATED);

RAISE NOTICE 'Tablas creadas en public (clonadas de desarrollo).';

-- ============================================
-- SECCION 4: FOREIGN KEYS
-- LIKE no copia FKs, hay que añadirlas manualmente
-- ============================================

-- projects → organizations
ALTER TABLE public.projects
    ADD CONSTRAINT fk_projects_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

-- organization_members → organizations
ALTER TABLE public.organization_members
    ADD CONSTRAINT fk_org_members_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- project_providers → projects
ALTER TABLE public.project_providers
    ADD CONSTRAINT fk_project_providers_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- document_metadata → projects
ALTER TABLE public.document_metadata
    ADD CONSTRAINT fk_document_metadata_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- rfq_items_master → document_metadata, projects
ALTER TABLE public.rfq_items_master
    ADD CONSTRAINT fk_rfq_items_file FOREIGN KEY (file_id) REFERENCES public.document_metadata(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_rfq_items_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- provider_responses → rfq_items_master, document_metadata
ALTER TABLE public.provider_responses
    ADD CONSTRAINT fk_provider_responses_requirement FOREIGN KEY (requirement_id) REFERENCES public.rfq_items_master(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_provider_responses_file FOREIGN KEY (file_id) REFERENCES public.document_metadata(id) ON DELETE CASCADE;

-- qa_audit → rfq_items_master, projects, self-ref
ALTER TABLE public.qa_audit
    ADD CONSTRAINT fk_qa_audit_requirement FOREIGN KEY (requirement_id) REFERENCES public.rfq_items_master(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_qa_audit_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_qa_audit_parent FOREIGN KEY (parent_question_id) REFERENCES public.qa_audit(id) ON DELETE SET NULL;

-- qa_notifications → projects
ALTER TABLE public.qa_notifications
    ADD CONSTRAINT fk_qa_notifications_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- qa_response_tokens → projects
ALTER TABLE public.qa_response_tokens
    ADD CONSTRAINT fk_qa_response_tokens_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- ranking_proveedores → projects
ALTER TABLE public.ranking_proveedores
    ADD CONSTRAINT fk_ranking_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- scoring_categories → projects
ALTER TABLE public.scoring_categories
    ADD CONSTRAINT fk_scoring_categories_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- scoring_criteria → scoring_categories, projects
ALTER TABLE public.scoring_criteria
    ADD CONSTRAINT fk_scoring_criteria_category FOREIGN KEY (category_id) REFERENCES public.scoring_categories(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_scoring_criteria_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- provider_criterion_scores → ranking_proveedores, scoring_criteria, projects
ALTER TABLE public.provider_criterion_scores
    ADD CONSTRAINT fk_criterion_scores_ranking FOREIGN KEY (provider_ranking_id) REFERENCES public.ranking_proveedores(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_criterion_scores_criterion FOREIGN KEY (criterion_id) REFERENCES public.scoring_criteria(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_criterion_scores_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- scoring_weight_configs → projects
ALTER TABLE public.scoring_weight_configs
    ADD CONSTRAINT fk_scoring_weight_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- economic_offers → projects
ALTER TABLE public.economic_offers
    ADD CONSTRAINT fk_economic_offers_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- project_communications → projects
ALTER TABLE public.project_communications
    ADD CONSTRAINT fk_project_comms_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- supplier_upload_tokens → projects
ALTER TABLE public.supplier_upload_tokens
    ADD CONSTRAINT fk_upload_tokens_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- scoring_audit_log → projects
ALTER TABLE public.scoring_audit_log
    ADD CONSTRAINT fk_audit_log_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

RAISE NOTICE 'Foreign keys creadas.';

-- ============================================
-- SECCION 5: COPIAR DATOS
-- Desactivar triggers durante bulk insert
-- ============================================
SET session_replication_role = 'replica';

INSERT INTO public.organizations SELECT * FROM desarrollo.organizations;
INSERT INTO public.projects SELECT * FROM desarrollo.projects;
INSERT INTO public.organization_members SELECT * FROM desarrollo.organization_members;
INSERT INTO public.project_providers SELECT * FROM desarrollo.project_providers;
INSERT INTO public.supplier_directory SELECT * FROM desarrollo.supplier_directory;
INSERT INTO public.document_metadata SELECT * FROM desarrollo.document_metadata;
INSERT INTO public.rfq SELECT * FROM desarrollo.rfq;
INSERT INTO public.proposals SELECT * FROM desarrollo.proposals;
INSERT INTO public.rfq_items_master SELECT * FROM desarrollo.rfq_items_master;
INSERT INTO public.provider_responses SELECT * FROM desarrollo.provider_responses;

-- qa_audit: primero sin parent, luego con parent (self-ref FK)
INSERT INTO public.qa_audit SELECT * FROM desarrollo.qa_audit WHERE parent_question_id IS NULL;
INSERT INTO public.qa_audit SELECT * FROM desarrollo.qa_audit WHERE parent_question_id IS NOT NULL;

INSERT INTO public.qa_notifications SELECT * FROM desarrollo.qa_notifications;
INSERT INTO public.qa_response_tokens SELECT * FROM desarrollo.qa_response_tokens;
INSERT INTO public.ranking_proveedores SELECT * FROM desarrollo.ranking_proveedores;
INSERT INTO public.scoring_categories SELECT * FROM desarrollo.scoring_categories;
INSERT INTO public.scoring_criteria SELECT * FROM desarrollo.scoring_criteria;
INSERT INTO public.provider_criterion_scores SELECT * FROM desarrollo.provider_criterion_scores;
INSERT INTO public.scoring_weight_configs SELECT * FROM desarrollo.scoring_weight_configs;
INSERT INTO public.economic_offers SELECT * FROM desarrollo.economic_offers;
INSERT INTO public.project_communications SELECT * FROM desarrollo.project_communications;
INSERT INTO public.supplier_upload_tokens SELECT * FROM desarrollo.supplier_upload_tokens;

-- scoring_audit_log (puede estar vacia)
INSERT INTO public.scoring_audit_log SELECT * FROM desarrollo.scoring_audit_log;

-- Reactivar triggers
SET session_replication_role = 'origin';

RAISE NOTICE 'Datos copiados de desarrollo a public.';

-- ============================================
-- SECCION 6: SINCRONIZAR SECUENCIAS (BIGSERIAL)
-- ============================================
SELECT setval(pg_get_serial_sequence('public.rfq', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM public.rfq), 0), 1));
SELECT setval(pg_get_serial_sequence('public.proposals', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM public.proposals), 0), 1));

-- ============================================
-- SECCION 7: FUNCIONES
-- ============================================

-- Funcion generica updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at para projects
CREATE OR REPLACE FUNCTION public.update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Normalizar nombres de proyecto
CREATE OR REPLACE FUNCTION public.normalize_project_name(display_name TEXT)
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

-- Obtener o crear proyecto
CREATE OR REPLACE FUNCTION public.get_or_create_project(
    p_display_name TEXT,
    p_description TEXT DEFAULT NULL
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
        INSERT INTO public.projects (name, display_name, description)
        VALUES (v_normalized_name, p_display_name, p_description)
        RETURNING id INTO v_project_id;
    END IF;
    RETURN v_project_id;
END;
$$ LANGUAGE plpgsql;

-- Calcular overall_score (trigger function)
CREATE OR REPLACE FUNCTION public.calculate_weighted_overall_score()
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

-- Clonar criterios por defecto a proyecto
CREATE OR REPLACE FUNCTION public.clone_default_criteria_to_project(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
    v_technical_id UUID;
    v_economic_id UUID;
    v_execution_id UUID;
    v_hse_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
        RAISE EXCEPTION 'Project % does not exist', p_project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM public.scoring_categories WHERE project_id = p_project_id) THEN
        RETURN;
    END IF;
    INSERT INTO public.scoring_categories (project_id, name, display_name, display_name_es, weight, color, sort_order)
    VALUES (p_project_id, 'technical', 'Technical Completeness', 'Completitud Técnica', 30, '#12b5b0', 1)
    RETURNING id INTO v_technical_id;
    INSERT INTO public.scoring_categories (project_id, name, display_name, display_name_es, weight, color, sort_order)
    VALUES (p_project_id, 'economic', 'Economic Competitiveness', 'Competitividad Económica', 35, '#f59e0b', 2)
    RETURNING id INTO v_economic_id;
    INSERT INTO public.scoring_categories (project_id, name, display_name, display_name_es, weight, color, sort_order)
    VALUES (p_project_id, 'execution', 'Execution Capability', 'Capacidad de Ejecución', 20, '#3b82f6', 3)
    RETURNING id INTO v_execution_id;
    INSERT INTO public.scoring_categories (project_id, name, display_name, display_name_es, weight, color, sort_order)
    VALUES (p_project_id, 'hse_compliance', 'HSE & Compliance', 'HSE y Cumplimiento', 15, '#8b5cf6', 4)
    RETURNING id INTO v_hse_id;
    INSERT INTO public.scoring_criteria (category_id, project_id, name, display_name, display_name_es, description, weight, keywords, sort_order)
    VALUES
        (v_technical_id, p_project_id, 'scope_facilities', 'Scope of Facilities', 'Alcance de Instalaciones', 'Evaluation of the facilities and equipment included in the proposal', 33.33, ARRAY['facilities', 'plant', 'equipment', 'infrastructure'], 1),
        (v_technical_id, p_project_id, 'scope_work', 'Scope of Work', 'Alcance de Trabajo', 'Evaluation of the work scope coverage and completeness', 33.33, ARRAY['scope', 'work', 'activities', 'tasks'], 2),
        (v_technical_id, p_project_id, 'deliverables_quality', 'Deliverables Quality', 'Calidad de Entregables', 'Quality and completeness of proposed deliverables', 33.34, ARRAY['deliverables', 'documents', 'quality', 'standards'], 3);
    INSERT INTO public.scoring_criteria (category_id, project_id, name, display_name, display_name_es, description, weight, keywords, sort_order)
    VALUES
        (v_economic_id, p_project_id, 'total_price', 'Total Price', 'Precio Total', 'Competitiveness of the total proposed price', 42.86, ARRAY['price', 'cost', 'total', 'budget'], 1),
        (v_economic_id, p_project_id, 'price_breakdown', 'Price Breakdown', 'Desglose de Precio', 'Transparency and detail of price breakdown', 22.86, ARRAY['breakdown', 'detail', 'itemized', 'line items'], 2),
        (v_economic_id, p_project_id, 'optionals_included', 'Optionals Included', 'Opcionales Incluidos', 'Optional items included in base price', 20.00, ARRAY['optionals', 'extras', 'additions', 'included'], 3),
        (v_economic_id, p_project_id, 'capex_opex_methodology', 'CAPEX/OPEX Methodology', 'Metodología CAPEX/OPEX', 'Clarity of CAPEX/OPEX classification methodology', 14.28, ARRAY['capex', 'opex', 'methodology', 'classification'], 4);
    INSERT INTO public.scoring_criteria (category_id, project_id, name, display_name, display_name_es, description, weight, keywords, sort_order)
    VALUES
        (v_execution_id, p_project_id, 'schedule', 'Schedule', 'Cronograma', 'Realism and achievability of proposed schedule', 40.00, ARRAY['schedule', 'timeline', 'milestones', 'planning'], 1),
        (v_execution_id, p_project_id, 'resources_allocation', 'Resources Allocation', 'Asignación de Recursos', 'Adequacy of resources allocated per discipline', 30.00, ARRAY['resources', 'team', 'staff', 'personnel'], 2),
        (v_execution_id, p_project_id, 'exceptions', 'Exceptions & Deviations', 'Excepciones y Desviaciones', 'Number and severity of exceptions and deviations', 30.00, ARRAY['exceptions', 'deviations', 'exclusions', 'clarifications'], 3);
    INSERT INTO public.scoring_criteria (category_id, project_id, name, display_name, display_name_es, description, weight, keywords, sort_order)
    VALUES
        (v_hse_id, p_project_id, 'safety_studies', 'Safety Studies', 'Estudios de Seguridad', 'Inclusion and quality of safety studies', 53.33, ARRAY['safety', 'hazop', 'risk', 'studies'], 1),
        (v_hse_id, p_project_id, 'regulatory_compliance', 'Regulatory Compliance', 'Cumplimiento Normativo', 'Compliance with regulatory requirements', 46.67, ARRAY['regulatory', 'compliance', 'permits', 'legal'], 2);
END;
$$ LANGUAGE plpgsql;

-- Calcular score dinamico
CREATE OR REPLACE FUNCTION public.calculate_dynamic_overall_score(p_provider_ranking_id UUID)
RETURNS DECIMAL(4,2) AS $$
DECLARE
    v_overall_score DECIMAL(10,4) := 0;
    v_category RECORD;
    v_criterion RECORD;
    v_category_score DECIMAL(10,4);
    v_project_id UUID;
BEGIN
    SELECT project_id INTO v_project_id FROM public.ranking_proveedores WHERE id = p_provider_ranking_id;
    IF v_project_id IS NULL THEN RETURN 0; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.scoring_categories WHERE project_id = v_project_id) THEN
        SELECT overall_score INTO v_overall_score FROM public.ranking_proveedores WHERE id = p_provider_ranking_id;
        RETURN COALESCE(v_overall_score, 0);
    END IF;
    FOR v_category IN SELECT id, name, weight FROM public.scoring_categories WHERE project_id = v_project_id ORDER BY sort_order
    LOOP
        v_category_score := 0;
        FOR v_criterion IN
            SELECT sc.id, sc.weight, COALESCE(pcs.score, 0) as score
            FROM public.scoring_criteria sc
            LEFT JOIN public.provider_criterion_scores pcs ON pcs.criterion_id = sc.id AND pcs.provider_ranking_id = p_provider_ranking_id
            WHERE sc.category_id = v_category.id ORDER BY sc.sort_order
        LOOP
            v_category_score := v_category_score + (v_criterion.score * v_criterion.weight / 100);
        END LOOP;
        v_overall_score := v_overall_score + (v_category_score * v_category.weight / 100);
    END LOOP;
    RETURN ROUND(v_overall_score, 2);
END;
$$ LANGUAGE plpgsql;

-- Validar pesos categorias (trigger)
CREATE OR REPLACE FUNCTION public.validate_category_weights()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validar pesos criterios (trigger)
CREATE OR REPLACE FUNCTION public.validate_criteria_weights()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at para economic_offers
CREATE OR REPLACE FUNCTION public.update_economic_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Soft-delete project
CREATE OR REPLACE FUNCTION public.soft_delete_project(p_project_id UUID)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.projects SET is_active = false, updated_at = NOW() WHERE id = p_project_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Project not found'); END IF;
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Update project name
CREATE OR REPLACE FUNCTION public.update_project_name(p_project_id UUID, p_new_display_name TEXT)
RETURNS JSONB AS $$
DECLARE v_new_name TEXT;
BEGIN
    v_new_name := normalize_project_name(p_new_display_name);
    UPDATE public.projects SET display_name = p_new_display_name, name = v_new_name, updated_at = NOW() WHERE id = p_project_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Project not found'); END IF;
    RETURN jsonb_build_object('success', true, 'name', v_new_name, 'display_name', p_new_display_name);
END;
$$ LANGUAGE plpgsql;

-- Busqueda vectorial RFQ
CREATE OR REPLACE FUNCTION public.match_rfq(
    query_embedding vector(4096), match_count int DEFAULT 10, filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (id bigint, content text, metadata jsonb, similarity float) AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, r.content, r.metadata, 1 - (r.embedding <=> query_embedding) as similarity
    FROM public.rfq r
    WHERE (filter->>'project_id' IS NULL OR r.metadata->>'project_id' = filter->>'project_id')
    ORDER BY r.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Busqueda vectorial proposals
CREATE OR REPLACE FUNCTION public.match_proposals(
    query_embedding vector(4096), match_count int DEFAULT 10, filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (id bigint, content text, metadata jsonb, similarity float) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.content, p.metadata, 1 - (p.embedding <=> query_embedding) as similarity
    FROM public.proposals p
    WHERE (filter->>'project_id' IS NULL OR p.metadata->>'project_id' = filter->>'project_id')
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Helper: get user's organization
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
BEGIN
    BEGIN
        RETURN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1);
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Audit log trigger function (security hardening)
CREATE OR REPLACE FUNCTION public.log_scoring_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO public.scoring_audit_log (project_id, table_name, operation, provider_name, old_data, new_data)
        VALUES (NEW.project_id, TG_TABLE_NAME, TG_OP,
            CASE WHEN TG_TABLE_NAME = 'ranking_proveedores' THEN NEW.provider_name ELSE NULL END,
            row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.scoring_audit_log (project_id, table_name, operation, provider_name, new_data)
        VALUES (NEW.project_id, TG_TABLE_NAME, TG_OP,
            CASE WHEN TG_TABLE_NAME = 'ranking_proveedores' THEN NEW.provider_name ELSE NULL END,
            row_to_json(NEW)::jsonb);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.scoring_audit_log (project_id, table_name, operation, provider_name, old_data)
        VALUES (OLD.project_id, TG_TABLE_NAME, TG_OP,
            CASE WHEN TG_TABLE_NAME = 'ranking_proveedores' THEN OLD.provider_name ELSE NULL END,
            row_to_json(OLD)::jsonb);
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalcular scores con pesos (RPC segura)
CREATE OR REPLACE FUNCTION public.recalculate_scores_with_weights(p_project_id UUID, p_weights JSONB)
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
    IF p_project_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'project_id is required'); END IF;
    IF p_weights IS NULL OR p_weights = '{}'::jsonb THEN RETURN jsonb_build_object('success', false, 'error', 'weights object is required'); END IF;
    FOR v_provider IN SELECT id, provider_name, individual_scores_json FROM public.ranking_proveedores WHERE project_id = p_project_id
    LOOP
        v_individual_scores := COALESCE(v_provider.individual_scores_json, '{}'::jsonb);
        v_new_overall := 0;
        FOR v_key IN SELECT jsonb_object_keys(p_weights)
        LOOP
            v_score := COALESCE((v_individual_scores->>v_key)::decimal, 0);
            IF v_score > 10 THEN v_score := v_score / 10; END IF;
            v_weight := COALESCE((p_weights->>v_key)::decimal, 0);
            v_new_overall := v_new_overall + (v_score * v_weight / 100);
        END LOOP;
        v_category_scores := '{}'::jsonb;
        FOR v_category IN SELECT sc.name, sc.weight AS cat_weight, sc.id AS cat_id FROM public.scoring_categories sc WHERE sc.project_id = p_project_id ORDER BY sc.sort_order
        LOOP
            v_cat_weighted_sum := 0; v_cat_total_weight := 0;
            FOR v_criterion IN SELECT scr.name, scr.weight AS crit_weight FROM public.scoring_criteria scr WHERE scr.category_id = v_category.cat_id ORDER BY scr.sort_order
            LOOP
                v_score := COALESCE((v_individual_scores->>v_criterion.name)::decimal, 0);
                IF v_score > 10 THEN v_score := v_score / 10; END IF;
                v_weight := (v_criterion.crit_weight * v_category.cat_weight) / 100;
                v_cat_weighted_sum := v_cat_weighted_sum + (v_score * v_weight);
                v_cat_total_weight := v_cat_total_weight + v_weight;
            END LOOP;
            IF v_cat_total_weight > 0 THEN
                v_category_scores := v_category_scores || jsonb_build_object(v_category.name, ROUND(v_cat_weighted_sum / v_cat_total_weight, 2));
            ELSE
                v_category_scores := v_category_scores || jsonb_build_object(v_category.name, 0);
            END IF;
        END LOOP;
        UPDATE public.ranking_proveedores
        SET overall_score = ROUND(v_new_overall, 2), category_scores_json = v_category_scores,
            technical_score = COALESCE((v_category_scores->>'technical')::decimal, technical_score),
            economic_score = COALESCE((v_category_scores->>'economic')::decimal, economic_score),
            execution_score = COALESCE((v_category_scores->>'execution')::decimal, execution_score),
            hse_compliance_score = COALESCE((v_category_scores->>'hse_compliance')::decimal, hse_compliance_score),
            last_updated = NOW()
        WHERE id = v_provider.id;
        v_count := v_count + 1;
    END LOOP;
    RETURN jsonb_build_object('success', true, 'providers_updated', v_count, 'project_id', p_project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrar scoring data existente
CREATE OR REPLACE FUNCTION public.migrate_existing_scoring_data(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
    v_ranking RECORD;
    v_criterion RECORD;
    v_score DECIMAL(4,2);
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.scoring_categories WHERE project_id = p_project_id) THEN
        PERFORM clone_default_criteria_to_project(p_project_id);
    END IF;
    FOR v_ranking IN
        SELECT id, provider_name, scope_facilities_score, scope_work_score, deliverables_quality_score,
               total_price_score, price_breakdown_score, optionals_included_score, capex_opex_methodology_score,
               schedule_score, resources_allocation_score, exceptions_score,
               safety_studies_score, regulatory_compliance_score
        FROM public.ranking_proveedores WHERE project_id = p_project_id
    LOOP
        FOR v_criterion IN SELECT id, name FROM public.scoring_criteria WHERE project_id = p_project_id
        LOOP
            v_score := CASE v_criterion.name
                WHEN 'scope_facilities' THEN v_ranking.scope_facilities_score
                WHEN 'scope_work' THEN v_ranking.scope_work_score
                WHEN 'deliverables_quality' THEN v_ranking.deliverables_quality_score
                WHEN 'total_price' THEN v_ranking.total_price_score
                WHEN 'price_breakdown' THEN v_ranking.price_breakdown_score
                WHEN 'optionals_included' THEN v_ranking.optionals_included_score
                WHEN 'capex_opex_methodology' THEN v_ranking.capex_opex_methodology_score
                WHEN 'schedule' THEN v_ranking.schedule_score
                WHEN 'resources_allocation' THEN v_ranking.resources_allocation_score
                WHEN 'exceptions' THEN v_ranking.exceptions_score
                WHEN 'safety_studies' THEN v_ranking.safety_studies_score
                WHEN 'regulatory_compliance' THEN v_ranking.regulatory_compliance_score
                ELSE 0
            END;
            INSERT INTO public.provider_criterion_scores (provider_ranking_id, criterion_id, project_id, provider_name, score)
            VALUES (v_ranking.id, v_criterion.id, p_project_id, v_ranking.provider_name, COALESCE(v_score, 0))
            ON CONFLICT (provider_ranking_id, criterion_id) DO UPDATE SET score = COALESCE(v_score, 0), updated_at = NOW();
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

RAISE NOTICE 'Funciones creadas.';

-- ============================================
-- SECCION 8: VISTAS
-- ============================================

CREATE OR REPLACE VIEW public.v_projects_with_stats AS
SELECT p.*, COUNT(DISTINCT dm.id) as document_count, COUNT(DISTINCT rim.id) as requirement_count, COUNT(DISTINCT qa.id) as qa_count
FROM public.projects p
LEFT JOIN public.document_metadata dm ON dm.project_id = p.id
LEFT JOIN public.rfq_items_master rim ON rim.project_id = p.id
LEFT JOIN public.qa_audit qa ON qa.project_id = p.id
GROUP BY p.id;

CREATE OR REPLACE VIEW public.ranking_proveedores_por_tipo AS
SELECT rp.provider_name, rp.project_id,
    ROUND(rp.technical_score::numeric, 2) as technical_score,
    ROUND(rp.economic_score::numeric, 2) as economic_score,
    ROUND(rp.execution_score::numeric, 2) as execution_score,
    ROUND(rp.hse_compliance_score::numeric, 2) as hse_compliance_score,
    ROUND(rp.overall_score::numeric, 2) as overall_score,
    ROUND(rp.compliance_percentage::numeric, 2) as compliance_percentage,
    rp.evaluation_count
FROM public.ranking_proveedores rp ORDER BY rp.overall_score DESC;

CREATE OR REPLACE VIEW public.ranking_proveedores_detailed AS
SELECT rp.provider_name, rp.project_id,
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
FROM public.ranking_proveedores rp ORDER BY rp.overall_score DESC;

CREATE OR REPLACE VIEW public.scoring_configuration_summary AS
SELECT sc.project_id, sc.id as category_id, sc.name as category_name,
    sc.display_name as category_display_name, sc.display_name_es as category_display_name_es,
    sc.weight as category_weight, sc.color as category_color, sc.sort_order as category_sort_order,
    scr.id as criterion_id, scr.name as criterion_name, scr.display_name as criterion_display_name,
    scr.display_name_es as criterion_display_name_es, scr.description as criterion_description,
    scr.weight as criterion_weight, scr.keywords as criterion_keywords, scr.sort_order as criterion_sort_order
FROM public.scoring_categories sc
LEFT JOIN public.scoring_criteria scr ON scr.category_id = sc.id
ORDER BY sc.project_id, sc.sort_order, scr.sort_order;

CREATE OR REPLACE VIEW public.v_economic_comparison AS
SELECT eo.project_id, eo.provider_name, eo.total_price, eo.currency, eo.discount_percentage,
    eo.tco_value, eo.tco_period_years, eo.validity_days, eo.taxes_included, eo.insurance_included,
    eo.payment_terms,
    ROUND(eo.total_price * (1 - COALESCE(eo.discount_percentage, 0) / 100), 2) AS net_price,
    RANK() OVER (PARTITION BY eo.project_id ORDER BY eo.total_price ASC) AS price_rank,
    jsonb_array_length(COALESCE(eo.optional_items, '[]'::jsonb)) AS optional_items_count,
    jsonb_array_length(COALESCE(eo.alternative_offers, '[]'::jsonb)) AS alternative_offers_count,
    eo.created_at, eo.updated_at
FROM public.economic_offers eo ORDER BY eo.project_id, eo.total_price ASC;

CREATE OR REPLACE VIEW public.v_supplier_history AS
SELECT COALESCE(sd.name, pp.provider_name) AS supplier_name,
    sd.display_name, sd.email, sd.phone, sd.contact_person, sd.category, sd.website, sd.notes, sd.tags,
    COUNT(DISTINCT pp.project_id) AS project_count,
    ARRAY_AGG(DISTINCT p.display_name) FILTER (WHERE p.display_name IS NOT NULL) AS project_names,
    AVG(rp.overall_score) AS avg_score, MAX(rp.overall_score) AS best_score, MIN(rp.overall_score) AS worst_score,
    COUNT(DISTINCT rp.id) AS times_scored, MAX(pp.invited_at) AS last_participation,
    ARRAY_AGG(DISTINCT pp.status) FILTER (WHERE pp.status IS NOT NULL) AS statuses
FROM public.project_providers pp
LEFT JOIN public.supplier_directory sd ON UPPER(sd.name) = UPPER(pp.provider_name)
LEFT JOIN public.projects p ON p.id = pp.project_id
LEFT JOIN public.ranking_proveedores rp ON UPPER(rp.provider_name) = UPPER(pp.provider_name) AND rp.project_id = pp.project_id
GROUP BY COALESCE(sd.name, pp.provider_name), sd.display_name, sd.email, sd.phone, sd.contact_person, sd.category, sd.website, sd.notes, sd.tags;

RAISE NOTICE 'Vistas creadas.';

-- ============================================
-- SECCION 9: TRIGGERS
-- ============================================

CREATE TRIGGER trigger_update_projects_updated_at
    BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_projects_updated_at();

CREATE TRIGGER trigger_calculate_weighted_score
    BEFORE INSERT OR UPDATE ON public.ranking_proveedores FOR EACH ROW EXECUTE FUNCTION public.calculate_weighted_overall_score();

CREATE TRIGGER trigger_validate_category_weights
    AFTER INSERT OR UPDATE OR DELETE ON public.scoring_categories FOR EACH ROW EXECUTE FUNCTION public.validate_category_weights();

CREATE TRIGGER trigger_validate_criteria_weights
    AFTER INSERT OR UPDATE OR DELETE ON public.scoring_criteria FOR EACH ROW EXECUTE FUNCTION public.validate_criteria_weights();

CREATE TRIGGER trigger_economic_offers_updated
    BEFORE UPDATE ON public.economic_offers FOR EACH ROW EXECUTE FUNCTION public.update_economic_offers_updated_at();

CREATE TRIGGER set_organizations_updated_at
    BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_org_members_updated_at
    BEFORE UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Audit triggers (security hardening)
CREATE TRIGGER trigger_audit_ranking_proveedores
    AFTER INSERT OR UPDATE OR DELETE ON public.ranking_proveedores FOR EACH ROW EXECUTE FUNCTION public.log_scoring_changes();

CREATE TRIGGER trigger_audit_scoring_weight_configs
    AFTER INSERT OR UPDATE OR DELETE ON public.scoring_weight_configs FOR EACH ROW EXECUTE FUNCTION public.log_scoring_changes();

CREATE TRIGGER trigger_audit_scoring_categories
    AFTER INSERT OR UPDATE OR DELETE ON public.scoring_categories FOR EACH ROW EXECUTE FUNCTION public.log_scoring_changes();

RAISE NOTICE 'Triggers creados.';

-- ============================================
-- SECCION 10: RLS POLICIES
-- ============================================

-- Tablas con acceso total (TODO: restringir con auth)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.project_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on project_providers" ON public.project_providers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.document_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on document_metadata" ON public.document_metadata FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.rfq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on rfq" ON public.rfq FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on proposals" ON public.proposals FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.rfq_items_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on rfq_items_master" ON public.rfq_items_master FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.provider_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on provider_responses" ON public.provider_responses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.qa_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on qa_audit" ON public.qa_audit FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.qa_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on qa_notifications" ON public.qa_notifications FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.scoring_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on scoring_categories" ON public.scoring_categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.scoring_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on scoring_criteria" ON public.scoring_criteria FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.scoring_weight_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on scoring_weight_configs" ON public.scoring_weight_configs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.economic_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on economic_offers" ON public.economic_offers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.project_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on project_communications" ON public.project_communications FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.supplier_directory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on supplier_directory" ON public.supplier_directory FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on organizations" ON public.organizations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on organization_members" ON public.organization_members FOR ALL USING (true) WITH CHECK (true);

-- Security hardening: read-only para scoring results (n8n usa service_role que bypasea RLS)
ALTER TABLE public.ranking_proveedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read ranking_proveedores" ON public.ranking_proveedores FOR SELECT USING (true);

ALTER TABLE public.provider_criterion_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read provider_criterion_scores" ON public.provider_criterion_scores FOR SELECT USING (true);

-- Audit log: solo lectura
ALTER TABLE public.scoring_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read audit log" ON public.scoring_audit_log FOR SELECT USING (true);

-- Tokens: con expiration enforcement
ALTER TABLE public.qa_response_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read by token" ON public.qa_response_tokens FOR SELECT USING (true);
CREATE POLICY "Allow insert tokens" ON public.qa_response_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update non_expired_qa_tokens" ON public.qa_response_tokens FOR UPDATE USING (expires_at > NOW());

ALTER TABLE public.supplier_upload_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read supplier_upload_tokens" ON public.supplier_upload_tokens FOR SELECT USING (true);
CREATE POLICY "Allow insert supplier_upload_tokens" ON public.supplier_upload_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update non_expired_tokens" ON public.supplier_upload_tokens FOR UPDATE USING (expires_at > NOW());

RAISE NOTICE 'RLS policies aplicadas.';

-- ============================================
-- SECCION 11: PERMISOS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================
-- SECCION 12: VERIFICACION
-- ============================================
DO $$
DECLARE
    dev_count BIGINT;
    pub_count BIGINT;
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'organizations', 'projects', 'organization_members', 'project_providers',
        'supplier_directory', 'document_metadata', 'rfq', 'proposals',
        'rfq_items_master', 'provider_responses', 'qa_audit', 'qa_notifications',
        'qa_response_tokens', 'ranking_proveedores', 'scoring_categories',
        'scoring_criteria', 'provider_criterion_scores', 'scoring_weight_configs',
        'economic_offers', 'project_communications', 'supplier_upload_tokens',
        'scoring_audit_log'
    ];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACION: desarrollo vs public';
    RAISE NOTICE '========================================';
    FOREACH tbl IN ARRAY tables LOOP
        BEGIN
            EXECUTE format('SELECT count(*) FROM desarrollo.%I', tbl) INTO dev_count;
            EXECUTE format('SELECT count(*) FROM public.%I', tbl) INTO pub_count;
            RAISE NOTICE '%-35s desarrollo=%-6s public=%-6s %s',
                tbl, dev_count::text, pub_count::text,
                CASE WHEN dev_count = pub_count THEN 'OK' ELSE 'MISMATCH!' END;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '%-35s ERROR: %', tbl, SQLERRM;
        END;
    END LOOP;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACION COMPLETADA';
    RAISE NOTICE '========================================';
END $$;

COMMIT;
