-- ============================================================
-- V6: User Management — Invites, Limits, Member RPCs
-- Schema: desarrollo
-- ============================================================
-- Depends on: v5_auth_foundation.sql
-- Creates: organization_invites table
-- RPCs: accept_invite, check_org_limits, get_org_members
-- ============================================================

SET search_path TO desarrollo;

-- 1. Organization invites table
CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_invites_token ON organization_invites(token);
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON organization_invites(email);

-- 2. RLS for organization_invites
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- Public read by token (for accept flow)
DROP POLICY IF EXISTS invite_select_by_token ON organization_invites;
CREATE POLICY invite_select_by_token ON organization_invites
  FOR SELECT
  USING (true);

-- Admin/owner can insert
DROP POLICY IF EXISTS invite_insert ON organization_invites;
CREATE POLICY invite_insert ON organization_invites
  FOR INSERT
  WITH CHECK (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid()
      AND organization_id = get_user_org_id()
      AND role IN ('owner', 'admin')
    )
  );

-- Admin/owner can update (revoke)
DROP POLICY IF EXISTS invite_update ON organization_invites;
CREATE POLICY invite_update ON organization_invites
  FOR UPDATE
  USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

-- 3. RPC: accept_invite
CREATE OR REPLACE FUNCTION accept_invite(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = desarrollo
AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
  v_user_email TEXT;
  v_limits RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Find the invite
  SELECT * INTO v_invite
  FROM organization_invites
  WHERE token = p_token
  AND status = 'pending'
  AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Verify email matches
  IF lower(v_invite.email) != lower(v_user_email) THEN
    RAISE EXCEPTION 'Email does not match invitation';
  END IF;

  -- Check user limit
  SELECT
    o.max_users,
    (SELECT count(*) FROM organization_members WHERE organization_id = v_invite.organization_id) AS current_users
  INTO v_limits
  FROM organizations o
  WHERE o.id = v_invite.organization_id;

  IF v_limits.current_users >= v_limits.max_users THEN
    RAISE EXCEPTION 'Organization user limit reached';
  END IF;

  -- Check not already member
  IF EXISTS (SELECT 1 FROM organization_members WHERE user_id = v_user_id AND organization_id = v_invite.organization_id) THEN
    -- Already a member, just mark invite as accepted
    UPDATE organization_invites SET status = 'accepted' WHERE id = v_invite.id;
    RETURN;
  END IF;

  -- Create membership
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_invite.organization_id, v_user_id, v_invite.role);

  -- Mark invite as accepted
  UPDATE organization_invites SET status = 'accepted' WHERE id = v_invite.id;
END;
$$;

-- 4. RPC: check_org_limits
CREATE OR REPLACE FUNCTION check_org_limits()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = desarrollo
AS $$
DECLARE
  v_org_id UUID;
  v_org RECORD;
  v_projects_used INT;
  v_users_used INT;
BEGIN
  v_org_id := get_user_org_id();
  IF v_org_id IS NULL THEN
    RETURN json_build_object(
      'plan', 'trial',
      'projects_used', 0, 'projects_max', 5,
      'users_used', 0, 'users_max', 3,
      'projects_available', 5, 'users_available', 3
    );
  END IF;

  SELECT * INTO v_org FROM organizations WHERE id = v_org_id;

  SELECT count(*) INTO v_projects_used
  FROM projects
  WHERE organization_id = v_org_id;

  SELECT count(*) INTO v_users_used
  FROM organization_members
  WHERE organization_id = v_org_id;

  RETURN json_build_object(
    'plan', v_org.plan,
    'projects_used', v_projects_used,
    'projects_max', v_org.max_projects,
    'users_used', v_users_used,
    'users_max', v_org.max_users,
    'projects_available', GREATEST(v_org.max_projects - v_projects_used, 0),
    'users_available', GREATEST(v_org.max_users - v_users_used, 0)
  );
END;
$$;

-- 5. RPC: get_org_members (returns members with email/full_name from auth.users)
CREATE OR REPLACE FUNCTION get_org_members()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = desarrollo
AS $$
DECLARE
  v_org_id UUID;
  v_result JSON;
BEGIN
  v_org_id := get_user_org_id();
  IF v_org_id IS NULL THEN
    RETURN '[]'::JSON;
  END IF;

  SELECT json_agg(row_to_json(t))
  INTO v_result
  FROM (
    SELECT
      om.id,
      om.user_id,
      u.email,
      COALESCE(u.raw_user_meta_data->>'full_name', '') AS full_name,
      om.role,
      om.created_at
    FROM organization_members om
    JOIN auth.users u ON u.id = om.user_id
    WHERE om.organization_id = v_org_id
    ORDER BY om.created_at
  ) t;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;
