import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useScoringStore, DEFAULT_WEIGHTS } from '../../../stores/useScoringStore';
import { useScoringConfigStore } from '../../../stores/useScoringConfigStore';
import { useProjectStore } from '../../../stores/useProjectStore';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { ScoringSetupWizard, InlineCriteriaEditor } from '../scoring';
import type { ScoringWeights } from '../../../types/database.types';
// ScoringCategory type used implicitly through the store

// Default scoring criteria IDs (fallback when no dynamic configuration)
// Based on RFQ requirements for engineering proposals evaluation
const DEFAULT_SCORING_CRITERIA_IDS = [
    // TECHNICAL COMPLETENESS (30%)
    { id: 'scope_facilities', category: 'technical', weight: 10 },
    { id: 'scope_work', category: 'technical', weight: 10 },
    { id: 'deliverables_quality', category: 'technical', weight: 10 },
    // ECONOMIC COMPETITIVENESS (35%)
    { id: 'total_price', category: 'economic', weight: 15 },
    { id: 'price_breakdown', category: 'economic', weight: 8 },
    { id: 'optionals_included', category: 'economic', weight: 7 },
    { id: 'capex_opex_methodology', category: 'economic', weight: 5 },
    // EXECUTION CAPABILITY (20%)
    { id: 'schedule', category: 'execution', weight: 8 },
    { id: 'resources_allocation', category: 'execution', weight: 6 },
    { id: 'exceptions', category: 'execution', weight: 6 },
    // HSE & COMPLIANCE (15%)
    { id: 'safety_studies', category: 'hse_compliance', weight: 8 },
    { id: 'regulatory_compliance', category: 'hse_compliance', weight: 7 },
];

// Function to get translated criteria (for fallback mode)
const getScoringCriteria = (t: (key: string) => string) => DEFAULT_SCORING_CRITERIA_IDS.map(c => ({
    ...c,
    name: t(`criteria.${c.id}`),
    description: t(`criteria.${c.id}.desc`)
}));

// Function to get translated category name (for fallback mode)
const getCategoryName = (category: string, t: (key: string) => string): string => {
    const categoryMap: Record<string, string> = {
        'technical': t('scoring.category.technical'),
        'economic': t('scoring.category.economic'),
        'execution': t('scoring.category.execution'),
        'hse_compliance': t('scoring.category.hse_compliance'),
        // Legacy uppercase support
        'TECHNICAL': t('scoring.category.technical'),
        'ECONOMIC': t('scoring.category.economic'),
        'EXECUTION': t('scoring.category.execution'),
        'HSE_COMPLIANCE': t('scoring.category.hse_compliance')
    };
    return categoryMap[category] || category;
};

// Default category info (fallback when no dynamic configuration)
const DEFAULT_CATEGORY_INFO: Record<string, { weight: number; color: string }> = {
    'technical': { weight: 30, color: '#12b5b0' },
    'economic': { weight: 35, color: '#f59e0b' },
    'execution': { weight: 20, color: '#3b82f6' },
    'hse_compliance': { weight: 15, color: '#8b5cf6' },
    // Legacy uppercase support
    'TECHNICAL': { weight: 30, color: '#12b5b0' },
    'ECONOMIC': { weight: 35, color: '#f59e0b' },
    'EXECUTION': { weight: 20, color: '#3b82f6' },
    'HSE_COMPLIANCE': { weight: 15, color: '#8b5cf6' },
};

export const ScoringMatrix: React.FC = () => {
    const {
        isCalculating,
        lastCalculation,
        scoringResults,
        calculateScoring,
        refreshScoring,
        customWeights,
        setCustomWeights,
        resetWeights: storeResetWeights,
        saveScoresWithWeights,
        loadSavedWeights,
        isSavingWeights,
        reset: resetScoringStore
    } = useScoringStore();

    // Scoring configuration store (dynamic criteria)
    const {
        categories: dynamicCategories,
        hasConfiguration,
        loadConfiguration,
        initializeDefaultConfig,
        isLoading: isConfigLoading,
        setShowWizard,
        showWizard,
    } = useScoringConfigStore();

    // Get active project
    const { activeProjectId } = useProjectStore();
    const { t } = useLanguageStore();

    // UI State
    const [showConfigEditor, setShowConfigEditor] = useState(false);

    // Load scoring configuration when project changes
    useEffect(() => {
        if (activeProjectId) {
            loadConfiguration(activeProjectId);
        }
    }, [activeProjectId, loadConfiguration]);

    // Build category info from dynamic configuration or fallback to defaults
    const CATEGORY_INFO = useMemo(() => {
        // Ensure dynamicCategories is an array
        const categories = Array.isArray(dynamicCategories) ? dynamicCategories : [];
        if (hasConfiguration && categories.length > 0) {
            return categories.reduce((acc, cat) => {
                if (cat && cat.name) {
                    const catName = typeof cat.name === 'string' ? cat.name : String(cat.name);
                    const catColor = typeof cat.color === 'string' ? cat.color : '#12b5b0';
                    acc[catName] = { weight: Number(cat.weight) || 0, color: catColor };
                }
                return acc;
            }, {} as Record<string, { weight: number; color: string }>);
        }
        return DEFAULT_CATEGORY_INFO;
    }, [hasConfiguration, dynamicCategories]);

    // Build scoring criteria from dynamic configuration or fallback to defaults
    const SCORING_CRITERIA = useMemo(() => {
        // Ensure dynamicCategories is an array
        const categories = Array.isArray(dynamicCategories) ? dynamicCategories : [];
        if (hasConfiguration && categories.length > 0) {
            const criteria: Array<{
                id: string;
                category: string;
                weight: number;
                name: string;
                description: string;
            }> = [];

            categories.forEach((cat) => {
                if (!cat || !cat.name) return;
                const catCriteria = Array.isArray(cat.criteria) ? cat.criteria : [];
                catCriteria.forEach((crit) => {
                    if (!crit || !crit.name) return;
                    // Calculate actual weight contribution (criterion weight * category weight / 100)
                    const actualWeight = ((crit.weight || 0) * (cat.weight || 0)) / 100;
                    // Ensure all values are primitives (not objects)
                    const critName = typeof crit.name === 'string' ? crit.name : String(crit.name || '');
                    const critDisplayName = typeof crit.display_name === 'string' ? crit.display_name : String(crit.display_name || '');
                    const critDesc = typeof crit.description === 'string' ? crit.description : '';
                    criteria.push({
                        id: critName,
                        category: String(cat.name || ''),
                        weight: parseFloat(actualWeight.toFixed(2)),
                        name: critDisplayName || critName,
                        description: critDesc,
                    });
                });
            });

            return criteria;
        }
        return getScoringCriteria(t);
    }, [hasConfiguration, dynamicCategories, t]);

    // Track if user has made changes from the saved/default state
    const [isEditingWeights, setIsEditingWeights] = useState(false);
    const hasLoadedRef = useRef(false);

    // Load scoring and saved weights on mount (only once)
    useEffect(() => {
        if (!hasLoadedRef.current) {
            hasLoadedRef.current = true;
            refreshScoring();
            loadSavedWeights();
        }
    }, [refreshScoring, loadSavedWeights]);

    // Reload scoring when active project changes
    useEffect(() => {
        console.log('[ScoringMatrix] Active project changed:', activeProjectId);
        // Reset scoring data immediately when project changes to avoid showing stale data
        if (activeProjectId) {
            refreshScoring();
        } else {
            // Clear scoring data if no project selected
            resetScoringStore();
        }
    }, [activeProjectId, refreshScoring, resetScoringStore]);

    // Check if weights differ from defaults
    const hasCustomWeights = useMemo(() => {
        return Object.keys(DEFAULT_WEIGHTS).some(
            key => customWeights[key as keyof ScoringWeights] !== DEFAULT_WEIGHTS[key as keyof ScoringWeights]
        );
    }, [customWeights]);

    // Calculate total weight
    const totalWeight = useMemo(() => {
        return Object.values(customWeights).reduce((sum, w) => sum + w, 0);
    }, [customWeights]);

    // Check if weights are valid (sum to 100)
    const weightsValid = totalWeight === 100;

    // Calculate category weights based on custom weights or dynamic configuration
    const customCategoryWeights = useMemo(() => {
        // Ensure dynamicCategories is an array
        const categories = Array.isArray(dynamicCategories) ? dynamicCategories : [];
        if (hasConfiguration && categories.length > 0) {
            // Use dynamic category weights
            return categories.reduce((acc, cat) => {
                if (cat && cat.name) {
                    acc[cat.name] = cat.weight || 0;
                }
                return acc;
            }, {} as Record<string, number>);
        }
        // Fallback to legacy calculation
        return {
            'technical': (customWeights.scope_facilities || 0) + (customWeights.scope_work || 0) + (customWeights.deliverables_quality || 0),
            'economic': (customWeights.total_price || 0) + (customWeights.price_breakdown || 0) + (customWeights.optionals_included || 0) + (customWeights.capex_opex_methodology || 0),
            'execution': (customWeights.schedule || 0) + (customWeights.resources_allocation || 0) + (customWeights.exceptions || 0),
            'hse_compliance': (customWeights.safety_studies || 0) + (customWeights.regulatory_compliance || 0),
            // Legacy uppercase support
            'TECHNICAL': (customWeights.scope_facilities || 0) + (customWeights.scope_work || 0) + (customWeights.deliverables_quality || 0),
            'ECONOMIC': (customWeights.total_price || 0) + (customWeights.price_breakdown || 0) + (customWeights.optionals_included || 0) + (customWeights.capex_opex_methodology || 0),
            'EXECUTION': (customWeights.schedule || 0) + (customWeights.resources_allocation || 0) + (customWeights.exceptions || 0),
            'HSE_COMPLIANCE': (customWeights.safety_studies || 0) + (customWeights.regulatory_compliance || 0),
        };
    }, [hasConfiguration, dynamicCategories, customWeights]);

    // Track which input is being edited (to allow empty string during typing)
    const [editingInput, setEditingInput] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState<string>('');

    // Handle weight change during typing
    const handleWeightChange = useCallback((criterionId: string, value: string) => {
        // Allow empty string or valid numbers only
        if (value === '' || /^\d+$/.test(value)) {
            setEditingInput(criterionId);
            setEditingValue(value);

            // Update the actual weight (use 0 for empty, parse for numbers)
            const numValue = value === '' ? 0 : parseInt(value, 10);
            const clampedValue = Math.max(0, Math.min(100, numValue));
            setCustomWeights({
                ...customWeights,
                [criterionId]: clampedValue
            } as ScoringWeights);
            if (!isEditingWeights) setIsEditingWeights(true);
        }
    }, [isEditingWeights, customWeights, setCustomWeights]);

    // Handle blur - reset editing state and ensure valid value
    const handleWeightBlur = useCallback(() => {
        setEditingInput(null);
        setEditingValue('');
    }, []);

    // Reset to default weights
    const resetWeights = useCallback(() => {
        storeResetWeights();
        setIsEditingWeights(false);
    }, [storeResetWeights]);

    // Save weights and scores
    const handleSave = useCallback(async () => {
        await saveScoresWithWeights();
        setIsEditingWeights(false);
    }, [saveScoresWithWeights]);

    // Increment/decrement weight by 1
    const adjustWeight = useCallback((criterionId: string, delta: number) => {
        const currentValue = customWeights[criterionId as keyof ScoringWeights] || 0;
        const newValue = Math.max(0, Math.min(100, currentValue + delta));
        setCustomWeights({
            ...customWeights,
            [criterionId]: newValue
        } as ScoringWeights);
        if (!isEditingWeights) setIsEditingWeights(true);
    }, [customWeights, setCustomWeights, isEditingWeights]);

    // Recalculate scores with custom weights
    const recalculatedProviders = useMemo(() => {
        if (!scoringResults?.ranking) return [];

        return scoringResults.ranking.map(provider => {
            // Calculate new overall score using custom weights
            const individualScores = provider.individual_scores;
            const newOverall = Object.entries(customWeights).reduce((total, [key, weight]) => {
                const score = individualScores[key as keyof typeof individualScores] || 0;
                return total + (score * (weight || 0) / 100);
            }, 0);

            // Calculate new category scores
            const newTechnical = (
                (individualScores.scope_facilities * (customWeights.scope_facilities || 0)) +
                (individualScores.scope_work * (customWeights.scope_work || 0)) +
                (individualScores.deliverables_quality * (customWeights.deliverables_quality || 0))
            ) / (customCategoryWeights['TECHNICAL'] || 1);

            const newEconomic = (
                (individualScores.total_price * (customWeights.total_price || 0)) +
                (individualScores.price_breakdown * (customWeights.price_breakdown || 0)) +
                (individualScores.optionals_included * (customWeights.optionals_included || 0)) +
                (individualScores.capex_opex_methodology * (customWeights.capex_opex_methodology || 0))
            ) / (customCategoryWeights['ECONOMIC'] || 1);

            const newExecution = (
                (individualScores.schedule * (customWeights.schedule || 0)) +
                (individualScores.resources_allocation * (customWeights.resources_allocation || 0)) +
                (individualScores.exceptions * (customWeights.exceptions || 0))
            ) / (customCategoryWeights['EXECUTION'] || 1);

            const newHseCompliance = (
                (individualScores.safety_studies * (customWeights.safety_studies || 0)) +
                (individualScores.regulatory_compliance * (customWeights.regulatory_compliance || 0))
            ) / (customCategoryWeights['HSE_COMPLIANCE'] || 1);

            return {
                ...provider,
                overall_score: newOverall,
                scores: {
                    technical: newTechnical,
                    economic: newEconomic,
                    execution: newExecution,
                    hse_compliance: newHseCompliance
                }
            };
        }).sort((a, b) => a.provider_name.localeCompare(b.provider_name))
          .map((p, idx) => ({ ...p, position: idx + 1 }));
    }, [scoringResults, customWeights, customCategoryWeights]);

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'var(--color-primary)';
        if (score >= 5) return 'var(--text-secondary)';
        return 'var(--text-tertiary)';
    };

    const getCriterionScore = (provider: any, criterionId: string): number => {
        if (!provider.individual_scores) return 0;
        return provider.individual_scores[criterionId] || 0;
    };

    // Use recalculated providers (with custom weights applied)
    const providers = recalculatedProviders;

    return (
        <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            boxShadow: 'var(--shadow-sm)'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '28px',
                paddingBottom: '20px',
                borderBottom: '2px solid var(--border-color)'
            }}>
                <div>
                    <h3 style={{
                        margin: '0 0 6px 0',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)'
                    }}>
                        {t('scoring.title')}
                    </h3>
                    <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        fontWeight: 500
                    }}>
                        {t('scoring.subtitle')}
                        {lastCalculation && (
                            <span style={{ marginLeft: '12px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                {t('scoring.last_updated')}: {new Date(lastCalculation).toLocaleString()}
                            </span>
                        )}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Configure Criteria Button - Always show when there's scoring data */}
                    {providers && providers.length > 0 && (
                        <button
                            onClick={() => hasConfiguration ? setShowConfigEditor(true) : setShowWizard(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-surface)',
                                color: 'var(--text-secondary)',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            {t('scoring.configure') || 'Configure'}
                        </button>
                    )}
                    {/* Weight validation indicator */}
                    {(isEditingWeights || hasCustomWeights) && !hasConfiguration && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            background: weightsValid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${weightsValid ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'}`,
                        }}>
                            <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: weightsValid ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'
                            }}>
                                Total: {totalWeight}%
                            </span>
                            {weightsValid ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(16, 185, 129)" strokeWidth="3">
                                    <path d="M20 6L9 17l-5-5"></path>
                                </svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(239, 68, 68)" strokeWidth="3">
                                    <path d="M18 6L6 18M6 6l12 12"></path>
                                </svg>
                            )}
                        </div>
                    )}
                    {/* Reset weights button */}
                    {(isEditingWeights || hasCustomWeights) && (
                        <button
                            onClick={resetWeights}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-surface)',
                                color: 'var(--text-secondary)',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                <path d="M3 3v5h5"></path>
                            </svg>
                            {t('scoring.reset')}
                        </button>
                    )}
                    {/* Save weights button */}
                    {(isEditingWeights || hasCustomWeights) && weightsValid && (
                        <button
                            onClick={handleSave}
                            disabled={isSavingWeights}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: 'none',
                                background: isSavingWeights ? 'var(--bg-surface-alt)' : 'rgb(16, 185, 129)',
                                color: isSavingWeights ? 'var(--text-secondary)' : 'white',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                cursor: isSavingWeights ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isSavingWeights ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)'
                            }}
                        >
                            {isSavingWeights ? (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                                        <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                                    </svg>
                                    {t('scoring.saving')}
                                </>
                            ) : (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                    {t('scoring.save')}
                                </>
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => calculateScoring()}
                        disabled={isCalculating}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            border: 'none',
                            background: isCalculating ? 'var(--bg-surface-alt)' : 'var(--color-primary)',
                            color: isCalculating ? 'var(--text-secondary)' : 'white',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            cursor: isCalculating ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isCalculating ? 'none' : '0 4px 12px var(--color-primary)30'
                        }}
                    >
                        {isCalculating ? (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                                    <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                                </svg>
                                {t('scoring.calculating')}
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M23 4v6h-6M1 20v-6h6"></path>
                                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"></path>
                                </svg>
                                {t('scoring.recalculate')}
                            </>
                        )}
                    </button>
                </div>
            </div>


            {/* Loading Overlay - Only shown during actual API call */}
            {isCalculating && (
                <div style={{
                    padding: '20px',
                    background: 'var(--bg-surface-alt)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid var(--border-color)',
                        borderTopColor: 'var(--color-primary)',
                        animation: 'spin 0.8s linear infinite'
                    }}></div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {t('scoring.loading')}
                    </span>
                </div>
            )}

            {/* Setup Prompt - Only show when no configuration AND no scoring results */}
            {!isConfigLoading && !hasConfiguration && activeProjectId && (!providers || providers.length === 0) && (
                <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-surface-alt)',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    border: '2px dashed var(--border-color)',
                }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.7 }}>
                        <path d="M12 5v14M5 12h14"></path>
                        <circle cx="12" cy="12" r="10" strokeDasharray="4 2"></circle>
                    </svg>
                    <h4 style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {t('scoring.setup.title')}
                    </h4>
                    <p style={{ margin: '0 0 20px 0', fontSize: '0.875rem' }}>
                        {t('scoring.setup.subtitle')}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                        <button
                            onClick={() => activeProjectId && initializeDefaultConfig(activeProjectId)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 20px',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'var(--color-primary)',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px var(--color-primary)30',
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            {t('scoring.setup.use_default')}
                        </button>
                        <button
                            onClick={() => setShowWizard(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 20px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-surface)',
                                color: 'var(--text-secondary)',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            {t('scoring.setup.configure_manually')}
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State - No scoring data */}
            {!isCalculating && (!providers || providers.length === 0) && hasConfiguration && (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: 'var(--text-secondary)'
                }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.5 }}>
                        <path d="M3 3h18v18H3zM9 3v18M3 9h18M3 15h18"></path>
                    </svg>
                    <h4 style={{ margin: '0 0 8px 0', fontWeight: 600 }}>{t('scoring.no_data')}</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                        {t('scoring.no_data_hint')}
                    </p>
                </div>
            )}

            {/* Scoring Table */}
            {!isCalculating && providers && providers.length > 0 && (
                <div className="scoring-grid-container" style={{ overflowX: 'auto' }}>
                    <table className="scoring-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-surface-alt)' }}>
                                <th style={{
                                    width: '35%',
                                    padding: '16px',
                                    textAlign: 'left',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    borderTopLeftRadius: '10px'
                                }}>
                                    {t('scoring.criteria')}
                                </th>
                                <th style={{
                                    width: '8%',
                                    padding: '16px',
                                    textAlign: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {t('scoring.weight')}
                                </th>
                                {providers.map((p, idx) => (
                                    <th key={p.provider_name} style={{
                                        padding: '16px',
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        fontSize: '0.875rem',
                                        color: 'var(--text-secondary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        borderTopRightRadius: idx === providers.length - 1 ? '10px' : 0,
                                    }}>
                                        {p.provider_name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Group criteria by category */}
                            {Object.entries(CATEGORY_INFO).map(([category, info]) => {
                                const categoryCriteria = SCORING_CRITERIA.filter(c => c.category === category);
                                const categoryWeight = customCategoryWeights[category as keyof typeof customCategoryWeights];
                                const defaultCategoryWeight = info.weight;
                                const categoryChanged = categoryWeight !== defaultCategoryWeight;
                                return (
                                    <React.Fragment key={category}>
                                        {/* Category Header */}
                                        <tr style={{ background: `${info.color}10` }}>
                                            <td colSpan={2 + providers.length} style={{
                                                padding: '12px 16px',
                                                fontWeight: 700,
                                                fontSize: '0.875rem',
                                                color: info.color,
                                                borderLeft: `4px solid ${info.color}`
                                            }}>
                                                {getCategoryName(category, t)} ({categoryWeight}%)
                                                {categoryChanged && (
                                                    <span style={{
                                                        marginLeft: '8px',
                                                        fontSize: '0.7rem',
                                                        color: 'var(--text-tertiary)',
                                                        fontWeight: 500
                                                    }}>
                                                        ({t('scoring.default')}: {defaultCategoryWeight}%)
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                        {/* Criteria Rows */}
                                        {categoryCriteria.map((criterion, index) => (
                                            <tr key={criterion.id} style={{
                                                background: index % 2 === 0 ? 'transparent' : 'var(--bg-surface-alt)',
                                                transition: 'all 0.2s'
                                            }}>
                                                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
                                                        {criterion.name}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                        {criterion.description}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                pattern="[0-9]*"
                                                                value={editingInput === criterion.id ? editingValue : (customWeights[criterion.id as keyof ScoringWeights] || 0).toString()}
                                                                onChange={(e) => handleWeightChange(criterion.id, e.target.value)}
                                                                onFocus={() => {
                                                                    setEditingInput(criterion.id);
                                                                    setEditingValue((customWeights[criterion.id as keyof ScoringWeights] || 0).toString());
                                                                }}
                                                                onBlur={() => handleWeightBlur()}
                                                                style={{
                                                                    width: '52px',
                                                                    padding: '6px 8px',
                                                                    paddingRight: '20px',
                                                                    background: (customWeights[criterion.id as keyof ScoringWeights] || 0) !== criterion.weight ? `${info.color}30` : `${info.color}20`,
                                                                    color: info.color,
                                                                    borderRadius: '8px',
                                                                    fontWeight: 700,
                                                                    fontSize: '0.85rem',
                                                                    border: (customWeights[criterion.id as keyof ScoringWeights] || 0) !== criterion.weight ? `2px solid ${info.color}` : '2px solid transparent',
                                                                    textAlign: 'center',
                                                                    outline: 'none',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            />
                                                            <span style={{
                                                                position: 'absolute',
                                                                right: '8px',
                                                                color: info.color,
                                                                fontWeight: 700,
                                                                fontSize: '0.85rem',
                                                                pointerEvents: 'none'
                                                            }}>%</span>
                                                        </div>
                                                        {/* Up/Down arrows */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <button
                                                                onClick={() => adjustWeight(criterion.id, 1)}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    width: '18px',
                                                                    height: '14px',
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    background: 'var(--bg-surface-alt)',
                                                                    color: info.color,
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s',
                                                                    padding: 0
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.background = `${info.color}30`}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-surface-alt)'}
                                                            >
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                                                    <path d="M18 15l-6-6-6 6"/>
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => adjustWeight(criterion.id, -1)}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    width: '18px',
                                                                    height: '14px',
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    background: 'var(--bg-surface-alt)',
                                                                    color: info.color,
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s',
                                                                    padding: 0
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.background = `${info.color}30`}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-surface-alt)'}
                                                            >
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                                                    <path d="M6 9l6 6 6-6"/>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                                {providers.map(p => {
                                                    const score = getCriterionScore(p, criterion.id);
                                                    return (
                                                        <td key={p.provider_name} style={{
                                                            textAlign: 'center',
                                                            padding: '14px 16px',
                                                            borderBottom: '1px solid var(--border-color)'
                                                        }}>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                fontWeight: 600,
                                                                fontSize: '0.9rem',
                                                                color: getScoreColor(score),
                                                                background: score >= 8 ? 'var(--color-primary)10' : 'var(--bg-surface-alt)'
                                                            }}>
                                                                {score.toFixed(1)}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                        {/* Category Subtotal */}
                                        <tr style={{ background: `${info.color}08` }}>
                                            <td style={{ padding: '12px 16px', fontWeight: 600, color: info.color }}>
                                                {getCategoryName(category, t)} {t('scoring.average')}
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                                                <span style={{ fontWeight: 700, color: info.color }}>{categoryWeight}%</span>
                                            </td>
                                            {providers.map(p => {
                                                const categoryScore = category === 'TECHNICAL' ? p.scores?.technical :
                                                    category === 'ECONOMIC' ? p.scores?.economic :
                                                    category === 'EXECUTION' ? p.scores?.execution :
                                                    p.scores?.hse_compliance || 0;
                                                return (
                                                    <td key={p.provider_name} style={{
                                                        textAlign: 'center',
                                                        padding: '12px 16px',
                                                        fontWeight: 700,
                                                        color: info.color
                                                    }}>
                                                        {categoryScore.toFixed(2)}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                            {/* Overall Total Row */}
                            <tr style={{
                                background: 'var(--bg-surface-alt)',
                                fontWeight: 700
                            }}>
                                <td colSpan={2} style={{
                                    textAlign: 'right',
                                    padding: '20px 16px',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                    borderBottomLeftRadius: '10px'
                                }}>
                                    {t('scoring.overall')}:
                                </td>
                                {providers.map((p, idx) => (
                                    <td key={p.provider_name} style={{
                                        textAlign: 'center',
                                        padding: '20px 16px',
                                        borderBottomRightRadius: idx === providers.length - 1 ? '10px' : 0
                                    }}>
                                        <div style={{
                                            fontSize: '1.5rem',
                                            fontWeight: 700,
                                            color: getScoreColor(p.overall_score),
                                            padding: '10px 18px',
                                            background: 'var(--bg-surface)',
                                            borderRadius: '10px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                            display: 'inline-block',
                                            border: '2px solid var(--border-color)'
                                        }}>
                                            {p.overall_score.toFixed(2)}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                /* Hide number input spinners */
                input[type="number"]::-webkit-inner-spin-button,
                input[type="number"]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type="number"] {
                    -moz-appearance: textfield;
                }
            `}</style>

            {/* Scoring Setup Wizard */}
            {showWizard && (
                <ScoringSetupWizard onClose={() => setShowWizard(false)} />
            )}

            {/* Inline Criteria Editor */}
            {showConfigEditor && (
                <InlineCriteriaEditor
                    isOpen={showConfigEditor}
                    onClose={() => setShowConfigEditor(false)}
                />
            )}
        </div>
    );
};
