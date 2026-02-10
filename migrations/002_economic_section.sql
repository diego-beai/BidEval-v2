-- ============================================
-- Migration 002: Economic Section (T8)
-- Dedicated economic analysis tables
-- Supports: price, payment terms, discounts, TCO
-- ============================================

-- 1. Economic offers table - stores raw economic data per provider per project
CREATE TABLE IF NOT EXISTS public.economic_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,

    -- Core pricing
    total_price DECIMAL(15,2),                   -- Total bid price
    currency TEXT DEFAULT 'EUR',                  -- ISO 4217 currency code
    price_breakdown JSONB DEFAULT '{}',           -- Itemized breakdown: {"engineering": 500000, "procurement": 1200000, ...}

    -- Payment terms
    payment_terms TEXT,                           -- Description of payment terms
    payment_schedule JSONB DEFAULT '[]',          -- [{milestone: "30%", event: "Kick-off"}, {milestone: "40%", event: "Delivery"}, ...]

    -- Discounts
    discount_percentage DECIMAL(5,2) DEFAULT 0,  -- Overall discount %
    discount_conditions TEXT,                     -- Conditions for discount

    -- TCO (Total Cost of Ownership)
    tco_value DECIMAL(15,2),                     -- Calculated TCO
    tco_period_years INTEGER,                    -- TCO calculation period
    tco_breakdown JSONB DEFAULT '{}',            -- {"capex": 2000000, "opex_annual": 150000, "maintenance": 50000, ...}

    -- Additional economic data
    validity_days INTEGER DEFAULT 90,            -- Offer validity in days
    price_escalation TEXT,                       -- Price escalation clause
    guarantees TEXT,                             -- Financial guarantees offered
    insurance_included BOOLEAN DEFAULT false,    -- Whether insurance is included
    taxes_included BOOLEAN DEFAULT false,        -- Whether taxes are included in total_price

    -- Optional items / alternatives
    optional_items JSONB DEFAULT '[]',           -- [{description: "Extra module", price: 50000}, ...]
    alternative_offers JSONB DEFAULT '[]',       -- [{description: "Option B", total_price: 1800000, details: "..."}, ...]

    -- AI-extracted metadata
    extraction_confidence DECIMAL(3,2),          -- AI confidence in extraction (0-1)
    raw_notes TEXT,                              -- Notes from extraction

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_economic_offer UNIQUE(project_id, provider_name)
);

-- Indexes for economic_offers
CREATE INDEX IF NOT EXISTS idx_economic_offers_project ON public.economic_offers(project_id);
CREATE INDEX IF NOT EXISTS idx_economic_offers_provider ON public.economic_offers(provider_name);
CREATE INDEX IF NOT EXISTS idx_economic_offers_total_price ON public.economic_offers(project_id, total_price);

-- Trigger for updated_at
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

-- 2. Economic comparison view - summary for side-by-side analysis
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
    -- Normalized price (for comparison: total minus discount)
    ROUND(eo.total_price * (1 - COALESCE(eo.discount_percentage, 0) / 100), 2) AS net_price,
    -- Price rank within project (1 = cheapest)
    RANK() OVER (PARTITION BY eo.project_id ORDER BY eo.total_price ASC) AS price_rank,
    -- Number of optional items included
    jsonb_array_length(COALESCE(eo.optional_items, '[]'::jsonb)) AS optional_items_count,
    -- Number of alternative offers
    jsonb_array_length(COALESCE(eo.alternative_offers, '[]'::jsonb)) AS alternative_offers_count,
    eo.created_at,
    eo.updated_at
FROM public.economic_offers eo
ORDER BY eo.project_id, eo.total_price ASC;

-- 3. RLS for economic_offers
ALTER TABLE public.economic_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on economic_offers" ON public.economic_offers;
CREATE POLICY "Allow all on economic_offers" ON public.economic_offers
    FOR ALL USING (true) WITH CHECK (true);
