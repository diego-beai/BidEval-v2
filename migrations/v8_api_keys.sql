-- ============================================================
-- V8: API Keys & Rate Limiting
-- Schema: desarrollo
-- Depends on: v5_auth_foundation.sql (get_user_org_id)
-- ============================================================

SET search_path TO desarrollo;

BEGIN;

-- --------------------------------------------------------
-- 1. API Keys table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,          -- SHA-256 hash of the full key
    key_prefix TEXT NOT NULL,        -- First 12 chars for display (beval_xxxx)
    permissions TEXT[] NOT NULL DEFAULT ARRAY['read'],
    rate_limit_per_hour INT NOT NULL DEFAULT 100,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_manage_api_keys ON api_keys;
CREATE POLICY org_manage_api_keys ON api_keys
    FOR ALL
    USING (organization_id = get_user_org_id())
    WITH CHECK (organization_id = get_user_org_id());

-- --------------------------------------------------------
-- 2. Rate limit counters table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limit_counters (
    key TEXT PRIMARY KEY,
    count INT NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS needed — accessed only by Edge Functions with service_role
ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;

-- Service role bypass (no user-facing policies)
DROP POLICY IF EXISTS service_role_rate_limits ON rate_limit_counters;
CREATE POLICY service_role_rate_limits ON rate_limit_counters
    FOR ALL
    USING (auth.uid() IS NULL)
    WITH CHECK (auth.uid() IS NULL);

-- --------------------------------------------------------
-- 3. Helper: validate API key and return org_id
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_api_key(p_key_hash TEXT)
RETURNS TABLE(org_id UUID, rate_limit INT, key_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = desarrollo
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ak.organization_id,
        ak.rate_limit_per_hour,
        ak.id
    FROM api_keys ak
    WHERE ak.key_hash = p_key_hash
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > now());
END;
$$;

-- --------------------------------------------------------
-- 4. Helper: check and increment rate limit
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION check_rate_limit(p_key TEXT, p_limit INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = desarrollo
AS $$
DECLARE
    v_count INT;
    v_window TIMESTAMPTZ;
BEGIN
    SELECT count, window_start INTO v_count, v_window
    FROM rate_limit_counters
    WHERE key = p_key
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO rate_limit_counters (key, count, window_start)
        VALUES (p_key, 1, now());
        RETURN true;
    END IF;

    -- Reset window if older than 1 hour
    IF v_window < now() - INTERVAL '1 hour' THEN
        UPDATE rate_limit_counters
        SET count = 1, window_start = now()
        WHERE key = p_key;
        RETURN true;
    END IF;

    -- Check limit
    IF v_count >= p_limit THEN
        RETURN false;
    END IF;

    -- Increment
    UPDATE rate_limit_counters
    SET count = count + 1
    WHERE key = p_key;

    RETURN true;
END;
$$;

-- --------------------------------------------------------
-- 5. Updated_at trigger
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_api_keys_updated_at ON api_keys;
CREATE TRIGGER trg_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_api_keys_updated_at();

COMMIT;
