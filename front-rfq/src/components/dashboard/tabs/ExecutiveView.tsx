import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
    PieChart, Pie
} from 'recharts';
import * as XLSX from 'xlsx';
import { useScoringStore } from '../../../stores/useScoringStore';
import { useScoringConfigStore } from '../../../stores/useScoringConfigStore';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { useProjectStore } from '../../../stores/useProjectStore';
import { getProviderColor, getProviderDisplayName as displayProviderName } from '../../../types/provider.types';
import { useProviderStore } from '../../../stores/useProviderStore';
import { EsgBadges } from '../../common/EsgBadges';

// Function to get translated criteria labels (fallback when no dynamic config)
const getDefaultCriteriaLabels = (t: (key: string) => string): Record<string, string> => ({
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
    const { categories: dynamicCategories, hasConfiguration, loadConfiguration } = useScoringConfigStore();
    const { t } = useLanguageStore();
    const { activeProjectId, approveResults, resultsApprovedMap, loadProjects } = useProjectStore();
    const { projectProviders } = useProviderStore();
    const [highlightedProvider, setHighlightedProvider] = useState<string | null>(null);

    const getCompactProviderLabel = (providerName: string, max = 18) => {
        const label = displayProviderName(providerName);
        if (label.length <= max) return label;
        return `${label.slice(0, max - 1)}…`;
    };

    // Get criteria labels (from dynamic config or fallback to translations)
    const CRITERIA_LABELS = useMemo(() => {
        const categories = Array.isArray(dynamicCategories) ? dynamicCategories : [];
        if (hasConfiguration && categories.length > 0) {
            const labels: Record<string, string> = {};
            categories.forEach(cat => {
                if (!cat) return;
                const catCriteria = Array.isArray(cat.criteria) ? cat.criteria : [];
                catCriteria.forEach(crit => {
                    if (crit && crit.name) {
                        const critName = typeof crit.name === 'string' ? crit.name : String(crit.name);
                        const displayName = typeof crit.display_name === 'string' ? crit.display_name : String(crit.display_name || crit.name);
                        labels[critName] = displayName;
                    }
                });
            });
            return labels;
        }
        return getDefaultCriteriaLabels(t);
    }, [hasConfiguration, dynamicCategories, t]);

    // Load scoring data and config on mount and when project changes
    useEffect(() => {
        refreshScoring();
        if (activeProjectId) {
            loadConfiguration(activeProjectId);
        }
    }, [refreshScoring, loadConfiguration, activeProjectId]);

    // Calculate category weights from dynamic config or customWeights
    const categoryWeights = useMemo(() => {
        const categories = Array.isArray(dynamicCategories) ? dynamicCategories : [];
        if (hasConfiguration && categories.length > 0) {
            // Use dynamic category weights
            const weights: Record<string, number> = {};
            categories.forEach(cat => {
                if (!cat || !cat.name) return;
                // Map to expected keys for pie chart
                const catName = typeof cat.name === 'string' ? cat.name : String(cat.name);
                const key = catName.toUpperCase();
                weights[key] = Number(cat.weight) || 0;
            });
            return weights;
        }

        // Fallback to legacy calculation from customWeights
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
    }, [hasConfiguration, dynamicCategories, customWeights]);

    // Build scoring criteria from dynamic config (mirrors ScoringMatrix logic)
    const scoringCriteria = useMemo(() => {
        const categories = Array.isArray(dynamicCategories) ? dynamicCategories : [];
        if (hasConfiguration && categories.length > 0) {
            const criteria: Array<{ id: string; category: string; weight: number }> = [];
            categories.forEach((cat: any) => {
                if (!cat || !cat.name) return;
                const catCriteria = Array.isArray(cat.criteria) ? cat.criteria : [];
                const criteriaSum = catCriteria.reduce((s: number, c: any) => s + (c.weight || 0), 0);
                const isRelative = catCriteria.length > 0 && Math.abs(criteriaSum - 100) < 1;
                catCriteria.forEach((crit: any) => {
                    if (!crit || !crit.name) return;
                    const actualWeight = isRelative
                        ? ((crit.weight || 0) * (cat.weight || 0)) / 100
                        : (crit.weight || 0);
                    criteria.push({
                        id: typeof crit.name === 'string' ? crit.name : String(crit.name),
                        category: String(cat.name || ''),
                        weight: parseFloat(actualWeight.toFixed(2)),
                    });
                });
            });
            return criteria;
        }
        return [
            { id: 'scope_facilities', category: 'technical', weight: 10 },
            { id: 'scope_work', category: 'technical', weight: 10 },
            { id: 'deliverables_quality', category: 'technical', weight: 10 },
            { id: 'total_price', category: 'economic', weight: 15 },
            { id: 'price_breakdown', category: 'economic', weight: 8 },
            { id: 'optionals_included', category: 'economic', weight: 7 },
            { id: 'capex_opex_methodology', category: 'economic', weight: 5 },
            { id: 'schedule', category: 'execution', weight: 8 },
            { id: 'resources_allocation', category: 'execution', weight: 6 },
            { id: 'exceptions', category: 'execution', weight: 6 },
            { id: 'safety_studies', category: 'hse_compliance', weight: 8 },
            { id: 'regulatory_compliance', category: 'hse_compliance', weight: 7 },
        ];
    }, [hasConfiguration, dynamicCategories]);

    // Recalculate ranking with current weights (mirrors ScoringMatrix recalculatedProviders)
    const recalculatedRanking = useMemo(() => {
        const providersList = scoringResults?.ranking || [];
        if (providersList.length === 0) return [];

        // Build category weights map (category name -> total weight)
        const catWeightsMap: Record<string, number> = {};
        const categories = Array.isArray(dynamicCategories) ? dynamicCategories : [];
        if (hasConfiguration && categories.length > 0) {
            categories.forEach((cat: any) => {
                if (cat && cat.name) {
                    catWeightsMap[String(cat.name)] = Number(cat.weight) || 0;
                }
            });
        } else {
            for (const crit of scoringCriteria) {
                catWeightsMap[crit.category] = (catWeightsMap[crit.category] || 0) +
                    (customWeights[crit.id] ?? crit.weight ?? 0);
            }
        }

        return providersList.map(provider => {
            const individualScores = provider.individual_scores || {};

            const newOverall = scoringCriteria.reduce((total, criterion) => {
                const score = individualScores[criterion.id] || 0;
                const weight = customWeights[criterion.id] ?? criterion.weight ?? 0;
                return total + (score * weight / 100);
            }, 0);

            const newScores: Record<string, number> = {};
            for (const [catName, catWeight] of Object.entries(catWeightsMap)) {
                const categoryCriteria = scoringCriteria.filter(c => c.category === catName);
                if (catWeight > 0 && categoryCriteria.length > 0) {
                    const weightedSum = categoryCriteria.reduce((sum, crit) => {
                        const score = individualScores[crit.id] || 0;
                        const weight = customWeights[crit.id] ?? crit.weight ?? 0;
                        return sum + (score * weight);
                    }, 0);
                    newScores[catName] = weightedSum / catWeight;
                } else {
                    newScores[catName] = 0;
                }
            }

            return {
                ...provider,
                overall_score: newOverall,
                scores: newScores,
            };
        });
    }, [scoringResults, customWeights, scoringCriteria, hasConfiguration, dynamicCategories]);

    // Prepare radar chart data - MUST be before any conditional returns to respect hooks rules
    // Uses recalculatedRanking to ensure scores match ScoringMatrix
    const radarData = useMemo(() => {
        const providersList = recalculatedRanking;
        if (providersList.length === 0) return [];

        const categories = Array.isArray(dynamicCategories) ? dynamicCategories : [];
        if (hasConfiguration && categories.length > 0) {
            return categories.filter(cat => cat && cat.name).map(cat => {
                // Ensure display_name is a string
                const displayName = typeof cat.display_name === 'string' ? cat.display_name : String(cat.display_name || cat.name || '');
                const catName = typeof cat.name === 'string' ? cat.name : String(cat.name || '');
                // Map category name to scores property
                return {
                    subject: displayName || catName,
                    ...Object.fromEntries(providersList.map(p => {
                        const providerName = typeof p.provider_name === 'string' ? p.provider_name : String(p.provider_name || '');
                        // Try to get score from the category name mapping
                        let score = 0;
                        if (p.scores) {
                            if (catName === 'technical') score = p.scores.technical ?? 0;
                            else if (catName === 'economic') score = p.scores.economic ?? 0;
                            else if (catName === 'execution') score = p.scores.execution ?? 0;
                            else if (catName === 'hse_compliance') score = p.scores.hse_compliance ?? 0;
                            else score = (p.scores as any)[catName] ?? 0;
                        }
                        return [providerName, Number(score) || 0];
                    }))
                };
            });
        }

        // Fallback to default categories
        return [
            {
                subject: t('category.technical'),
                ...Object.fromEntries(providersList.map(p => {
                    const name = typeof p.provider_name === 'string' ? p.provider_name : String(p.provider_name || '');
                    return [name, p.scores?.technical ?? 0];
                }))
            },
            {
                subject: t('category.economic'),
                ...Object.fromEntries(providersList.map(p => {
                    const name = typeof p.provider_name === 'string' ? p.provider_name : String(p.provider_name || '');
                    return [name, p.scores?.economic ?? 0];
                }))
            },
            {
                subject: t('category.execution'),
                ...Object.fromEntries(providersList.map(p => {
                    const name = typeof p.provider_name === 'string' ? p.provider_name : String(p.provider_name || '');
                    return [name, p.scores?.execution ?? 0];
                }))
            },
            {
                subject: t('category.hse_compliance'),
                ...Object.fromEntries(providersList.map(p => {
                    const name = typeof p.provider_name === 'string' ? p.provider_name : String(p.provider_name || '');
                    return [name, p.scores?.hse_compliance ?? 0];
                }))
            }
        ];
    }, [hasConfiguration, dynamicCategories, recalculatedRanking, t]);

    // Calculate dynamic radar domain to spread clustered values
    const radarDomain = useMemo(() => {
        if (radarData.length === 0) return [0, 10] as [number, number];
        const providersList = recalculatedRanking;
        const allValues: number[] = [];
        radarData.forEach(row => {
            providersList.forEach(p => {
                const val = Number((row as any)[p.provider_name]);
                if (!isNaN(val) && val > 0) allValues.push(val);
            });
        });
        if (allValues.length === 0) return [0, 10] as [number, number];
        const minVal = Math.min(...allValues);
        const maxVal = Math.max(...allValues);
        const range = maxVal - minVal;
        // If values are clustered (range < 4), zoom in to spread them
        if (range < 4 && minVal > 2) {
            const floor = Math.max(0, Math.floor(minVal) - 2);
            const ceil = Math.min(10, Math.ceil(maxVal) + 1);
            return [floor, ceil] as [number, number];
        }
        return [0, 10] as [number, number];
    }, [radarData, recalculatedRanking]);

    // Prepare bar chart data - MUST be before any conditional returns
    const barChartData = useMemo(() => {
        return recalculatedRanking.map(p => {
            const rawName = typeof p.provider_name === 'string' ? p.provider_name : String(p.provider_name || '');
            const score = typeof p.overall_score === 'number' ? p.overall_score : Number(p.overall_score) || 0;
            return { name: displayProviderName(rawName), score, id: rawName };
        }).sort((a, b) => b.score - a.score);
    }, [recalculatedRanking]);

    /* ---------- Excel export (must be before conditional returns) ---------- */
    const handleExportExcel = useCallback(() => {
        if (!recalculatedRanking.length) return;
        const wb = XLSX.utils.book_new();

        const sorted = [...recalculatedRanking].sort((a, b) => b.overall_score - a.overall_score);
        const rankingData = sorted.map((p, i) => ({
            '#': i + 1,
            [t('board.econ_provider')]: displayProviderName(p.provider_name),
            [t('board.overall_score')]: parseFloat(p.overall_score.toFixed(2)),
        }));
        const wsRanking = XLSX.utils.json_to_sheet(rankingData);
        wsRanking['!cols'] = [{ wch: 4 }, { wch: 24 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, wsRanking, 'Ranking');

        if (radarData.length > 0) {
            const catData = radarData.map(row => {
                const r: Record<string, string | number> = { [t('board.col_category')]: String(row.subject) };
                sorted.forEach(p => {
                    r[displayProviderName(p.provider_name)] = parseFloat((Number((row as any)[p.provider_name]) || 0).toFixed(2));
                });
                return r;
            });
            const wsCat = XLSX.utils.json_to_sheet(catData);
            wsCat['!cols'] = [{ wch: 24 }, ...sorted.map(() => ({ wch: 18 }))];
            XLSX.utils.book_append_sheet(wb, wsCat, t('executive.radar.title'));
        }

        XLSX.writeFile(wb, `executive-summary-${new Date().toISOString().split('T')[0]}.xlsx`);
    }, [recalculatedRanking, radarData, t]);

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

    const providers = recalculatedRanking;

    // Get top 3 providers by score (sort a copy to get actual ranking)
    const sortedByScore = [...providers].sort((a, b) => b.overall_score - a.overall_score);
    const winner = sortedByScore[0];
    const runnerUp = sortedByScore[1];
    const thirdPlace = sortedByScore[2];

    // Calculate score gap
    const scoreGap = runnerUp ? winner.overall_score - runnerUp.overall_score : 0;

    // Identify strengths and weaknesses based on individual criterion scores (12 criteria)
    const individualScores = winner.individual_scores ? Object.entries(winner.individual_scores)
        .map(([criterionId, score]) => {
            // Ensure label is always a string primitive
            const rawLabel = CRITERIA_LABELS[criterionId] || criterionId;
            const label = typeof rawLabel === 'string' ? rawLabel : String(rawLabel || criterionId);
            // Ensure score is always a number
            const numScore = typeof score === 'number' ? score : Number(score) || 0;
            return {
                id: String(criterionId),
                label,
                score: numScore
            };
        })
        .filter(c => c.score > 0) // Only include criteria with actual scores
        : [];

    // Strengths: criteria with score >= 8 (top performers)
    const strengths = individualScores
        .filter(c => c.score >= 8)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4) // Limit to top 4 strengths
        .map(c => String(c.label)); // Ensure string

    // Weaknesses: the 3 lowest scoring criteria (regardless of threshold)
    const weaknesses = [...individualScores]
        .sort((a, b) => a.score - b.score)
        .slice(0, 3) // Take the 3 lowest scores
        .map(c => String(c.label)); // Ensure string

    // Helper for colors - uses dynamic provider color system
    const getColor = (id: string, _index: number) => {
        return getProviderColor(id, projectProviders);
    };

    // Stroke dash patterns for visual separation when lines overlap
    const STROKE_PATTERNS = ['', '8 4', '4 4', '12 4 4 4', '2 4', '16 4'];
    const getStrokePattern = (index: number): string => STROKE_PATTERNS[index % STROKE_PATTERNS.length];
    const getStrokeWidth = (index: number): number => index === 0 ? 3.5 : 2.5;

    // Rank-based fill opacity for gradient defs
    const getFillOpacity = (rank: number): [number, number] => {
        if (rank === 0) return [0.25, 0.08];
        if (rank === 1) return [0.15, 0.05];
        if (rank === 2) return [0.10, 0.03];
        return [0.05, 0.02];
    };

    // Convert hex color to rgba string
    const hexToRgba = (hex: string, alpha: number): string => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return `rgba(100,100,100,${alpha})`;
        return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
    };

    // Sanitize string for SVG id attributes (no spaces or special chars)
    const svgId = (str: string): string => str.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Custom dot renderer with offset for close values
    const renderCustomDot = (providerName: string, providerIdx: number) => (props: any) => {
        const { cx, cy, payload } = props;
        if (cx == null || cy == null) return null;

        const color = getColor(providerName, providerIdx);
        const baseR = providerIdx === 0 ? 6 : 4.5;
        const strokeW = 2;

        // Check for overlapping values and spread dots in a circle pattern
        let offsetX = 0;
        let offsetY = 0;
        if (payload) {
            const currentValue = Number(payload[providerName]) || 0;
            const closeNeighbors: number[] = [];
            sortedByScore.forEach((p, idx) => {
                const otherValue = Number(payload[p.provider_name]) || 0;
                if (Math.abs(currentValue - otherValue) < 0.5) {
                    closeNeighbors.push(idx);
                }
            });
            if (closeNeighbors.length > 1) {
                const posInCluster = closeNeighbors.indexOf(providerIdx);
                const angle = (2 * Math.PI * posInCluster) / closeNeighbors.length - Math.PI / 2;
                const mag = 5 + closeNeighbors.length * 2;
                offsetX = Math.cos(angle) * mag;
                offsetY = Math.sin(angle) * mag;
            }
        }

        // Dim non-highlighted providers
        const opacity = highlightedProvider
            ? (highlightedProvider === providerName ? 1 : 0.2)
            : 1;

        return (
            <circle
                cx={cx + offsetX}
                cy={cy + offsetY}
                r={baseR}
                fill={color}
                stroke="var(--bg-surface)"
                strokeWidth={strokeW}
                opacity={opacity}
            />
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Top Section: Winner & Stats */}
            <div>
                <div style={{
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-cyan))',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px 24px',
                    color: 'white',
                    boxShadow: '0 8px 20px rgba(18, 181, 176, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: 'fadeInScale 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                    {/* Decorative elements */}
                    <div style={{
                        position: 'absolute',
                        top: '-80px',
                        right: '-80px',
                        width: '200px',
                        height: '200px',
                        background: 'rgba(255, 255, 255, 0.12)',
                        borderRadius: '50%',
                        filter: 'blur(50px)'
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
                            gap: '20px',
                            flexWrap: 'wrap',
                            marginBottom: '20px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
                                {/* Award Icon */}
                                <div style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    backdropFilter: 'blur(10px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="8" r="7"></circle>
                                        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                                    </svg>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        opacity: 0.9,
                                        marginBottom: '4px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>
                                        {t('executive.winner')}
                                    </div>
                                    <h2 style={{
                                        margin: 0,
                                        fontSize: '1.4rem',
                                        fontWeight: 700,
                                        textShadow: '0 1px 4px rgba(0,0,0,0.15)'
                                    }}>
                                        {displayProviderName(winner.provider_name)}
                                    </h2>
                                    <div style={{
                                        marginTop: '8px',
                                        padding: '5px 12px',
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        borderRadius: '6px',
                                        display: 'inline-block',
                                        backdropFilter: 'blur(10px)',
                                        fontSize: '0.8rem',
                                        fontWeight: 600
                                    }}>
                                        {t('executive.score')}: <span style={{ fontSize: '1.1rem', marginLeft: '6px' }}>{winner.overall_score.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Export Excel Button */}
                            <button
                                onClick={handleExportExcel}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    transition: 'all 0.2s ease',
                                    backdropFilter: 'blur(10px)',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                                }}
                                title={t('board.export_excel')}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                </svg>
                                Excel
                            </button>

                            {/* Award Contract Button */}
                            {activeProjectId && (
                                resultsApprovedMap[activeProjectId] ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 20px',
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        borderRadius: '10px',
                                        backdropFilter: 'blur(10px)',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        flexShrink: 0
                                    }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        {t('executive.awarded_badge')}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            approveResults(activeProjectId);
                                            // Reload projects to recalculate status
                                            loadProjects();
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 24px',
                                            background: 'rgba(255, 255, 255, 0.95)',
                                            color: 'var(--color-primary)',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '0.9rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                            transition: 'all 0.2s ease',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                        }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        {t('executive.award')}
                                    </button>
                                )
                            )}

                        </div>

                        {/* Winner Analysis Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '12px'
                        }}>
                            {/* Lead Margin */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.12)',
                                borderRadius: '10px',
                                padding: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.15)'
                            }}>
                                <div style={{
                                    fontSize: '0.7rem',
                                    opacity: 0.85,
                                    marginBottom: '6px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.3px'
                                }}>
                                    {t('executive.lead_margin')} {runnerUp ? displayProviderName(runnerUp.provider_name) : 'N/A'}
                                </div>
                                <div style={{
                                    fontSize: '1.2rem',
                                    fontWeight: 700
                                }}>
                                    {scoreGap >= 0 ? '+' : ''}{scoreGap.toFixed(2)} {t('executive.pts')}
                                </div>
                                <div style={{
                                    fontSize: '0.7rem',
                                    opacity: 0.7,
                                    marginTop: '2px'
                                }}>
                                    {runnerUp && runnerUp.overall_score > 0 ? ((scoreGap / runnerUp.overall_score) * 100).toFixed(1) : '0.0'}% {t('executive.advantage')}
                                </div>
                            </div>

                            {/* Strengths */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.12)',
                                borderRadius: '10px',
                                padding: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.15)'
                            }}>
                                <div style={{
                                    fontSize: '0.7rem',
                                    opacity: 0.85,
                                    marginBottom: '6px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.3px'
                                }}>
                                    {t('executive.key_strengths')}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '4px'
                                }}>
                                    {strengths.length > 0 ? strengths.map((s, i) => (
                                        <span key={i} style={{
                                            background: 'rgba(34, 197, 94, 0.3)',
                                            padding: '3px 8px',
                                            borderRadius: '5px',
                                            fontSize: '0.68rem',
                                            fontWeight: 600,
                                            color: '#bbf7d0'
                                        }}>
                                            {s}
                                        </span>
                                    )) : (
                                        <span style={{
                                            fontSize: '0.75rem',
                                            opacity: 0.7
                                        }}>{t('executive.no_strengths')}</span>
                                    )}
                                </div>
                            </div>

                            {/* Weaknesses */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.12)',
                                borderRadius: '10px',
                                padding: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.15)'
                            }}>
                                <div style={{
                                    fontSize: '0.7rem',
                                    opacity: 0.85,
                                    marginBottom: '6px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.3px'
                                }}>
                                    {t('executive.areas_review')}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '4px'
                                }}>
                                    {weaknesses.length > 0 ? weaknesses.map((w, i) => (
                                        <span key={i} style={{
                                            background: 'rgba(251, 146, 60, 0.3)',
                                            padding: '3px 8px',
                                            borderRadius: '5px',
                                            fontSize: '0.68rem',
                                            fontWeight: 600,
                                            color: '#fed7aa'
                                        }}>
                                            {w}
                                        </span>
                                    )) : (
                                        <span style={{
                                            fontSize: '0.75rem',
                                            opacity: 0.7
                                        }}>{t('executive.no_data_available')}</span>
                                    )}
                                </div>
                            </div>

                            {/* Podium */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.12)',
                                borderRadius: '10px',
                                padding: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.15)'
                            }}>
                                <div style={{
                                    fontSize: '0.7rem',
                                    opacity: 0.85,
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.3px'
                                }}>
                                    {t('executive.top_rankings')}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '5px'
                                }}>
                                    {[winner, runnerUp, thirdPlace].filter(Boolean).map((p, i) => (
                                        <div key={p.provider_name} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '0.78rem',
                                            fontWeight: 600
                                        }}>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                color: 'rgba(255, 255, 255, 0.6)',
                                                minWidth: '20px'
                                            }}>
                                                #{i + 1}
                                            </span>
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayProviderName(p.provider_name)}</span>
                                            <span style={{
                                                background: 'rgba(255, 255, 255, 0.2)',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontSize: '0.7rem',
                                                flexShrink: 0
                                            }}>
                                                {p.overall_score.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ESG Badges for winner */}
                        {(winner?.esg_certifications?.filter(c => c.status !== 'not_detected')?.length ?? 0) > 0 && (
                            <div style={{
                                marginTop: '16px',
                                padding: '14px 16px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '10px',
                                border: '1px solid rgba(255, 255, 255, 0.15)'
                            }}>
                                <div style={{
                                    fontSize: '0.7rem',
                                    opacity: 0.85,
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.3px',
                                    fontWeight: 600
                                }}>
                                    {t('esg.winner_badges')}
                                </div>
                                <div style={{ filter: 'brightness(1.3)' }}>
                                    <EsgBadges
                                        certifications={winner.esg_certifications!}
                                        variant="compact"
                                        showNotDetected={false}
                                    />
                                </div>
                            </div>
                        )}
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
                minHeight: '460px',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                padding: '22px',
                animation: 'fadeInUp 0.5s ease-out 0.1s backwards'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
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
                        {radarDomain[0] > 0 && (
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--color-primary)',
                                fontWeight: 600,
                                marginTop: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                {t('executive.radar.scale_note')} ({radarDomain[0]}-{radarDomain[1]})
                            </div>
                        )}
                    </div>
                </div>
                <div style={{ width: '100%', height: '320px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="48%" outerRadius="76%" data={radarData}>
                            <defs>
                                {sortedByScore.map((p, i) => {
                                    const [topOpacity, bottomOpacity] = getFillOpacity(i);
                                    return (
                                        <linearGradient key={`gradient-${p.provider_name}`} id={`gradient-${svgId(p.provider_name)}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={getColor(p.provider_name, i)} stopOpacity={topOpacity} />
                                            <stop offset="100%" stopColor={getColor(p.provider_name, i)} stopOpacity={bottomOpacity} />
                                        </linearGradient>
                                    );
                                })}
                            </defs>
                            <PolarGrid
                                stroke="var(--border-color)"
                                strokeWidth={1}
                                strokeDasharray="3 3"
                                gridType="polygon"
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
                                domain={radarDomain}
                                tickCount={radarDomain[0] === 0 ? 6 : radarDomain[1] - radarDomain[0] + 1}
                                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                                stroke="var(--border-color)"
                            />
                            <Tooltip
                                content={({ label, payload }) => {
                                    if (!payload || payload.length === 0) return null;
                                    const sorted = [...payload].sort((a: any, b: any) => (b.value as number) - (a.value as number));
                                    return (
                                        <div style={{
                                            backgroundColor: 'var(--bg-surface)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '10px',
                                            boxShadow: 'var(--shadow-lg)',
                                            padding: '12px 16px',
                                            minWidth: '180px'
                                        }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {label}
                                            </div>
                                            {sorted.map((entry: any, idx: number) => (
                                                <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', fontSize: '0.85rem' }}>
                                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
                                                    <span style={{ flex: 1, fontWeight: idx === 0 ? 700 : 500, color: 'var(--text-primary)' }}>{entry.name}</span>
                                                    <span style={{ fontWeight: 700, color: entry.color }}>{Number(entry.value).toFixed(1)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }}
                            />
                            {/* Render in reverse order so the top provider (index 0) draws on top in SVG */}
                            {[...sortedByScore].reverse().map((p) => {
                                const origIdx = sortedByScore.findIndex(s => s.provider_name === p.provider_name);
                                const isHighlighted = highlightedProvider === p.provider_name;
                                const isDimmed = highlightedProvider && !isHighlighted;
                                return (
                                    <Radar
                                        key={p.provider_name}
                                        name={displayProviderName(p.provider_name)}
                                        dataKey={p.provider_name}
                                        stroke={getColor(p.provider_name, origIdx)}
                                        fill={`url(#gradient-${svgId(p.provider_name)})`}
                                        strokeWidth={isHighlighted ? 4 : getStrokeWidth(origIdx)}
                                        strokeDasharray={getStrokePattern(origIdx)}
                                        strokeOpacity={isDimmed ? 0.2 : 1}
                                        fillOpacity={isDimmed ? 0.05 : 1}
                                        dot={renderCustomDot(p.provider_name, origIdx)}
                                        activeDot={{ r: 7, strokeWidth: 2, stroke: 'var(--bg-surface)' }}
                                        onMouseEnter={() => setHighlightedProvider(p.provider_name)}
                                        onMouseLeave={() => setHighlightedProvider(null)}
                                        style={{ transition: 'stroke-opacity 0.2s ease, fill-opacity 0.2s ease' }}
                                        isAnimationActive={true}
                                        animationDuration={800}
                                        animationBegin={origIdx * 150}
                                    />
                                );
                            })}
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* External legend to avoid shrinking radar plot area */}
                <div style={{
                    marginTop: '8px',
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}>
                    {sortedByScore.map((p, i) => {
                        const isDimmed = highlightedProvider && highlightedProvider !== p.provider_name;
                        return (
                            <div
                                key={`radar-legend-${p.provider_name}`}
                                onMouseEnter={() => setHighlightedProvider(p.provider_name)}
                                onMouseLeave={() => setHighlightedProvider(null)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    opacity: isDimmed ? 0.35 : 1,
                                    cursor: 'pointer',
                                    transition: 'opacity 0.2s ease'
                                }}
                            >
                                <span style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: getColor(p.provider_name, i),
                                    flexShrink: 0
                                }} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    <span title={displayProviderName(p.provider_name)}>
                                        {getCompactProviderLabel(p.provider_name, 16)}
                                    </span>
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Score Comparison Mini-Table */}
                {radarData.length > 0 && (
                    <div style={{ marginTop: '10px', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={{
                                        textAlign: 'left',
                                        padding: '5px 8px',
                                        borderBottom: '2px solid var(--border-color)',
                                        color: 'var(--text-secondary)',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        background: 'var(--bg-surface)',
                                    }}>
                                        {t('executive.radar.title')}
                                    </th>
                                    {sortedByScore.map((p, i) => (
                                        <th key={p.provider_name} style={{
                                            textAlign: 'center',
                                            padding: '5px 8px',
                                            borderBottom: '2px solid var(--border-color)',
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                            whiteSpace: 'nowrap',
                                            cursor: 'pointer',
                                            opacity: highlightedProvider && highlightedProvider !== p.provider_name ? 0.4 : 1,
                                            background: 'var(--bg-surface)',
                                        }}
                                            onMouseEnter={() => setHighlightedProvider(p.provider_name)}
                                            onMouseLeave={() => setHighlightedProvider(null)}
                                        >
                                            <span style={{
                                                display: 'inline-block',
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                background: getColor(p.provider_name, i),
                                                marginRight: 4,
                                                verticalAlign: 'middle',
                                            }} />
                                            <span style={{ color: 'var(--text-primary)', verticalAlign: 'middle' }}>
                                                <span title={displayProviderName(p.provider_name)}>
                                                    {getCompactProviderLabel(p.provider_name, 14)}
                                                </span>
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {radarData.map((row) => (
                                    <tr key={row.subject}>
                                        <td style={{
                                            padding: '4px 8px',
                                            color: 'var(--text-primary)',
                                            fontWeight: 500,
                                            borderBottom: '1px solid var(--border-color)',
                                        }}>
                                            {row.subject}
                                        </td>
                                        {sortedByScore.map((p, i) => {
                                            const val = Number((row as any)[p.provider_name]) || 0;
                                            const intensity = Math.min(val / 10, 1);
                                            const color = getColor(p.provider_name, i);
                                            const isHl = highlightedProvider === p.provider_name;
                                            const isDim = highlightedProvider && !isHl;
                                            return (
                                                <td key={p.provider_name} style={{
                                                    textAlign: 'center',
                                                    padding: '4px 8px',
                                                    fontWeight: 600,
                                                    borderBottom: '1px solid var(--border-color)',
                                                    background: hexToRgba(color, intensity * 0.2),
                                                    color: 'var(--text-primary)',
                                                    opacity: isDim ? 0.3 : 1,
                                                    transition: 'opacity 0.2s ease',
                                                }}
                                                    onMouseEnter={() => setHighlightedProvider(p.provider_name)}
                                                    onMouseLeave={() => setHighlightedProvider(null)}
                                                >
                                                    {val.toFixed(1)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Bar Chart */}
            <div className="widget-card" style={{
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                padding: '20px',
                animation: 'fadeInUp 0.5s ease-out 0.2s backwards'
            }}>
                <div style={{
                    marginBottom: '12px'
                }}>
                    <div>
                        <div className="widget-title" style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>
                            {t('executive.bar.title')}
                        </div>
                        <div style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 500
                        }}>
                            {t('executive.bar.subtitle')}
                        </div>
                    </div>
                </div>
                <div style={{ flex: 1, width: '100%', minHeight: '200px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={barChartData}
                            layout="vertical"
                            margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
                        >
                            <defs>
                                {barChartData.map((entry, index) => (
                                    <linearGradient key={`bar-gradient-${entry.id}`} id={`bar-gradient-${svgId(entry.id)}`} x1="0" y1="0" x2="1" y2="0">
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
                                width={140}
                                tick={(props: any) => {
                                    const { x, y, payload } = props;
                                    const name = payload.value || '';
                                    const maxLen = 18;
                                    const display = name.length > maxLen ? name.slice(0, maxLen) + '...' : name;
                                    return (
                                        <g>
                                            <title>{name}</title>
                                            <text x={x - 4} y={y} textAnchor="end" fill="var(--text-primary)" fontSize={11} fontWeight={600} dominantBaseline="middle">
                                                {display}
                                            </text>
                                        </g>
                                    );
                                }}
                                stroke="var(--border-color)"
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'var(--bg-hover)', opacity: 0.3 }}
                                allowEscapeViewBox={{ x: true, y: true }}
                                wrapperStyle={{ zIndex: 20 }}
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
                                        fill={`url(#bar-gradient-${svgId(entry.id)})`}
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
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                padding: '20px',
                animation: 'fadeInUp 0.5s ease-out 0.3s backwards'
            }}>
                <div style={{
                    marginBottom: '12px'
                }}>
                    <div>
                        <div className="widget-title" style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>
                            {t('executive.criteria_weight')}
                        </div>
                        <div style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 500
                        }}>
                            {t('executive.scoring_impact')}
                        </div>
                    </div>
                </div>
                <div style={{ flex: 1, width: '100%', minHeight: '240px', display: 'flex', alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <defs>
                                {/* Dynamic gradients for each category */}
                                {hasConfiguration && dynamicCategories.length > 0 ? (
                                    dynamicCategories.filter(cat => cat && cat.name).map((cat) => {
                                        const catName = typeof cat.name === 'string' ? cat.name : String(cat.name || '');
                                        const catColor = typeof cat.color === 'string' ? cat.color : '#12b5b0';
                                        return (
                                            <linearGradient key={`gradient-${catName}`} id={`gradient-${catName}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={catColor} stopOpacity={0.9} />
                                                <stop offset="100%" stopColor={catColor} stopOpacity={0.7} />
                                            </linearGradient>
                                        );
                                    })
                                ) : (
                                    <>
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
                                    </>
                                )}
                            </defs>
                            <Pie
                                data={hasConfiguration && dynamicCategories.length > 0
                                    ? dynamicCategories.filter(cat => cat && cat.name).map(cat => {
                                        const displayName = typeof cat.display_name === 'string' ? cat.display_name : String(cat.display_name || cat.name || '');
                                        const catName = typeof cat.name === 'string' ? cat.name : String(cat.name || '');
                                        const weight = typeof cat.weight === 'number' ? cat.weight : Number(cat.weight) || 0;
                                        return {
                                            name: displayName,
                                            value: weight,
                                            color: `url(#gradient-${catName})`
                                        };
                                      })
                                    : [
                                        { name: t('category.technical'), value: categoryWeights.TECHNICAL || 30, color: 'url(#tech-gradient)' },
                                        { name: t('category.economic'), value: categoryWeights.ECONOMIC || 35, color: 'url(#econ-gradient)' },
                                        { name: t('category.execution'), value: categoryWeights.EXECUTION || 20, color: 'url(#exec-gradient)' },
                                        { name: t('category.hse_compliance'), value: categoryWeights['HSE_COMPLIANCE'] || 15, color: 'url(#hse-gradient)' }
                                      ]
                                }
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={false}
                                outerRadius="78%"
                                innerRadius="44%"
                                dataKey="value"
                                animationBegin={300}
                                animationDuration={800}
                            >
                                {(hasConfiguration && dynamicCategories.length > 0
                                    ? dynamicCategories.filter(cat => cat && cat.name).map(cat => {
                                        const displayName = typeof cat.display_name === 'string' ? cat.display_name : String(cat.display_name || cat.name || '');
                                        const catName = typeof cat.name === 'string' ? cat.name : String(cat.name || '');
                                        const weight = typeof cat.weight === 'number' ? cat.weight : Number(cat.weight) || 0;
                                        return {
                                            name: displayName,
                                            value: weight,
                                            color: `url(#gradient-${catName})`
                                        };
                                      })
                                    : [
                                        { name: t('category.technical'), value: categoryWeights.TECHNICAL || 30, color: 'url(#tech-gradient)' },
                                        { name: t('category.economic'), value: categoryWeights.ECONOMIC || 35, color: 'url(#econ-gradient)' },
                                        { name: t('category.execution'), value: categoryWeights.EXECUTION || 20, color: 'url(#exec-gradient)' },
                                        { name: t('category.hse_compliance'), value: categoryWeights['HSE_COMPLIANCE'] || 15, color: 'url(#hse-gradient)' }
                                      ]
                                ).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={String(entry.color)} stroke="var(--bg-surface)" strokeWidth={3} />
                                ))}
                            </Pie>
                            <Tooltip
                                allowEscapeViewBox={{ x: true, y: true }}
                                wrapperStyle={{ zIndex: 20 }}
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
                                height={80}
                                wrapperStyle={{
                                    paddingTop: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                }}
                                iconType="circle"
                                formatter={(value: string, entry: any) => {
                                    const weight = entry?.payload?.value;
                                    return (
                                        <span style={{ color: 'var(--text-primary)', fontSize: '0.75rem' }}>
                                            {value} ({weight}%)
                                        </span>
                                    );
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            </div>
        </div>
    );
};
