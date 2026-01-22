import React, { useEffect, useMemo } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
    PieChart, Pie
} from 'recharts';
import { useScoringStore } from '../../../stores/useScoringStore';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { useProjectStore } from '../../../stores/useProjectStore';
import { PROVIDER_COLORS } from '../../../config/constants';

// Function to get translated criteria labels
const getCriteriaLabels = (t: (key: string) => string): Record<string, string> => ({
    // TECHNICAL COMPLETENESS (30%)
    scope_facilities: t('criteria.scope_facilities'),
    scope_work: t('criteria.scope_work'),
    deliverables_quality: t('criteria.deliverables_quality'),
    // ECONOMIC COMPETITIVENESS (35%)
    total_price: t('criteria.total_price'),
    price_breakdown: t('criteria.price_breakdown'),
    optionals_included: t('criteria.optionals_included'),
    capex_opex_methodology: t('criteria.capex_opex_methodology'),
    // EXECUTION CAPABILITY (20%)
    schedule: t('criteria.schedule'),
    resources_allocation: t('criteria.resources_allocation'),
    exceptions: t('criteria.exceptions'),
    // HSE & COMPLIANCE (15%)
    safety_studies: t('criteria.safety_studies'),
    regulatory_compliance: t('criteria.regulatory_compliance')
});

export const ExecutiveView: React.FC = () => {
    const { scoringResults, refreshScoring, isCalculating, customWeights } = useScoringStore();
    const { t } = useLanguageStore();
    const { activeProjectId } = useProjectStore();

    // Get translated criteria labels
    const CRITERIA_LABELS = useMemo(() => getCriteriaLabels(t), [t]);

    // Load scoring data on mount and when project changes
    useEffect(() => {
        console.log('[ExecutiveView] Active project changed:', activeProjectId);
        refreshScoring();
    }, [refreshScoring, activeProjectId]);

    // Calculate dynamic category weights from customWeights (RFQ-aligned structure)
    const categoryWeights = useMemo(() => {
        const technical = (customWeights.scope_facilities || 0) +
                         (customWeights.scope_work || 0) +
                         (customWeights.deliverables_quality || 0);

        const economic = (customWeights.total_price || 0) +
                        (customWeights.price_breakdown || 0) +
                        (customWeights.optionals_included || 0) +
                        (customWeights.capex_opex_methodology || 0);

        const execution = (customWeights.schedule || 0) +
                         (customWeights.resources_allocation || 0) +
                         (customWeights.exceptions || 0);

        const hseCompliance = (customWeights.safety_studies || 0) +
                             (customWeights.regulatory_compliance || 0);

        return {
            TECHNICAL: technical,
            ECONOMIC: economic,
            EXECUTION: execution,
            'HSE_COMPLIANCE': hseCompliance
        };
    }, [customWeights]);

    if (isCalculating) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '500px',
                padding: '40px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                gap: '24px'
            }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: '4px solid var(--border-color)',
                    borderTopColor: 'var(--color-primary)',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <div style={{
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                }}>
                    {t('executive.calculating')}
                </div>
                <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    maxWidth: '300px'
                }}>
                    {t('executive.calculating_subtitle')}
                </div>
                <style>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (!scoringResults || scoringResults.ranking.length === 0) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '400px',
                color: 'var(--text-secondary)',
                gap: '16px'
            }}>
                <div>{t('executive.no_data')}</div>
                <button
                    onClick={() => refreshScoring()}
                    style={{
                        padding: '10px 20px',
                        background: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    {t('executive.refresh')}
                </button>
            </div>
        );
    }

    const providers = scoringResults.ranking;

    // Get top 3 providers by score (sort a copy to get actual ranking)
    const sortedByScore = [...providers].sort((a, b) => b.overall_score - a.overall_score);
    const winner = sortedByScore[0];
    const runnerUp = sortedByScore[1];
    const thirdPlace = sortedByScore[2];

    // Calculate score gap
    const scoreGap = runnerUp ? winner.overall_score - runnerUp.overall_score : 0;

    // Identify strengths and weaknesses based on individual criterion scores (12 criteria)
    const individualScores = winner.individual_scores ? Object.entries(winner.individual_scores)
        .map(([criterionId, score]) => ({
            id: criterionId,
            label: CRITERIA_LABELS[criterionId] || criterionId,
            score: score as number
        }))
        .filter(c => c.score > 0) // Only include criteria with actual scores
        : [];

    // Strengths: criteria with score >= 8 (top performers)
    const strengths = individualScores
        .filter(c => c.score >= 8)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4) // Limit to top 4 strengths
        .map(c => c.label);

    // Weaknesses: the 3 lowest scoring criteria (regardless of threshold)
    const weaknesses = [...individualScores]
        .sort((a, b) => a.score - b.score)
        .slice(0, 3) // Take the 3 lowest scores
        .map(c => c.label);

    // Prepare radar chart data
    const radarData = [
        {
            subject: t('category.technical'),
            ...Object.fromEntries(providers.map(p => [p.provider_name, p.scores?.technical ?? 0]))
        },
        {
            subject: t('category.economic'),
            ...Object.fromEntries(providers.map(p => [p.provider_name, p.scores?.economic ?? 0]))
        },
        {
            subject: t('category.execution'),
            ...Object.fromEntries(providers.map(p => [p.provider_name, p.scores?.execution ?? 0]))
        },
        {
            subject: t('category.hse_compliance'),
            ...Object.fromEntries(providers.map(p => [p.provider_name, p.scores?.hse_compliance ?? 0]))
        }
    ];

    // Prepare bar chart data (overall scores) - sorted by score descending
    const barChartData = providers.map(p => ({
        name: p.provider_name,
        score: p.overall_score,
        id: p.provider_name
    })).sort((a, b) => b.score - a.score);

    // Helper for colors - handles various provider name formats
    const getColor = (id: string, index: number) => {
        // Normalize provider name for matching (uppercase, no spaces)
        const normalized = id.toUpperCase().replace(/\s+/g, '');

        const colorMap: Record<string, string> = {
            // Primary names (as stored in DB)
            'TECNICASREUNIDAS': '#12b5b0',
            'IDOM': '#f59e0b',
            'SACYR': '#a78bfa',
            'EA': '#fb923c',
            'SENER': '#ec4899',
            'TRESCA': '#22d3ee',
            'WORLEY': '#fbbf24',
            // Aliases
            'TR': '#12b5b0',
            'TÉCNICASREUNIDAS': '#12b5b0',
            'EMPRESARIOSAGRUPADOS': '#fb923c'
        };

        const defined = colorMap[normalized] || colorMap[id] || PROVIDER_COLORS[id as keyof typeof PROVIDER_COLORS];
        if (defined) return defined;

        const fallbacks = ['#12b5b0', '#f59e0b', '#a78bfa', '#fb923c', '#ec4899', '#22d3ee', '#fbbf24'];
        return fallbacks[index % fallbacks.length];
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Top Section: Winner & Stats */}
            <div>
                <div style={{
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-cyan))',
                    borderRadius: 'var(--radius-lg)',
                    padding: '40px 32px',
                    color: 'white',
                    boxShadow: '0 12px 28px rgba(18, 181, 176, 0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: 'fadeInScale 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                    {/* Decorative elements */}
                    <div style={{
                        position: 'absolute',
                        top: '-80px',
                        right: '-80px',
                        width: '250px',
                        height: '250px',
                        background: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '50%',
                        filter: 'blur(50px)'
                    }}></div>
                    <div style={{
                        position: 'absolute',
                        bottom: '-60px',
                        left: '-60px',
                        width: '200px',
                        height: '200px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '50%',
                        filter: 'blur(40px)'
                    }}></div>

                    <div style={{
                        position: 'relative',
                        zIndex: 1
                    }}>
                        {/* Main Winner Section */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '32px',
                            flexWrap: 'wrap',
                            marginBottom: '32px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, minWidth: '300px' }}>
                                {/* Award Icon */}
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.25)',
                                    backdropFilter: 'blur(10px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="8" r="7"></circle>
                                        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                                    </svg>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: '0.9rem',
                                        fontWeight: 500,
                                        opacity: 0.95,
                                        marginBottom: '8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>
                                        {t('executive.winner')}
                                    </div>
                                    <h2 style={{
                                        margin: 0,
                                        fontSize: '2rem',
                                        fontWeight: 700,
                                        textShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                    }}>
                                        {winner.provider_name}
                                    </h2>
                                    <div style={{
                                        marginTop: '12px',
                                        padding: '8px 16px',
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        borderRadius: '8px',
                                        display: 'inline-block',
                                        backdropFilter: 'blur(10px)',
                                        fontSize: '0.9rem',
                                        fontWeight: 600
                                    }}>
                                        {t('executive.score')}: <span style={{ fontSize: '1.3rem', marginLeft: '8px' }}>{winner.overall_score.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                style={{
                                    background: 'white',
                                    color: 'var(--color-primary)',
                                    border: 'none',
                                    padding: '16px 32px',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                                onClick={() => {
                                    if (window.confirm(`${t('executive.award')} ${winner.provider_name}?`)) {
                                        alert(`${t('executive.contract_awarded')} ${winner.provider_name}! \n${t('executive.total_score')}: ${winner.overall_score.toFixed(2)}`);
                                    }
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M9 11l3 3L22 4"></path>
                                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                                </svg>
                                {t('executive.award')}
                            </button>
                        </div>

                        {/* Winner Analysis Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '16px',
                            marginTop: '24px'
                        }}>
                            {/* Lead Margin */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                <div style={{
                                    fontSize: '0.8rem',
                                    opacity: 0.9,
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {t('executive.lead_margin')} {runnerUp?.provider_name || 'N/A'}
                                </div>
                                <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 700
                                }}>
                                    {scoreGap >= 0 ? '+' : ''}{scoreGap.toFixed(2)} {t('executive.pts')}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    opacity: 0.8,
                                    marginTop: '4px'
                                }}>
                                    {runnerUp ? ((scoreGap / runnerUp.overall_score) * 100).toFixed(1) : 0}% {t('executive.advantage')}
                                </div>
                            </div>

                            {/* Strengths */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                <div style={{
                                    fontSize: '0.8rem',
                                    opacity: 0.9,
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {t('executive.key_strengths')}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px',
                                    marginTop: '8px'
                                }}>
                                    {strengths.length > 0 ? strengths.map((s, i) => (
                                        <span key={i} style={{
                                            background: 'rgba(34, 197, 94, 0.35)',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: '#bbf7d0'
                                        }}>
                                            {s}
                                        </span>
                                    )) : (
                                        <span style={{
                                            fontSize: '0.8rem',
                                            opacity: 0.7
                                        }}>{t('executive.no_strengths')}</span>
                                    )}
                                </div>
                            </div>

                            {/* Weaknesses */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                <div style={{
                                    fontSize: '0.8rem',
                                    opacity: 0.9,
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {t('executive.areas_review')}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px',
                                    marginTop: '8px'
                                }}>
                                    {weaknesses.length > 0 ? weaknesses.map((w, i) => (
                                        <span key={i} style={{
                                            background: 'rgba(251, 146, 60, 0.35)',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: '#fed7aa'
                                        }}>
                                            {w}
                                        </span>
                                    )) : (
                                        <span style={{
                                            fontSize: '0.8rem',
                                            opacity: 0.7
                                        }}>{t('executive.no_data_available')}</span>
                                    )}
                                </div>
                            </div>

                            {/* Podium */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                <div style={{
                                    fontSize: '0.8rem',
                                    opacity: 0.9,
                                    marginBottom: '12px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {t('executive.top_rankings')}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    {[winner, runnerUp, thirdPlace].filter(Boolean).map((p, i) => (
                                        <div key={p.provider_name} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '0.85rem',
                                            fontWeight: 600
                                        }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                minWidth: '24px'
                                            }}>
                                                #{i + 1}
                                            </span>
                                            <span style={{ flex: 1 }}>{p.provider_name}</span>
                                            <span style={{
                                                background: 'rgba(255, 255, 255, 0.25)',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem'
                                            }}>
                                                {p.overall_score.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <style>{`
                        @keyframes fadeInScale {
                            from {
                                opacity: 0;
                                transform: scale(0.95) translateY(20px);
                            }
                            to {
                                opacity: 1;
                                transform: scale(1) translateY(0);
                            }
                        }
                    `}</style>
                </div>
            </div>

            {/* Charts Row - 3 charts in a row */}
            <div className="charts-row-container">
                {/* Radar Chart */}
                <div className="widget-card" style={{
                minHeight: '480px',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                padding: '28px',
                animation: 'fadeInUp 0.5s ease-out 0.1s backwards'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px'
                }}>
                    <div>
                        <div className="widget-title" style={{ margin: '0 0 6px 0' }}>
                            {t('executive.radar.title')}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 500
                        }}>
                            {t('executive.radar.subtitle')}
                        </div>
                    </div>
                </div>
                <div style={{ flex: 1, width: '100%', minHeight: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                            <defs>
                                {providers.map((p, i) => (
                                    <linearGradient key={`gradient-${p.provider_name}`} id={`gradient-${p.provider_name}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={getColor(p.provider_name, i)} stopOpacity={0.3} />
                                        <stop offset="100%" stopColor={getColor(p.provider_name, i)} stopOpacity={0.05} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <PolarGrid
                                stroke="var(--border-color)"
                                strokeWidth={1.5}
                                strokeDasharray="3 3"
                            />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{
                                    fill: 'var(--text-primary)',
                                    fontSize: 12,
                                    fontWeight: 600
                                }}
                            />
                            <PolarRadiusAxis
                                angle={30}
                                domain={[0, 10]}
                                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                                stroke="var(--border-color)"
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--bg-surface)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    boxShadow: 'var(--shadow-lg)',
                                    padding: '12px'
                                }}
                                itemStyle={{
                                    color: 'var(--text-primary)',
                                    fontSize: '0.875rem',
                                    fontWeight: 600
                                }}
                                labelStyle={{
                                    color: 'var(--text-secondary)',
                                    fontWeight: 700,
                                    marginBottom: '8px'
                                }}
                                formatter={(value: any) => Number(value).toFixed(2)}
                            />
                            <Legend
                                wrapperStyle={{
                                    paddingTop: '24px',
                                    fontSize: '0.875rem',
                                    fontWeight: 600
                                }}
                                iconType="circle"
                            />
                            {providers.map((p, i) => (
                                <Radar
                                    key={p.provider_name}
                                    name={p.provider_name}
                                    dataKey={p.provider_name}
                                    stroke={getColor(p.provider_name, i)}
                                    fill={`url(#gradient-${p.provider_name})`}
                                    strokeWidth={2.5}
                                    dot={{ fill: getColor(p.provider_name, i), r: 4 }}
                                    activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--bg-surface)' }}
                                />
                            ))}
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bar Chart */}
            <div className="widget-card" style={{
                minHeight: '480px',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                padding: '28px',
                animation: 'fadeInUp 0.5s ease-out 0.2s backwards'
            }}>
                <div style={{
                    marginBottom: '24px'
                }}>
                    <div>
                        <div className="widget-title" style={{ margin: '0 0 6px 0' }}>
                            {t('executive.bar.title')}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 500
                        }}>
                            {t('executive.bar.subtitle')}
                        </div>
                    </div>
                </div>
                <div style={{ flex: 1, width: '100%', minHeight: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={barChartData}
                            layout="vertical"
                            margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
                        >
                            <defs>
                                {barChartData.map((entry, index) => (
                                    <linearGradient key={`bar-gradient-${entry.id}`} id={`bar-gradient-${entry.id}`} x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor={getColor(entry.id, index)} stopOpacity={0.8} />
                                        <stop offset="100%" stopColor={getColor(entry.id, index)} stopOpacity={1} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid
                                strokeDasharray="4 4"
                                horizontal={false}
                                vertical={true}
                                stroke="var(--border-color)"
                                strokeOpacity={0.3}
                            />
                            <XAxis
                                type="number"
                                domain={[0, 10]}
                                tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }}
                                stroke="var(--border-color)"
                                tickLine={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={120}
                                tick={{ fill: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}
                                stroke="var(--border-color)"
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'var(--bg-hover)', opacity: 0.3 }}
                                contentStyle={{
                                    backgroundColor: 'var(--bg-surface)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    boxShadow: 'var(--shadow-lg)',
                                    padding: '12px'
                                }}
                                itemStyle={{
                                    color: 'var(--text-primary)',
                                    fontSize: '0.875rem',
                                    fontWeight: 600
                                }}
                                labelStyle={{
                                    color: 'var(--text-secondary)',
                                    fontWeight: 700,
                                    marginBottom: '8px'
                                }}
                                formatter={(value: any) => [`${Number(value).toFixed(2)}`, t('executive.score')]}
                            />
                            <Bar
                                dataKey="score"
                                radius={[0, 8, 8, 0]}
                                barSize={36}
                                isAnimationActive={true}
                                animationDuration={1000}
                                animationBegin={200}
                            >
                                {barChartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={`url(#bar-gradient-${entry.id})`}
                                        stroke={getColor(entry.id, index)}
                                        strokeWidth={entry.id === winner.provider_name ? 3 : 0}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Category Weight Distribution */}
            <div className="widget-card" style={{
                minHeight: '480px',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                padding: '28px',
                animation: 'fadeInUp 0.5s ease-out 0.3s backwards'
            }}>
                <div style={{
                    marginBottom: '24px'
                }}>
                    <div>
                        <div className="widget-title" style={{ margin: '0 0 6px 0' }}>
                            {t('executive.criteria_weight')}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 500
                        }}>
                            {t('executive.scoring_impact')}
                        </div>
                    </div>
                </div>
                <div style={{ flex: 1, width: '100%', minHeight: '350px', display: 'flex', alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <defs>
                                <linearGradient id="tech-gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.7} />
                                </linearGradient>
                                <linearGradient id="econ-gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0.7} />
                                </linearGradient>
                                <linearGradient id="exec-gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--color-warning)" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="var(--color-warning)" stopOpacity={0.7} />
                                </linearGradient>
                                <linearGradient id="hse-gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--color-cyan)" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="var(--color-cyan)" stopOpacity={0.7} />
                                </linearGradient>
                            </defs>
                            <Pie
                                data={[
                                    { name: t('category.technical'), value: categoryWeights.TECHNICAL, color: 'url(#tech-gradient)' },
                                    { name: t('category.economic'), value: categoryWeights.ECONOMIC, color: 'url(#econ-gradient)' },
                                    { name: t('category.execution'), value: categoryWeights.EXECUTION, color: 'url(#exec-gradient)' },
                                    { name: t('category.hse_compliance'), value: categoryWeights['HSE_COMPLIANCE'], color: 'url(#hse-gradient)' }
                                ]}
                                cx="50%"
                                cy="50%"
                                labelLine={{
                                    stroke: 'var(--text-secondary)',
                                    strokeWidth: 1.5
                                }}
                                label={(entry) => `${entry.value}%`}
                                outerRadius="60%"
                                dataKey="value"
                                animationBegin={300}
                                animationDuration={800}
                            >
                                {[
                                    { name: t('category.technical'), value: categoryWeights.TECHNICAL, color: 'url(#tech-gradient)' },
                                    { name: t('category.economic'), value: categoryWeights.ECONOMIC, color: 'url(#econ-gradient)' },
                                    { name: t('category.execution'), value: categoryWeights.EXECUTION, color: 'url(#exec-gradient)' },
                                    { name: t('category.hse_compliance'), value: categoryWeights['HSE_COMPLIANCE'], color: 'url(#hse-gradient)' }
                                ].map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--bg-surface)" strokeWidth={3} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--bg-surface)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    boxShadow: 'var(--shadow-lg)',
                                    padding: '12px'
                                }}
                                itemStyle={{
                                    color: 'var(--text-primary)',
                                    fontSize: '0.875rem',
                                    fontWeight: 600
                                }}
                                formatter={(value: any) => [`${value}%`, t('executive.weight')]}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={50}
                                wrapperStyle={{
                                    paddingTop: '20px',
                                    fontSize: '0.875rem',
                                    fontWeight: 600
                                }}
                                iconType="circle"
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            </div>
        </div>
    );
};
