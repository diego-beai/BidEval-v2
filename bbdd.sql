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
-- ============================================
CREATE TABLE IF NOT EXISTS public.ranking_proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    cumplimiento_porcentual DECIMAL(5,2) DEFAULT 0, -- Porcentaje de cumplimiento (0-100)
    technical_score DECIMAL(3,1) DEFAULT 0, -- Puntaje técnico (0-10)
    economical_score DECIMAL(3,1) DEFAULT 0, -- Puntaje económico (0-10)
    pre_feed_score DECIMAL(3,1) DEFAULT 0, -- Puntaje Pre-FEED (0-10)
    feed_score DECIMAL(3,1) DEFAULT 0, -- Puntaje FEED (0-10)
    overall_score DECIMAL(3,1) DEFAULT 0, -- Puntaje general (0-10)
    evaluation_count INTEGER DEFAULT 0, -- Número de evaluaciones realizadas
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_ranking_provider_name ON public.ranking_proveedores(provider_name);
CREATE INDEX IF NOT EXISTS idx_ranking_project_id ON public.ranking_proveedores(project_id);
CREATE INDEX IF NOT EXISTS idx_ranking_cumplimiento ON public.ranking_proveedores(cumplimiento_porcentual);

-- Función para actualizar automáticamente overall_score
CREATE OR REPLACE FUNCTION update_overall_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.overall_score = (
        COALESCE(NEW.technical_score, 0) +
        COALESCE(NEW.economical_score, 0) +
        COALESCE(NEW.pre_feed_score, 0) +
        COALESCE(NEW.feed_score, 0)
    ) / NULLIF(NEW.evaluation_count, 0);

    -- Si no hay evaluaciones, el score es 0
    IF NEW.evaluation_count = 0 THEN
        NEW.overall_score = 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar overall_score automáticamente
CREATE OR REPLACE TRIGGER trigger_update_overall_score
    BEFORE INSERT OR UPDATE ON public.ranking_proveedores
    FOR EACH ROW
    EXECUTE FUNCTION update_overall_score();

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
-- Vista que calcula scores por tipo de evaluación para cada proveedor
-- Esta vista es usada por el frontend para mostrar gráficos de scoring
-- ============================================
CREATE OR REPLACE VIEW public.ranking_proveedores_por_tipo AS
WITH provider_scores AS (
    SELECT
        r.provider_name,
        m.project_id,
        m.evaluation_type,
        COUNT(r.id) as items_evaluados,
        COALESCE(AVG(r.score), 0) as avg_score
    FROM provider_responses r
    JOIN rfq_items_master m ON r.requirement_id = m.id
    WHERE r.score IS NOT NULL
    GROUP BY r.provider_name, m.project_id, m.evaluation_type
),
aggregated_scores AS (
    SELECT
        provider_name,
        project_id,
        -- Technical Evaluation score
        COALESCE(MAX(CASE WHEN evaluation_type ILIKE '%Technical%' THEN avg_score END), 0) as technical_score,
        -- Economical Evaluation score
        COALESCE(MAX(CASE WHEN evaluation_type ILIKE '%Econom%' THEN avg_score END), 0) as economical_score,
        -- Pre-FEED score
        COALESCE(MAX(CASE WHEN evaluation_type ILIKE '%Pre-FEED%' OR evaluation_type ILIKE '%Pre FEED%' THEN avg_score END), 0) as pre_feed_score,
        -- FEED score (excluding Pre-FEED)
        COALESCE(MAX(CASE WHEN evaluation_type ILIKE '%FEED%' AND evaluation_type NOT ILIKE '%Pre-FEED%' AND evaluation_type NOT ILIKE '%Pre FEED%' THEN avg_score END), 0) as feed_score,
        -- Total items evaluados
        SUM(items_evaluados) as total_items
    FROM provider_scores
    GROUP BY provider_name, project_id
)
SELECT
    provider_name,
    project_id,
    ROUND(technical_score::numeric, 2) as technical_score,
    ROUND(economical_score::numeric, 2) as economical_score,
    ROUND(pre_feed_score::numeric, 2) as pre_feed_score,
    ROUND(feed_score::numeric, 2) as feed_score,
    ROUND(((technical_score * 0.4 + economical_score * 0.3 + pre_feed_score * 0.15 + feed_score * 0.15))::numeric, 2) as overall_score,
    ROUND(((technical_score + economical_score + pre_feed_score + feed_score) / 4 * 10)::numeric, 2) as cumplimiento_porcentual,
    total_items as evaluation_count
FROM aggregated_scores
ORDER BY overall_score DESC;

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
  ) as cumplimiento_porcentual
FROM
  rfq_items_master m
  JOIN provider_responses r ON m.id = r.requirement_id
GROUP BY
  m.project_id,
  r.provider_name
ORDER BY cumplimiento_porcentual DESC;
