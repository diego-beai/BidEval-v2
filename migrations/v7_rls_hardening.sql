-- ============================================================
-- V7: RLS Hardening — Organization-based Row Level Security
-- Schema: desarrollo
-- ============================================================
-- Safe: only applies policies to tables that exist
-- Depends on: v5_auth_foundation.sql (get_user_org_id function)
-- ============================================================

SET search_path TO desarrollo;

-- =====================================================
-- HELPER: user_has_project_access(project_id)
-- =====================================================
CREATE OR REPLACE FUNCTION user_has_project_access(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = desarrollo
AS $$
DECLARE
  v_user_org UUID;
  v_project_org UUID;
BEGIN
  IF p_project_id IS NULL THEN RETURN FALSE; END IF;
  v_user_org := get_user_org_id();
  IF auth.uid() IS NULL THEN RETURN TRUE; END IF;

  SELECT organization_id INTO v_project_org FROM projects WHERE id = p_project_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF v_project_org IS NULL THEN RETURN TRUE; END IF;
  IF v_user_org IS NULL THEN RETURN FALSE; END IF;

  RETURN v_user_org = v_project_org;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- =====================================================
-- PATTERN A: projects (must exist)
-- =====================================================
DO $$
DECLARE pol RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='desarrollo' AND tablename='projects') THEN RETURN; END IF;
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename='projects' AND schemaname='desarrollo' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON projects', pol.policyname);
  END LOOP;
  ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
  CREATE POLICY projects_select ON projects FOR SELECT USING (organization_id = get_user_org_id() OR organization_id IS NULL);
  CREATE POLICY projects_insert ON projects FOR INSERT WITH CHECK (true);
  CREATE POLICY projects_update ON projects FOR UPDATE USING (organization_id = get_user_org_id() OR organization_id IS NULL);
  CREATE POLICY projects_delete ON projects FOR DELETE USING (
    (organization_id = get_user_org_id() OR organization_id IS NULL)
    AND EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND organization_id = get_user_org_id() AND role IN ('owner','admin'))
  );
END $$;

-- =====================================================
-- PATTERN B: Tables with project_id FK
-- Each block checks if the table exists first
-- =====================================================

-- Helper: apply RLS pattern B to a table
CREATE OR REPLACE FUNCTION _tmp_apply_rls_pattern_b(p_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE pol RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='desarrollo' AND tablename=p_table) THEN RETURN; END IF;
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename=p_table AND schemaname='desarrollo' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, p_table);
  END LOOP;
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (user_has_project_access(project_id))', p_table || '_all', p_table);
END;
$$;

-- Apply to all child tables
SELECT _tmp_apply_rls_pattern_b('project_providers');
SELECT _tmp_apply_rls_pattern_b('document_metadata');
SELECT _tmp_apply_rls_pattern_b('document_chunks');
SELECT _tmp_apply_rls_pattern_b('rfq_items_master');
SELECT _tmp_apply_rls_pattern_b('ranking_proveedores');
SELECT _tmp_apply_rls_pattern_b('provider_criterion_scores');
SELECT _tmp_apply_rls_pattern_b('economic_offers');
SELECT _tmp_apply_rls_pattern_b('qa_audit');
SELECT _tmp_apply_rls_pattern_b('qa_notifications');
SELECT _tmp_apply_rls_pattern_b('scoring_categories');
SELECT _tmp_apply_rls_pattern_b('scoring_criteria');
SELECT _tmp_apply_rls_pattern_b('scoring_weight_configs');
SELECT _tmp_apply_rls_pattern_b('scoring_change_log');
SELECT _tmp_apply_rls_pattern_b('scoring_simulations');
SELECT _tmp_apply_rls_pattern_b('project_milestones');
SELECT _tmp_apply_rls_pattern_b('project_document_types');
SELECT _tmp_apply_rls_pattern_b('project_economic_fields');
SELECT _tmp_apply_rls_pattern_b('project_awards');
SELECT _tmp_apply_rls_pattern_b('technical_reports');
SELECT _tmp_apply_rls_pattern_b('QA_PENDIENTE');

-- Cleanup helper
DROP FUNCTION IF EXISTS _tmp_apply_rls_pattern_b(TEXT);

-- =====================================================
-- PATTERN D: Public token tables
-- =====================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='desarrollo' AND tablename='supplier_upload_tokens') THEN
    EXECUTE (SELECT COALESCE(string_agg(format('DROP POLICY IF EXISTS %I ON supplier_upload_tokens', policyname), '; '), 'SELECT 1') FROM pg_policies WHERE tablename='supplier_upload_tokens' AND schemaname='desarrollo');
    ALTER TABLE supplier_upload_tokens ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY supplier_upload_tokens_select ON supplier_upload_tokens FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY supplier_upload_tokens_update ON supplier_upload_tokens FOR UPDATE USING (expires_at > now())';
    EXECUTE 'CREATE POLICY supplier_upload_tokens_insert ON supplier_upload_tokens FOR INSERT WITH CHECK (user_has_project_access(project_id))';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='desarrollo' AND tablename='qa_response_tokens') THEN
    EXECUTE (SELECT COALESCE(string_agg(format('DROP POLICY IF EXISTS %I ON qa_response_tokens', policyname), '; '), 'SELECT 1') FROM pg_policies WHERE tablename='qa_response_tokens' AND schemaname='desarrollo');
    ALTER TABLE qa_response_tokens ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY qa_response_tokens_select ON qa_response_tokens FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY qa_response_tokens_update ON qa_response_tokens FOR UPDATE USING (expires_at > now())';
    EXECUTE 'CREATE POLICY qa_response_tokens_insert ON qa_response_tokens FOR INSERT WITH CHECK (user_has_project_access(project_id))';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =====================================================
-- PATTERN E: Chat tables
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='desarrollo' AND tablename='n8n_chat_histories') THEN RETURN; END IF;

  -- Add project_id column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='desarrollo' AND table_name='n8n_chat_histories' AND column_name='project_id') THEN
    ALTER TABLE n8n_chat_histories ADD COLUMN project_id UUID REFERENCES projects(id);
    CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_project ON n8n_chat_histories(project_id);
  END IF;

  -- Drop existing policies
  EXECUTE (SELECT COALESCE(string_agg(format('DROP POLICY IF EXISTS %I ON n8n_chat_histories', policyname), '; '), 'SELECT 1') FROM pg_policies WHERE tablename='n8n_chat_histories' AND schemaname='desarrollo');

  ALTER TABLE n8n_chat_histories ENABLE ROW LEVEL SECURITY;
  CREATE POLICY n8n_chat_histories_select ON n8n_chat_histories FOR SELECT USING (project_id IS NULL OR user_has_project_access(project_id));
  CREATE POLICY n8n_chat_histories_insert ON n8n_chat_histories FOR INSERT WITH CHECK (true);
  CREATE POLICY n8n_chat_histories_update ON n8n_chat_histories FOR UPDATE USING (project_id IS NULL OR user_has_project_access(project_id));
END $$;

-- =====================================================
-- VERIFY
-- =====================================================
-- SELECT tablename, COUNT(*) FROM pg_policies WHERE schemaname = 'desarrollo' GROUP BY tablename ORDER BY tablename;
