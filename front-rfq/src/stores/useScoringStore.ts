import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { API_CONFIG } from '../config/constants';
import { supabase } from '../lib/supabase';
import { useToastStore } from './useToastStore';
import { useProjectStore } from './useProjectStore';
import type { ScoringWeights } from '../types/database.types';

// Default weights for scoring criteria (legacy 12-criteria configuration)
export const DEFAULT_WEIGHTS: ScoringWeights = {
    scope_facilities: 10,
    scope_work: 10,
    deliverables_quality: 10,
    total_price: 15,
    price_breakdown: 8,
    optionals_included: 7,
    capex_opex_methodology: 5,
    schedule: 8,
    resources_allocation: 6,
    exceptions: 6,
    safety_studies: 8,
    regulatory_compliance: 7,
};

/**
 * Tipos para el scoring - fully dynamic
 */
export interface ProviderScore {
    provider_name: string;
    position: number;
    overall_score: number;
    compliance_percentage: number;
    // Aggregated category scores (dynamic keys)
    scores: Record<string, number>;
    // Individual criterion scores (dynamic keys)
    individual_scores: Record<string, number>;
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
    setCustomWeights: (weights: Record<string, number>) => void;
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
                    set({ isCalculating: false });
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

                    // If no data found for this project, show empty state (no fallback to other projects)
                    if (!data || data.length === 0) {
                        console.log('[Scoring] No scoring data found for project:', activeProjectId);
                        set({
                            scoringResults: null,
                            isCalculating: false
                        });
                        return;
                    }

                    // Helper to normalize scores to 0-10 scale
                    const normalizeScore = (score: number | null | undefined): number => {
                        const s = score || 0;
                        return s > 10 ? s / 10 : s;
                    };

                    // Helper to safely parse JSONB fields that might be stored as strings
                    const parseJsonField = (val: any): Record<string, any> => {
                        if (!val) return {};
                        if (typeof val === 'string') {
                            try { return JSON.parse(val); } catch { return {}; }
                        }
                        if (typeof val === 'object') return val;
                        return {};
                    };

                    // Check if dynamic JSONB data is available (handle both string and object)
                    const hasDynamicData = data.some((row: any) => {
                        const parsed = parseJsonField(row.individual_scores_json);
                        return Object.keys(parsed).length > 0;
                    });

                    // Transform data to expected format
                    const ranking: ProviderScore[] = (data || []).map((row: any, index: number) => {
                        // Build individual_scores: prefer JSONB dynamic data, fallback to legacy columns
                        let individualScores: Record<string, number>;
                        let categoryScores: Record<string, number>;

                        const individualJson = parseJsonField(row.individual_scores_json);
                        const categoryJson = parseJsonField(row.category_scores_json);
                        const evalDetails = parseJsonField(row.evaluation_details);

                        if (hasDynamicData && Object.keys(individualJson).length > 0) {
                            // Dynamic mode: read from JSONB columns
                            individualScores = {};
                            for (const [key, val] of Object.entries(individualJson)) {
                                individualScores[key] = normalizeScore(val as number);
                            }
                            categoryScores = {};
                            if (Object.keys(categoryJson).length > 0) {
                                for (const [key, val] of Object.entries(categoryJson)) {
                                    categoryScores[key.toLowerCase()] = normalizeScore(val as number);
                                }
                            }
                        } else {
                            // Legacy mode: read from fixed columns
                            individualScores = {
                                scope_facilities: normalizeScore(row.scope_facilities_score),
                                scope_work: normalizeScore(row.scope_work_score),
                                deliverables_quality: normalizeScore(row.deliverables_quality_score),
                                total_price: normalizeScore(row.total_price_score),
                                price_breakdown: normalizeScore(row.price_breakdown_score),
                                optionals_included: normalizeScore(row.optionals_included_score),
                                capex_opex_methodology: normalizeScore(row.capex_opex_methodology_score),
                                schedule: normalizeScore(row.schedule_score),
                                resources_allocation: normalizeScore(row.resources_allocation_score),
                                exceptions: normalizeScore(row.exceptions_score),
                                safety_studies: normalizeScore(row.safety_studies_score),
                                regulatory_compliance: normalizeScore(row.regulatory_compliance_score),
                            };
                            categoryScores = {
                                technical: normalizeScore(row.technical_score),
                                economic: normalizeScore(row.economic_score),
                                execution: normalizeScore(row.execution_score),
                                hse_compliance: normalizeScore(row.hse_compliance_score),
                            };
                        }

                        return {
                            provider_name: row.provider_name,
                            position: index + 1,
                            overall_score: normalizeScore(row.overall_score),
                            compliance_percentage: row.compliance_percentage || 0,
                            scores: categoryScores,
                            individual_scores: individualScores,
                            strengths: evalDetails.strengths || [],
                            weaknesses: evalDetails.weaknesses || [],
                        };
                    });

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
            setCustomWeights: (weights: Record<string, number>) => {
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
                        // Merge saved weights with defaults
                        const mergedWeights: ScoringWeights = { ...DEFAULT_WEIGHTS };
                        const savedWeights = data.weights as Record<string, number>;

                        // Accept all keys from saved weights (dynamic)
                        for (const [key, val] of Object.entries(savedWeights)) {
                            if (typeof val === 'number') {
                                mergedWeights[key] = val;
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

                    // Dynamically import scoring config to get category→criteria mapping
                    const { useScoringConfigStore } = await import('./useScoringConfigStore');
                    const { categories: dynamicCategories, hasConfiguration } = useScoringConfigStore.getState();

                    // Calculate new scores with custom weights (fully dynamic)
                    const updatedRankings = scoringResults.ranking.map(provider => {
                        const scores = provider.individual_scores;

                        // Calculate new overall score
                        const newOverall = Object.entries(customWeights).reduce((total, [key, weight]) => {
                            const score = scores[key] || 0;
                            return total + (score * weight / 100);
                        }, 0);

                        // Calculate category scores dynamically
                        const categoryScores: Record<string, number> = {};
                        const safeCategories = Array.isArray(dynamicCategories) ? dynamicCategories : [];

                        if (hasConfiguration && safeCategories.length > 0) {
                            // Dynamic: use categories from config store
                            for (const cat of safeCategories) {
                                if (!cat || !cat.name) continue;
                                const catCriteria = Array.isArray(cat.criteria) ? cat.criteria : [];
                                const catWeight = catCriteria.reduce((sum: number, crit: any) => {
                                    const actualWeight = ((crit.weight || 0) * (cat.weight || 0)) / 100;
                                    return sum + actualWeight;
                                }, 0);
                                const weightedSum = catCriteria.reduce((sum: number, crit: any) => {
                                    const critName = typeof crit.name === 'string' ? crit.name : String(crit.name || '');
                                    const actualWeight = ((crit.weight || 0) * (cat.weight || 0)) / 100;
                                    return sum + ((scores[critName] || 0) * actualWeight);
                                }, 0);
                                categoryScores[cat.name] = catWeight > 0 ? parseFloat((weightedSum / catWeight).toFixed(2)) : 0;
                            }
                        } else {
                            // Legacy: hardcoded 4 categories
                            const technicalWeight = (customWeights.scope_facilities || 0) + (customWeights.scope_work || 0) + (customWeights.deliverables_quality || 0);
                            const economicWeight = (customWeights.total_price || 0) + (customWeights.price_breakdown || 0) + (customWeights.optionals_included || 0) + (customWeights.capex_opex_methodology || 0);
                            const executionWeight = (customWeights.schedule || 0) + (customWeights.resources_allocation || 0) + (customWeights.exceptions || 0);
                            const hseWeight = (customWeights.safety_studies || 0) + (customWeights.regulatory_compliance || 0);

                            categoryScores.technical = technicalWeight > 0 ? parseFloat(((((scores.scope_facilities || 0) * (customWeights.scope_facilities || 0)) + ((scores.scope_work || 0) * (customWeights.scope_work || 0)) + ((scores.deliverables_quality || 0) * (customWeights.deliverables_quality || 0))) / technicalWeight).toFixed(2)) : 0;
                            categoryScores.economic = economicWeight > 0 ? parseFloat(((((scores.total_price || 0) * (customWeights.total_price || 0)) + ((scores.price_breakdown || 0) * (customWeights.price_breakdown || 0)) + ((scores.optionals_included || 0) * (customWeights.optionals_included || 0)) + ((scores.capex_opex_methodology || 0) * (customWeights.capex_opex_methodology || 0))) / economicWeight).toFixed(2)) : 0;
                            categoryScores.execution = executionWeight > 0 ? parseFloat(((((scores.schedule || 0) * (customWeights.schedule || 0)) + ((scores.resources_allocation || 0) * (customWeights.resources_allocation || 0)) + ((scores.exceptions || 0) * (customWeights.exceptions || 0))) / executionWeight).toFixed(2)) : 0;
                            categoryScores.hse_compliance = hseWeight > 0 ? parseFloat(((((scores.safety_studies || 0) * (customWeights.safety_studies || 0)) + ((scores.regulatory_compliance || 0) * (customWeights.regulatory_compliance || 0))) / hseWeight).toFixed(2)) : 0;
                        }

                        return {
                            provider_name: provider.provider_name,
                            overall_score: parseFloat(newOverall.toFixed(2)),
                            category_scores: categoryScores,
                        };
                    });

                    // Update each provider's scores in the database
                    const client = supabase as any;
                    for (const ranking of updatedRankings) {
                        const updateData: Record<string, unknown> = {
                            overall_score: ranking.overall_score,
                            category_scores_json: ranking.category_scores,
                            last_updated: new Date().toISOString(),
                        };
                        // Also update legacy columns if they exist in the category scores
                        if (ranking.category_scores.technical !== undefined) updateData.technical_score = ranking.category_scores.technical;
                        if (ranking.category_scores.economic !== undefined) updateData.economic_score = ranking.category_scores.economic;
                        if (ranking.category_scores.execution !== undefined) updateData.execution_score = ranking.category_scores.execution;
                        if (ranking.category_scores.hse_compliance !== undefined) updateData.hse_compliance_score = ranking.category_scores.hse_compliance;

                        const { error } = await client
                            .from('ranking_proveedores')
                            .update(updateData)
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
                        // Don't persist scoringResults - it should be loaded fresh per project
                        // Only persist weight configuration which is global
                        customWeights: state.customWeights,
                        savedWeightsId: state.savedWeightsId
                    }),
                    // Merge persisted state with defaults to handle schema migrations
                    merge: (persistedState, currentState) => {
                        const persisted = persistedState as Partial<ScoringState> | undefined;
                        if (!persisted) return currentState;

                        // Merge customWeights with defaults - accept all dynamic keys
                        let mergedWeights: ScoringWeights = { ...DEFAULT_WEIGHTS };
                        if (persisted.customWeights) {
                            const persistedWeights = persisted.customWeights as unknown as Record<string, number>;
                            for (const [key, val] of Object.entries(persistedWeights)) {
                                if (typeof val === 'number') {
                                    mergedWeights[key] = val;
                                }
                            }
                        }

                        return {
                            ...currentState,
                            // Only restore weight-related persisted data, not scoring results
                            customWeights: mergedWeights,
                            savedWeightsId: persisted.savedWeightsId || null
                            // scoringResults and lastCalculation are intentionally NOT restored
                            // They should be loaded fresh per project
                        };
                    }
                }
            )
        ),
        { name: 'ScoringStore' }
    )
);
