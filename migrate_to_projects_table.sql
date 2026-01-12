-- ============================================
-- SCRIPT DE MIGRACIÓN: project_name -> projects table
-- ============================================
-- Este script migra los datos existentes de project_name (TEXT) 
-- a la nueva estructura normalizada con la tabla projects
--
-- IMPORTANTE: Ejecutar este script solo si ya tienes datos en las tablas
-- y quieres migrarlos a la nueva estructura.
-- ============================================

-- PASO 1: Crear proyectos desde document_metadata
-- Extrae todos los project_name únicos y crea registros en projects
INSERT INTO public.projects (name, display_name)
SELECT DISTINCT 
    normalize_project_name(project_name) as name,
    project_name as display_name
FROM public.document_metadata
WHERE project_name IS NOT NULL 
  AND project_name != ''
ON CONFLICT (name) DO NOTHING;

-- PASO 2: Actualizar document_metadata con project_id
UPDATE public.document_metadata dm
SET project_id = p.id
FROM public.projects p
WHERE dm.project_name = p.display_name
  AND dm.project_id IS NULL;

-- PASO 3: Crear proyectos desde rfq_items_master (si la columna project_name existe)
-- NOTA: Si la tabla ya tiene project_id, este paso no es necesario
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'rfq_items_master' 
          AND column_name = 'project_name'
    ) THEN
        -- Crear proyectos desde rfq_items_master
        INSERT INTO public.projects (name, display_name)
        SELECT DISTINCT 
            normalize_project_name(project_name) as name,
            project_name as display_name
        FROM public.rfq_items_master
        WHERE project_name IS NOT NULL 
          AND project_name != ''
        ON CONFLICT (name) DO NOTHING;
        
        -- Actualizar rfq_items_master con project_id
        UPDATE public.rfq_items_master rim
        SET project_id = p.id
        FROM public.projects p
        WHERE rim.project_name = p.display_name
          AND rim.project_id IS NULL;
    END IF;
END $$;

-- PASO 4: Crear proyectos desde qa_audit (si la columna project_name existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'qa_audit' 
          AND column_name = 'project_name'
    ) THEN
        -- Crear proyectos desde qa_audit
        INSERT INTO public.projects (name, display_name)
        SELECT DISTINCT 
            normalize_project_name(project_name) as name,
            project_name as display_name
        FROM public.qa_audit
        WHERE project_name IS NOT NULL 
          AND project_name != ''
        ON CONFLICT (name) DO NOTHING;
        
        -- Actualizar qa_audit con project_id
        UPDATE public.qa_audit qa
        SET project_id = p.id
        FROM public.projects p
        WHERE qa.project_name = p.display_name
          AND qa.project_id IS NULL;
    END IF;
END $$;

-- PASO 5: Crear proyectos desde QA_PENDIENTE (compatibilidad con frontend)
INSERT INTO public.projects (name, display_name)
SELECT DISTINCT 
    normalize_project_name(project_id) as name,
    project_id as display_name
FROM public.QA_PENDIENTE
WHERE project_id IS NOT NULL 
  AND project_id != ''
  AND NOT EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.name = normalize_project_name(QA_PENDIENTE.project_id)
         OR p.display_name = QA_PENDIENTE.project_id
  )
ON CONFLICT (name) DO NOTHING;

-- Verificación: Mostrar resumen de la migración
SELECT 
    'Migración completada' as status,
    COUNT(*) as total_projects,
    COUNT(DISTINCT dm.id) as documents_with_project_id,
    COUNT(DISTINCT rim.id) as requirements_with_project_id,
    COUNT(DISTINCT qa.id) as qa_items_with_project_id
FROM public.projects p
LEFT JOIN public.document_metadata dm ON dm.project_id = p.id
LEFT JOIN public.rfq_items_master rim ON rim.project_id = p.id
LEFT JOIN public.qa_audit qa ON qa.project_id = p.id;
