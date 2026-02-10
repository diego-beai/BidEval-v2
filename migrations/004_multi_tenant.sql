-- ============================================
-- Migration 004: Multi-Tenant Foundation
-- Adds organizations, user-org membership, and
-- prepares project-level tenant isolation.
-- ============================================
-- NOTE: This migration should be applied AFTER
-- Supabase Auth is enabled on the project.
-- ============================================

-- 1. Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'professional', 'enterprise')),
    max_projects INTEGER DEFAULT 5,
    max_users INTEGER DEFAULT 3,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- 2. Organization members (user <-> org mapping)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL, -- References auth.users(id) when Auth is enabled
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

-- 3. Add organization_id to projects (nullable initially for migration)
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);

-- 4. Add created_by to projects for audit trail
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS created_by UUID;

-- 5. Helper function: get current user's organization
-- Uses Supabase auth.uid() when Auth is enabled.
-- Returns NULL if user has no org (allows graceful degradation).
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
BEGIN
    -- When Supabase Auth is not yet enabled, return NULL
    -- This allows the app to work without auth during development
    BEGIN
        RETURN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
            LIMIT 1
        );
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. Helper function: check if user has role in their org
CREATE OR REPLACE FUNCTION public.user_has_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    BEGIN
        RETURN EXISTS (
            SELECT 1
            FROM public.organization_members
            WHERE user_id = auth.uid()
            AND role = ANY(required_roles)
        );
    EXCEPTION WHEN OTHERS THEN
        RETURN TRUE; -- Permissive when auth not enabled
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7. Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 8. RLS for organizations (users see their own org)
DROP POLICY IF EXISTS "Users see own organization" ON public.organizations;
CREATE POLICY "Users see own organization"
    ON public.organizations FOR SELECT
    USING (
        id = public.get_user_org_id()
        OR public.get_user_org_id() IS NULL -- Allow when auth not enabled
    );

-- 9. RLS for organization_members
DROP POLICY IF EXISTS "Users see own org members" ON public.organization_members;
CREATE POLICY "Users see own org members"
    ON public.organization_members FOR SELECT
    USING (
        organization_id = public.get_user_org_id()
        OR public.get_user_org_id() IS NULL
    );

DROP POLICY IF EXISTS "Admins manage members" ON public.organization_members;
CREATE POLICY "Admins manage members"
    ON public.organization_members FOR ALL
    USING (
        public.user_has_role(ARRAY['owner', 'admin'])
    );

-- 10. Updated trigger for organizations
CREATE TRIGGER set_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_org_members_updated_at
    BEFORE UPDATE ON public.organization_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- MIGRATION NOTES
-- ============================================
-- After enabling Supabase Auth and populating organizations:
--
-- 1. Assign existing projects to a default organization:
--    UPDATE public.projects SET organization_id = '<default-org-id>'
--    WHERE organization_id IS NULL;
--
-- 2. Make organization_id NOT NULL:
--    ALTER TABLE public.projects
--        ALTER COLUMN organization_id SET NOT NULL;
--
-- 3. Replace permissive RLS policies on projects and child tables:
--    See docs/architecture-saas.md Phase 1.2 for full policy definitions
--
-- 4. Add FK constraint for created_by:
--    ALTER TABLE public.projects
--        ADD CONSTRAINT fk_projects_created_by
--        FOREIGN KEY (created_by) REFERENCES auth.users(id);
-- ============================================
