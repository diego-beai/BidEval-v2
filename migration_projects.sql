-- Migration to add status, ai_context and disciplines to projects table

DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'status') THEN
        ALTER TABLE public.projects ADD COLUMN status TEXT DEFAULT 'Setup';
    END IF;

    -- Add ai_context column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'ai_context') THEN
        ALTER TABLE public.projects ADD COLUMN ai_context TEXT;
    END IF;

    -- Add disciplines column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'disciplines') THEN
        ALTER TABLE public.projects ADD COLUMN disciplines TEXT[] DEFAULT NULL;
    END IF;
END $$;
