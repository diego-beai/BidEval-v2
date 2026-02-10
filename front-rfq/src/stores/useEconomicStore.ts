import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useProjectStore } from './useProjectStore';

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
    loadOffers: () => Promise<void>;
}

export const useEconomicStore = create<EconomicState>((set) => ({
    offers: [],
    comparison: [],
    isLoading: false,
    error: null,

    loadOffers: async () => {
        const projectId = useProjectStore.getState().activeProjectId;
        if (!projectId) {
            set({ offers: [], comparison: [], error: null });
            return;
        }

        if (!isSupabaseConfigured()) {
            set({ offers: [], comparison: [], error: 'Supabase not configured', isLoading: false });
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

            set({ offers, comparison: withNet, isLoading: false });
        } catch (err: any) {
            console.error('[EconomicStore] Error loading offers:', err);
            set({ error: err.message || 'Failed to load economic data', isLoading: false });
        }
    },
}));
