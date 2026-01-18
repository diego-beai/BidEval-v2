import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { API_CONFIG } from '../config/constants';
import { supabase } from '../lib/supabase';
import { useToastStore } from './useToastStore';
import { useProjectStore } from './useProjectStore';
import type { ScoringWeights } from '../types/database.types';

// Default weights for scoring criteria
// Based on RFQ requirements for engineering proposals evaluation
// Categories:
// - TECHNICAL COMPLETENESS: 30%
// - ECONOMIC COMPETITIVENESS: 35%
// - EXECUTION CAPABILITY: 20%
// - HSE & COMPLIANCE: 15%
export const DEFAULT_WEIGHTS: ScoringWeights = {
    // TECHNICAL COMPLETENESS (30%)
    scope_facilities: 10,       // Scope of facilities included (H2 plant, BOP, utilities)
    scope_work: 10,             // Scope of work covered (PM, studies, deliverables)
    deliverables_quality: 10,   // Quality of deliverables (P&IDs, specs, 3D model)

    // ECONOMIC COMPETITIVENESS (35%)
    total_price: 15,            // Total price (PRE-FEED + FEED + EPC compared)
    price_breakdown: 8,         // Transparent breakdown (hours/discipline, €/hour)
    optionals_included: 7,      // Optionals included in base price
    capex_opex_methodology: 5,  // CAPEX/OPEX methodology (AACEI class)

    // EXECUTION CAPABILITY (20%)
    schedule: 8,                // Realistic schedule
    resources_allocation: 6,    // Resources per discipline (coherent hours)
    exceptions: 6,              // Exceptions and deviations (fewer = better)

    // HSE & COMPLIANCE (15%)
    safety_studies: 8,          // Safety studies (HAZID, HAZOP, QRA, ATEX)
    regulatory_compliance: 7,   // Regulatory compliance (codes, standards)
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
        technical: number;      // Technical Completeness (30%)
        economic: number;       // Economic Competitiveness (35%)
        execution: number;      // Execution Capability (20%)
        hse_compliance: number; // HSE & Compliance (15%)
    };
    // Individual criterion scores (11 criteria)
    individual_scores: {
        // TECHNICAL COMPLETENESS (30%)
        scope_facilities: number;       // 10%
        scope_work: number;             // 10%
        deliverables_quality: number;   // 10%
        // ECONOMIC COMPETITIVENESS (35%)
        total_price: number;            // 15%
        price_breakdown: number;        // 8%
        optionals_included: number;     // 7%
        capex_opex_methodology: number; // 5%
        // EXECUTION CAPABILITY (20%)
        schedule: number;               // 8%
        resources_allocation: number;   // 6%
        exceptions: number;             // 6%
        // HSE & COMPLIANCE (15%)
        safety_studies: number;         // 8%
        regulatory_compliance: number;  // 7%
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

                // Use active project ID from global store if not provided
                const activeProjectId = useProjectStore.getState().activeProjectId;
                const effectiveProjectId = projectId || activeProjectId;

                if (!effectiveProjectId) {
                    addToast('No project selected. Please select a project first.', 'error');
                    return;
                }

                set({ isCalculating: true, error: null });
                addToast('Calculating provider scores with AI...', 'info');

                try {
                    const response = await fetch(API_CONFIG.N8N_SCORING_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            project_id: effectiveProjectId,
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

                // Get active project ID for filtering
                const activeProjectId = useProjectStore.getState().activeProjectId;

                // If no project selected, clear scoring data
                if (!activeProjectId) {
                    set({
                        scoringResults: null,
                        isCalculating: false
                    });
                    console.log('[Scoring] No active project, clearing scoring data');
                    return;
                }

                set({ isCalculating: true, error: null });

                try {
                    // Read directly from ranking_proveedores table filtered by project
                    let { data, error } = await supabase
                        .from('ranking_proveedores')
                        .select('*')
                        .eq('project_id', activeProjectId)
                        .order('provider_name', { ascending: true });

                    if (error) {
                        throw new Error(error.message);
                    }

                    // Fallback: if no data with project_id, try loading data without project filter
                    // This handles legacy data that was saved before project_id was implemented
                    if (!data || data.length === 0) {
                        console.log('[Scoring] No data with project_id, trying fallback to load all providers...');
                        const fallback = await supabase
                            .from('ranking_proveedores')
                            .select('*')
                            .order('provider_name', { ascending: true });

                        if (!fallback.error && fallback.data && fallback.data.length > 0) {
                            data = fallback.data;
                            console.log('[Scoring] Loaded', data.length, 'providers from fallback (no project filter)');
                        }
                    }

                    // Helper to normalize scores to 0-10 scale
                    // If score > 10, assume it's on 0-100 scale and divide by 10
                    const normalizeScore = (score: number | null | undefined): number => {
                        const s = score || 0;
                        return s > 10 ? s / 10 : s;
                    };

                    // Transform data to expected format with all individual scores
                    const ranking: ProviderScore[] = (data || []).map((row: any, index: number) => ({
                        provider_name: row.provider_name,
                        position: index + 1,
                        overall_score: normalizeScore(row.overall_score),
                        compliance_percentage: row.compliance_percentage || 0,
                        scores: {
                            technical: normalizeScore(row.technical_score),
                            economic: normalizeScore(row.economic_score),
                            execution: normalizeScore(row.execution_score),
                            hse_compliance: normalizeScore(row.hse_compliance_score)
                        },
                        individual_scores: {
                            // TECHNICAL COMPLETENESS (30%)
                            scope_facilities: normalizeScore(row.scope_facilities_score),
                            scope_work: normalizeScore(row.scope_work_score),
                            deliverables_quality: normalizeScore(row.deliverables_quality_score),
                            // ECONOMIC COMPETITIVENESS (35%)
                            total_price: normalizeScore(row.total_price_score),
                            price_breakdown: normalizeScore(row.price_breakdown_score),
                            optionals_included: normalizeScore(row.optionals_included_score),
                            capex_opex_methodology: normalizeScore(row.capex_opex_methodology_score),
                            // EXECUTION CAPABILITY (20%)
                            schedule: normalizeScore(row.schedule_score),
                            resources_allocation: normalizeScore(row.resources_allocation_score),
                            exceptions: normalizeScore(row.exceptions_score),
                            // HSE & COMPLIANCE (15%)
                            safety_studies: normalizeScore(row.safety_studies_score),
                            regulatory_compliance: normalizeScore(row.regulatory_compliance_score)
                        }
                    }));

                    // Sort by overall_score descending to get proper ranking
                    const sortedRanking = [...ranking].sort((a, b) => b.overall_score - a.overall_score);
                    const topPerformer = sortedRanking[0]?.provider_name || 'N/A';

                    set({
                        scoringResults: {
                            success: true,
                            ranking,
                            statistics: {
                                total_providers: ranking.length,
                                average_score: ranking.reduce((sum, r) => sum + r.overall_score, 0) / (ranking.length || 1),
                                top_performer: topPerformer,
                                evaluation_date: new Date().toISOString()
                            },
                            message: 'Loaded from database'
                        },
                        lastCalculation: new Date(),
                        isCalculating: false
                    });

                    console.log('[Scoring] Loaded', ranking.length, 'providers for project', activeProjectId);

                } catch (err: any) {
                    console.error('[Scoring] Refresh error:', err);
                    set({
                        error: err.message || 'Error loading scores',
                        isCalculating: false,
                        scoringResults: null
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

                    if (data && data.weights) {
                        // Merge saved weights with defaults to handle schema migrations
                        // Only use saved values for keys that exist in DEFAULT_WEIGHTS
                        const mergedWeights: ScoringWeights = { ...DEFAULT_WEIGHTS };
                        const savedWeights = data.weights as Record<string, number>;

                        for (const key of Object.keys(DEFAULT_WEIGHTS)) {
                            if (key in savedWeights && typeof savedWeights[key] === 'number') {
                                mergedWeights[key as keyof ScoringWeights] = savedWeights[key];
                            }
                        }

                        set({
                            customWeights: mergedWeights,
                            savedWeightsId: data.id
                        });
                        console.log('[Scoring] Loaded saved weights (merged with defaults):', mergedWeights);
                    }
                } catch (err: any) {
                    console.error('[Scoring] Error loading saved weights:', err);
                }
            },

            saveScoresWithWeights: async () => {
                const { addToast } = useToastStore.getState();
                const { scoringResults, customWeights } = get();

                // Get active project ID for filtering
                const activeProjectId = useProjectStore.getState().activeProjectId;

                if (!supabase) {
                    addToast('Supabase not configured', 'error');
                    return;
                }

                if (!scoringResults?.ranking) {
                    addToast('No scoring data to save', 'error');
                    return;
                }

                if (!activeProjectId) {
                    addToast('No project selected', 'error');
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

                        // Calculate category weights from individual criteria
                        const technicalWeight = customWeights.scope_facilities + customWeights.scope_work +
                                               customWeights.deliverables_quality;
                        const economicWeight = customWeights.total_price + customWeights.price_breakdown +
                                               customWeights.optionals_included + customWeights.capex_opex_methodology;
                        const executionWeight = customWeights.schedule + customWeights.resources_allocation +
                                               customWeights.exceptions;
                        const hseWeight = customWeights.safety_studies + customWeights.regulatory_compliance;

                        // Calculate category scores (weighted average within category)
                        const technicalScore = technicalWeight > 0 ? (
                            (scores.scope_facilities * customWeights.scope_facilities) +
                            (scores.scope_work * customWeights.scope_work) +
                            (scores.deliverables_quality * customWeights.deliverables_quality)
                        ) / technicalWeight : 0;

                        const economicScore = economicWeight > 0 ? (
                            (scores.total_price * customWeights.total_price) +
                            (scores.price_breakdown * customWeights.price_breakdown) +
                            (scores.optionals_included * customWeights.optionals_included) +
                            (scores.capex_opex_methodology * customWeights.capex_opex_methodology)
                        ) / economicWeight : 0;

                        const executionScore = executionWeight > 0 ? (
                            (scores.schedule * customWeights.schedule) +
                            (scores.resources_allocation * customWeights.resources_allocation) +
                            (scores.exceptions * customWeights.exceptions)
                        ) / executionWeight : 0;

                        const hseScore = hseWeight > 0 ? (
                            (scores.safety_studies * customWeights.safety_studies) +
                            (scores.regulatory_compliance * customWeights.regulatory_compliance)
                        ) / hseWeight : 0;

                        return {
                            provider_name: provider.provider_name,
                            overall_score: parseFloat(newOverall.toFixed(2)),
                            technical_score: parseFloat(technicalScore.toFixed(2)),
                            economic_score: parseFloat(economicScore.toFixed(2)),
                            execution_score: parseFloat(executionScore.toFixed(2)),
                            hse_compliance_score: parseFloat(hseScore.toFixed(2))
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
                                hse_compliance_score: ranking.hse_compliance_score,
                                last_updated: new Date().toISOString()
                            })
                            .eq('provider_name', ranking.provider_name)
                            .eq('project_id', activeProjectId);

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
                    }),
                    // Merge persisted state with defaults to handle schema migrations
                    merge: (persistedState, currentState) => {
                        const persisted = persistedState as Partial<ScoringState> | undefined;
                        if (!persisted) return currentState;

                        // Merge customWeights with defaults - only use persisted values for valid keys
                        let mergedWeights = { ...DEFAULT_WEIGHTS };
                        if (persisted.customWeights) {
                            for (const key of Object.keys(DEFAULT_WEIGHTS)) {
                                const persistedWeights = persisted.customWeights as unknown as Record<string, number>;
                                if (key in persistedWeights && typeof persistedWeights[key] === 'number') {
                                    mergedWeights[key as keyof ScoringWeights] = persistedWeights[key];
                                }
                            }
                        }

                        return {
                            ...currentState,
                            ...persisted,
                            customWeights: mergedWeights
                        };
                    }
                }
            )
        ),
        { name: 'ScoringStore' }
    )
);
