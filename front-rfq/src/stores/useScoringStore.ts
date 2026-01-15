import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { API_CONFIG } from '../config/constants';
import { supabase } from '../lib/supabase';
import { useToastStore } from './useToastStore';
import type { ScoringWeights } from '../types/database.types';

// Default weights for scoring criteria
// Based on H2 Plant La Zaida project requirements analysis:
// - TECHNICAL: 35% (92 technical requirements)
// - ECONOMIC: 35% (94 economic requirements - CAPEX/OPEX critical)
// - HSE/ESG: 18% (44 safety requirements - ATEX critical for H2)
// - EXECUTION: 12% (23 project management requirements)
export const DEFAULT_WEIGHTS: ScoringWeights = {
    // TECHNICAL (35%)
    efficiency_bop: 12,        // Electrolyzer efficiency is key for H2
    degradation_lifetime: 8,   // Stack lifetime important
    flexibility: 8,            // Intermittent operation capability
    purity_pressure: 7,        // H2 purity 99.9%, pressure 7-40 barg
    // ECONOMIC (35%)
    capex: 18,                 // High initial investment in H2 plants
    opex: 12,                  // Operational costs (electricity)
    warranties: 5,             // Guarantees and penalties
    // HSE/ESG (18%)
    safety_atex: 12,           // ATEX critical for H2 handling
    sustainability: 6,         // ESG important but less than safety
    // EXECUTION (12%)
    delivery_time: 6,          // FEED deadline 21/02/2025
    track_record: 3,           // Previous experience
    provider_strength: 3,      // Financial strength
};

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

    // Custom weights state
    customWeights: ScoringWeights;
    savedWeightsId: string | null;
    isSavingWeights: boolean;

    // Acciones
    calculateScoring: (projectId?: string, providerName?: string) => Promise<void>;
    refreshScoring: () => Promise<void>;
    clearError: () => void;
    reset: () => void;

    // Weight actions
    setCustomWeights: (weights: ScoringWeights) => void;
    resetWeights: () => void;
    saveWeights: () => Promise<void>;
    loadSavedWeights: () => Promise<void>;
    saveScoresWithWeights: () => Promise<void>;
}

export const useScoringStore = create<ScoringState>()(
    devtools(
        subscribeWithSelector(
            persist(
                (set, get) => ({
                    isCalculating: false,
                    lastCalculation: null,
                    scoringResults: null,
                    error: null,
                    customWeights: { ...DEFAULT_WEIGHTS },
                    savedWeightsId: null,
                    isSavingWeights: false,

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

                    // Check if response has content before parsing
                    const responseText = await response.text();
                    if (!responseText || responseText.trim() === '') {
                        throw new Error('No data available to calculate scores. Please ensure there are provider evaluations in the database.');
                    }

                    let data: ScoringResult;
                    try {
                        data = JSON.parse(responseText);
                    } catch (parseErr) {
                        console.error('[Scoring] Invalid JSON response:', responseText.substring(0, 200));
                        throw new Error('Invalid response from scoring service. The workflow may have encountered an error.');
                    }

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
                        .order('provider_name', { ascending: true });

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
                error: null,
                customWeights: { ...DEFAULT_WEIGHTS },
                savedWeightsId: null
            }),

            // Weight actions
            setCustomWeights: (weights: ScoringWeights) => {
                set({ customWeights: weights });
            },

            resetWeights: () => {
                set({ customWeights: { ...DEFAULT_WEIGHTS } });
            },

            saveWeights: async () => {
                const { addToast } = useToastStore.getState();
                const { customWeights } = get();

                if (!supabase) {
                    addToast('Supabase not configured', 'error');
                    return;
                }

                set({ isSavingWeights: true });

                try {
                    // Use type assertion for the new table (not yet in generated types)
                    const client = supabase as any;

                    // Check if config already exists
                    const { data: existing } = await client
                        .from('scoring_weight_configs')
                        .select('id')
                        .eq('is_active', true)
                        .single();

                    if (existing) {
                        // Update existing config
                        const { error } = await client
                            .from('scoring_weight_configs')
                            .update({
                                weights: customWeights,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', existing.id);

                        if (error) throw error;
                        set({ savedWeightsId: existing.id });
                    } else {
                        // Insert new config
                        const { data, error } = await client
                            .from('scoring_weight_configs')
                            .insert({
                                weights: customWeights,
                                is_active: true
                            })
                            .select('id')
                            .single();

                        if (error) throw error;
                        set({ savedWeightsId: data?.id || null });
                    }

                    addToast('Weight configuration saved', 'success');
                } catch (err: any) {
                    console.error('[Scoring] Error saving weights:', err);
                    addToast(`Failed to save weights: ${err.message}`, 'error');
                } finally {
                    set({ isSavingWeights: false });
                }
            },

            loadSavedWeights: async () => {
                if (!supabase) return;

                try {
                    // Use type assertion for the new table (not yet in generated types)
                    const client = supabase as any;

                    const { data, error } = await client
                        .from('scoring_weight_configs')
                        .select('*')
                        .eq('is_active', true)
                        .single();

                    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                        throw error;
                    }

                    if (data) {
                        set({
                            customWeights: data.weights as ScoringWeights,
                            savedWeightsId: data.id
                        });
                        console.log('[Scoring] Loaded saved weights:', data.weights);
                    }
                } catch (err: any) {
                    console.error('[Scoring] Error loading saved weights:', err);
                }
            },

            saveScoresWithWeights: async () => {
                const { addToast } = useToastStore.getState();
                const { scoringResults, customWeights } = get();

                if (!supabase) {
                    addToast('Supabase not configured', 'error');
                    return;
                }

                if (!scoringResults?.ranking) {
                    addToast('No scoring data to save', 'error');
                    return;
                }

                set({ isSavingWeights: true });

                try {
                    // First save the weights config
                    await get().saveWeights();

                    // Calculate new scores with custom weights
                    const updatedRankings = scoringResults.ranking.map(provider => {
                        const scores = provider.individual_scores;

                        // Calculate new overall score
                        const newOverall = Object.entries(customWeights).reduce((total, [key, weight]) => {
                            const score = scores[key as keyof typeof scores] || 0;
                            return total + (score * weight / 100);
                        }, 0);

                        // Calculate category scores
                        const technicalWeight = customWeights.efficiency_bop + customWeights.degradation_lifetime +
                                               customWeights.flexibility + customWeights.purity_pressure;
                        const economicWeight = customWeights.capex + customWeights.opex + customWeights.warranties;
                        const executionWeight = customWeights.delivery_time + customWeights.track_record +
                                               customWeights.provider_strength;
                        const hseWeight = customWeights.safety_atex + customWeights.sustainability;

                        const technicalScore = technicalWeight > 0 ? (
                            (scores.efficiency_bop * customWeights.efficiency_bop) +
                            (scores.degradation_lifetime * customWeights.degradation_lifetime) +
                            (scores.flexibility * customWeights.flexibility) +
                            (scores.purity_pressure * customWeights.purity_pressure)
                        ) / technicalWeight : 0;

                        const economicScore = economicWeight > 0 ? (
                            (scores.capex * customWeights.capex) +
                            (scores.opex * customWeights.opex) +
                            (scores.warranties * customWeights.warranties)
                        ) / economicWeight : 0;

                        const executionScore = executionWeight > 0 ? (
                            (scores.delivery_time * customWeights.delivery_time) +
                            (scores.track_record * customWeights.track_record) +
                            (scores.provider_strength * customWeights.provider_strength)
                        ) / executionWeight : 0;

                        const hseScore = hseWeight > 0 ? (
                            (scores.safety_atex * customWeights.safety_atex) +
                            (scores.sustainability * customWeights.sustainability)
                        ) / hseWeight : 0;

                        return {
                            provider_name: provider.provider_name,
                            overall_score: parseFloat(newOverall.toFixed(2)),
                            technical_score: parseFloat(technicalScore.toFixed(2)),
                            economic_score: parseFloat(economicScore.toFixed(2)),
                            execution_score: parseFloat(executionScore.toFixed(2)),
                            hse_esg_score: parseFloat(hseScore.toFixed(2))
                        };
                    });

                    // Update each provider's scores in the database
                    // Use type assertion since ranking_proveedores has more columns than in types
                    const client = supabase as any;
                    for (const ranking of updatedRankings) {
                        const { error } = await client
                            .from('ranking_proveedores')
                            .update({
                                overall_score: ranking.overall_score,
                                technical_score: ranking.technical_score,
                                economic_score: ranking.economic_score,
                                execution_score: ranking.execution_score,
                                hse_esg_score: ranking.hse_esg_score,
                                last_updated: new Date().toISOString()
                            })
                            .eq('provider_name', ranking.provider_name);

                        if (error) {
                            console.error('[Scoring] Error updating provider:', ranking.provider_name, error);
                        }
                    }

                    addToast(`Saved scores for ${updatedRankings.length} providers`, 'success');

                    // Refresh to get the updated data
                    await get().refreshScoring();

                } catch (err: any) {
                    console.error('[Scoring] Error saving scores:', err);
                    addToast(`Failed to save scores: ${err.message}`, 'error');
                } finally {
                    set({ isSavingWeights: false });
                }
            }
                }),
                {
                    name: 'scoring-storage',
                    partialize: (state) => ({
                        scoringResults: state.scoringResults,
                        lastCalculation: state.lastCalculation,
                        customWeights: state.customWeights,
                        savedWeightsId: state.savedWeightsId
                    })
                }
            )
        ),
        { name: 'ScoringStore' }
    )
);
