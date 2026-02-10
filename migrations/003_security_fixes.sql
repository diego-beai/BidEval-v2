-- ============================================
-- Migration 003: Security Fixes (T20)
-- Addresses RLS, input validation, and data integrity
-- ============================================

-- 1. Add CHECK constraints for text fields that should be non-empty
-- Prevents empty strings being inserted where meaningful data is expected

-- projects.display_name should not be empty
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS chk_projects_display_name_nonempty;
ALTER TABLE public.projects ADD CONSTRAINT chk_projects_display_name_nonempty CHECK (length(trim(display_name)) >= 1);

-- qa_audit.question should not be empty
ALTER TABLE public.qa_audit DROP CONSTRAINT IF EXISTS chk_qa_audit_question_nonempty;
ALTER TABLE public.qa_audit ADD CONSTRAINT chk_qa_audit_question_nonempty CHECK (length(trim(question)) >= 1);

-- qa_audit.provider_name should not be empty
ALTER TABLE public.qa_audit DROP CONSTRAINT IF EXISTS chk_qa_audit_provider_nonempty;
ALTER TABLE public.qa_audit ADD CONSTRAINT chk_qa_audit_provider_nonempty CHECK (length(trim(provider_name)) >= 1);

-- ranking_proveedores.provider_name should not be empty
ALTER TABLE public.ranking_proveedores DROP CONSTRAINT IF EXISTS chk_ranking_provider_nonempty;
ALTER TABLE public.ranking_proveedores ADD CONSTRAINT chk_ranking_provider_nonempty CHECK (length(trim(provider_name)) >= 1);

-- economic_offers.provider_name should not be empty
ALTER TABLE public.economic_offers DROP CONSTRAINT IF EXISTS chk_economic_provider_nonempty;
ALTER TABLE public.economic_offers ADD CONSTRAINT chk_economic_provider_nonempty CHECK (length(trim(provider_name)) >= 1);

-- 2. Add score range validation for ranking_proveedores
-- Scores should be 0-10 range
ALTER TABLE public.ranking_proveedores DROP CONSTRAINT IF EXISTS chk_overall_score_range;
ALTER TABLE public.ranking_proveedores ADD CONSTRAINT chk_overall_score_range
    CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 10));

ALTER TABLE public.ranking_proveedores DROP CONSTRAINT IF EXISTS chk_compliance_range;
ALTER TABLE public.ranking_proveedores ADD CONSTRAINT chk_compliance_range
    CHECK (compliance_percentage IS NULL OR (compliance_percentage >= 0 AND compliance_percentage <= 100));

-- 3. Add expiry validation for qa_response_tokens
-- expires_at should always be in the future at creation time (handled by application)
-- token should be at least 32 characters for security
ALTER TABLE public.qa_response_tokens DROP CONSTRAINT IF EXISTS chk_token_min_length;
ALTER TABLE public.qa_response_tokens ADD CONSTRAINT chk_token_min_length CHECK (length(token) >= 32);

-- 4. Add status CHECK constraint to qa_audit (replace free-text with enum)
ALTER TABLE public.qa_audit DROP CONSTRAINT IF EXISTS chk_qa_audit_status;
ALTER TABLE public.qa_audit ADD CONSTRAINT chk_qa_audit_status
    CHECK (status IN ('Draft', 'Pending', 'Approved', 'Sent', 'Answered', 'Resolved', 'NeedsMoreInfo', 'Discarded'));

-- 5. Economic offers: price should be non-negative
ALTER TABLE public.economic_offers DROP CONSTRAINT IF EXISTS chk_economic_price_positive;
ALTER TABLE public.economic_offers ADD CONSTRAINT chk_economic_price_positive
    CHECK (total_price IS NULL OR total_price >= 0);

ALTER TABLE public.economic_offers DROP CONSTRAINT IF EXISTS chk_economic_discount_range;
ALTER TABLE public.economic_offers ADD CONSTRAINT chk_economic_discount_range
    CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

-- 6. Rate-limit token creation (application-level, but add index for monitoring)
CREATE INDEX IF NOT EXISTS idx_qa_response_tokens_created ON public.qa_response_tokens(created_at DESC);

-- ============================================
-- NOTE: RLS Policies
-- ============================================
-- Current state: All tables have permissive USING(true) policies.
-- This is acceptable for the demo phase (no user auth implemented).
--
-- PRE-PRODUCTION CHECKLIST:
-- 1. Implement Supabase Auth (email/password or SSO)
-- 2. Add user_id column to projects table
-- 3. Replace USING(true) with USING(auth.uid() = user_id) on all tables
-- 4. Add organization_id for multi-tenant isolation
-- 5. Use RLS to enforce tenant boundaries
-- 6. Remove anon key from frontend, use authenticated sessions
--
-- The qa_response_tokens table is an exception: it needs public read
-- access for the supplier portal (token-based auth, no user session).
