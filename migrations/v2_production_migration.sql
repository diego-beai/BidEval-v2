-- ============================================
-- MIGRACIÓN v1 → v2: Schema public (producción)
-- Ejecutar en Supabase SQL Editor
-- SEGURO: usa IF NOT EXISTS / IF EXISTS en todo
-- ============================================

BEGIN;

-- ============================================
-- 1. NUEVAS COLUMNAS EN projects
-- ============================================
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'RFQ',
    ADD COLUMN IF NOT EXISTS disciplines TEXT[] DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
    ADD COLUMN IF NOT EXISTS reference_code TEXT,
    ADD COLUMN IF NOT EXISTS owner_name TEXT,
    ADD COLUMN IF NOT EXISTS date_opening TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS date_submission_deadline TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS date_questions_deadline TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS date_questions_response TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS date_evaluation TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS date_award TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS invited_suppliers TEXT[] DEFAULT '{}';

-- CHECK constraint para project_type (solo si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'projects_project_type_check'
    ) THEN
        ALTER TABLE public.projects
            ADD CONSTRAINT projects_project_type_check
            CHECK (project_type IN ('RFP', 'RFQ', 'RFI'));
    END IF;
END $$;

-- Índice para is_active
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON public.projects(is_active) WHERE is_active = true;

-- ============================================
-- 2. NUEVAS COLUMNAS EN qa_audit
-- ============================================
ALTER TABLE public.qa_audit
    ADD COLUMN IF NOT EXISTS parent_question_id UUID REFERENCES public.qa_audit(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qa_audit_project_status ON public.qa_audit(project_id, status);
CREATE INDEX IF NOT EXISTS idx_qa_audit_parent_question ON public.qa_audit(parent_question_id) WHERE parent_question_id IS NOT NULL;

-- ============================================
-- 3. NUEVOS ÍNDICES EN TABLAS EXISTENTES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_provider_responses_requirement ON public.provider_responses(requirement_id);
CREATE INDEX IF NOT EXISTS idx_provider_responses_provider ON public.provider_responses(provider_name);
CREATE INDEX IF NOT EXISTS idx_document_metadata_project_type ON public.document_metadata(project_id, document_type);

-- ============================================
-- 4. NUEVA TABLA: project_providers
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,
    provider_email TEXT,
    provider_contact TEXT,
    status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'submitted', 'disqualified')),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_project_provider UNIQUE(project_id, provider_name)
);

CREATE INDEX IF NOT EXISTS idx_project_providers_project ON public.project_providers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_providers_status ON public.project_providers(project_id, status);

ALTER TABLE public.project_providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on project_providers" ON public.project_providers;
CREATE POLICY "Allow all on project_providers" ON public.project_providers
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 5. NUEVA TABLA: qa_notifications
-- ============================================
CREATE TABLE IF NOT EXISTS public.qa_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('supplier_responded', 'evaluation_updated', 'questions_sent')),
    title TEXT NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_qa_notifications_project ON public.qa_notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_qa_notifications_unread ON public.qa_notifications(project_id, is_read) WHERE is_read = false;

ALTER TABLE public.qa_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on qa_notifications" ON public.qa_notifications;
CREATE POLICY "Allow all on qa_notifications" ON public.qa_notifications
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 6. NUEVA TABLA: economic_offers
-- ============================================
CREATE TABLE IF NOT EXISTS public.economic_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,
    total_price DECIMAL(15,2),
    currency TEXT DEFAULT 'EUR',
    price_breakdown JSONB DEFAULT '{}',
    payment_terms TEXT,
    payment_schedule JSONB DEFAULT '[]',
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_conditions TEXT,
    tco_value DECIMAL(15,2),
    tco_period_years INTEGER,
    tco_breakdown JSONB DEFAULT '{}',
    validity_days INTEGER DEFAULT 90,
    price_escalation TEXT,
    guarantees TEXT,
    insurance_included BOOLEAN DEFAULT false,
    taxes_included BOOLEAN DEFAULT false,
    optional_items JSONB DEFAULT '[]',
    alternative_offers JSONB DEFAULT '[]',
    extraction_confidence DECIMAL(3,2),
    raw_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_economic_offer UNIQUE(project_id, provider_name)
);

CREATE INDEX IF NOT EXISTS idx_economic_offers_project ON public.economic_offers(project_id);
CREATE INDEX IF NOT EXISTS idx_economic_offers_provider ON public.economic_offers(provider_name);

-- Trigger updated_at para economic_offers
CREATE OR REPLACE FUNCTION update_economic_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_economic_offers_updated ON public.economic_offers;
CREATE TRIGGER trigger_economic_offers_updated
    BEFORE UPDATE ON public.economic_offers
    FOR EACH ROW
    EXECUTE FUNCTION update_economic_offers_updated_at();

-- Vista comparación económica
CREATE OR REPLACE VIEW public.v_economic_comparison AS
SELECT
    eo.project_id,
    eo.provider_name,
    eo.total_price,
    eo.currency,
    eo.discount_percentage,
    eo.tco_value,
    eo.tco_period_years,
    eo.validity_days,
    eo.taxes_included,
    eo.insurance_included,
    eo.payment_terms,
    ROUND(eo.total_price * (1 - COALESCE(eo.discount_percentage, 0) / 100), 2) AS net_price,
    RANK() OVER (PARTITION BY eo.project_id ORDER BY eo.total_price ASC) AS price_rank,
    jsonb_array_length(COALESCE(eo.optional_items, '[]'::jsonb)) AS optional_items_count,
    jsonb_array_length(COALESCE(eo.alternative_offers, '[]'::jsonb)) AS alternative_offers_count,
    eo.created_at,
    eo.updated_at
FROM public.economic_offers eo
ORDER BY eo.project_id, eo.total_price ASC;

ALTER TABLE public.economic_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on economic_offers" ON public.economic_offers;
CREATE POLICY "Allow all on economic_offers" ON public.economic_offers
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 7. NUEVA TABLA: project_communications
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    tone TEXT DEFAULT 'formal',
    status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'failed', 'read')),
    qa_item_ids TEXT[] DEFAULT '{}',
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_comms_project ON public.project_communications(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comms_provider ON public.project_communications(project_id, provider_name);
CREATE INDEX IF NOT EXISTS idx_project_comms_sent_at ON public.project_communications(sent_at DESC);

ALTER TABLE public.project_communications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on project_communications" ON public.project_communications;
CREATE POLICY "Allow all on project_communications" ON public.project_communications
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 8. NUEVA TABLA: supplier_directory
-- ============================================
CREATE TABLE IF NOT EXISTS public.supplier_directory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT,
    email TEXT,
    phone TEXT,
    contact_person TEXT,
    category TEXT DEFAULT 'engineering',
    website TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_directory_name ON public.supplier_directory(name);
CREATE INDEX IF NOT EXISTS idx_supplier_directory_category ON public.supplier_directory(category);

ALTER TABLE public.supplier_directory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on supplier_directory" ON public.supplier_directory;
CREATE POLICY "Allow all on supplier_directory" ON public.supplier_directory
    FOR ALL USING (true) WITH CHECK (true);

-- Vista historial de proveedores
CREATE OR REPLACE VIEW public.v_supplier_history AS
SELECT
    COALESCE(sd.name, pp.provider_name) AS supplier_name,
    sd.display_name,
    sd.email,
    sd.phone,
    sd.contact_person,
    sd.category,
    sd.website,
    sd.notes,
    sd.tags,
    COUNT(DISTINCT pp.project_id) AS project_count,
    ARRAY_AGG(DISTINCT p.display_name) FILTER (WHERE p.display_name IS NOT NULL) AS project_names,
    AVG(rp.overall_score) AS avg_score,
    MAX(rp.overall_score) AS best_score,
    MIN(rp.overall_score) AS worst_score,
    COUNT(DISTINCT rp.id) AS times_scored,
    MAX(pp.invited_at) AS last_participation,
    ARRAY_AGG(DISTINCT pp.status) FILTER (WHERE pp.status IS NOT NULL) AS statuses
FROM public.project_providers pp
LEFT JOIN public.supplier_directory sd ON UPPER(sd.name) = UPPER(pp.provider_name)
LEFT JOIN public.projects p ON p.id = pp.project_id
LEFT JOIN public.ranking_proveedores rp ON UPPER(rp.provider_name) = UPPER(pp.provider_name) AND rp.project_id = pp.project_id
GROUP BY COALESCE(sd.name, pp.provider_name), sd.display_name, sd.email, sd.phone, sd.contact_person, sd.category, sd.website, sd.notes, sd.tags;

-- ============================================
-- 9. NUEVA TABLA: supplier_upload_tokens
-- ============================================
CREATE TABLE IF NOT EXISTS public.supplier_upload_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accessed', 'uploaded', 'expired')),
    files_uploaded INT DEFAULT 0,
    accessed_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_upload_tokens_token ON public.supplier_upload_tokens(token);
CREATE INDEX IF NOT EXISTS idx_supplier_upload_tokens_project ON public.supplier_upload_tokens(project_id);

ALTER TABLE public.supplier_upload_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on supplier_upload_tokens" ON public.supplier_upload_tokens;
CREATE POLICY "Allow all on supplier_upload_tokens" ON public.supplier_upload_tokens
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 10. MULTI-TENANT: organizations + members
-- ============================================
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

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

-- Añadir FK de organizations a projects
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id),
    ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);

-- RLS organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on organizations" ON public.organizations;
CREATE POLICY "Allow all on organizations" ON public.organizations
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on organization_members" ON public.organization_members;
CREATE POLICY "Allow all on organization_members" ON public.organization_members
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 11. FUNCIONES NUEVAS
-- ============================================

-- Función genérica updated_at (para triggers de organizations)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para organizations
DROP TRIGGER IF EXISTS set_organizations_updated_at ON public.organizations;
CREATE TRIGGER set_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_org_members_updated_at ON public.organization_members;
CREATE TRIGGER set_org_members_updated_at
    BEFORE UPDATE ON public.organization_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Soft-delete project
CREATE OR REPLACE FUNCTION soft_delete_project(p_project_id UUID)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.projects
    SET is_active = false, updated_at = NOW()
    WHERE id = p_project_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Project not found');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Update project name
CREATE OR REPLACE FUNCTION update_project_name(p_project_id UUID, p_new_display_name TEXT)
RETURNS JSONB AS $$
DECLARE
    v_new_name TEXT;
BEGIN
    v_new_name := normalize_project_name(p_new_display_name);

    UPDATE public.projects
    SET display_name = p_new_display_name,
        name = v_new_name,
        updated_at = NOW()
    WHERE id = p_project_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Project not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'name', v_new_name, 'display_name', p_new_display_name);
END;
$$ LANGUAGE plpgsql;

-- Helper: get user's organization
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
BEGIN
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

-- ============================================
-- 12. ACTUALIZAR VISTA v_projects_with_stats
-- (incluir nuevas columnas de projects)
-- ============================================
CREATE OR REPLACE VIEW v_projects_with_stats AS
SELECT
    p.id,
    p.name,
    p.display_name,
    p.description,
    p.status,
    p.ai_context,
    p.is_active,
    p.project_type,
    p.disciplines,
    p.date_opening,
    p.date_submission_deadline,
    p.date_evaluation,
    p.date_award,
    p.invited_suppliers,
    p.created_at,
    p.updated_at,
    COUNT(DISTINCT dm.id) as document_count,
    COUNT(DISTINCT rim.id) as requirement_count,
    COUNT(DISTINCT qa.id) as qa_count
FROM public.projects p
LEFT JOIN public.document_metadata dm ON dm.project_id = p.id
LEFT JOIN public.rfq_items_master rim ON rim.project_id = p.id
LEFT JOIN public.qa_audit qa ON qa.project_id = p.id
GROUP BY p.id, p.name, p.display_name, p.description, p.status, p.ai_context,
         p.is_active, p.project_type, p.disciplines,
         p.date_opening, p.date_submission_deadline, p.date_evaluation, p.date_award,
         p.invited_suppliers, p.created_at, p.updated_at;

-- ============================================
-- 13. MARCAR PROYECTOS EXISTENTES COMO ACTIVOS
-- (por si acaso, para que la nueva columna is_active no filtre datos)
-- ============================================
UPDATE public.projects SET is_active = true WHERE is_active IS NULL;

COMMIT;

-- ============================================
-- VERIFICACIÓN (ejecutar después para comprobar)
-- ============================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN (
--     'project_providers', 'qa_notifications', 'economic_offers',
--     'project_communications', 'supplier_directory', 'supplier_upload_tokens',
--     'organizations', 'organization_members'
-- );
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'projects'
-- AND column_name IN ('is_active', 'project_type', 'currency', 'organization_id');
