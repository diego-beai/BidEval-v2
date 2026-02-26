import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useProjectStore } from './useProjectStore';
import type { ExcelTemplateData } from '../types/setup.types';
import {
    buildExcelComparison,
    exportFilledExcel,
    type ExcelComparisonData,
} from '../utils/excel.utils';

export interface EconomicOffer {
    id: string;
    project_id: string;
    provider_name: string;
    total_price: number | null;
    currency: string;
    price_breakdown: Record<string, number> | null;
    payment_terms: string | null;
    payment_schedule: Array<{ milestone: string; event: string }> | null;
    discount_percentage: number;
    discount_conditions: string | null;
    tco_value: number | null;
    tco_period_years: number | null;
    tco_breakdown: Record<string, number> | null;
    validity_days: number;
    price_escalation: string | null;
    guarantees: string | null;
    insurance_included: boolean;
    taxes_included: boolean;
    optional_items: Array<{ description: string; price: number }> | null;
    alternative_offers: Array<{ description: string; total_price: number; details?: string }> | null;
    extraction_confidence: number | null;
    raw_notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface EconomicComparison {
    provider_name: string;
    total_price: number | null;
    net_price: number;
    discount_percentage: number;
    price_rank: number;
}

interface EconomicState {
    offers: EconomicOffer[];
    comparison: EconomicComparison[];
    isLoading: boolean;
    error: string | null;
    _lastFetchedAt: number | null;

    // Excel-related state
    excelTemplate: ExcelTemplateData | null;
    comparisonData: ExcelComparisonData | null;

    // Actions
    loadOffers: (forceRefresh?: boolean) => Promise<void>;

    // Excel actions
    setExcelTemplate: (data: ExcelTemplateData) => void;
    clearExcelTemplate: () => void;
    buildComparison: () => void;
    exportExcel: (projectName: string, currency: string) => void;
}

export const useEconomicStore = create<EconomicState>((set, get) => ({
    offers: [],
    comparison: [],
    isLoading: false,
    error: null,
    _lastFetchedAt: null,

    // Excel-related state
    excelTemplate: null,
    comparisonData: null,

    loadOffers: async (forceRefresh?: boolean) => {
        const projectId = useProjectStore.getState().activeProjectId;
        if (!projectId) {
            set({ offers: [], comparison: [], error: null });
            return;
        }

        if (!isSupabaseConfigured()) {
            set({ offers: [], comparison: [], error: 'Supabase not configured', isLoading: false });
            return;
        }

        // Cache guard: skip re-fetch if data is fresh (< 2 min) unless forced
        const now = Date.now();
        const state = get();
        if (!forceRefresh && state._lastFetchedAt && (now - state._lastFetchedAt) < 120_000 && state.offers.length > 0) {
            return;
        }

        set({ isLoading: true, error: null });

        try {
            // Fetch economic offers for the active project
            const { data, error } = await supabase!
                .from('economic_offers')
                .select('*')
                .eq('project_id', projectId)
                .order('total_price', { ascending: true, nullsFirst: false });

            if (error) throw error;

            const offers = (data || []) as EconomicOffer[];

            // Build comparison from offers (calculate net_price and rank)
            const withNet = offers
                .filter(o => o.total_price != null)
                .map(o => ({
                    provider_name: o.provider_name,
                    total_price: o.total_price,
                    net_price: (o.total_price || 0) * (1 - (o.discount_percentage || 0) / 100),
                    discount_percentage: o.discount_percentage || 0,
                    price_rank: 0,
                }))
                .sort((a, b) => a.net_price - b.net_price);

            withNet.forEach((item, idx) => {
                item.price_rank = idx + 1;
            });

            set({ offers, comparison: withNet, isLoading: false, _lastFetchedAt: Date.now() });

            // Auto-rebuild Excel comparison if template is loaded
            const { excelTemplate } = get();
            if (excelTemplate) {
                const comparisonData = buildExcelComparison(excelTemplate, offers, []);
                set({ comparisonData });
            }
        } catch (err: any) {
            set({ error: err.message || 'Failed to load economic data', isLoading: false });
        }
    },

    // ============================================
    // EXCEL ACTIONS
    // ============================================

    setExcelTemplate: (data: ExcelTemplateData) => {
        set({ excelTemplate: data });

        // Auto-build comparison if we already have offers
        const { offers } = get();
        if (offers.length > 0) {
            const comparisonData = buildExcelComparison(data, offers, []);
            set({ comparisonData });
        }
    },

    clearExcelTemplate: () => {
        set({ excelTemplate: null, comparisonData: null });
    },

    buildComparison: () => {
        const { excelTemplate, offers } = get();
        if (!excelTemplate) return;

        const comparisonData = buildExcelComparison(excelTemplate, offers, []);
        set({ comparisonData });
    },

    exportExcel: (projectName: string, currency: string) => {
        const { excelTemplate, offers } = get();
        if (!excelTemplate || offers.length === 0) return;

        const blob = exportFilledExcel(excelTemplate, offers, projectName, currency);

        // Trigger browser download
        const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `comparativa_economica_${safeName}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
    },
}));
