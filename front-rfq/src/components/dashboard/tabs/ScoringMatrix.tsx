import React, { useEffect } from 'react';
import { useScoringStore } from '../../../stores/useScoringStore';

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
        refreshScoring
    } = useScoringStore();

    // Load scoring on mount
    useEffect(() => {
        refreshScoring();
    }, [refreshScoring]);

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'var(--color-primary)';
        if (score >= 5) return 'var(--text-secondary)';
        return 'var(--text-tertiary)';
    };

    const getCriterionScore = (provider: any, criterionId: string): number => {
        if (!provider.individual_scores) return 0;
        return provider.individual_scores[criterionId] || 0;
    };

    const providers = scoringResults?.ranking || [];

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

            {/* AI Scoring Results Summary */}
            {scoringResults && scoringResults.ranking.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    marginBottom: '24px',
                    padding: '16px',
                    background: 'var(--bg-surface-alt)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px', fontWeight: 600 }}>TOP PERFORMER</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {scoringResults.statistics.top_performer}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px', fontWeight: 600 }}>AVG SCORE</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {scoringResults.statistics.average_score.toFixed(2)}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px', fontWeight: 600 }}>PROVIDERS</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {scoringResults.statistics.total_providers}
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {(!providers || providers.length === 0) && (
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
            {providers && providers.length > 0 && (
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
                                                {category} ({info.weight}%)
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
                                                        padding: '4px 10px',
                                                        background: `${info.color}20`,
                                                        color: info.color,
                                                        borderRadius: '8px',
                                                        fontWeight: 700,
                                                        fontSize: '0.85rem'
                                                    }}>
                                                        {criterion.weight}%
                                                    </span>
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
                                                <span style={{ fontWeight: 700, color: info.color }}>{info.weight}%</span>
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
            `}</style>
        </div>
    );
};
