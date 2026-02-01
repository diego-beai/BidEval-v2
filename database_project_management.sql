-- ============================================
-- GESTIÓN DE PROYECTOS: Soft Delete + Editar Nombre
-- ============================================

-- 1. Agregar campo is_active para soft delete
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;

-- Índice para búsquedas rápidas por estado activo
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON public.projects(is_active);

-- 2. Eliminar vista existente y recrearla con la nueva columna
DROP VIEW IF EXISTS v_projects_with_stats;

CREATE VIEW v_projects_with_stats AS
SELECT
    p.id,
    p.name,
    p.display_name,
    p.description,
    p.created_at,
    p.updated_at,
    p.is_active,
    COUNT(DISTINCT dm.id) as document_count,
    COUNT(DISTINCT rim.id) as requirement_count,
    COUNT(DISTINCT qa.id) as qa_count
FROM public.projects p
LEFT JOIN public.document_metadata dm ON dm.project_id = p.id
LEFT JOIN public.rfq_items_master rim ON rim.project_id = p.id
LEFT JOIN public.qa_audit qa ON qa.project_id = p.id
WHERE p.is_active = TRUE  -- Solo mostrar proyectos activos
GROUP BY p.id, p.name, p.display_name, p.description, p.created_at, p.updated_at, p.is_active;

-- 3. Función para editar nombre de proyecto
CREATE OR REPLACE FUNCTION update_project_name(
    p_project_id UUID,
    p_new_display_name TEXT
)
RETURNS JSON AS $$
DECLARE
    v_normalized_name TEXT;
    v_existing_project UUID;
BEGIN
    -- Validar que el proyecto existe y está activo
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND is_active = TRUE) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Project not found or inactive'
        );
    END IF;

    -- Normalizar el nuevo nombre
    v_normalized_name := normalize_project_name(p_new_display_name);

    -- Verificar que no exista otro proyecto activo con el mismo nombre
    SELECT id INTO v_existing_project
    FROM public.projects
    WHERE name = v_normalized_name
      AND id != p_project_id
      AND is_active = TRUE;

    IF v_existing_project IS NOT NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'A project with this name already exists'
        );
    END IF;

    -- Actualizar el proyecto
    UPDATE public.projects
    SET
        display_name = p_new_display_name,
        name = v_normalized_name,
        updated_at = NOW()
    WHERE id = p_project_id;

    RETURN json_build_object(
        'success', TRUE,
        'project_id', p_project_id,
        'display_name', p_new_display_name,
        'name', v_normalized_name
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Función para soft delete (desactivar proyecto)
CREATE OR REPLACE FUNCTION soft_delete_project(
    p_project_id UUID
)
RETURNS JSON AS $$
BEGIN
    -- Validar que el proyecto existe
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Project not found'
        );
    END IF;

    -- Marcar como inactivo (no eliminar de BBDD)
    UPDATE public.projects
    SET
        is_active = FALSE,
        updated_at = NOW()
    WHERE id = p_project_id;

    RETURN json_build_object(
        'success', TRUE,
        'project_id', p_project_id,
        'message', 'Project marked as inactive'
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Función para reactivar proyecto (por si se necesita después)
CREATE OR REPLACE FUNCTION reactivate_project(
    p_project_id UUID
)
RETURNS JSON AS $$
BEGIN
    -- Validar que el proyecto existe
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Project not found'
        );
    END IF;

    -- Marcar como activo
    UPDATE public.projects
    SET
        is_active = TRUE,
        updated_at = NOW()
    WHERE id = p_project_id;

    RETURN json_build_object(
        'success', TRUE,
        'project_id', p_project_id,
        'message', 'Project reactivated'
    );
END;
$$ LANGUAGE plpgsql;

-- 6. Configurar políticas RLS para permitir acceso desde el frontend
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.projects;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.projects;
DROP POLICY IF EXISTS "Enable update for all users" ON public.projects;

CREATE POLICY "Enable read access for all users" ON public.projects
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON public.projects
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON public.projects
    FOR UPDATE USING (true);

-- 7. Dar permisos a la vista y tabla
GRANT SELECT ON v_projects_with_stats TO anon;
GRANT SELECT ON v_projects_with_stats TO authenticated;
GRANT ALL ON public.projects TO anon;
GRANT ALL ON public.projects TO authenticated;

-- ============================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================
-- - Los proyectos NO se eliminan físicamente de la BBDD
-- - El campo is_active permite "ocultar" proyectos sin perder datos
-- - La vista v_projects_with_stats filtra automáticamente proyectos inactivos
-- - Se puede reactivar un proyecto usando reactivate_project()
-- - Todos los datos relacionados (documentos, requisitos, Q&A) se mantienen intactos
-- - Las políticas RLS permiten acceso completo desde el frontend
