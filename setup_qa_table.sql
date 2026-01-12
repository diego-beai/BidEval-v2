-- Script to verify and create QA_PENDIENTE table if needed
-- Run this script in your Supabase SQL editor

-- Check if table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'QA_PENDIENTE'
    ) THEN
        RAISE NOTICE 'Creating QA_PENDIENTE table...';
        
        CREATE TABLE public.QA_PENDIENTE (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            project_id TEXT NOT NULL,
            proveedor TEXT NOT NULL,
            disciplina TEXT CHECK (disciplina IN ('Eléctrica', 'Mecánica', 'Civil', 'Proceso', 'General')),
            pregunta_texto TEXT NOT NULL,
            estado TEXT CHECK (estado IN ('Borrador', 'Pendiente', 'Aprobada', 'Enviada', 'Respondida', 'Descartada')) DEFAULT 'Borrador',
            importancia TEXT CHECK (importancia IN ('Alta', 'Media', 'Baja')),
            respuesta_proveedor TEXT,
            fecha_respuesta TIMESTAMP WITH TIME ZONE,
            notas_internas TEXT
        );
        
        -- Create indexes
        CREATE INDEX idx_qa_pendiente_project_id ON public.QA_PENDIENTE(project_id);
        CREATE INDEX idx_qa_pendiente_proveedor ON public.QA_PENDIENTE(proveedor);
        CREATE INDEX idx_qa_pendiente_estado ON public.QA_PENDIENTE(estado);
        
        RAISE NOTICE 'QA_PENDIENTE table created successfully!';
    ELSE
        RAISE NOTICE 'QA_PENDIENTE table already exists.';
    END IF;
END $$;

-- Verify table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'QA_PENDIENTE'
ORDER BY ordinal_position;
