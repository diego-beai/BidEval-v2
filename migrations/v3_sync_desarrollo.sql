-- ============================================================
-- V3: Sync schema desarrollo with public
-- ============================================================
-- Safe: uses IF NOT EXISTS / IF EXISTS everywhere
-- Only affects schema desarrollo
-- ============================================================

SET search_path TO desarrollo;

-- =========================================================
-- PASO 1: Renombrar tablas para alinear con public
-- =========================================================

-- chat_histories → n8n_chat_histories
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='desarrollo' AND tablename='chat_histories')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='desarrollo' AND tablename='n8n_chat_histories') THEN
    ALTER TABLE chat_histories RENAME TO n8n_chat_histories;
  END IF;
END $$;

-- scoring_audit_log → scoring_change_log
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='desarrollo' AND tablename='scoring_audit_log')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='desarrollo' AND tablename='scoring_change_log') THEN
    ALTER TABLE scoring_audit_log RENAME TO scoring_change_log;
  END IF;
END $$;

-- =========================================================
-- PASO 2: Crear tablas que faltan
-- =========================================================

-- pdf_template_config
CREATE TABLE IF NOT EXISTS pdf_template_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  company_name TEXT DEFAULT '',
  logo_data_url TEXT DEFAULT '',
  primary_color TEXT DEFAULT '#0a2540',
  footer_text TEXT DEFAULT '',
  show_page_numbers BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- project_awards
CREATE TABLE IF NOT EXISTS project_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  winner_provider_name TEXT NOT NULL,
  justification TEXT NOT NULL,
  award_status TEXT NOT NULL DEFAULT 'draft',
  award_date TIMESTAMPTZ,
  contract_reference TEXT,
  contract_data JSONB DEFAULT '{}'::jsonb,
  award_document_url TEXT,
  contract_document_url TEXT,
  awarded_by TEXT NOT NULL DEFAULT 'system',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- project_document_types
CREATE TABLE IF NOT EXISTS project_document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  doc_category TEXT NOT NULL DEFAULT 'technical',
  evaluation_link TEXT DEFAULT 'info',
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- project_economic_fields
CREATE TABLE IF NOT EXISTS project_economic_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  field_type TEXT NOT NULL DEFAULT 'currency',
  unit TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  formula TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- project_milestones
CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  milestone_type TEXT DEFAULT 'custom',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- project_setup_templates
CREATE TABLE IF NOT EXISTS project_setup_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT DEFAULT 'RFQ',
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  organization_id UUID,
  created_by TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- scoring_simulations
CREATE TABLE IF NOT EXISTS scoring_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  alternative_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- technical_reports
CREATE TABLE IF NOT EXISTS technical_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  report_type TEXT NOT NULL DEFAULT 'evaluation',
  title TEXT NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by TEXT NOT NULL DEFAULT 'system',
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- user_permissions
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  can_view_confidential BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================
-- PASO 3: Indices basicos para las nuevas tablas
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_project_awards_project ON project_awards(project_id);
CREATE INDEX IF NOT EXISTS idx_project_doc_types_project ON project_document_types(project_id);
CREATE INDEX IF NOT EXISTS idx_project_eco_fields_project ON project_economic_fields(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_scoring_simulations_project ON scoring_simulations(project_id);
CREATE INDEX IF NOT EXISTS idx_technical_reports_project ON technical_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

-- =========================================================
-- VERIFICACION
-- =========================================================
-- Ejecutar despues para confirmar:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'desarrollo' ORDER BY table_name;
