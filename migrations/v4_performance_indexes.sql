-- ============================================================
-- V4: Performance Indexes for Scalability
-- Schema: desarrollo
-- Phase 1 - Enterprise Hardening
-- ============================================================
-- Safe: only creates indexes on tables that exist
-- ============================================================

SET search_path TO desarrollo;

DO $$
BEGIN
  -- rfq_items_master: queried by project_id + ordered by created_at
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'desarrollo' AND tablename = 'rfq_items_master') THEN
    CREATE INDEX IF NOT EXISTS idx_rfq_items_project_created ON rfq_items_master (project_id, created_at DESC);
    ANALYZE rfq_items_master;
  END IF;

  -- provider_responses: queried by project_id + ordered by updated_at
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'desarrollo' AND tablename = 'provider_responses') THEN
    CREATE INDEX IF NOT EXISTS idx_provider_responses_project_updated ON provider_responses (project_id, updated_at DESC);
    ANALYZE provider_responses;
  END IF;

  -- ranking_proveedores: queried by project_id + ordered by overall_score
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'desarrollo' AND tablename = 'ranking_proveedores') THEN
    CREATE INDEX IF NOT EXISTS idx_ranking_project_score ON ranking_proveedores (project_id, overall_score DESC);
    ANALYZE ranking_proveedores;
  END IF;

  -- scoring_change_log: queried by project_id + ordered by created_at
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'desarrollo' AND tablename = 'scoring_change_log') THEN
    CREATE INDEX IF NOT EXISTS idx_scoring_changelog_project_created ON scoring_change_log (project_id, created_at DESC);
    ANALYZE scoring_change_log;
  END IF;

  -- n8n_chat_histories: queried by session_id for chat context
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'desarrollo' AND tablename = 'n8n_chat_histories') THEN
    CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_session ON n8n_chat_histories (session_id);
    ANALYZE n8n_chat_histories;
  END IF;

  -- qa_audit: queried by project_id + provider + status
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'desarrollo' AND tablename = 'qa_audit') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_audit_project_provider_status ON qa_audit (project_id, provider_name, status);
    ANALYZE qa_audit;
  END IF;

  -- economic_offers: queried by project_id + ordered by total_price
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'desarrollo' AND tablename = 'economic_offers') THEN
    CREATE INDEX IF NOT EXISTS idx_economic_offers_project_price ON economic_offers (project_id, total_price ASC NULLS LAST);
    ANALYZE economic_offers;
  END IF;

  -- document_metadata: queried by project_id + document_type
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'desarrollo' AND tablename = 'document_metadata') THEN
    CREATE INDEX IF NOT EXISTS idx_document_metadata_project_type ON document_metadata (project_id, document_type);
    ANALYZE document_metadata;
  END IF;
END $$;
