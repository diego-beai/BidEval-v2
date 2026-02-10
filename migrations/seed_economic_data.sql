-- ============================================
-- Seed: Economic Offers (5 realistic providers)
-- Inserts test data into desarrollo.economic_offers
-- for the first active project found in the DB.
-- Idempotent: uses ON CONFLICT ... DO UPDATE SET
-- ============================================

DO $$
DECLARE
    v_project_id UUID;
BEGIN
    -- Pick the first available active project
    SELECT id INTO v_project_id
    FROM desarrollo.projects
    WHERE is_active = true
    ORDER BY updated_at DESC
    LIMIT 1;

    IF v_project_id IS NULL THEN
        RAISE NOTICE 'No active project found. Skipping economic seed data.';
        RETURN;
    END IF;

    RAISE NOTICE 'Seeding economic_offers for project %', v_project_id;

    -- -------------------------------------------------------
    -- Provider 1: Siemens Energy
    -- Cheapest overall, high extraction confidence
    -- -------------------------------------------------------
    INSERT INTO desarrollo.economic_offers (
        project_id, provider_name,
        total_price, currency, price_breakdown,
        payment_terms, payment_schedule,
        discount_percentage, discount_conditions,
        tco_value, tco_period_years, tco_breakdown,
        validity_days, price_escalation, guarantees,
        insurance_included, taxes_included,
        optional_items, alternative_offers,
        extraction_confidence, raw_notes
    ) VALUES (
        v_project_id, 'Siemens Energy',
        875000.00, 'EUR',
        '{"engineering": 250000, "procurement": 425000, "installation": 150000, "commissioning": 50000}'::jsonb,
        '30/40/30',
        '[{"milestone": "30%", "event": "Kick-off"}, {"milestone": "40%", "event": "Equipment delivery"}, {"milestone": "30%", "event": "Commissioning"}]'::jsonb,
        8.00, NULL,
        2100000.00, 10,
        '{"capex": 805000, "opex_annual": 95000, "maintenance_annual": 35000}'::jsonb,
        90, NULL,
        '2 year warranty, performance guarantee 98%',
        true, false,
        '[]'::jsonb, '[]'::jsonb,
        0.94, 'Extracted from commercial proposal v3.2 - high confidence on all fields'
    )
    ON CONFLICT (project_id, provider_name) DO UPDATE SET
        total_price            = EXCLUDED.total_price,
        currency               = EXCLUDED.currency,
        price_breakdown        = EXCLUDED.price_breakdown,
        payment_terms          = EXCLUDED.payment_terms,
        payment_schedule       = EXCLUDED.payment_schedule,
        discount_percentage    = EXCLUDED.discount_percentage,
        discount_conditions    = EXCLUDED.discount_conditions,
        tco_value              = EXCLUDED.tco_value,
        tco_period_years       = EXCLUDED.tco_period_years,
        tco_breakdown          = EXCLUDED.tco_breakdown,
        validity_days          = EXCLUDED.validity_days,
        price_escalation       = EXCLUDED.price_escalation,
        guarantees             = EXCLUDED.guarantees,
        insurance_included     = EXCLUDED.insurance_included,
        taxes_included         = EXCLUDED.taxes_included,
        optional_items         = EXCLUDED.optional_items,
        alternative_offers     = EXCLUDED.alternative_offers,
        extraction_confidence  = EXCLUDED.extraction_confidence,
        raw_notes              = EXCLUDED.raw_notes;

    -- -------------------------------------------------------
    -- Provider 2: ABB Solutions
    -- Mid-range price, includes optional items & alternatives
    -- -------------------------------------------------------
    INSERT INTO desarrollo.economic_offers (
        project_id, provider_name,
        total_price, currency, price_breakdown,
        payment_terms, payment_schedule,
        discount_percentage, discount_conditions,
        tco_value, tco_period_years, tco_breakdown,
        validity_days, price_escalation, guarantees,
        insurance_included, taxes_included,
        optional_items, alternative_offers,
        extraction_confidence, raw_notes
    ) VALUES (
        v_project_id, 'ABB Solutions',
        1120000.00, 'EUR',
        '{"engineering": 320000, "equipment": 580000, "services": 220000}'::jsonb,
        'Net 60',
        '[]'::jsonb,
        12.00, NULL,
        2800000.00, 10,
        '{"capex": 985600, "opex_annual": 125000, "maintenance_annual": 55000}'::jsonb,
        120, NULL, NULL,
        true, true,
        '[{"description": "Remote monitoring system", "price": 45000}, {"description": "Extended warranty 5y", "price": 32000}]'::jsonb,
        '[{"description": "Option B - Modular", "total_price": 980000, "details": "Phased delivery over 18 months"}]'::jsonb,
        0.87, 'Extracted from ABB technical-commercial offer. Optional items listed in Annex C.'
    )
    ON CONFLICT (project_id, provider_name) DO UPDATE SET
        total_price            = EXCLUDED.total_price,
        currency               = EXCLUDED.currency,
        price_breakdown        = EXCLUDED.price_breakdown,
        payment_terms          = EXCLUDED.payment_terms,
        payment_schedule       = EXCLUDED.payment_schedule,
        discount_percentage    = EXCLUDED.discount_percentage,
        discount_conditions    = EXCLUDED.discount_conditions,
        tco_value              = EXCLUDED.tco_value,
        tco_period_years       = EXCLUDED.tco_period_years,
        tco_breakdown          = EXCLUDED.tco_breakdown,
        validity_days          = EXCLUDED.validity_days,
        price_escalation       = EXCLUDED.price_escalation,
        guarantees             = EXCLUDED.guarantees,
        insurance_included     = EXCLUDED.insurance_included,
        taxes_included         = EXCLUDED.taxes_included,
        optional_items         = EXCLUDED.optional_items,
        alternative_offers     = EXCLUDED.alternative_offers,
        extraction_confidence  = EXCLUDED.extraction_confidence,
        raw_notes              = EXCLUDED.raw_notes;

    -- -------------------------------------------------------
    -- Provider 3: Schneider Electric
    -- Most expensive, low discount, no TCO data, low confidence
    -- -------------------------------------------------------
    INSERT INTO desarrollo.economic_offers (
        project_id, provider_name,
        total_price, currency, price_breakdown,
        payment_terms, payment_schedule,
        discount_percentage, discount_conditions,
        tco_value, tco_period_years, tco_breakdown,
        validity_days, price_escalation, guarantees,
        insurance_included, taxes_included,
        optional_items, alternative_offers,
        extraction_confidence, raw_notes
    ) VALUES (
        v_project_id, 'Schneider Electric',
        1350000.00, 'EUR',
        '{"design": 280000, "manufacturing": 650000, "logistics": 120000, "installation": 200000, "testing": 100000}'::jsonb,
        '50% advance, 50% delivery',
        '[]'::jsonb,
        3.00, NULL,
        NULL, NULL,
        '{}'::jsonb,
        60, 'CPI-linked annual adjustment',
        '5 year comprehensive warranty',
        false, false,
        '[]'::jsonb, '[]'::jsonb,
        0.72, 'Partial extraction - economic data spread across multiple PDF sections. TCO not provided by supplier.'
    )
    ON CONFLICT (project_id, provider_name) DO UPDATE SET
        total_price            = EXCLUDED.total_price,
        currency               = EXCLUDED.currency,
        price_breakdown        = EXCLUDED.price_breakdown,
        payment_terms          = EXCLUDED.payment_terms,
        payment_schedule       = EXCLUDED.payment_schedule,
        discount_percentage    = EXCLUDED.discount_percentage,
        discount_conditions    = EXCLUDED.discount_conditions,
        tco_value              = EXCLUDED.tco_value,
        tco_period_years       = EXCLUDED.tco_period_years,
        tco_breakdown          = EXCLUDED.tco_breakdown,
        validity_days          = EXCLUDED.validity_days,
        price_escalation       = EXCLUDED.price_escalation,
        guarantees             = EXCLUDED.guarantees,
        insurance_included     = EXCLUDED.insurance_included,
        taxes_included         = EXCLUDED.taxes_included,
        optional_items         = EXCLUDED.optional_items,
        alternative_offers     = EXCLUDED.alternative_offers,
        extraction_confidence  = EXCLUDED.extraction_confidence,
        raw_notes              = EXCLUDED.raw_notes;

    -- -------------------------------------------------------
    -- Provider 4: Eaton Corporation
    -- Budget option, medium confidence, conditional discount
    -- -------------------------------------------------------
    INSERT INTO desarrollo.economic_offers (
        project_id, provider_name,
        total_price, currency, price_breakdown,
        payment_terms, payment_schedule,
        discount_percentage, discount_conditions,
        tco_value, tco_period_years, tco_breakdown,
        validity_days, price_escalation, guarantees,
        insurance_included, taxes_included,
        optional_items, alternative_offers,
        extraction_confidence, raw_notes
    ) VALUES (
        v_project_id, 'Eaton Corporation',
        920000.00, 'EUR',
        '{"equipment": 620000, "installation": 200000, "training": 100000}'::jsonb,
        'Net 90',
        '[]'::jsonb,
        5.00, 'Valid for orders placed before Q2 2025',
        2400000.00, 10,
        '{"capex": 874000, "opex_annual": 110000, "maintenance_annual": 42000}'::jsonb,
        90, NULL, NULL,
        false, false,
        '[{"description": "Spare parts kit", "price": 18000}]'::jsonb,
        '[]'::jsonb,
        0.58, 'Low confidence - pricing table partially scanned from image-based PDF. Manual review recommended.'
    )
    ON CONFLICT (project_id, provider_name) DO UPDATE SET
        total_price            = EXCLUDED.total_price,
        currency               = EXCLUDED.currency,
        price_breakdown        = EXCLUDED.price_breakdown,
        payment_terms          = EXCLUDED.payment_terms,
        payment_schedule       = EXCLUDED.payment_schedule,
        discount_percentage    = EXCLUDED.discount_percentage,
        discount_conditions    = EXCLUDED.discount_conditions,
        tco_value              = EXCLUDED.tco_value,
        tco_period_years       = EXCLUDED.tco_period_years,
        tco_breakdown          = EXCLUDED.tco_breakdown,
        validity_days          = EXCLUDED.validity_days,
        price_escalation       = EXCLUDED.price_escalation,
        guarantees             = EXCLUDED.guarantees,
        insurance_included     = EXCLUDED.insurance_included,
        taxes_included         = EXCLUDED.taxes_included,
        optional_items         = EXCLUDED.optional_items,
        alternative_offers     = EXCLUDED.alternative_offers,
        extraction_confidence  = EXCLUDED.extraction_confidence,
        raw_notes              = EXCLUDED.raw_notes;

    -- -------------------------------------------------------
    -- Provider 5: GE Vernova
    -- Premium offer, full data, highest discount, green alt
    -- -------------------------------------------------------
    INSERT INTO desarrollo.economic_offers (
        project_id, provider_name,
        total_price, currency, price_breakdown,
        payment_terms, payment_schedule,
        discount_percentage, discount_conditions,
        tco_value, tco_period_years, tco_breakdown,
        validity_days, price_escalation, guarantees,
        insurance_included, taxes_included,
        optional_items, alternative_offers,
        extraction_confidence, raw_notes
    ) VALUES (
        v_project_id, 'GE Vernova',
        1180000.00, 'EUR',
        '{"engineering": 350000, "equipment": 520000, "installation": 180000, "commissioning": 80000, "documentation": 50000}'::jsonb,
        '20/30/30/20',
        '[{"milestone": "20%", "event": "Contract signing"}, {"milestone": "30%", "event": "Design approval"}, {"milestone": "30%", "event": "Delivery"}, {"milestone": "20%", "event": "Final acceptance"}]'::jsonb,
        15.00, NULL,
        2300000.00, 10,
        '{"capex": 1003000, "opex_annual": 88000, "maintenance_annual": 40000, "decommissioning": 25000}'::jsonb,
        90, NULL,
        '3 year full warranty + 2 year parts warranty',
        true, true,
        '[]'::jsonb,
        '[{"description": "Green Energy Package", "total_price": 1250000, "details": "Includes carbon offset program"}]'::jsonb,
        0.91, 'Extracted from GE Vernova commercial proposal and TCO annex. High confidence overall.'
    )
    ON CONFLICT (project_id, provider_name) DO UPDATE SET
        total_price            = EXCLUDED.total_price,
        currency               = EXCLUDED.currency,
        price_breakdown        = EXCLUDED.price_breakdown,
        payment_terms          = EXCLUDED.payment_terms,
        payment_schedule       = EXCLUDED.payment_schedule,
        discount_percentage    = EXCLUDED.discount_percentage,
        discount_conditions    = EXCLUDED.discount_conditions,
        tco_value              = EXCLUDED.tco_value,
        tco_period_years       = EXCLUDED.tco_period_years,
        tco_breakdown          = EXCLUDED.tco_breakdown,
        validity_days          = EXCLUDED.validity_days,
        price_escalation       = EXCLUDED.price_escalation,
        guarantees             = EXCLUDED.guarantees,
        insurance_included     = EXCLUDED.insurance_included,
        taxes_included         = EXCLUDED.taxes_included,
        optional_items         = EXCLUDED.optional_items,
        alternative_offers     = EXCLUDED.alternative_offers,
        extraction_confidence  = EXCLUDED.extraction_confidence,
        raw_notes              = EXCLUDED.raw_notes;

    RAISE NOTICE 'Successfully seeded 5 economic offers for project %', v_project_id;

END $$;
