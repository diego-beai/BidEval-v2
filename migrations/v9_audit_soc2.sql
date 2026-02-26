-- ============================================================
-- V9: Audit Log & SOC2/ISO Controls
-- Schema: desarrollo
-- Depends on: v5_auth_foundation.sql (get_user_org_id)
-- ============================================================

SET search_path TO desarrollo;

BEGIN;

-- --------------------------------------------------------
-- 1. Audit log table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    metadata JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_org_created
    ON audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_created
    ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_created
    ON audit_log(action, created_at DESC);

-- RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_read_audit_log ON audit_log;
CREATE POLICY org_read_audit_log ON audit_log
    FOR SELECT
    USING (organization_id = get_user_org_id());

-- --------------------------------------------------------
-- 2. RPC: log_audit (SECURITY DEFINER — writes as service)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION log_audit(
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_metadata TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = desarrollo
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_org_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- Get user email
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    -- Get org id
    SELECT organization_id INTO v_org_id
    FROM organization_members
    WHERE user_id = v_user_id
    LIMIT 1;

    INSERT INTO audit_log (
        organization_id, user_id, user_email,
        action, resource_type, resource_id, metadata
    ) VALUES (
        v_org_id, v_user_id, v_user_email,
        p_action, p_resource_type, p_resource_id,
        CASE WHEN p_metadata IS NOT NULL THEN p_metadata::JSONB ELSE NULL END
    );
EXCEPTION WHEN OTHERS THEN
    -- Silent fail: audit logging must never block user operations
    NULL;
END;
$$;

-- --------------------------------------------------------
-- 3. Automatic triggers for key operations
-- --------------------------------------------------------

-- Projects: create, lock, delete
CREATE OR REPLACE FUNCTION trg_audit_project_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = desarrollo
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (organization_id, user_id, action, resource_type, resource_id)
        VALUES (NEW.organization_id, auth.uid(), 'project.create', 'project', NEW.id::TEXT);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Detect soft delete
        IF OLD.is_active = true AND NEW.is_active = false THEN
            INSERT INTO audit_log (organization_id, user_id, action, resource_type, resource_id)
            VALUES (NEW.organization_id, auth.uid(), 'project.delete', 'project', NEW.id::TEXT);
        END IF;
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW; -- Never block the operation
END;
$$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='desarrollo' AND tablename='projects') THEN
    DROP TRIGGER IF EXISTS trg_audit_projects ON projects;
    CREATE TRIGGER trg_audit_projects AFTER INSERT OR UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION trg_audit_project_changes();
  END IF;
END $$;

-- Ranking: score changes
CREATE OR REPLACE FUNCTION trg_audit_ranking_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = desarrollo
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.overall_score IS DISTINCT FROM NEW.overall_score THEN
        INSERT INTO audit_log (user_id, action, resource_type, resource_id, metadata)
        VALUES (
            auth.uid(),
            'scoring.update',
            'ranking',
            NEW.project_id::TEXT,
            jsonb_build_object(
                'provider', NEW.provider_name,
                'old_score', OLD.overall_score,
                'new_score', NEW.overall_score
            )
        );
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='desarrollo' AND tablename='ranking_proveedores') THEN
    DROP TRIGGER IF EXISTS trg_audit_ranking ON ranking_proveedores;
    CREATE TRIGGER trg_audit_ranking AFTER UPDATE ON ranking_proveedores FOR EACH ROW EXECUTE FUNCTION trg_audit_ranking_changes();
  END IF;
END $$;

-- --------------------------------------------------------
-- 4. Cleanup RPC: remove expired data
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = desarrollo
AS $$
DECLARE
    v_tokens_deleted INT;
    v_rate_deleted INT;
    v_audit_deleted INT;
BEGIN
    -- Expired upload/response tokens (> 30 days)
    v_tokens_deleted := 0;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='desarrollo' AND tablename='supplier_upload_tokens') THEN
      DELETE FROM supplier_upload_tokens WHERE expires_at < now() - INTERVAL '30 days';
      GET DIAGNOSTICS v_tokens_deleted = ROW_COUNT;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='desarrollo' AND tablename='qa_response_tokens') THEN
      DELETE FROM qa_response_tokens WHERE expires_at < now() - INTERVAL '30 days';
      v_tokens_deleted := v_tokens_deleted + ROW_COUNT;
    END IF;

    -- Stale rate limit counters (> 1 day)
    DELETE FROM rate_limit_counters WHERE window_start < now() - INTERVAL '1 day';
    GET DIAGNOSTICS v_rate_deleted = ROW_COUNT;

    -- Old audit logs (> 365 days)
    DELETE FROM audit_log WHERE created_at < now() - INTERVAL '365 days';
    GET DIAGNOSTICS v_audit_deleted = ROW_COUNT;

    RETURN jsonb_build_object(
        'tokens_deleted', v_tokens_deleted,
        'rate_counters_deleted', v_rate_deleted,
        'audit_logs_deleted', v_audit_deleted,
        'cleaned_at', now()
    );
END;
$$;

-- --------------------------------------------------------
-- 5. Add pending_deletion columns to organizations
-- --------------------------------------------------------
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pending_deletion BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ;

COMMIT;
