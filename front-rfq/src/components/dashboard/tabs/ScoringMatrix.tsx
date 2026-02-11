import React, { useEffect, useState, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import ReactDOM from 'react-dom';
import { useScoringStore } from '../../../stores/useScoringStore';
import { useScoringConfigStore } from '../../../stores/useScoringConfigStore';
import { useProjectStore } from '../../../stores/useProjectStore';
import { useLanguageStore } from '../../../stores/useLanguageStore';

// Lazy-load wizard and editor (only rendered on user action)
const ScoringSetupWizard = lazy(() => import('../scoring').then(m => ({ default: m.ScoringSetupWizard })));
const InlineCriteriaEditor = lazy(() => import('../scoring').then(m => ({ default: m.InlineCriteriaEditor })));

const displayProviderName = (name: string) => name === 'TECNICASREUNIDAS' ? 'TR' : name;

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
const getCategoryName = (category: string, t: (key: string) => string, displayName?: string): string => {
    // If a display_name is provided from the DB, use it directly
    if (displayName) return displayName;
    const categoryMap: Record<string, string> = {
        'technical': t('scoring.category.technical'),
        'economic': t('scoring.category.economic'),
        'execution': t('scoring.category.execution'),
        'hse_compliance': t('scoring.category.hse_compliance'),
    };
    return categoryMap[category] || category.replace(/_/g, ' ').toUpperCase();
};

// Default category info (fallback when no dynamic configuration)
const DEFAULT_CATEGORY_INFO: Record<string, { weight: number; color: string; displayName?: string }> = {
    'technical': { weight: 30, color: '#12b5b0' },
    'economic': { weight: 35, color: '#f59e0b' },
    'execution': { weight: 20, color: '#3b82f6' },
    'hse_compliance': { weight: 15, color: '#8b5cf6' },
};

export const ScoringMatrix: React.FC = () => {
    const {
        isCalculating,
        lastCalculation,
        scoringResults,
        calculateScoring,
        refreshScoring,
        customWeights,
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
        deleteConfiguration,
        isLoading: isConfigLoading,
        setShowWizard,
        showWizard,
    } = useScoringConfigStore();

    // Get active project
    const { activeProjectId } = useProjectStore();
    const { t } = useLanguageStore();

    // UI State
    const [showConfigEditor, setShowConfigEditor] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Handler to delete scoring configuration
    const handleDeleteConfig = useCallback(async () => {
        if (!activeProjectId) return;
        try {
            await deleteConfiguration(activeProjectId);
            resetScoringStore();
            await loadConfiguration(activeProjectId);
        } catch (err) {
            console.error('[ScoringMatrix] Error deleting config:', err);
        } finally {
            setShowDeleteConfirm(false);
        }
    }, [activeProjectId, deleteConfiguration, resetScoringStore, loadConfiguration]);

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
            const result = categories.reduce((acc, cat) => {
                if (cat && cat.name) {
                    const catName = typeof cat.name === 'string' ? cat.name : String(cat.name);
                    const catColor = typeof cat.color === 'string' ? cat.color : '#12b5b0';
                    const catDisplayName = typeof cat.display_name === 'string' ? cat.display_name : '';
                    acc[catName] = { weight: Number(cat.weight) || 0, color: catColor, displayName: catDisplayName };
                }
                return acc;
            }, {} as Record<string, { weight: number; color: string; displayName?: string }>);
            console.log('[ScoringMatrix] CATEGORY_INFO from DB:', Object.keys(result));
            return result;
        }
        console.log('[ScoringMatrix] CATEGORY_INFO using defaults:', Object.keys(DEFAULT_CATEGORY_INFO));
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
                // Detect if criteria use relative (sum~100) or absolute (sum~catWeight) convention
                const criteriaSum = catCriteria.reduce((s, c) => s + (c.weight || 0), 0);
                const isRelative = catCriteria.length > 0 && Math.abs(criteriaSum - 100) < 1;
                catCriteria.forEach((crit) => {
                    if (!crit || !crit.name) return;
                    // If relative weights (sum=100), convert to absolute; otherwise use directly
                    const actualWeight = isRelative
                        ? ((crit.weight || 0) * (cat.weight || 0)) / 100
                        : (crit.weight || 0);
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

    // Calculate total weight (only from active criteria, not stale keys)
    const totalWeight = useMemo(() => {
        return SCORING_CRITERIA.reduce((sum, criterion) => {
            return sum + (customWeights[criterion.id] ?? criterion.weight ?? 0);
        }, 0);
    }, [customWeights, SCORING_CRITERIA]);

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
        };
    }, [hasConfiguration, dynamicCategories, customWeights]);

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

    // Recalculate scores with custom weights (fully dynamic)
    const recalculatedProviders = useMemo(() => {
        if (!scoringResults?.ranking) return [];

        return scoringResults.ranking.map(provider => {
            const individualScores = provider.individual_scores;

            // Calculate new overall score using custom weights for criteria we know about
            const newOverall = SCORING_CRITERIA.reduce((total, criterion) => {
                const score = individualScores[criterion.id] || 0;
                const weight = customWeights[criterion.id] ?? criterion.weight ?? 0;
                return total + (score * weight / 100);
            }, 0);

            // Calculate new category scores dynamically
            const newScores: Record<string, number> = {};
            for (const [category] of Object.entries(CATEGORY_INFO)) {
                const categoryCriteria = SCORING_CRITERIA.filter(c => c.category === category);
                const catWeight = customCategoryWeights[category] || 0;
                if (catWeight > 0 && categoryCriteria.length > 0) {
                    const weightedSum = categoryCriteria.reduce((sum, crit) => {
                        const score = individualScores[crit.id] || 0;
                        const weight = customWeights[crit.id] ?? crit.weight ?? 0;
                        return sum + (score * weight);
                    }, 0);
                    newScores[category] = weightedSum / catWeight;
                } else {
                    newScores[category] = 0;
                }
            }

            return {
                ...provider,
                overall_score: newOverall,
                scores: newScores,
            };
        }).sort((a, b) => (a.provider_name || '').localeCompare(b.provider_name || ''))
          .map((p, idx) => ({ ...p, position: idx + 1 }));
    }, [scoringResults, customWeights, customCategoryWeights, SCORING_CRITERIA, CATEGORY_INFO]);

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
                    {/* Delete Configuration Button - Only when config exists */}
                    {hasConfiguration && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'rgba(239, 68, 68, 0.08)',
                                color: 'rgb(239, 68, 68)',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            title={t('scoring.delete_config')}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            {t('scoring.delete_config')}
                        </button>
                    )}
                    {/* Configure Criteria Button - Show when there's scoring data OR configuration */}
                    {(hasConfiguration || (providers && providers.length > 0)) && (
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
                    {isEditingWeights && (
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
                    {isEditingWeights && (
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
                    {isEditingWeights && weightsValid && (
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

            {/* Scoring Table - Show when there's configuration, even without scoring data */}
            {!isCalculating && hasConfiguration && (
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
                                {providers && providers.map((p, idx) => (
                                    <th key={displayProviderName(p.provider_name)} style={{
                                        padding: '16px',
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        fontSize: '0.875rem',
                                        color: 'var(--text-secondary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        borderTopRightRadius: idx === providers.length - 1 ? '10px' : 0,
                                    }}>
                                        {displayProviderName(p.provider_name)}
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
                                            <td colSpan={2 + (providers?.length || 0)} style={{
                                                padding: '12px 16px',
                                                fontWeight: 700,
                                                fontSize: '0.875rem',
                                                color: info.color,
                                                borderLeft: `4px solid ${info.color}`
                                            }}>
                                                {getCategoryName(category, t, info.displayName)} ({categoryWeight}%)
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
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '6px 12px',
                                                        background: `${info.color}20`,
                                                        color: info.color,
                                                        borderRadius: '8px',
                                                        fontWeight: 700,
                                                        fontSize: '0.85rem',
                                                    }}>
                                                        {criterion.weight} %
                                                    </span>
                                                </td>
                                                {providers && providers.map(p => {
                                                    const score = getCriterionScore(p, criterion.id);
                                                    return (
                                                        <td key={displayProviderName(p.provider_name)} style={{
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
                                                                background: 'transparent'
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
                                                {getCategoryName(category, t, info.displayName)} {t('scoring.average')}
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                                                <span style={{ fontWeight: 700, color: info.color }}>{categoryWeight}%</span>
                                            </td>
                                            {providers && providers.map(p => {
                                                const categoryScore = p.scores?.[category] || 0;
                                                return (
                                                    <td key={displayProviderName(p.provider_name)} style={{
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
                                {providers && providers.map((p, idx) => (
                                    <td key={displayProviderName(p.provider_name)} style={{
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

            {/* Delete Configuration Confirmation Modal - rendered via portal */}
            {showDeleteConfirm && ReactDOM.createPortal(
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99999
                }}
                onClick={() => setShowDeleteConfirm(false)}
                >
                    <div style={{
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '28px',
                        maxWidth: '420px',
                        width: '90%',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                        border: '1px solid var(--border-color)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(239, 68, 68)" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </div>
                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {t('scoring.delete_config_confirm')}
                            </h4>
                        </div>
                        <p style={{
                            margin: '0 0 24px 0',
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.5'
                        }}>
                            {t('scoring.delete_config_warning')}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-surface)',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                {t('upload.btn.cancel')}
                            </button>
                            <button
                                onClick={handleDeleteConfig}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'rgb(239, 68, 68)',
                                    color: 'white',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                }}
                            >
                                {t('scoring.delete_config_btn')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
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
                <Suspense fallback={null}>
                    <ScoringSetupWizard onClose={() => setShowWizard(false)} />
                </Suspense>
            )}

            {/* Inline Criteria Editor */}
            {showConfigEditor && (
                <Suspense fallback={null}>
                    <InlineCriteriaEditor
                        isOpen={showConfigEditor}
                        onClose={() => setShowConfigEditor(false)}
                    />
                </Suspense>
            )}
        </div>
    );
};
