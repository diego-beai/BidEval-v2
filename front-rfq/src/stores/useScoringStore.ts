import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { API_CONFIG } from '../config/constants';
import { supabase } from '../lib/supabase';
import { useToastStore } from './useToastStore';

/**
 * Tipos para el scoring
 */
export interface ProviderScore {
    provider_name: string;
    position: number;
    overall_score: number;
    compliance_percentage: number;
    // Aggregated category scores
    scores: {
        technical: number;
        economic: number;
        execution: number;
        hse_esg: number;
    };
    // Individual criterion scores (12 criteria)
    individual_scores: {
        // TECHNICAL (40%)
        efficiency_bop: number;        // 15%
        degradation_lifetime: number;  // 10%
        flexibility: number;           // 10%
        purity_pressure: number;       // 5%
        // ECONOMIC (30%)
        capex: number;                 // 15%
        opex: number;                  // 10%
        warranties: number;            // 5%
        // EXECUTION (20%)
        delivery_time: number;         // 10%
        track_record: number;          // 5%
        provider_strength: number;     // 5%
        // HSE/ESG (10%)
        safety_atex: number;           // 5%
        sustainability: number;        // 5%
    };
    strengths?: string[];
    weaknesses?: string[];
}

export interface ScoringResult {
    success: boolean;
    ranking: ProviderScore[];
    statistics: {
        total_providers: number;
        average_score: number;
        top_performer: string;
        evaluation_date: string;
    };
    message: string;
}

interface ScoringState {
    // Estado
    isCalculating: boolean;
    lastCalculation: Date | null;
    scoringResults: ScoringResult | null;
    error: string | null;

    // Acciones
    calculateScoring: (projectId?: string, providerName?: string) => Promise<void>;
    refreshScoring: () => Promise<void>;
    clearError: () => void;
    reset: () => void;
}

export const useScoringStore = create<ScoringState>()(
    devtools(
        (set, get) => ({
            isCalculating: false,
            lastCalculation: null,
            scoringResults: null,
            error: null,

            calculateScoring: async (projectId?: string, providerName?: string) => {
                const { addToast } = useToastStore.getState();

                set({ isCalculating: true, error: null });
                addToast('Calculating provider scores with AI...', 'info');

                try {
                    const response = await fetch(API_CONFIG.N8N_SCORING_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            project_id: projectId || null,
                            provider_name: providerName || '',
                            recalculate_all: !providerName
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data: ScoringResult = await response.json();

                    if (data.success) {
                        set({
                            scoringResults: data,
                            lastCalculation: new Date(),
                            isCalculating: false
                        });

                        addToast(
                            `Scoring completed! ${data.ranking.length} providers evaluated. Top: ${data.statistics.top_performer}`,
                            'success'
                        );

                        console.log('[Scoring] Results:', data);
                    } else {
                        throw new Error(data.message || 'Scoring calculation failed');
                    }

                } catch (err: any) {
                    console.error('[Scoring] Error:', err);

                    // Intentar obtener datos directamente de Supabase como fallback
                    try {
                        console.log('[Scoring] Attempting fallback to Supabase...');
                        await get().refreshScoring();
                        addToast('Loaded existing scores from database', 'info');
                    } catch (fallbackErr) {
                        set({
                            error: err.message || 'Error calculating scores',
                            isCalculating: false
                        });
                        addToast(`Scoring failed: ${err.message}`, 'error');
                    }
                }
            },

            refreshScoring: async () => {
                if (!supabase) {
                    console.error('[Scoring] Supabase not configured');
                    return;
                }

                set({ isCalculating: true, error: null });

                try {
                    // Read directly from ranking_proveedores table (has all 12 individual scores)
                    const { data, error } = await supabase
                        .from('ranking_proveedores')
                        .select('*')
                        .order('overall_score', { ascending: false, nullsFirst: false });

                    if (error) {
                        throw new Error(error.message);
                    }

                    // Transform data to expected format with all 12 individual scores
                    const ranking: ProviderScore[] = (data || []).map((row: any, index: number) => ({
                        provider_name: row.provider_name,
                        position: index + 1,
                        overall_score: row.overall_score || 0,
                        compliance_percentage: row.compliance_percentage || 0,
                        scores: {
                            technical: row.technical_score || 0,
                            economic: row.economic_score || 0,
                            execution: row.execution_score || 0,
                            hse_esg: row.hse_esg_score || 0
                        },
                        individual_scores: {
                            // TECHNICAL (40%)
                            efficiency_bop: row.efficiency_bop_score || 0,
                            degradation_lifetime: row.degradation_lifetime_score || 0,
                            flexibility: row.flexibility_score || 0,
                            purity_pressure: row.purity_pressure_score || 0,
                            // ECONOMIC (30%)
                            capex: row.capex_score || 0,
                            opex: row.opex_score || 0,
                            warranties: row.warranties_score || 0,
                            // EXECUTION (20%)
                            delivery_time: row.delivery_time_score || 0,
                            track_record: row.track_record_score || 0,
                            provider_strength: row.provider_strength_score || 0,
                            // HSE/ESG (10%)
                            safety_atex: row.safety_atex_score || 0,
                            sustainability: row.sustainability_score || 0
                        }
                    }));

                    set({
                        scoringResults: {
                            success: true,
                            ranking,
                            statistics: {
                                total_providers: ranking.length,
                                average_score: ranking.reduce((sum, r) => sum + r.overall_score, 0) / (ranking.length || 1),
                                top_performer: ranking[0]?.provider_name || 'N/A',
                                evaluation_date: new Date().toISOString()
                            },
                            message: 'Loaded from database'
                        },
                        lastCalculation: new Date(),
                        isCalculating: false
                    });

                    console.log('[Scoring] Loaded from ranking_proveedores:', ranking.length, 'providers');

                } catch (err: any) {
                    console.error('[Scoring] Refresh error:', err);
                    set({
                        error: err.message || 'Error loading scores',
                        isCalculating: false
                    });
                }
            },

            clearError: () => set({ error: null }),

            reset: () => set({
                isCalculating: false,
                lastCalculation: null,
                scoringResults: null,
                error: null
            })
        }),
        { name: 'ScoringStore' }
    )
);
