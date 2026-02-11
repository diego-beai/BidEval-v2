-- ============================================
-- Migration 009: Add unique constraint on provider_responses
--
-- The n8n upsert node uses ON CONFLICT (provider_name, file_id, requirement_id)
-- but no unique constraint existed on these columns, causing the upsert to fail.
-- ============================================

-- 1. Public schema
ALTER TABLE public.provider_responses
    DROP CONSTRAINT IF EXISTS unique_provider_response;

ALTER TABLE public.provider_responses
    ADD CONSTRAINT unique_provider_response
    UNIQUE (provider_name, file_id, requirement_id);

-- 2. Desarrollo schema
ALTER TABLE desarrollo.provider_responses
    DROP CONSTRAINT IF EXISTS unique_provider_response;

ALTER TABLE desarrollo.provider_responses
    ADD CONSTRAINT unique_provider_response
    UNIQUE (provider_name, file_id, requirement_id);
