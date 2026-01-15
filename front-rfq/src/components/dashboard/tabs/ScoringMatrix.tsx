import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useScoringStore, DEFAULT_WEIGHTS } from '../../../stores/useScoringStore';
import type { ScoringWeights } from '../../../types/database.types';

// Define the 12 scoring criteria with their weights
const SCORING_CRITERIA = [
    // TECHNICAL (40%)
    { id: 'efficiency_bop', name: 'Efficiency (BOP)', category: 'TECHNICAL', weight: 15, description: 'Total energy consumption (kWh/kg H2)' },
    { id: 'degradation_lifetime', name: 'Degradation & Lifetime', category: 'TECHNICAL', weight: 10, description: 'Stack replacement hours and annual loss' },
    { id: 'flexibility', name: 'Operational Flexibility', category: 'TECHNICAL', weight: 10, description: 'Turndown and ramp response speed' },
    { id: 'purity_pressure', name: 'Purity & Pressure', category: 'TECHNICAL', weight: 5, description: 'Output gas quality and direct pressure' },
    // ECONOMIC (30%)
    { id: 'capex', name: 'CAPEX Total', category: 'ECONOMIC', weight: 15, description: 'Purchase price, transport, insurance, commissioning' },
    { id: 'opex', name: 'OPEX Guaranteed', category: 'ECONOMIC', weight: 10, description: 'Maintenance, consumables, spare parts cost' },
    { id: 'warranties', name: 'Warranties & Penalties', category: 'ECONOMIC', weight: 5, description: 'Failure coverage and availability penalties' },
    // EXECUTION (20%)
    { id: 'delivery_time', name: 'Delivery Time', category: 'EXECUTION', weight: 10, description: 'Lead time from signature to site delivery' },
    { id: 'track_record', name: 'Track Record', category: 'EXECUTION', weight: 5, description: 'Similar plants installed and operating' },
    { id: 'provider_strength', name: 'Provider Strength', category: 'EXECUTION', weight: 5, description: 'Financial capacity and local service network' },
    // HSE/ESG (10%)
    { id: 'safety_atex', name: 'Safety & ATEX', category: 'HSE/ESG', weight: 5, description: 'Safety certifications and ATEX compliance' },
    { id: 'sustainability', name: 'Sustainability', category: 'HSE/ESG', weight: 5, description: 'Carbon footprint and material recyclability' },
];

const CATEGORY_INFO = {
    'TECHNICAL': { weight: 40, color: '#12b5b0' },
    'ECONOMIC': { weight: 30, color: '#f59e0b' },
    'EXECUTION': { weight: 20, color: '#3b82f6' },
    'HSE/ESG': { weight: 10, color: '#8b5cf6' },
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
        isSavingWeights
    } = useScoringStore();

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

    // Calculate category weights based on custom weights
    const customCategoryWeights = useMemo(() => {
        return {
            'TECHNICAL': (customWeights.efficiency_bop || 0) + (customWeights.degradation_lifetime || 0) + (customWeights.flexibility || 0) + (customWeights.purity_pressure || 0),
            'ECONOMIC': (customWeights.capex || 0) + (customWeights.opex || 0) + (customWeights.warranties || 0),
            'EXECUTION': (customWeights.delivery_time || 0) + (customWeights.track_record || 0) + (customWeights.provider_strength || 0),
            'HSE/ESG': (customWeights.safety_atex || 0) + (customWeights.sustainability || 0),
        };
    }, [customWeights]);

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
                (individualScores.efficiency_bop * (customWeights.efficiency_bop || 0)) +
                (individualScores.degradation_lifetime * (customWeights.degradation_lifetime || 0)) +
                (individualScores.flexibility * (customWeights.flexibility || 0)) +
                (individualScores.purity_pressure * (customWeights.purity_pressure || 0))
            ) / (customCategoryWeights['TECHNICAL'] || 1);

            const newEconomic = (
                (individualScores.capex * (customWeights.capex || 0)) +
                (individualScores.opex * (customWeights.opex || 0)) +
                (individualScores.warranties * (customWeights.warranties || 0))
            ) / (customCategoryWeights['ECONOMIC'] || 1);

            const newExecution = (
                (individualScores.delivery_time * (customWeights.delivery_time || 0)) +
                (individualScores.track_record * (customWeights.track_record || 0)) +
                (individualScores.provider_strength * (customWeights.provider_strength || 0))
            ) / (customCategoryWeights['EXECUTION'] || 1);

            const newHseEsg = (
                (individualScores.safety_atex * (customWeights.safety_atex || 0)) +
                (individualScores.sustainability * (customWeights.sustainability || 0))
            ) / (customCategoryWeights['HSE/ESG'] || 1);

            return {
                ...provider,
                overall_score: newOverall,
                scores: {
                    technical: newTechnical,
                    economic: newEconomic,
                    execution: newExecution,
                    hse_esg: newHseEsg
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
            boxShadow: 'var(--shadow-sm)',
            animation: 'fadeInUp 0.5s ease-out'
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
                        Provider Scoring Matrix
                    </h3>
                    <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        fontWeight: 500
                    }}>
                        AI-evaluated scores across 12 criteria
                        {lastCalculation && (
                            <span style={{ marginLeft: '12px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                Last updated: {new Date(lastCalculation).toLocaleString()}
                            </span>
                        )}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Weight validation indicator */}
                    {(isEditingWeights || hasCustomWeights) && (
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
                            Reset
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
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                    Save
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
                                Calculating...
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M23 4v6h-6M1 20v-6h6"></path>
                                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"></path>
                                </svg>
                                Recalculate AI Scoring
                            </>
                        )}
                    </button>
                </div>
            </div>


            {/* Loading Overlay */}
            {isCalculating && (
                <div style={{
                    position: 'relative',
                    padding: '60px 20px',
                    background: 'var(--bg-surface-alt)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '20px'
                    }}>
                        <div style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            border: '4px solid var(--border-color)',
                            borderTopColor: 'var(--color-primary)',
                            animation: 'spin 1s linear infinite'
                        }}></div>
                        <div style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)'
                        }}>
                            Calculating AI Scores...
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            textAlign: 'center',
                            maxWidth: '400px'
                        }}>
                            Analyzing provider responses against 12 weighted criteria. Please wait...
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!isCalculating && (!providers || providers.length === 0) && (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: 'var(--text-secondary)'
                }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.5 }}>
                        <path d="M3 3h18v18H3zM9 3v18M3 9h18M3 15h18"></path>
                    </svg>
                    <h4 style={{ margin: '0 0 8px 0', fontWeight: 600 }}>No Scoring Data Available</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                        Click "Recalculate AI Scoring" to evaluate providers based on their RFQ responses.
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
                                    Criterion
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
                                    Weight
                                </th>
                                {providers.map((p, idx) => (
                                    <th key={p.provider_name} style={{
                                        padding: '16px',
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        fontSize: '0.875rem',
                                        color: p.position === 1 ? 'var(--color-primary)' : 'var(--text-secondary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        borderTopRightRadius: idx === providers.length - 1 ? '10px' : 0,
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                                                #{p.position}
                                            </div>
                                            <div>{p.provider_name}</div>
                                        </div>
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
                                                {category} ({categoryWeight}%)
                                                {categoryChanged && (
                                                    <span style={{
                                                        marginLeft: '8px',
                                                        fontSize: '0.7rem',
                                                        color: 'var(--text-tertiary)',
                                                        fontWeight: 500
                                                    }}>
                                                        (default: {defaultCategoryWeight}%)
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
                                                {category} Average
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                                                <span style={{ fontWeight: 700, color: info.color }}>{categoryWeight}%</span>
                                            </td>
                                            {providers.map(p => {
                                                const categoryScore = category === 'TECHNICAL' ? p.scores?.technical :
                                                    category === 'ECONOMIC' ? p.scores?.economic :
                                                    category === 'EXECUTION' ? p.scores?.execution :
                                                    p.scores?.hse_esg || 0;
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
                                    OVERALL SCORE:
                                </td>
                                {providers.map((p, idx) => {
                                    const isWinner = p.position === 1;
                                    return (
                                        <td key={p.provider_name} style={{
                                            textAlign: 'center',
                                            padding: '20px 16px',
                                            borderBottomRightRadius: idx === providers.length - 1 ? '10px' : 0
                                        }}>
                                            <div style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: isWinner ? 'var(--color-primary)' : getScoreColor(p.overall_score),
                                                padding: '10px 18px',
                                                background: 'var(--bg-surface)',
                                                borderRadius: '10px',
                                                boxShadow: isWinner ? '0 4px 16px var(--color-primary)30' : '0 2px 8px rgba(0,0,0,0.1)',
                                                display: 'inline-block',
                                                border: isWinner ? '2px solid var(--color-primary)' : '2px solid var(--border-color)'
                                            }}>
                                                {p.overall_score.toFixed(2)}
                                            </div>
                                        </td>
                                    );
                                })}
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
        </div>
    );
};
