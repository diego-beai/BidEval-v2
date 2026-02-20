-- ============================================
-- MIGRACIÓN v3: Phase 1 - BidEval-v2 Core Funcional
-- Ejecutar en Supabase SQL Editor
-- Schema: desarrollo (pruebas)
-- SEGURO: usa IF NOT EXISTS / IF EXISTS en todo
-- ============================================

-- Asegurar que el schema desarrollo existe
CREATE SCHEMA IF NOT EXISTS desarrollo;

BEGIN;

-- ============================================
-- 1. NUEVA TABLA: project_milestones
-- Fases/hitos dinámicos del proyecto
-- Reemplaza las 4 fechas fijas por lista editable
-- ============================================
CREATE TABLE IF NOT EXISTS desarrollo.project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    milestone_type TEXT DEFAULT 'custom' CHECK (milestone_type IN ('opening', 'submission', 'questions', 'evaluation', 'award', 'negotiation', 'due_diligence', 'kickoff', 'custom')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON desarrollo.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_order ON desarrollo.project_milestones(project_id, sort_order);

ALTER TABLE desarrollo.project_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on project_milestones" ON desarrollo.project_milestones;
CREATE POLICY "Allow all on project_milestones" ON desarrollo.project_milestones FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 2. NUEVA TABLA: project_document_types
-- Tipos de documento por proyecto con evaluación vinculada
-- ============================================
CREATE TABLE IF NOT EXISTS desarrollo.project_document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    doc_category TEXT NOT NULL DEFAULT 'technical' CHECK (doc_category IN ('technical', 'economic', 'administrative', 'legal', 'hse', 'custom')),
    evaluation_link TEXT DEFAULT 'info' CHECK (evaluation_link IN ('technical', 'economic', 'info')),
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_document_types_project ON desarrollo.project_document_types(project_id);

ALTER TABLE desarrollo.project_document_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on project_document_types" ON desarrollo.project_document_types;
CREATE POLICY "Allow all on project_document_types" ON desarrollo.project_document_types FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 3. NUEVA TABLA: project_economic_fields
-- Campos económicos esperados con jerarquía parent-child
-- ============================================
CREATE TABLE IF NOT EXISTS desarrollo.project_economic_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES desarrollo.project_economic_fields(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    field_type TEXT NOT NULL DEFAULT 'currency' CHECK (field_type IN ('currency', 'percentage', 'number', 'text', 'formula')),
    unit TEXT,
    is_required BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    formula TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_economic_fields_project ON desarrollo.project_economic_fields(project_id);
CREATE INDEX IF NOT EXISTS idx_project_economic_fields_parent ON desarrollo.project_economic_fields(parent_id);

ALTER TABLE desarrollo.project_economic_fields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on project_economic_fields" ON desarrollo.project_economic_fields;
CREATE POLICY "Allow all on project_economic_fields" ON desarrollo.project_economic_fields FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 4. NUEVA TABLA: project_setup_templates
-- Plantillas de configuración reutilizables
-- ============================================
CREATE TABLE IF NOT EXISTS desarrollo.project_setup_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    project_type TEXT DEFAULT 'RFQ' CHECK (project_type IN ('RFP', 'RFQ', 'RFI')),
    template_data JSONB NOT NULL DEFAULT '{}',
    organization_id UUID,
    created_by TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_setup_templates_org ON desarrollo.project_setup_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_setup_templates_type ON desarrollo.project_setup_templates(project_type);

ALTER TABLE desarrollo.project_setup_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on project_setup_templates" ON desarrollo.project_setup_templates;
CREATE POLICY "Allow all on project_setup_templates" ON desarrollo.project_setup_templates FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 5. NUEVA TABLA: scoring_change_log
-- Audit trail de cambios de scoring
-- ============================================
CREATE TABLE IF NOT EXISTS desarrollo.scoring_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,
    changed_by TEXT NOT NULL DEFAULT 'system',
    change_type TEXT NOT NULL DEFAULT 'score_update' CHECK (change_type IN ('score_update', 'weight_change', 'criteria_change', 'recalculation', 'manual_override')),
    field_changed TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scoring_change_log_project ON desarrollo.scoring_change_log(project_id);
CREATE INDEX IF NOT EXISTS idx_scoring_change_log_provider ON desarrollo.scoring_change_log(project_id, provider_name);
CREATE INDEX IF NOT EXISTS idx_scoring_change_log_created ON desarrollo.scoring_change_log(created_at DESC);

ALTER TABLE desarrollo.scoring_change_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on scoring_change_log" ON desarrollo.scoring_change_log;
CREATE POLICY "Allow all on scoring_change_log" ON desarrollo.scoring_change_log FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 6. NUEVA TABLA: scoring_simulations
-- Escenarios what-if con pesos alternativos
-- ============================================
CREATE TABLE IF NOT EXISTS desarrollo.scoring_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    alternative_weights JSONB NOT NULL DEFAULT '{}',
    results JSONB NOT NULL DEFAULT '{}',
    created_by TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scoring_simulations_project ON desarrollo.scoring_simulations(project_id);

ALTER TABLE desarrollo.scoring_simulations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on scoring_simulations" ON desarrollo.scoring_simulations;
CREATE POLICY "Allow all on scoring_simulations" ON desarrollo.scoring_simulations FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 7. NUEVA TABLA: project_awards
-- Adjudicación formal
-- ============================================
CREATE TABLE IF NOT EXISTS desarrollo.project_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
    winner_provider_name TEXT NOT NULL,
    justification TEXT NOT NULL,
    award_status TEXT NOT NULL DEFAULT 'draft' CHECK (award_status IN ('draft', 'pending_approval', 'approved', 'notified', 'contracted', 'cancelled')),
    award_date TIMESTAMPTZ,
    contract_reference TEXT,
    contract_data JSONB DEFAULT '{}',
    award_document_url TEXT,
    contract_document_url TEXT,
    awarded_by TEXT NOT NULL DEFAULT 'system',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_awards_project ON desarrollo.project_awards(project_id);
CREATE INDEX IF NOT EXISTS idx_project_awards_status ON desarrollo.project_awards(award_status);

ALTER TABLE desarrollo.project_awards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on project_awards" ON desarrollo.project_awards;
CREATE POLICY "Allow all on project_awards" ON desarrollo.project_awards FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 8. NUEVA TABLA: technical_reports
-- Informes auditables versionados
-- ============================================
CREATE TABLE IF NOT EXISTS desarrollo.technical_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES desarrollo.projects(id) ON DELETE CASCADE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    report_type TEXT NOT NULL DEFAULT 'evaluation' CHECK (report_type IN ('evaluation', 'comparison', 'executive_summary', 'award_justification')),
    title TEXT NOT NULL,
    report_data JSONB NOT NULL DEFAULT '{}',
    generated_by TEXT NOT NULL DEFAULT 'system',
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_project_report_version UNIQUE(project_id, report_type, version)
);

CREATE INDEX IF NOT EXISTS idx_technical_reports_project ON desarrollo.technical_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_technical_reports_type ON desarrollo.technical_reports(project_id, report_type);

ALTER TABLE desarrollo.technical_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on technical_reports" ON desarrollo.technical_reports;
CREATE POLICY "Allow all on technical_reports" ON desarrollo.technical_reports FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 9. ALTERACIONES: economic_offers
-- Campos nuevos para Excel template y validaciones
-- ============================================
ALTER TABLE desarrollo.economic_offers
    ADD COLUMN IF NOT EXISTS excel_template_data JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT NULL;

-- ============================================
-- 10. ALTERACIONES: projects
-- Campos de bloqueo por adjudicación
-- ============================================
ALTER TABLE desarrollo.projects
    ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS locked_by TEXT;

-- ============================================
-- 11. VISTA: v_supplier_price_history
-- Historial de precios por proveedor cross-project
-- ============================================
CREATE OR REPLACE VIEW desarrollo.v_supplier_price_history AS
SELECT
    eo.provider_name,
    eo.project_id,
    p.display_name AS project_name,
    p.project_type,
    eo.total_price,
    eo.currency,
    eo.discount_percentage,
    eo.tco_value,
    rp.overall_score,
    rp.category_scores_json,
    p.created_at AS project_date,
    eo.created_at AS offer_date
FROM desarrollo.economic_offers eo
JOIN desarrollo.projects p ON p.id = eo.project_id
LEFT JOIN desarrollo.ranking_proveedores rp ON rp.project_id = eo.project_id AND rp.provider_name = eo.provider_name
ORDER BY eo.provider_name, p.created_at DESC;

-- ============================================
-- 12. FUNCIÓN: updated_at trigger automático
-- ============================================
CREATE OR REPLACE FUNCTION desarrollo.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at en tablas nuevas
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'project_milestones',
        'project_document_types',
        'project_economic_fields',
        'project_setup_templates',
        'scoring_simulations',
        'project_awards'
    ] LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS set_updated_at ON desarrollo.%I; CREATE TRIGGER set_updated_at BEFORE UPDATE ON desarrollo.%I FOR EACH ROW EXECUTE FUNCTION desarrollo.trigger_set_updated_at();',
            tbl, tbl
        );
    END LOOP;
END $$;

COMMIT;
