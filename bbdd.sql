-- 0. TABLA DE PROYECTOS (Normalización de nombres)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- Nombre normalizado (sin caracteres especiales, mayúsculas)
    display_name TEXT NOT NULL, -- Nombre para mostrar (puede tener caracteres especiales)
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas por nombre
CREATE INDEX IF NOT EXISTS idx_projects_name ON public.projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_display_name ON public.projects(display_name);

-- 1. REGISTRO GLOBAL DE DOCUMENTOS
CREATE TABLE IF NOT EXISTS public.document_metadata (
    id TEXT PRIMARY KEY,
    title TEXT,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    document_type TEXT NOT NULL,
    provider TEXT,
    evaluation_types TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLAS VECTORIALES (Vectores de 4096)
-- Aceptan los 4096 de Qwen3, solo que no llevan índice (perfecto para <10k filas)
CREATE TABLE IF NOT EXISTS public.rfq (
    id BIGSERIAL PRIMARY KEY,
    content TEXT,
    metadata JSONB,
    embedding vector(4096) 
);

CREATE TABLE IF NOT EXISTS public.proposals (
    id BIGSERIAL PRIMARY KEY,
    content TEXT,
    metadata JSONB,
    embedding vector(4096)
);

-- 3. REQUISITOS MAESTROS
CREATE TABLE IF NOT EXISTS public.rfq_items_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id TEXT REFERENCES public.document_metadata(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    evaluation_type TEXT NOT NULL,
    phase TEXT,
    requirement_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por proyecto
CREATE INDEX IF NOT EXISTS idx_rfq_items_master_project_id ON public.rfq_items_master(project_id);

-- 4. EVALUACIONES DE PROVEEDORES
CREATE TABLE IF NOT EXISTS public.provider_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID REFERENCES public.rfq_items_master(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    evaluation_value TEXT,
    score INTEGER, -- Added score column for quantitative evaluation
    comment TEXT,
    file_id TEXT REFERENCES public.document_metadata(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_requirement_provider UNIQUE(requirement_id, provider_name)
);

-- 5. AUDITORÍA TÉCNICA (Q&A)
CREATE TABLE IF NOT EXISTS public.qa_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID REFERENCES public.rfq_items_master(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,
    discipline TEXT,
    question TEXT NOT NULL,
    importance TEXT CHECK (importance IN ('High', 'Medium', 'Low')),
    status TEXT DEFAULT 'Pending',
    response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por proyecto
CREATE INDEX IF NOT EXISTS idx_qa_audit_project_id ON public.qa_audit(project_id);

-- 5b. TOKENS DE RESPUESTA DE PROVEEDORES
-- Sistema para enviar preguntas Q&A a proveedores vía link único
CREATE TABLE IF NOT EXISTS public.qa_response_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_qa_response_tokens_token ON public.qa_response_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qa_response_tokens_status ON public.qa_response_tokens(status);
CREATE INDEX IF NOT EXISTS idx_qa_response_tokens_project ON public.qa_response_tokens(project_id);

-- Habilitar RLS para qa_response_tokens
ALTER TABLE public.qa_response_tokens ENABLE ROW LEVEL SECURITY;

-- Política: Lectura pública por token (para el formulario del proveedor)
DROP POLICY IF EXISTS "Allow read by token" ON public.qa_response_tokens;
CREATE POLICY "Allow read by token" ON public.qa_response_tokens
    FOR SELECT USING (true);

-- Política: Update por token (para marcar como accedido/respondido)
DROP POLICY IF EXISTS "Allow update by token" ON public.qa_response_tokens;
CREATE POLICY "Allow update by token" ON public.qa_response_tokens
    FOR UPDATE USING (true);

-- Política: Insert para crear nuevos tokens
DROP POLICY IF EXISTS "Allow insert tokens" ON public.qa_response_tokens;
CREATE POLICY "Allow insert tokens" ON public.qa_response_tokens
    FOR INSERT WITH CHECK (true);

-- Agregar campos adicionales a qa_audit para tracking de respuestas (si no existen)
ALTER TABLE public.qa_audit
    ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS response_source TEXT CHECK (response_source IN ('portal', 'manual', 'email'));

-- Agregar columna requirement_id para vincular preguntas QA con requisitos
ALTER TABLE public.qa_audit
    ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES public.rfq_items_master(id) ON DELETE SET NULL;

-- Índice para búsquedas por requirement_id
CREATE INDEX IF NOT EXISTS idx_qa_audit_requirement_id ON public.qa_audit(requirement_id);

-- Status values for qa_audit.status:
-- 'Draft' - Question created but not yet approved
-- 'Pending' - Question pending review
-- 'Approved' - Question approved, ready to send
-- 'Sent' - Question sent to supplier
-- 'Answered' - Supplier has responded (needs review)
-- 'Resolved' - Response reviewed and accepted as satisfactory
-- 'NeedsMoreInfo' - Response reviewed but needs additional clarification
-- 'Discarded' - Question discarded/cancelled

-- 6. TABLA QA_PENDIENTE (compatibilidad con el frontend)
-- Esta tabla mantiene la estructura esperada por el frontend
CREATE TABLE IF NOT EXISTS public.QA_PENDIENTE (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    project_id TEXT NOT NULL, -- Mantenemos TEXT para compatibilidad, pero debería referenciar projects
    proveedor TEXT NOT NULL,
    disciplina TEXT CHECK (disciplina IN ('Eléctrica', 'Mecánica', 'Civil', 'Proceso', 'General')),
    pregunta_texto TEXT NOT NULL,
    estado TEXT CHECK (estado IN ('Borrador', 'Pendiente', 'Aprobada', 'Enviada', 'Respondida', 'Descartada')) DEFAULT 'Borrador',
    importancia TEXT CHECK (importancia IN ('Alta', 'Media', 'Baja')),
    respuesta_proveedor TEXT,
    fecha_respuesta TIMESTAMP WITH TIME ZONE,
    notas_internas TEXT
);

-- Índices para QA_PENDIENTE
CREATE INDEX IF NOT EXISTS idx_qa_pendiente_project_id ON public.QA_PENDIENTE(project_id);
CREATE INDEX IF NOT EXISTS idx_qa_pendiente_proveedor ON public.QA_PENDIENTE(proveedor);
CREATE INDEX IF NOT EXISTS idx_qa_pendiente_estado ON public.QA_PENDIENTE(estado);

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
    BEFORE UPDATE ON public.projects
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
    FROM public.projects
    WHERE name = v_normalized_name OR display_name = p_display_name
    LIMIT 1;
    
    -- Si no existe, crearlo
    IF v_project_id IS NULL THEN
        INSERT INTO public.projects (name, display_name, description)
        VALUES (v_normalized_name, p_display_name, p_description)
        RETURNING id INTO v_project_id;
    END IF;
    
    RETURN v_project_id;
END;
$$ LANGUAGE plpgsql;

-- Vista para facilitar consultas con nombres de proyectos
CREATE OR REPLACE VIEW v_projects_with_stats AS
SELECT 
    p.id,
    p.name,
    p.display_name,
    p.description,
    p.created_at,
    p.updated_at,
    COUNT(DISTINCT dm.id) as document_count,
    COUNT(DISTINCT rim.id) as requirement_count,
    COUNT(DISTINCT qa.id) as qa_count
FROM public.projects p
LEFT JOIN public.document_metadata dm ON dm.project_id = p.id
LEFT JOIN public.rfq_items_master rim ON rim.project_id = p.id
LEFT JOIN public.qa_audit qa ON qa.project_id = p.id
GROUP BY p.id, p.name, p.display_name, p.description, p.created_at, p.updated_at;

-- ============================================
-- SCRIPT DE MIGRACIÓN (ejecutar solo si hay datos existentes)
-- ============================================
-- Este script migra los project_name existentes a la nueva tabla projects
-- 
-- PASO 1: Migrar project_name de document_metadata
-- INSERT INTO public.projects (name, display_name)
-- SELECT DISTINCT 
--     normalize_project_name(project_name) as name,
--     project_name as display_name
-- FROM public.document_metadata
-- WHERE project_name IS NOT NULL
-- ON CONFLICT (name) DO NOTHING;
--
-- PASO 2: Actualizar document_metadata con project_id
-- UPDATE public.document_metadata dm
-- SET project_id = p.id
-- FROM public.projects p
-- WHERE dm.project_name = p.display_name
--   AND dm.project_id IS NULL;
--
-- PASO 3: Migrar project_name de rfq_items_master (si existe la columna)
-- INSERT INTO public.projects (name, display_name)
-- SELECT DISTINCT 
--     normalize_project_name(project_name) as name,
--     project_name as display_name
-- FROM public.rfq_items_master
-- WHERE project_name IS NOT NULL
-- ON CONFLICT (name) DO NOTHING;
--
-- PASO 4: Actualizar rfq_items_master con project_id
-- UPDATE public.rfq_items_master rim
-- SET project_id = p.id
-- FROM public.projects p
-- WHERE rim.project_name = p.display_name
--   AND rim.project_id IS NULL;
--
-- PASO 5: Migrar project_name de qa_audit (si existe la columna)
-- INSERT INTO public.projects (name, display_name)
-- SELECT DISTINCT 
--     normalize_project_name(project_name) as name,
--     project_name as display_name
-- FROM public.qa_audit
-- WHERE project_name IS NOT NULL
-- ON CONFLICT (name) DO NOTHING;
--
-- PASO 6: Actualizar qa_audit con project_id
-- UPDATE public.qa_audit qa
-- SET project_id = p.id
-- FROM public.projects p
-- WHERE qa.project_name = p.display_name
--   AND qa.project_id IS NULL;

-- ============================================
-- TABLA DE RANKING DE PROVEEDORES
-- New scoring system based on RFQ evaluation criteria
-- ============================================
CREATE TABLE IF NOT EXISTS public.ranking_proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

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

    -- Metadata
    evaluation_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraint for unique provider per project
    CONSTRAINT unique_provider_project UNIQUE(provider_name, project_id)
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_ranking_provider_name ON public.ranking_proveedores(provider_name);
CREATE INDEX IF NOT EXISTS idx_ranking_project_id ON public.ranking_proveedores(project_id);
CREATE INDEX IF NOT EXISTS idx_ranking_overall_score ON public.ranking_proveedores(overall_score DESC);

-- Función para calcular overall_score basado en los nuevos pesos
CREATE OR REPLACE FUNCTION calculate_weighted_overall_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate category scores from individual criteria
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
DROP TRIGGER IF EXISTS trigger_update_overall_score ON public.ranking_proveedores;
CREATE TRIGGER trigger_calculate_weighted_score
    BEFORE INSERT OR UPDATE ON public.ranking_proveedores
    FOR EACH ROW
    EXECUTE FUNCTION calculate_weighted_overall_score();

-- ============================================
-- DATOS DE EJEMPLO PARA RANKING DE PROVEEDORES
-- ============================================
-- Insertar datos de ejemplo (ejecutar solo para pruebas)
-- INSERT INTO public.ranking_proveedores (provider_name, cumplimiento_porcentual, technical_score, economical_score, pre_feed_score, feed_score, evaluation_count)
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

-- ============================================
-- VISTA: ranking_proveedores_detailed
-- Vista con todos los scores individuales por criterio
-- ============================================
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

-- ============================================
-- VISTA LEGACY: ranking_proveedores_simple (para compatibilidad)
-- ============================================
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
