-- ============================================
-- BBDD DESARROLLO - Schema completo para el entorno de desarrollo
-- Ejecutar en Supabase SQL Editor
-- NO toca el schema public (produccion)
-- ============================================

-- 1. Crear el schema (DROP primero si ya existe de un intento previo)
DROP SCHEMA IF EXISTS desarrollo CASCADE;
CREATE SCHEMA desarrollo;

-- 2. Crear todas las tablas, funciones, vistas, triggers en desarrollo

-- IMPORTANTE: Setear search_path para que las funciones PL/pgSQL
-- resuelvan tablas sin prefijo al schema 'desarrollo'
SET search_path TO desarrollo, public, extensions;

-- Funcion generica para updated_at (usada por varios triggers)
CREATE OR REPLACE FUNCTION desarrollo.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 0. TABLA DE PROYECTOS (Normalización de nombres)
CREATE TABLE IF NOT EXISTS desarrollo.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- Nombre normalizado (sin caracteres especiales, mayúsculas)
    display_name TEXT NOT NULL, -- Nombre para mostrar (puede tener caracteres especiales)
    description TEXT,
    status TEXT DEFAULT 'Setup', -- Setup, Ingestion, Evaluation, Completed
    ai_context TEXT, -- Contexto específico para el prompt del LLM (ej. "Green Hydrogen Plant", "Solar Farm")
    is_active BOOLEAN DEFAULT true, -- Soft-delete support
    project_type TEXT DEFAULT 'RFQ' CHECK (project_type IN ('RFP', 'RFQ', 'RFI')), -- T12: Project type
    disciplines TEXT[] DEFAULT NULL, -- Disciplines involved in the project
    date_opening TIMESTAMPTZ, -- T3: Project opening date
    date_submission_deadline TIMESTAMPTZ, -- T3: Deadline for supplier submissions
    date_evaluation TIMESTAMPTZ, -- T3: Deadline for evaluation completion
    date_award TIMESTAMPTZ, -- T3: Deadline for contract award
    invited_suppliers TEXT[] DEFAULT '{}', -- T4: Suppliers invited to bid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas por nombre
CREATE INDEX IF NOT EXISTS idx_projects_name ON desarrollo.projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_display_name ON desarrollo.projects(display_name);
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON desarrollo.projects(is_active) WHERE is_active = true;

-- 0b. PROVEEDORES POR PROYECTO (relational table for setup wizard)
CREATE TABLE IF NOT EXISTS desarrollo.project_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_project_providers_project ON desarrollo.project_providers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_providers_status ON desarrollo.project_providers(project_id, status);

-- 1. REGISTRO GLOBAL DE DOCUMENTOS
CREATE TABLE IF NOT EXISTS desarrollo.document_metadata (
    id TEXT PRIMARY KEY,
    title TEXT,
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE SET NULL,
    document_type TEXT NOT NULL,
    provider TEXT,
    evaluation_types TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLAS VECTORIALES (Vectores de 4096)
-- Aceptan los 4096 de Qwen3, solo que no llevan índice (perfecto para <10k filas)
CREATE TABLE IF NOT EXISTS desarrollo.rfq (
    id BIGSERIAL PRIMARY KEY,
    content TEXT,
    metadata JSONB,
    embedding vector(4096) 
);

CREATE TABLE IF NOT EXISTS desarrollo.proposals (
    id BIGSERIAL PRIMARY KEY,
    content TEXT,
    metadata JSONB,
    embedding vector(4096)
);

-- 3. REQUISITOS MAESTROS
CREATE TABLE IF NOT EXISTS desarrollo.rfq_items_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id TEXT REFERENCES desarrollo.document_metadata(id) ON DELETE CASCADE,
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE NOT NULL,
    evaluation_type TEXT NOT NULL,
    phase TEXT,
    requirement_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por proyecto
CREATE INDEX IF NOT EXISTS idx_rfq_items_master_project_id ON desarrollo.rfq_items_master(project_id);

-- 4. EVALUACIONES DE PROVEEDORES
CREATE TABLE IF NOT EXISTS desarrollo.provider_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID REFERENCES desarrollo.rfq_items_master(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    evaluation_value TEXT,
    comment TEXT,
    file_id TEXT REFERENCES desarrollo.document_metadata(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_requirement_provider_file UNIQUE(requirement_id, provider_name, file_id)
);

-- Indexes for provider_responses (FK join performance)
CREATE INDEX IF NOT EXISTS idx_provider_responses_requirement ON desarrollo.provider_responses(requirement_id);
CREATE INDEX IF NOT EXISTS idx_provider_responses_provider ON desarrollo.provider_responses(provider_name);

-- Composite index for document_metadata common queries
CREATE INDEX IF NOT EXISTS idx_document_metadata_project_type ON desarrollo.document_metadata(project_id, document_type);

-- 5. AUDITORÍA TÉCNICA (Q&A)
CREATE TABLE IF NOT EXISTS desarrollo.qa_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID REFERENCES desarrollo.rfq_items_master(id) ON DELETE SET NULL,
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,
    discipline TEXT,
    question TEXT NOT NULL,
    importance TEXT CHECK (importance IN ('High', 'Medium', 'Low')),
    status TEXT DEFAULT 'Pending',
    response TEXT,
    parent_question_id UUID REFERENCES desarrollo.qa_audit(id) ON DELETE SET NULL, -- For follow-up threads
    responded_at TIMESTAMPTZ,
    response_source TEXT CHECK (response_source IN ('portal', 'manual', 'email')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por proyecto
CREATE INDEX IF NOT EXISTS idx_qa_audit_project_id ON desarrollo.qa_audit(project_id);
CREATE INDEX IF NOT EXISTS idx_qa_audit_project_status ON desarrollo.qa_audit(project_id, status);
CREATE INDEX IF NOT EXISTS idx_qa_audit_parent_question ON desarrollo.qa_audit(parent_question_id) WHERE parent_question_id IS NOT NULL;

-- 5a. NOTIFICACIONES Q&A
CREATE TABLE IF NOT EXISTS desarrollo.qa_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('supplier_responded', 'evaluation_updated', 'questions_sent')),
    title TEXT NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_qa_notifications_project ON desarrollo.qa_notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_qa_notifications_unread ON desarrollo.qa_notifications(project_id, is_read) WHERE is_read = false;

-- 5b. TOKENS DE RESPUESTA DE PROVEEDORES
-- Sistema para enviar preguntas Q&A a proveedores vía link único
CREATE TABLE IF NOT EXISTS desarrollo.qa_response_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    question_ids UUID[] NOT NULL,  -- Array de IDs de preguntas incluidas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    accessed_at TIMESTAMPTZ,  -- Cuando el proveedor abrió el link
    responded_at TIMESTAMPTZ,  -- Cuando envió las respuestas
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accessed', 'responded', 'expired'))
);

-- Índices para qa_response_tokens
CREATE INDEX IF NOT EXISTS idx_qa_response_tokens_token ON desarrollo.qa_response_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qa_response_tokens_status ON desarrollo.qa_response_tokens(status);
CREATE INDEX IF NOT EXISTS idx_qa_response_tokens_project ON desarrollo.qa_response_tokens(project_id);

-- Habilitar RLS para qa_response_tokens
ALTER TABLE desarrollo.qa_response_tokens ENABLE ROW LEVEL SECURITY;

-- Política: Lectura pública por token (para el formulario del proveedor)
DROP POLICY IF EXISTS "Allow read by token" ON desarrollo.qa_response_tokens;
CREATE POLICY "Allow read by token" ON desarrollo.qa_response_tokens
    FOR SELECT USING (true);

-- Política: Update por token (para marcar como accedido/respondido)
DROP POLICY IF EXISTS "Allow update by token" ON desarrollo.qa_response_tokens;
CREATE POLICY "Allow update by token" ON desarrollo.qa_response_tokens
    FOR UPDATE USING (true);

-- Política: Insert para crear nuevos tokens
DROP POLICY IF EXISTS "Allow insert tokens" ON desarrollo.qa_response_tokens;
CREATE POLICY "Allow insert tokens" ON desarrollo.qa_response_tokens
    FOR INSERT WITH CHECK (true);

-- Note: responded_at, response_source, and requirement_id are now defined
-- in the CREATE TABLE statement above. Keeping index for requirement_id.
CREATE INDEX IF NOT EXISTS idx_qa_audit_requirement_id ON desarrollo.qa_audit(requirement_id);

-- Status values for qa_audit.status:
-- 'Draft' - Question created but not yet approved
-- 'Pending' - Question pending review
-- 'Approved' - Question approved, ready to send
-- 'Sent' - Question sent to supplier
-- 'Answered' - Supplier has responded (needs review)
-- 'Resolved' - Response reviewed and accepted as satisfactory
-- 'NeedsMoreInfo' - Response reviewed but needs additional clarification
-- 'Discarded' - Question discarded/cancelled


-- Función para actualizar updated_at en projects
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER trigger_update_projects_updated_at
    BEFORE UPDATE ON desarrollo.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();

-- Función helper para normalizar nombres de proyectos
-- Convierte nombres con caracteres especiales a formato normalizado
CREATE OR REPLACE FUNCTION normalize_project_name(display_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN UPPER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(display_name, '[^\w\s]', '', 'g'), -- Elimina caracteres especiales
            '\s+', '_', 'g' -- Reemplaza espacios múltiples con guión bajo
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para obtener o crear un proyecto
-- Útil para migraciones y para asegurar que los proyectos se crean correctamente
CREATE OR REPLACE FUNCTION get_or_create_project(
    p_display_name TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_project_id UUID;
    v_normalized_name TEXT;
BEGIN
    -- Normalizar el nombre
    v_normalized_name := normalize_project_name(p_display_name);
    
    -- Buscar si ya existe
    SELECT id INTO v_project_id
    FROM desarrollo.projects
    WHERE name = v_normalized_name OR display_name = p_display_name
    LIMIT 1;
    
    -- Si no existe, crearlo
    IF v_project_id IS NULL THEN
        INSERT INTO desarrollo.projects (name, display_name, description)
        VALUES (v_normalized_name, p_display_name, p_description)
        RETURNING id INTO v_project_id;
    END IF;
    
    RETURN v_project_id;
END;
$$ LANGUAGE plpgsql;

-- Vista para facilitar consultas con nombres de proyectos
DROP VIEW IF EXISTS desarrollo.v_projects_with_stats;
CREATE OR REPLACE VIEW desarrollo.v_projects_with_stats AS
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
FROM desarrollo.projects p
LEFT JOIN desarrollo.document_metadata dm ON dm.project_id = p.id
LEFT JOIN desarrollo.rfq_items_master rim ON rim.project_id = p.id
LEFT JOIN desarrollo.qa_audit qa ON qa.project_id = p.id
GROUP BY p.id, p.name, p.display_name, p.description, p.status, p.ai_context,
         p.is_active, p.project_type, p.disciplines,
         p.date_opening, p.date_submission_deadline, p.date_evaluation, p.date_award,
         p.invited_suppliers, p.created_at, p.updated_at;

-- ============================================
-- SCRIPT DE MIGRACIÓN (ejecutar solo si hay datos existentes)
-- ============================================
-- Este script migra los project_name existentes a la nueva tabla projects
-- 
-- PASO 1: Migrar project_name de document_metadata
-- INSERT INTO desarrollo.projects (name, display_name)
-- SELECT DISTINCT 
--     normalize_project_name(project_name) as name,
--     project_name as display_name
-- FROM desarrollo.document_metadata
-- WHERE project_name IS NOT NULL
-- ON CONFLICT (name) DO NOTHING;
--
-- PASO 2: Actualizar document_metadata con project_id
-- UPDATE desarrollo.document_metadata dm
-- SET project_id = p.id
-- FROM desarrollo.projects p
-- WHERE dm.project_name = p.display_name
--   AND dm.project_id IS NULL;
--
-- PASO 3: Migrar project_name de rfq_items_master (si existe la columna)
-- INSERT INTO desarrollo.projects (name, display_name)
-- SELECT DISTINCT 
--     normalize_project_name(project_name) as name,
--     project_name as display_name
-- FROM desarrollo.rfq_items_master
-- WHERE project_name IS NOT NULL
-- ON CONFLICT (name) DO NOTHING;
--
-- PASO 4: Actualizar rfq_items_master con project_id
-- UPDATE desarrollo.rfq_items_master rim
-- SET project_id = p.id
-- FROM desarrollo.projects p
-- WHERE rim.project_name = p.display_name
--   AND rim.project_id IS NULL;
--
-- PASO 5: Migrar project_name de qa_audit (si existe la columna)
-- INSERT INTO desarrollo.projects (name, display_name)
-- SELECT DISTINCT 
--     normalize_project_name(project_name) as name,
--     project_name as display_name
-- FROM desarrollo.qa_audit
-- WHERE project_name IS NOT NULL
-- ON CONFLICT (name) DO NOTHING;
--
-- PASO 6: Actualizar qa_audit con project_id
-- UPDATE desarrollo.qa_audit qa
-- SET project_id = p.id
-- FROM desarrollo.projects p
-- WHERE qa.project_name = p.display_name
--   AND qa.project_id IS NULL;

-- ============================================
-- TABLA DE RANKING DE PROVEEDORES
-- New scoring system based on RFQ evaluation criteria
-- ============================================
CREATE TABLE IF NOT EXISTS desarrollo.ranking_proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL,
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE,

    -- Aggregated category scores (0-10 scale)
    technical_score DECIMAL(4,2) DEFAULT 0,      -- Technical Completeness (30%)
    economic_score DECIMAL(4,2) DEFAULT 0,       -- Economic Competitiveness (35%)
    execution_score DECIMAL(4,2) DEFAULT 0,      -- Execution Capability (20%)
    hse_compliance_score DECIMAL(4,2) DEFAULT 0, -- HSE & Compliance (15%)

    -- TECHNICAL COMPLETENESS individual scores (30% total)
    scope_facilities_score DECIMAL(4,2) DEFAULT 0,      -- 10% - Scope of facilities included
    scope_work_score DECIMAL(4,2) DEFAULT 0,            -- 10% - Scope of work covered
    deliverables_quality_score DECIMAL(4,2) DEFAULT 0,  -- 10% - Quality of deliverables

    -- ECONOMIC COMPETITIVENESS individual scores (35% total)
    total_price_score DECIMAL(4,2) DEFAULT 0,           -- 15% - Total price competitiveness
    price_breakdown_score DECIMAL(4,2) DEFAULT 0,       -- 8% - Transparent breakdown
    optionals_included_score DECIMAL(4,2) DEFAULT 0,    -- 7% - Optionals included in base
    capex_opex_methodology_score DECIMAL(4,2) DEFAULT 0,-- 5% - CAPEX/OPEX methodology

    -- EXECUTION CAPABILITY individual scores (20% total)
    schedule_score DECIMAL(4,2) DEFAULT 0,              -- 8% - Realistic schedule
    resources_allocation_score DECIMAL(4,2) DEFAULT 0,  -- 6% - Resources per discipline
    exceptions_score DECIMAL(4,2) DEFAULT 0,            -- 6% - Exceptions and deviations

    -- HSE & COMPLIANCE individual scores (15% total)
    safety_studies_score DECIMAL(4,2) DEFAULT 0,        -- 8% - Safety studies included
    regulatory_compliance_score DECIMAL(4,2) DEFAULT 0, -- 7% - Regulatory compliance

    -- Overall metrics
    overall_score DECIMAL(4,2) DEFAULT 0,               -- Weighted overall score (0-10)
    compliance_percentage DECIMAL(5,2) DEFAULT 0,       -- Percentage of requirements met

    -- Dynamic scoring JSONB columns (for custom criteria configurations)
    category_scores_json JSONB DEFAULT '{}',            -- Dynamic category scores
    individual_scores_json JSONB DEFAULT '{}',          -- Dynamic individual criterion scores
    evaluation_details JSONB DEFAULT '{}',              -- Strengths, weaknesses, summary

    -- Metadata
    evaluation_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraint for unique provider per project
    CONSTRAINT unique_provider_project UNIQUE(provider_name, project_id)
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_ranking_provider_name ON desarrollo.ranking_proveedores(provider_name);
CREATE INDEX IF NOT EXISTS idx_ranking_project_id ON desarrollo.ranking_proveedores(project_id);
CREATE INDEX IF NOT EXISTS idx_ranking_overall_score ON desarrollo.ranking_proveedores(overall_score DESC);

-- Función para calcular overall_score basado en los nuevos pesos
-- CONDITIONAL: Skip recalculation when dynamic scoring config is used
-- (signaled by non-empty individual_scores_json)
CREATE OR REPLACE FUNCTION calculate_weighted_overall_score()
RETURNS TRIGGER AS $$
BEGIN
    -- If dynamic scoring data is present, do NOT recalculate
    -- The workflow already computed correct scores using dynamic weights
    IF NEW.individual_scores_json IS NOT NULL
       AND NEW.individual_scores_json != '{}'::jsonb
       AND jsonb_typeof(NEW.individual_scores_json) = 'object'
       AND (SELECT count(*) FROM jsonb_object_keys(NEW.individual_scores_json)) > 0 THEN
        RETURN NEW;
    END IF;

    -- Legacy calculation for default 12-criteria configuration
    -- TECHNICAL COMPLETENESS (30%)
    NEW.technical_score = (
        COALESCE(NEW.scope_facilities_score, 0) * 0.10 +
        COALESCE(NEW.scope_work_score, 0) * 0.10 +
        COALESCE(NEW.deliverables_quality_score, 0) * 0.10
    ) / 0.30 * 10;

    -- ECONOMIC COMPETITIVENESS (35%)
    NEW.economic_score = (
        COALESCE(NEW.total_price_score, 0) * 0.15 +
        COALESCE(NEW.price_breakdown_score, 0) * 0.08 +
        COALESCE(NEW.optionals_included_score, 0) * 0.07 +
        COALESCE(NEW.capex_opex_methodology_score, 0) * 0.05
    ) / 0.35 * 10;

    -- EXECUTION CAPABILITY (20%)
    NEW.execution_score = (
        COALESCE(NEW.schedule_score, 0) * 0.08 +
        COALESCE(NEW.resources_allocation_score, 0) * 0.06 +
        COALESCE(NEW.exceptions_score, 0) * 0.06
    ) / 0.20 * 10;

    -- HSE & COMPLIANCE (15%)
    NEW.hse_compliance_score = (
        COALESCE(NEW.safety_studies_score, 0) * 0.08 +
        COALESCE(NEW.regulatory_compliance_score, 0) * 0.07
    ) / 0.15 * 10;

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

-- Trigger para calcular overall_score automáticamente
DROP TRIGGER IF EXISTS trigger_update_overall_score ON desarrollo.ranking_proveedores;
CREATE TRIGGER trigger_calculate_weighted_score
    BEFORE INSERT OR UPDATE ON desarrollo.ranking_proveedores
    FOR EACH ROW
    EXECUTE FUNCTION calculate_weighted_overall_score();

-- ============================================
-- DATOS DE EJEMPLO PARA RANKING DE PROVEEDORES
-- ============================================
-- Insertar datos de ejemplo (ejecutar solo para pruebas)
-- INSERT INTO desarrollo.ranking_proveedores (provider_name, cumplimiento_porcentual, technical_score, economical_score, pre_feed_score, feed_score, evaluation_count)
-- VALUES
--     ('TECNICASREUNIDAS', 85.5, 8.5, 8.0, 9.0, 8.5, 4),
--     ('IDOM', 78.2, 7.8, 8.5, 7.5, 8.0, 4),
--     ('SACYR', 92.1, 9.2, 9.0, 9.5, 9.0, 4),
--     ('EA', 71.8, 7.1, 7.5, 7.0, 7.2, 4),
--     ('SENER', 88.9, 8.8, 9.0, 8.5, 9.2, 4),
--     ('TRESCA', 65.4, 6.5, 6.8, 6.0, 6.5, 4),
--     ('WORLEY', 94.7, 9.4, 9.5, 9.8, 9.5, 4);



-- ============================================
-- VISTA: ranking_proveedores_por_tipo
-- Vista que calcula scores por categoría de evaluación para cada proveedor
-- New scoring criteria aligned with RFQ requirements
-- ============================================
DROP VIEW IF EXISTS desarrollo.ranking_proveedores_por_tipo;
CREATE OR REPLACE VIEW desarrollo.ranking_proveedores_por_tipo AS
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
FROM desarrollo.ranking_proveedores rp
ORDER BY rp.overall_score DESC;

-- ============================================
-- VISTA: ranking_proveedores_detailed
-- Vista con todos los scores individuales por criterio
-- ============================================
DROP VIEW IF EXISTS desarrollo.ranking_proveedores_detailed;
CREATE OR REPLACE VIEW desarrollo.ranking_proveedores_detailed AS
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
FROM desarrollo.ranking_proveedores rp
ORDER BY rp.overall_score DESC;

-- NOTA: Vista ranking_proveedores_simple eliminada.
-- El compliance se calcula ahora en el workflow de scoring (scoring.json)
-- y se almacena directamente en ranking_proveedores.compliance_percentage.

-- ============================================
-- SISTEMA DE SCORING DINÁMICO CON CRITERIOS PERSONALIZADOS
-- Permite definir categorías y criterios de scoring por proyecto
-- ============================================

-- Tabla de categorías de scoring por proyecto
CREATE TABLE IF NOT EXISTS desarrollo.scoring_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                           -- Identificador interno: 'technical', 'economic', etc.
    display_name TEXT NOT NULL,                   -- Nombre para mostrar: 'Technical Completeness'
    display_name_es TEXT,                         -- Nombre en español: 'Completitud Técnica'
    weight DECIMAL(5,2) NOT NULL CHECK (weight >= 0 AND weight <= 100), -- Peso 0-100%
    color VARCHAR(7) DEFAULT '#12b5b0',           -- Color hex para UI
    sort_order INTEGER DEFAULT 0,                 -- Orden de visualización
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_category_name_project UNIQUE(project_id, name)
);

-- Índices para scoring_categories
CREATE INDEX IF NOT EXISTS idx_scoring_categories_project_id ON desarrollo.scoring_categories(project_id);
CREATE INDEX IF NOT EXISTS idx_scoring_categories_sort_order ON desarrollo.scoring_categories(project_id, sort_order);

-- Tabla de criterios individuales dentro de categorías
CREATE TABLE IF NOT EXISTS desarrollo.scoring_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES desarrollo.scoring_categories(id) ON DELETE CASCADE,
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                           -- Identificador interno: 'scope_facilities'
    display_name TEXT NOT NULL,                   -- Nombre para mostrar: 'Scope of Facilities'
    display_name_es TEXT,                         -- Nombre en español: 'Alcance de Instalaciones'
    description TEXT,                             -- Descripción detallada del criterio
    weight DECIMAL(5,2) NOT NULL CHECK (weight >= 0 AND weight <= 100), -- Peso dentro de la categoría (0-100%)
    keywords TEXT[],                              -- Keywords para mapeo AI: ['facilities', 'plant', 'equipment']
    sort_order INTEGER DEFAULT 0,                 -- Orden de visualización
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_criterion_name_category UNIQUE(category_id, name)
);

-- Índices para scoring_criteria
CREATE INDEX IF NOT EXISTS idx_scoring_criteria_category_id ON desarrollo.scoring_criteria(category_id);
CREATE INDEX IF NOT EXISTS idx_scoring_criteria_project_id ON desarrollo.scoring_criteria(project_id);
CREATE INDEX IF NOT EXISTS idx_scoring_criteria_sort_order ON desarrollo.scoring_criteria(category_id, sort_order);

-- Tabla de puntuaciones por criterio y proveedor
CREATE TABLE IF NOT EXISTS desarrollo.provider_criterion_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_ranking_id UUID REFERENCES desarrollo.ranking_proveedores(id) ON DELETE CASCADE,
    criterion_id UUID REFERENCES desarrollo.scoring_criteria(id) ON DELETE CASCADE,
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    score DECIMAL(4,2) DEFAULT 0 CHECK (score >= 0 AND score <= 10), -- Score 0-10
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_provider_criterion UNIQUE(provider_ranking_id, criterion_id)
);

-- Índices para provider_criterion_scores
CREATE INDEX IF NOT EXISTS idx_provider_criterion_scores_ranking ON desarrollo.provider_criterion_scores(provider_ranking_id);
CREATE INDEX IF NOT EXISTS idx_provider_criterion_scores_criterion ON desarrollo.provider_criterion_scores(criterion_id);
CREATE INDEX IF NOT EXISTS idx_provider_criterion_scores_project ON desarrollo.provider_criterion_scores(project_id);

-- Tabla de configuración de pesos guardados (para mantener compatibilidad)
CREATE TABLE IF NOT EXISTS desarrollo.scoring_weight_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE,
    name TEXT DEFAULT 'default',
    weights JSONB NOT NULL,                       -- Configuración completa de pesos
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_active_config_project UNIQUE(project_id, is_active)
);

-- Índice para scoring_weight_configs
CREATE INDEX IF NOT EXISTS idx_scoring_weight_configs_project ON desarrollo.scoring_weight_configs(project_id);

-- ============================================
-- CRITERIOS POR DEFECTO
-- Define la plantilla de criterios estándar
-- ============================================

-- Función para copiar criterios por defecto a un proyecto
CREATE OR REPLACE FUNCTION clone_default_criteria_to_project(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
    v_technical_id UUID;
    v_economic_id UUID;
    v_execution_id UUID;
    v_hse_id UUID;
BEGIN
    -- Verificar que el proyecto existe
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id) THEN
        RAISE EXCEPTION 'Project with ID % does not exist', p_project_id;
    END IF;

    -- Verificar que no hay categorías existentes para este proyecto
    IF EXISTS (SELECT 1 FROM scoring_categories WHERE project_id = p_project_id) THEN
        RAISE NOTICE 'Project % already has scoring configuration', p_project_id;
        RETURN;
    END IF;

    -- Insertar categorías por defecto
    INSERT INTO scoring_categories (project_id, name, display_name, display_name_es, weight, color, sort_order)
    VALUES
        (p_project_id, 'technical', 'Technical Completeness', 'Completitud Técnica', 30, '#12b5b0', 1)
    RETURNING id INTO v_technical_id;

    INSERT INTO scoring_categories (project_id, name, display_name, display_name_es, weight, color, sort_order)
    VALUES
        (p_project_id, 'economic', 'Economic Competitiveness', 'Competitividad Económica', 35, '#f59e0b', 2)
    RETURNING id INTO v_economic_id;

    INSERT INTO scoring_categories (project_id, name, display_name, display_name_es, weight, color, sort_order)
    VALUES
        (p_project_id, 'execution', 'Execution Capability', 'Capacidad de Ejecución', 20, '#3b82f6', 3)
    RETURNING id INTO v_execution_id;

    INSERT INTO scoring_categories (project_id, name, display_name, display_name_es, weight, color, sort_order)
    VALUES
        (p_project_id, 'hse_compliance', 'HSE & Compliance', 'HSE y Cumplimiento', 15, '#8b5cf6', 4)
    RETURNING id INTO v_hse_id;

    -- Insertar criterios para TECHNICAL (30% total -> 33.33% cada criterio dentro de la categoría)
    INSERT INTO scoring_criteria (category_id, project_id, name, display_name, display_name_es, description, weight, keywords, sort_order)
    VALUES
        (v_technical_id, p_project_id, 'scope_facilities', 'Scope of Facilities', 'Alcance de Instalaciones',
         'Evaluation of the facilities and equipment included in the proposal', 33.33,
         ARRAY['facilities', 'plant', 'equipment', 'infrastructure'], 1),
        (v_technical_id, p_project_id, 'scope_work', 'Scope of Work', 'Alcance de Trabajo',
         'Evaluation of the work scope coverage and completeness', 33.33,
         ARRAY['scope', 'work', 'activities', 'tasks'], 2),
        (v_technical_id, p_project_id, 'deliverables_quality', 'Deliverables Quality', 'Calidad de Entregables',
         'Quality and completeness of proposed deliverables', 33.34,
         ARRAY['deliverables', 'documents', 'quality', 'standards'], 3);

    -- Insertar criterios para ECONOMIC (35% total)
    INSERT INTO scoring_criteria (category_id, project_id, name, display_name, display_name_es, description, weight, keywords, sort_order)
    VALUES
        (v_economic_id, p_project_id, 'total_price', 'Total Price', 'Precio Total',
         'Competitiveness of the total proposed price', 42.86,
         ARRAY['price', 'cost', 'total', 'budget'], 1),
        (v_economic_id, p_project_id, 'price_breakdown', 'Price Breakdown', 'Desglose de Precio',
         'Transparency and detail of price breakdown', 22.86,
         ARRAY['breakdown', 'detail', 'itemized', 'line items'], 2),
        (v_economic_id, p_project_id, 'optionals_included', 'Optionals Included', 'Opcionales Incluidos',
         'Optional items included in base price', 20.00,
         ARRAY['optionals', 'extras', 'additions', 'included'], 3),
        (v_economic_id, p_project_id, 'capex_opex_methodology', 'CAPEX/OPEX Methodology', 'Metodología CAPEX/OPEX',
         'Clarity of CAPEX/OPEX classification methodology', 14.28,
         ARRAY['capex', 'opex', 'methodology', 'classification'], 4);

    -- Insertar criterios para EXECUTION (20% total)
    INSERT INTO scoring_criteria (category_id, project_id, name, display_name, display_name_es, description, weight, keywords, sort_order)
    VALUES
        (v_execution_id, p_project_id, 'schedule', 'Schedule', 'Cronograma',
         'Realism and achievability of proposed schedule', 40.00,
         ARRAY['schedule', 'timeline', 'milestones', 'planning'], 1),
        (v_execution_id, p_project_id, 'resources_allocation', 'Resources Allocation', 'Asignación de Recursos',
         'Adequacy of resources allocated per discipline', 30.00,
         ARRAY['resources', 'team', 'staff', 'personnel'], 2),
        (v_execution_id, p_project_id, 'exceptions', 'Exceptions & Deviations', 'Excepciones y Desviaciones',
         'Number and severity of exceptions and deviations', 30.00,
         ARRAY['exceptions', 'deviations', 'exclusions', 'clarifications'], 3);

    -- Insertar criterios para HSE & COMPLIANCE (15% total)
    INSERT INTO scoring_criteria (category_id, project_id, name, display_name, display_name_es, description, weight, keywords, sort_order)
    VALUES
        (v_hse_id, p_project_id, 'safety_studies', 'Safety Studies', 'Estudios de Seguridad',
         'Inclusion and quality of safety studies', 53.33,
         ARRAY['safety', 'hazop', 'risk', 'studies'], 1),
        (v_hse_id, p_project_id, 'regulatory_compliance', 'Regulatory Compliance', 'Cumplimiento Normativo',
         'Compliance with regulatory requirements', 46.67,
         ARRAY['regulatory', 'compliance', 'permits', 'legal'], 2);

    RAISE NOTICE 'Created default scoring configuration for project %', p_project_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN PARA CALCULAR SCORE DINÁMICO
-- Calcula el overall_score usando criterios dinámicos
-- ============================================
CREATE OR REPLACE FUNCTION calculate_dynamic_overall_score(p_provider_ranking_id UUID)
RETURNS DECIMAL(4,2) AS $$
DECLARE
    v_overall_score DECIMAL(10,4) := 0;
    v_category RECORD;
    v_criterion RECORD;
    v_category_score DECIMAL(10,4);
    v_criterion_score DECIMAL(10,4);
    v_project_id UUID;
BEGIN
    -- Obtener project_id del ranking
    SELECT project_id INTO v_project_id
    FROM ranking_proveedores
    WHERE id = p_provider_ranking_id;

    IF v_project_id IS NULL THEN
        RETURN 0;
    END IF;

    -- Si no hay configuración dinámica, usar cálculo legacy
    IF NOT EXISTS (SELECT 1 FROM scoring_categories WHERE project_id = v_project_id) THEN
        SELECT overall_score INTO v_overall_score
        FROM ranking_proveedores
        WHERE id = p_provider_ranking_id;
        RETURN COALESCE(v_overall_score, 0);
    END IF;

    -- Iterar por cada categoría
    FOR v_category IN
        SELECT id, name, weight
        FROM scoring_categories
        WHERE project_id = v_project_id
        ORDER BY sort_order
    LOOP
        v_category_score := 0;

        -- Iterar por cada criterio de la categoría
        FOR v_criterion IN
            SELECT sc.id, sc.weight, COALESCE(pcs.score, 0) as score
            FROM scoring_criteria sc
            LEFT JOIN provider_criterion_scores pcs
                ON pcs.criterion_id = sc.id
                AND pcs.provider_ranking_id = p_provider_ranking_id
            WHERE sc.category_id = v_category.id
            ORDER BY sc.sort_order
        LOOP
            -- Sumar score ponderado dentro de la categoría
            v_category_score := v_category_score + (v_criterion.score * v_criterion.weight / 100);
        END LOOP;

        -- Añadir score de categoría ponderado al total
        v_overall_score := v_overall_score + (v_category_score * v_category.weight / 100);
    END LOOP;

    RETURN ROUND(v_overall_score, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER PARA VALIDAR PESOS DE CATEGORÍAS
-- Asegura que los pesos de categorías suman 100%
-- ============================================
CREATE OR REPLACE FUNCTION validate_category_weights()
RETURNS TRIGGER AS $$
DECLARE
    v_total_weight DECIMAL(10,2);
    v_project_id UUID;
BEGIN
    -- Obtener el project_id
    IF TG_OP = 'DELETE' THEN
        v_project_id := OLD.project_id;
    ELSE
        v_project_id := NEW.project_id;
    END IF;

    -- Calcular el total de pesos para el proyecto (excluyendo la fila actual si es DELETE)
    IF TG_OP = 'DELETE' THEN
        SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
        FROM scoring_categories
        WHERE project_id = v_project_id AND id != OLD.id;
    ELSE
        SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
        FROM scoring_categories
        WHERE project_id = v_project_id;
    END IF;

    -- Permitir temporalmente pesos que no suman 100% durante la configuración
    -- La validación estricta se hace en la aplicación antes de guardar
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar pesos
CREATE TRIGGER trigger_validate_category_weights
    AFTER INSERT OR UPDATE OR DELETE ON desarrollo.scoring_categories
    FOR EACH ROW
    EXECUTE FUNCTION validate_category_weights();

-- ============================================
-- TRIGGER PARA VALIDAR PESOS DE CRITERIOS
-- Asegura que los pesos de criterios dentro de una categoría suman 100%
-- ============================================
CREATE OR REPLACE FUNCTION validate_criteria_weights()
RETURNS TRIGGER AS $$
DECLARE
    v_total_weight DECIMAL(10,2);
    v_category_id UUID;
BEGIN
    -- Obtener el category_id
    IF TG_OP = 'DELETE' THEN
        v_category_id := OLD.category_id;
    ELSE
        v_category_id := NEW.category_id;
    END IF;

    -- Permitir temporalmente pesos que no suman 100% durante la configuración
    -- La validación estricta se hace en la aplicación antes de guardar
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar pesos de criterios
CREATE TRIGGER trigger_validate_criteria_weights
    AFTER INSERT OR UPDATE OR DELETE ON desarrollo.scoring_criteria
    FOR EACH ROW
    EXECUTE FUNCTION validate_criteria_weights();

-- ============================================
-- FUNCIÓN DE MIGRACIÓN PARA PROYECTOS EXISTENTES
-- Migra datos de ranking_proveedores a provider_criterion_scores
-- ============================================
CREATE OR REPLACE FUNCTION migrate_existing_scoring_data(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
    v_ranking RECORD;
    v_criterion RECORD;
    v_score DECIMAL(4,2);
BEGIN
    -- Primero crear la configuración por defecto si no existe
    IF NOT EXISTS (SELECT 1 FROM scoring_categories WHERE project_id = p_project_id) THEN
        PERFORM clone_default_criteria_to_project(p_project_id);
    END IF;

    -- Iterar por cada ranking de proveedor
    FOR v_ranking IN
        SELECT id, provider_name,
               scope_facilities_score, scope_work_score, deliverables_quality_score,
               total_price_score, price_breakdown_score, optionals_included_score, capex_opex_methodology_score,
               schedule_score, resources_allocation_score, exceptions_score,
               safety_studies_score, regulatory_compliance_score
        FROM ranking_proveedores
        WHERE project_id = p_project_id
    LOOP
        -- Iterar por cada criterio y mapear el score correspondiente
        FOR v_criterion IN
            SELECT id, name FROM scoring_criteria WHERE project_id = p_project_id
        LOOP
            -- Mapear el score según el nombre del criterio
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

            -- Insertar o actualizar el score
            INSERT INTO provider_criterion_scores (provider_ranking_id, criterion_id, project_id, provider_name, score)
            VALUES (v_ranking.id, v_criterion.id, p_project_id, v_ranking.provider_name, COALESCE(v_score, 0))
            ON CONFLICT (provider_ranking_id, criterion_id)
            DO UPDATE SET score = COALESCE(v_score, 0), updated_at = NOW();
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Migrated scoring data for project %', p_project_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VISTA: scoring_configuration_summary
-- Vista para obtener la configuración de scoring completa de un proyecto
-- ============================================
DROP VIEW IF EXISTS desarrollo.scoring_configuration_summary;
CREATE OR REPLACE VIEW desarrollo.scoring_configuration_summary AS
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
FROM scoring_categories sc
LEFT JOIN scoring_criteria scr ON scr.category_id = sc.id
ORDER BY sc.project_id, sc.sort_order, scr.sort_order;

-- ============================================
-- RLS POLICIES PARA TODAS LAS TABLAS
-- ============================================

-- Habilitar RLS en tablas que no lo tenían
ALTER TABLE desarrollo.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.project_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.document_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.rfq ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.rfq_items_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.provider_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.qa_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.ranking_proveedores ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en tablas de scoring (ya existente)
ALTER TABLE desarrollo.scoring_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.provider_criterion_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE desarrollo.scoring_weight_configs ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para tablas core (TODO: restringir cuando se implemente auth)
DROP POLICY IF EXISTS "Allow all on projects" ON desarrollo.projects;
CREATE POLICY "Allow all on projects" ON desarrollo.projects
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on project_providers" ON desarrollo.project_providers;
CREATE POLICY "Allow all on project_providers" ON desarrollo.project_providers
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on document_metadata" ON desarrollo.document_metadata;
CREATE POLICY "Allow all on document_metadata" ON desarrollo.document_metadata
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on rfq" ON desarrollo.rfq;
CREATE POLICY "Allow all on rfq" ON desarrollo.rfq
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on proposals" ON desarrollo.proposals;
CREATE POLICY "Allow all on proposals" ON desarrollo.proposals
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on rfq_items_master" ON desarrollo.rfq_items_master;
CREATE POLICY "Allow all on rfq_items_master" ON desarrollo.rfq_items_master
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on provider_responses" ON desarrollo.provider_responses;
CREATE POLICY "Allow all on provider_responses" ON desarrollo.provider_responses
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on qa_audit" ON desarrollo.qa_audit;
CREATE POLICY "Allow all on qa_audit" ON desarrollo.qa_audit
    FOR ALL USING (true) WITH CHECK (true);


DROP POLICY IF EXISTS "Allow all on ranking_proveedores" ON desarrollo.ranking_proveedores;
CREATE POLICY "Allow all on ranking_proveedores" ON desarrollo.ranking_proveedores
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para scoring_categories
DROP POLICY IF EXISTS "Allow all operations on scoring_categories" ON desarrollo.scoring_categories;
CREATE POLICY "Allow all operations on scoring_categories" ON desarrollo.scoring_categories
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para scoring_criteria
DROP POLICY IF EXISTS "Allow all operations on scoring_criteria" ON desarrollo.scoring_criteria;
CREATE POLICY "Allow all operations on scoring_criteria" ON desarrollo.scoring_criteria
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para provider_criterion_scores
DROP POLICY IF EXISTS "Allow all operations on provider_criterion_scores" ON desarrollo.provider_criterion_scores;
CREATE POLICY "Allow all operations on provider_criterion_scores" ON desarrollo.provider_criterion_scores
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para scoring_weight_configs
DROP POLICY IF EXISTS "Allow all operations on scoring_weight_configs" ON desarrollo.scoring_weight_configs;
CREATE POLICY "Allow all operations on scoring_weight_configs" ON desarrollo.scoring_weight_configs
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- MIGRATION: Add JSONB columns to ranking_proveedores (for existing databases)
-- ============================================
ALTER TABLE desarrollo.ranking_proveedores
    ADD COLUMN IF NOT EXISTS category_scores_json JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS individual_scores_json JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS evaluation_details JSONB DEFAULT '{}';

-- ============================================
-- FUNCIONES DE BÚSQUEDA VECTORIAL CON FILTRO POR PROYECTO
-- Usadas por el chat AI para buscar solo en documentos del proyecto activo
-- ============================================

-- Función para buscar en documentos RFQ con filtro por project_id
CREATE OR REPLACE FUNCTION match_rfq(
  query_embedding vector(4096),
  match_count int DEFAULT 10,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.content,
    r.metadata,
    1 - (r.embedding <=> query_embedding) as similarity
  FROM desarrollo.rfq r
  WHERE
    (filter->>'project_id' IS NULL OR r.metadata->>'project_id' = filter->>'project_id')
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Función para buscar en propuestas de proveedores con filtro por project_id
CREATE OR REPLACE FUNCTION match_proposals(
  query_embedding vector(4096),
  match_count int DEFAULT 10,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.content,
    p.metadata,
    1 - (p.embedding <=> query_embedding) as similarity
  FROM desarrollo.proposals p
  WHERE
    (filter->>'project_id' IS NULL OR p.metadata->>'project_id' = filter->>'project_id')
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLA DE OFERTAS ECONÓMICAS (T8)
-- Sección económica dedicada por proveedor y proyecto
-- ============================================
CREATE TABLE IF NOT EXISTS desarrollo.economic_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,

    -- Core pricing
    total_price DECIMAL(15,2),
    currency TEXT DEFAULT 'EUR',
    price_breakdown JSONB DEFAULT '{}',

    -- Payment terms
    payment_terms TEXT,
    payment_schedule JSONB DEFAULT '[]',

    -- Discounts
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_conditions TEXT,

    -- TCO (Total Cost of Ownership)
    tco_value DECIMAL(15,2),
    tco_period_years INTEGER,
    tco_breakdown JSONB DEFAULT '{}',

    -- Additional economic data
    validity_days INTEGER DEFAULT 90,
    price_escalation TEXT,
    guarantees TEXT,
    insurance_included BOOLEAN DEFAULT false,
    taxes_included BOOLEAN DEFAULT false,

    -- Optional items / alternatives
    optional_items JSONB DEFAULT '[]',
    alternative_offers JSONB DEFAULT '[]',

    -- AI-extracted metadata
    extraction_confidence DECIMAL(3,2),
    raw_notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_economic_offer UNIQUE(project_id, provider_name)
);

CREATE INDEX IF NOT EXISTS idx_economic_offers_project ON desarrollo.economic_offers(project_id);
CREATE INDEX IF NOT EXISTS idx_economic_offers_provider ON desarrollo.economic_offers(provider_name);

-- Trigger for updated_at on economic_offers
CREATE OR REPLACE FUNCTION update_economic_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_economic_offers_updated ON desarrollo.economic_offers;
CREATE TRIGGER trigger_economic_offers_updated
    BEFORE UPDATE ON desarrollo.economic_offers
    FOR EACH ROW
    EXECUTE FUNCTION update_economic_offers_updated_at();

-- Vista de comparación económica
DROP VIEW IF EXISTS desarrollo.v_economic_comparison;
CREATE OR REPLACE VIEW desarrollo.v_economic_comparison AS
SELECT
    eo.project_id,
    eo.provider_name,
    eo.total_price,
    eo.currency,
    eo.discount_percentage,
    eo.tco_value,
    eo.tco_period_years,
    eo.validity_days,
    eo.taxes_included,
    eo.insurance_included,
    eo.payment_terms,
    ROUND(eo.total_price * (1 - COALESCE(eo.discount_percentage, 0) / 100), 2) AS net_price,
    RANK() OVER (PARTITION BY eo.project_id ORDER BY eo.total_price ASC) AS price_rank,
    jsonb_array_length(COALESCE(eo.optional_items, '[]'::jsonb)) AS optional_items_count,
    jsonb_array_length(COALESCE(eo.alternative_offers, '[]'::jsonb)) AS alternative_offers_count,
    eo.created_at,
    eo.updated_at
FROM desarrollo.economic_offers eo
ORDER BY eo.project_id, eo.total_price ASC;

-- RLS for economic_offers
ALTER TABLE desarrollo.economic_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on economic_offers" ON desarrollo.economic_offers;
CREATE POLICY "Allow all on economic_offers" ON desarrollo.economic_offers
    FOR ALL USING (true) WITH CHECK (true);

-- RLS for qa_notifications
ALTER TABLE desarrollo.qa_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on qa_notifications" ON desarrollo.qa_notifications;
CREATE POLICY "Allow all on qa_notifications" ON desarrollo.qa_notifications
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- TABLA DE COMUNICACIONES / EMAILS ENVIADOS (T15)
-- Historial de correos enviados a proveedores por proyecto
-- ============================================
CREATE TABLE IF NOT EXISTS desarrollo.project_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    tone TEXT DEFAULT 'formal',
    status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'failed', 'read')),
    qa_item_ids TEXT[] DEFAULT '{}',  -- IDs of Q&A items included in the email
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_comms_project ON desarrollo.project_communications(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comms_provider ON desarrollo.project_communications(project_id, provider_name);
CREATE INDEX IF NOT EXISTS idx_project_comms_sent_at ON desarrollo.project_communications(sent_at DESC);

-- RLS for project_communications
ALTER TABLE desarrollo.project_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on project_communications" ON desarrollo.project_communications;
CREATE POLICY "Allow all on project_communications" ON desarrollo.project_communications
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- DIRECTORIO GLOBAL DE PROVEEDORES (T16)
-- Información de contacto y notas globales (no por proyecto)
-- ============================================
CREATE TABLE IF NOT EXISTS desarrollo.supplier_directory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT,
    email TEXT,
    phone TEXT,
    contact_person TEXT,
    category TEXT DEFAULT 'engineering',
    website TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_directory_name ON desarrollo.supplier_directory(name);
CREATE INDEX IF NOT EXISTS idx_supplier_directory_category ON desarrollo.supplier_directory(category);

ALTER TABLE desarrollo.supplier_directory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on supplier_directory" ON desarrollo.supplier_directory;
CREATE POLICY "Allow all on supplier_directory" ON desarrollo.supplier_directory
    FOR ALL USING (true) WITH CHECK (true);

-- VISTA: Historial agregado de proveedores across projects
DROP VIEW IF EXISTS desarrollo.v_supplier_history;
CREATE OR REPLACE VIEW desarrollo.v_supplier_history AS
SELECT
    COALESCE(sd.name, pp.provider_name) AS supplier_name,
    sd.display_name,
    sd.email,
    sd.phone,
    sd.contact_person,
    sd.category,
    sd.website,
    sd.notes,
    sd.tags,
    COUNT(DISTINCT pp.project_id) AS project_count,
    ARRAY_AGG(DISTINCT p.display_name) FILTER (WHERE p.display_name IS NOT NULL) AS project_names,
    AVG(rp.overall_score) AS avg_score,
    MAX(rp.overall_score) AS best_score,
    MIN(rp.overall_score) AS worst_score,
    COUNT(DISTINCT rp.id) AS times_scored,
    MAX(pp.invited_at) AS last_participation,
    ARRAY_AGG(DISTINCT pp.status) FILTER (WHERE pp.status IS NOT NULL) AS statuses
FROM desarrollo.supplier_directory sd
FULL OUTER JOIN desarrollo.project_providers pp ON UPPER(sd.name) = UPPER(pp.provider_name)
LEFT JOIN desarrollo.projects p ON p.id = pp.project_id
LEFT JOIN desarrollo.ranking_proveedores rp
    ON UPPER(rp.provider_name) = UPPER(COALESCE(sd.name, pp.provider_name))
    AND rp.project_id = pp.project_id
GROUP BY COALESCE(sd.name, pp.provider_name), sd.display_name, sd.email, sd.phone, sd.contact_person, sd.category, sd.website, sd.notes, sd.tags;

-- ============================================
-- TOKENS DE SUBIDA EXTERNA DE OFERTAS (T17)
-- Links para que proveedores suban PDFs sin login
-- ============================================
CREATE TABLE IF NOT EXISTS desarrollo.supplier_upload_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accessed', 'uploaded', 'expired')),
    files_uploaded INT DEFAULT 0,
    accessed_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_upload_tokens_token ON desarrollo.supplier_upload_tokens(token);
CREATE INDEX IF NOT EXISTS idx_supplier_upload_tokens_project ON desarrollo.supplier_upload_tokens(project_id);

ALTER TABLE desarrollo.supplier_upload_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on supplier_upload_tokens" ON desarrollo.supplier_upload_tokens;
CREATE POLICY "Allow all on supplier_upload_tokens" ON desarrollo.supplier_upload_tokens
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- FUNCIONES AUXILIARES DE GESTIÓN DE PROYECTOS
-- ============================================

-- Soft-delete project (referenced by frontend)
CREATE OR REPLACE FUNCTION soft_delete_project(p_project_id UUID)
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

-- Update project name (referenced by frontend)
CREATE OR REPLACE FUNCTION update_project_name(p_project_id UUID, p_new_display_name TEXT)
RETURNS JSONB AS $$
DECLARE
    v_new_name TEXT;
BEGIN
    v_new_name := normalize_project_name(p_new_display_name);

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

-- ============================================
-- MULTI-TENANT FOUNDATION (T23)
-- Organizations, membership, and tenant isolation
-- ============================================

-- Organizations
CREATE TABLE IF NOT EXISTS desarrollo.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'professional', 'enterprise')),
    max_projects INTEGER DEFAULT 5,
    max_users INTEGER DEFAULT 3,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON desarrollo.organizations(slug);

-- Organization members (user <-> org)
CREATE TABLE IF NOT EXISTS desarrollo.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES desarrollo.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON desarrollo.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON desarrollo.organization_members(organization_id);

-- Add organization_id and created_by to projects (nullable for migration)
ALTER TABLE desarrollo.projects
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES desarrollo.organizations(id),
    ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE INDEX IF NOT EXISTS idx_projects_org ON desarrollo.projects(organization_id);

-- RLS for organizations
ALTER TABLE desarrollo.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on organizations" ON desarrollo.organizations;
CREATE POLICY "Allow all on organizations" ON desarrollo.organizations
    FOR ALL USING (true) WITH CHECK (true);

-- RLS for organization_members
ALTER TABLE desarrollo.organization_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on organization_members" ON desarrollo.organization_members;
CREATE POLICY "Allow all on organization_members" ON desarrollo.organization_members
    FOR ALL USING (true) WITH CHECK (true);

-- Triggers
DROP TRIGGER IF EXISTS set_organizations_updated_at ON desarrollo.organizations;
CREATE TRIGGER set_organizations_updated_at
    BEFORE UPDATE ON desarrollo.organizations
    FOR EACH ROW
    EXECUTE FUNCTION desarrollo.update_updated_at();

DROP TRIGGER IF EXISTS set_org_members_updated_at ON desarrollo.organization_members;
CREATE TRIGGER set_org_members_updated_at
    BEFORE UPDATE ON desarrollo.organization_members
    FOR EACH ROW
    EXECUTE FUNCTION desarrollo.update_updated_at();

-- Helper: get user's organization (requires Supabase Auth)
CREATE OR REPLACE FUNCTION desarrollo.get_user_org_id()
RETURNS UUID AS $$
BEGIN
    BEGIN
        RETURN (
            SELECT organization_id
            FROM desarrollo.organization_members
            WHERE user_id = auth.uid()
            LIMIT 1
        );
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 3. COPIAR DATOS existentes de public (si las tablas existen)
-- Usa DO block con exception handling para no fallar si la tabla no existe
-- ============================================

DO $$
DECLARE
    tbl_pair TEXT[][] := ARRAY[
        ['projects', 'projects'],
        ['organizations', 'organizations'],
        ['organization_members', 'organization_members'],
        ['project_providers', 'project_providers'],
        ['document_metadata', 'document_metadata'],
        ['rfq', 'rfq'],
        ['proposals', 'proposals'],
        ['rfq_items_master', 'rfq_items_master'],
        ['provider_responses', 'provider_responses'],
        ['qa_audit', 'qa_audit'],
        ['qa_notifications', 'qa_notifications'],
        ['qa_response_tokens', 'qa_response_tokens'],
        ['ranking_proveedores', 'ranking_proveedores'],
        ['scoring_categories', 'scoring_categories'],
        ['scoring_criteria', 'scoring_criteria'],
        ['provider_criterion_scores', 'provider_criterion_scores'],
        ['scoring_weight_configs', 'scoring_weight_configs'],
        ['economic_offers', 'economic_offers'],
        ['project_communications', 'project_communications'],
        ['supplier_directory', 'supplier_directory'],
        ['supplier_upload_tokens', 'supplier_upload_tokens']
    ];
    pair TEXT[];
BEGIN
    FOREACH pair SLICE 1 IN ARRAY tbl_pair LOOP
        BEGIN
            EXECUTE format(
                'INSERT INTO desarrollo.%I SELECT * FROM public.%I ON CONFLICT DO NOTHING',
                pair[1], pair[2]
            );
            RAISE NOTICE 'Copied data: public.% -> desarrollo.%', pair[1], pair[1];
        EXCEPTION WHEN undefined_table THEN
            RAISE NOTICE 'Table public.% does not exist, skipping', pair[2];
        WHEN OTHERS THEN
            RAISE NOTICE 'Error copying %: %', pair[1], SQLERRM;
        END;
    END LOOP;
END $$;

-- Sync sequences for BIGSERIAL columns (rfq, proposals)
DO $$
BEGIN
    PERFORM setval(
        pg_get_serial_sequence('desarrollo.rfq', 'id'),
        COALESCE((SELECT MAX(id) FROM desarrollo.rfq), 1)
    );
    PERFORM setval(
        pg_get_serial_sequence('desarrollo.proposals', 'id'),
        COALESCE((SELECT MAX(id) FROM desarrollo.proposals), 1)
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Sequence sync skipped: %', SQLERRM;
END $$;


-- ============================================
-- 4. PERMISOS - Necesario para acceso via PostgREST/API
-- ============================================

GRANT USAGE ON SCHEMA desarrollo TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA desarrollo TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA desarrollo TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA desarrollo TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA desarrollo GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA desarrollo GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA desarrollo GRANT ALL ON ROUTINES TO anon, authenticated, service_role;


-- ============================================
-- LISTO
-- ============================================
-- Despues de ejecutar:
-- 1. Asegurate de que PostgREST expone 'desarrollo': PGRST_DB_SCHEMAS=public,desarrollo
-- 2. Reinicia PostgREST
-- 3. El frontend local usa VITE_SUPABASE_SCHEMA=desarrollo
