-- Migration: Add disciplines column to projects table
-- This allows storing project-specific engineering disciplines dynamically

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS disciplines TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.projects.disciplines IS 'Array of engineering disciplines relevant to this project (e.g., Electrical, Mechanical, Civil, Process)';

-- Create index for faster discipline-based queries
CREATE INDEX IF NOT EXISTS idx_projects_disciplines ON public.projects USING GIN(disciplines);
