import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import {
    Printer, Trophy, AlertTriangle, AlertCircle, Info,
    ShieldCheck, TrendingUp, DollarSign, Target, BarChart3, FileText, Leaf, PieChart,
    Download, FileSpreadsheet, CheckCircle, XCircle, User
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ESG_CATALOG, ESG_CATEGORY_LABELS } from '../../../types/esg.types';
import type { ESGCertification } from '../../../types/esg.types';
import { useScoringStore } from '../../../stores/useScoringStore';
import { useScoringConfigStore } from '../../../stores/useScoringConfigStore';
import { useEconomicStore } from '../../../stores/useEconomicStore';
import { useProjectStore } from '../../../stores/useProjectStore';
import { useProviderStore } from '../../../stores/useProviderStore';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { usePdfTemplateStore } from '../../../stores/usePdfTemplateStore';
import { getProviderColor } from '../../../types/provider.types';
import { downloadBoardReportPdf } from './BoardReportPdf';
import type { BoardReportPdfData } from './BoardReportPdf';
import './BoardReport.css';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Capitalize each word: "ACME CORP" -> "Acme Corp" */
const displayName = (name: string) =>
    name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

/** Normalize for matching between stores */
const norm = (s: string) => s.toUpperCase().trim();

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

const BoardReport: React.FC = () => {
    const { scoringResults, customWeights, refreshScoring } = useScoringStore();
    const { categories, hasConfiguration, loadConfiguration } = useScoringConfigStore();
    const { offers, comparison, loadOffers } = useEconomicStore();
    const { getActiveProject, activeProjectId } = useProjectStore();
    const { projectProviders } = useProviderStore();
    const { t, language } = useLanguageStore();
    const pdfConfig = usePdfTemplateStore();

    const project = getActiveProject();
    const reportRef = useRef<HTMLDivElement>(null);

    /* Reload all data when active project changes */
    useEffect(() => {
        refreshScoring();
        loadOffers();
        if (activeProjectId) {
            loadConfiguration(activeProjectId);
        }
    }, [activeProjectId, refreshScoring, loadOffers, loadConfiguration]);

    /* ---------- sorted ranking (recalculated with current weights) ---------- */
    const sortedRanking = useMemo(() => {
        if (!scoringResults?.ranking) return [];

        const cats = Array.isArray(categories) ? categories : [];

        // Build criteria list with actual weights (mirrors ScoringMatrix logic)
        const criteria: Array<{ id: string; category: string; weight: number }> = [];
        if (hasConfiguration && cats.length > 0) {
            cats.forEach(cat => {
                if (!cat?.name) return;
                const catCriteria = Array.isArray(cat.criteria) ? cat.criteria : [];
                const criteriaSum = catCriteria.reduce((s, c) => s + (c.weight || 0), 0);
                const isRelative = catCriteria.length > 0 && Math.abs(criteriaSum - 100) < 1;
                catCriteria.forEach(crit => {
                    if (!crit?.name) return;
                    const actualWeight = isRelative
                        ? ((crit.weight || 0) * (cat.weight || 0)) / 100
                        : (crit.weight || 0);
                    criteria.push({
                        id: String(crit.name),
                        category: String(cat.name),
                        weight: parseFloat(actualWeight.toFixed(2)),
                    });
                });
            });
        }

        // Build category weights map
        const catWeightsMap: Record<string, number> = {};
        if (hasConfiguration && cats.length > 0) {
            cats.forEach(cat => {
                if (cat?.name) catWeightsMap[String(cat.name)] = Number(cat.weight) || 0;
            });
        }

        // Recalculate scores with current weights (same formula as ScoringMatrix)
        const recalculated = scoringResults.ranking.map(provider => {
            if (criteria.length === 0) return provider; // No config, use raw DB scores

            const individualScores = provider.individual_scores || {};

            // Recalculate overall score: sum(score_i * weight_i / 100)
            const newOverall = criteria.reduce((total, crit) => {
                const score = individualScores[crit.id] || 0;
                const weight = customWeights[crit.id] ?? crit.weight ?? 0;
                return total + (score * weight / 100);
            }, 0);

            // Recalculate category scores
            const newScores: Record<string, number> = {};
            for (const [catName, catWeight] of Object.entries(catWeightsMap)) {
                const catCriteria = criteria.filter(c => c.category === catName);
                if (catWeight > 0 && catCriteria.length > 0) {
                    const weightedSum = catCriteria.reduce((sum, c) => {
                        const score = individualScores[c.id] || 0;
                        const w = customWeights[c.id] ?? c.weight ?? 0;
                        return sum + (score * w);
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

        return recalculated.sort((a, b) => b.overall_score - a.overall_score);
    }, [scoringResults, categories, hasConfiguration, customWeights]);

    const winner = sortedRanking[0];
    const runnerUp = sortedRanking[1];

    /* ---------- scatter data ---------- */
    const scatterData = useMemo(() => {
        if (!sortedRanking.length || !comparison.length) return [];
        return sortedRanking.map(p => {
            const econ = comparison.find(c => norm(c.provider_name) === norm(p.provider_name));
            return {
                name: p.provider_name,
                score: p.overall_score,
                price: econ?.net_price ?? null,
                color: getProviderColor(p.provider_name, projectProviders),
            };
        }).filter(d => d.price !== null) as { name: string; score: number; price: number; color: string }[];
    }, [sortedRanking, comparison, projectProviders]);

    /* ---------- differentiating criteria ---------- */
    const differentiatingCriteria = useMemo(() => {
        if (!winner || !runnerUp) return [];
        const result: { key: string; winnerScore: number; runnerUpScore: number; diff: number }[] = [];
        for (const [key, val] of Object.entries(winner.individual_scores)) {
            const runnerVal = runnerUp.individual_scores[key] ?? 0;
            const diff = val - runnerVal;
            if (diff > 1) {
                result.push({ key, winnerScore: val, runnerUpScore: runnerVal, diff });
            }
        }
        return result.sort((a, b) => b.diff - a.diff);
    }, [winner, runnerUp]);

    /* ---------- scoring criteria from config ---------- */
    const scoringCriteria = useMemo(() => {
        const cats = Array.isArray(categories) ? categories : [];
        if (!hasConfiguration || cats.length === 0) return [];
        const criteria: Array<{ id: string; category: string; weight: number; displayName: string }> = [];
        cats.forEach(cat => {
            if (!cat?.name) return;
            const catCriteria = Array.isArray(cat.criteria) ? cat.criteria : [];
            const criteriaSum = catCriteria.reduce((s, c) => s + (c.weight || 0), 0);
            const isRelative = catCriteria.length > 0 && Math.abs(criteriaSum - 100) < 1;
            catCriteria.forEach(crit => {
                if (!crit?.name) return;
                const actualWeight = isRelative
                    ? ((crit.weight || 0) * (cat.weight || 0)) / 100
                    : (crit.weight || 0);
                const label = language === 'es' && crit.display_name_es
                    ? crit.display_name_es
                    : crit.display_name || crit.name;
                criteria.push({
                    id: String(crit.name),
                    category: String(cat.name),
                    weight: parseFloat(actualWeight.toFixed(2)),
                    displayName: label,
                });
            });
        });
        return criteria;
    }, [hasConfiguration, categories, language]);

    /* ---------- confidence calculation ---------- */
    const confidence = useMemo(() => {
        if (!sortedRanking.length) return { overall: 0, coverage: 0, extraction: 0, completeness: 0, differentiation: 0 };

        // Factor 1: Requirements coverage (30%)
        const avgCompliance = sortedRanking.reduce((s, p) => s + p.compliance_percentage, 0) / sortedRanking.length;
        const coverage = Math.min(avgCompliance, 100);

        // Factor 2: Economic extraction confidence (25%)
        const offersWithConf = offers.filter(o => o.extraction_confidence != null);
        const extraction = offersWithConf.length > 0
            ? (offersWithConf.reduce((s, o) => s + (o.extraction_confidence ?? 0), 0) / offersWithConf.length) * 100
            : 50;

        // Factor 3: Data completeness (25%) - % of criteria with score > 0
        let totalSlots = 0;
        let filledSlots = 0;
        sortedRanking.forEach(p => {
            const scores = Object.values(p.individual_scores);
            totalSlots += scores.length;
            filledSlots += scores.filter(s => s > 0).length;
        });
        const completeness = totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0;

        // Factor 4: Differentiation (20%) - spread between best and worst
        const best = sortedRanking[0]?.overall_score ?? 0;
        const worst = sortedRanking[sortedRanking.length - 1]?.overall_score ?? 0;
        const spread = best - worst;
        const differentiation = spread > 2 ? 100 : spread > 1 ? 70 : spread > 0.5 ? 40 : 20;

        const overall = coverage * 0.30 + extraction * 0.25 + completeness * 0.25 + differentiation * 0.20;

        return { overall, coverage, extraction, completeness, differentiation };
    }, [sortedRanking, offers]);

    /* ---------- risks ---------- */
    const risks = useMemo(() => {
        const items: { severity: 'high' | 'medium' | 'low'; message: string }[] = [];
        if (!sortedRanking.length) return items;

        // Providers without economic data
        const provNamesWithEcon = new Set(comparison.map(c => norm(c.provider_name)));
        const withoutEcon = sortedRanking.filter(p => !provNamesWithEcon.has(norm(p.provider_name)));
        withoutEcon.forEach(p => {
            items.push({ severity: 'high', message: t('board.risk_no_economic', { provider: displayName(p.provider_name) }) });
        });

        // Compliance < 60%
        sortedRanking.forEach(p => {
            if (p.compliance_percentage < 60 && p.compliance_percentage > 0) {
                items.push({ severity: 'high', message: t('board.risk_low_compliance', { provider: displayName(p.provider_name), pct: p.compliance_percentage.toFixed(0) }) });
            }
        });

        // Very close scores (#1 vs #2)
        if (winner && runnerUp) {
            const gap = winner.overall_score - runnerUp.overall_score;
            if (gap < 0.5) {
                items.push({ severity: 'medium', message: t('board.risk_close_scores', { gap: gap.toFixed(2) }) });
            }
        }

        // Cheapest provider = worst score
        if (comparison.length > 0 && sortedRanking.length > 0) {
            const cheapest = comparison[0];
            const worstScorer = sortedRanking[sortedRanking.length - 1];
            if (cheapest && worstScorer && norm(cheapest.provider_name) === norm(worstScorer.provider_name)) {
                items.push({ severity: 'medium', message: t('board.risk_cheapest_worst', { provider: displayName(cheapest.provider_name) }) });
            }
        }

        return items;
    }, [sortedRanking, comparison, winner, runnerUp, t]);

    /* ---------- economic red flags ---------- */
    const economicFlags = useMemo(() => {
        const flags: Record<string, string[]> = {};
        if (!comparison.length) return flags;

        const cheapestPrice = comparison[0]?.net_price ?? 0;

        comparison.forEach(c => {
            const provFlags: string[] = [];
            if (cheapestPrice > 0 && c.net_price > cheapestPrice * 2) {
                provFlags.push(t('board.flag_price_2x'));
            }
            if (c.discount_percentage > 40) {
                provFlags.push(t('board.flag_high_discount'));
            }
            flags[norm(c.provider_name)] = provFlags;
        });

        offers.forEach(o => {
            if (o.extraction_confidence != null && o.extraction_confidence < 0.5) {
                const key = norm(o.provider_name);
                if (!flags[key]) flags[key] = [];
                flags[key].push(t('board.flag_low_confidence'));
            }
        });

        sortedRanking.forEach(p => {
            const key = norm(p.provider_name);
            if (!comparison.find(c => norm(c.provider_name) === key)) {
                if (!flags[key]) flags[key] = [];
                flags[key].push(t('board.flag_no_data'));
            }
        });

        return flags;
    }, [comparison, offers, sortedRanking, t]);

    /* ---------- currency formatter ---------- */
    const currencyFormatter = useMemo(() => {
        const cur = project?.currency || 'EUR';
        return new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-US', {
            style: 'currency',
            currency: cur,
            maximumFractionDigits: 0,
        });
    }, [project?.currency, language]);

    /* ---------- category label helper ---------- */
    const getCategoryLabel = useCallback((cat: { display_name: string; display_name_es?: string; name: string }) => {
        if (language === 'es' && cat.display_name_es) return cat.display_name_es;
        return cat.display_name || cat.name;
    }, [language]);

    /* ---------- confidence level helper ---------- */
    const getConfidenceLevel = (value: number): 'high' | 'medium' | 'low' => {
        if (value >= 75) return 'high';
        if (value >= 50) return 'medium';
        return 'low';
    };

    /* ---------- PDF export (react-pdf/renderer) ---------- */
    const handleDownloadPdf = useCallback(async () => {
        if (!sortedRanking.length || !winner) return;

        // Build category data for PDF
        const cats = Array.isArray(categories) ? categories : [];
        const pdfCategories: BoardReportPdfData['categories'] = cats.map(cat => {
            const catCriteria = scoringCriteria.filter(c => c.category === cat.name);
            return {
                name: getCategoryLabel(cat),
                weight: cat.weight || 0,
                criteria: catCriteria.map(crit => {
                    const providerScores: Record<string, number> = {};
                    sortedRanking.forEach(p => {
                        providerScores[displayName(p.provider_name)] = p.individual_scores?.[crit.id] ?? 0;
                    });
                    return {
                        name: crit.displayName,
                        weight: crit.weight,
                        providerScores,
                    };
                }),
            };
        });

        // Build economic data for PDF
        const cheapestPrice = comparison[0]?.net_price ?? 1;
        const pdfEconomic: BoardReportPdfData['economic'] = comparison.map((c, i) => {
            const vsCheapest = cheapestPrice > 0 ? ((c.net_price - cheapestPrice) / cheapestPrice) * 100 : 0;
            const offer = offers.find(o => norm(o.provider_name) === norm(c.provider_name));
            const flags = economicFlags[norm(c.provider_name)] || [];
            return {
                name: displayName(c.provider_name),
                price: c.total_price ?? null,
                discount: c.discount_percentage,
                net: c.net_price,
                vsCheapest: i === 0 ? t('board.cheapest') : `+${vsCheapest.toFixed(1)}%`,
                tco: offer?.tco_value ?? null,
                flags,
            };
        });

        const pdfData: BoardReportPdfData = {
            project: {
                name: project?.display_name || '',
                type: project?.project_type || '',
                ref: project?.reference_code || '',
                date: new Date(scoringResults?.statistics?.evaluation_date || Date.now()).toLocaleDateString(
                    language === 'es' ? 'es-ES' : 'en-US',
                    { year: 'numeric', month: 'long', day: 'numeric' }
                ),
                currency: project?.currency || 'EUR',
            },
            pdfConfig: {
                companyName: pdfConfig.companyName,
                logoDataUrl: pdfConfig.logoDataUrl,
                primaryColor: pdfConfig.primaryColor,
                footerText: pdfConfig.footerText,
                showPageNumbers: pdfConfig.showPageNumbers,
            },
            winner: {
                name: displayName(winner.provider_name),
                score: winner.overall_score,
                margin: runnerUp ? winner.overall_score - runnerUp.overall_score : 0,
                summary: winner.summary,
            },
            ranking: sortedRanking.map((p, i) => ({
                position: i + 1,
                name: displayName(p.provider_name),
                score: p.overall_score,
                compliance: p.compliance_percentage,
            })),
            categories: pdfCategories,
            economic: pdfEconomic,
            confidence: {
                overall: confidence.overall,
                level: getConfidenceLevel(confidence.overall),
            },
            risks,
            recommendations: winner.recommendations || [],
            providers: sortedRanking.map((p, i) => ({
                name: displayName(p.provider_name),
                rank: i + 1,
                score: p.overall_score,
                summary: p.summary,
                strengths: p.strengths || [],
                weaknesses: p.weaknesses || [],
            })),
            language,
            t,
        };

        try {
            await downloadBoardReportPdf(pdfData);
        } catch (err) {
            console.error('PDF generation failed:', err);
        }
    }, [
        sortedRanking, winner, runnerUp, categories, scoringCriteria, comparison,
        offers, economicFlags, confidence, risks, project, scoringResults,
        language, t, pdfConfig, getCategoryLabel,
    ]);

    /* ---------- Excel export ---------- */
    const handleExportExcel = useCallback(() => {
        if (!sortedRanking.length) return;
        const wb = XLSX.utils.book_new();

        // Sheet 1: Ranking
        const rankingData = sortedRanking.map((p, i) => ({
            '#': i + 1,
            [t('board.econ_provider')]: displayName(p.provider_name),
            [t('board.overall_score')]: parseFloat(p.overall_score.toFixed(2)),
            [`${t('board.section_confidence')} %`]: parseFloat(p.compliance_percentage.toFixed(1)),
        }));
        const wsRanking = XLSX.utils.json_to_sheet(rankingData);
        wsRanking['!cols'] = [{ wch: 4 }, { wch: 24 }, { wch: 14 }, { wch: 16 }];
        XLSX.utils.book_append_sheet(wb, wsRanking, 'Ranking');

        // Sheet 2: Category Scores
        if (hasConfiguration && categories.length > 0) {
            const catData: Record<string, string | number>[] = [];
            categories.forEach(cat => {
                const row: Record<string, string | number> = {
                    [t('board.col_category')]: getCategoryLabel(cat),
                    [t('board.col_weight')]: `${cat.weight}%`,
                };
                sortedRanking.forEach(p => {
                    const catKey = cat.name.toLowerCase();
                    row[displayName(p.provider_name)] = parseFloat((p.scores?.[catKey] ?? 0).toFixed(2));
                });
                catData.push(row);
            });
            const wsCat = XLSX.utils.json_to_sheet(catData);
            wsCat['!cols'] = [{ wch: 24 }, { wch: 8 }, ...sortedRanking.map(() => ({ wch: 18 }))];
            XLSX.utils.book_append_sheet(wb, wsCat, t('board.section_categories'));
        }

        // Sheet 3: Economic Comparison
        if (comparison.length > 0) {
            const econData = comparison.map(c => {
                const cheapest = comparison[0]?.net_price ?? 1;
                const vsCheapest = cheapest > 0 ? ((c.net_price - cheapest) / cheapest) * 100 : 0;
                return {
                    [t('board.econ_provider')]: displayName(c.provider_name),
                    [t('board.econ_price')]: c.total_price ?? '-',
                    [t('board.econ_discount')]: c.discount_percentage > 0 ? `${c.discount_percentage.toFixed(1)}%` : '-',
                    [t('board.econ_net')]: c.net_price,
                    [t('board.econ_vs_cheapest')]: comparison.indexOf(c) === 0 ? t('board.cheapest') : `+${vsCheapest.toFixed(1)}%`,
                };
            });
            const wsEcon = XLSX.utils.json_to_sheet(econData);
            wsEcon['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(wb, wsEcon, t('board.section_economic'));
        }

        const projectName = project?.display_name || 'board-report';
        XLSX.writeFile(wb, `${projectName.replace(/\s+/g, '-')}-board-report.xlsx`);
    }, [sortedRanking, categories, comparison, hasConfiguration, project, t, language]);

    /* ================================================================ */
    /*  EMPTY STATE                                                     */
    /* ================================================================ */
    if (!scoringResults?.ranking?.length) {
        return (
            <div className="board-report board-empty">
                <FileText size={48} />
                <h3>{t('board.no_data_title')}</h3>
                <p>{t('board.no_data_desc')}</p>
            </div>
        );
    }

    /* ================================================================ */
    /*  SCATTER PLOT                                                    */
    /* ================================================================ */
    const renderScatterPlot = () => {
        if (!scatterData.length) {
            return (
                <div className="board-scatter-empty">
                    <Target size={32} />
                    <p>{t('board.no_economic_for_chart')}</p>
                </div>
            );
        }

        const prices = scatterData.map(d => d.price);
        const scores = scatterData.map(d => d.score);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);

        const pricePad = (maxPrice - minPrice) * 0.15 || maxPrice * 0.1;
        const scorePad = (maxScore - minScore) * 0.15 || 0.5;

        const xMin = minPrice - pricePad;
        const xMax = maxPrice + pricePad;
        const yMin = Math.max(0, minScore - scorePad);
        const yMax = Math.min(10, maxScore + scorePad);

        const medianPrice = (minPrice + maxPrice) / 2;
        const medianScore = (minScore + maxScore) / 2;

        const pad = { top: 30, right: 30, bottom: 50, left: 70 };
        const w = 500;
        const h = 400;
        const plotW = w - pad.left - pad.right;
        const plotH = h - pad.top - pad.bottom;

        const toX = (price: number) => pad.left + ((price - xMin) / (xMax - xMin)) * plotW;
        const toY = (score: number) => pad.top + plotH - ((score - yMin) / (yMax - yMin)) * plotH;

        const xTicks = 5;
        const yTicks = 5;
        const xStep = (xMax - xMin) / xTicks;
        const yStep = (yMax - yMin) / yTicks;

        return (
            <svg viewBox={`0 0 ${w} ${h}`}>
                {/* Best Value quadrant background (top-left) */}
                <rect
                    x={pad.left} y={pad.top}
                    width={toX(medianPrice) - pad.left}
                    height={toY(medianScore) - pad.top}
                    fill="var(--color-success)" opacity="0.06"
                />

                {/* Axes */}
                <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotH}
                    className="board-scatter-axis" />
                <line x1={pad.left} y1={pad.top + plotH} x2={pad.left + plotW} y2={pad.top + plotH}
                    className="board-scatter-axis" />

                {/* Median dashed lines */}
                <line x1={toX(medianPrice)} y1={pad.top} x2={toX(medianPrice)} y2={pad.top + plotH}
                    className="board-scatter-grid" />
                <line x1={pad.left} y1={toY(medianScore)} x2={pad.left + plotW} y2={toY(medianScore)}
                    className="board-scatter-grid" />

                {/* Quadrant labels */}
                <text x={pad.left + 8} y={pad.top + 16} className="board-scatter-quadrant-label"
                    fill="var(--color-success)" fontWeight="600" opacity="0.7">
                    {t('board.quadrant_best_value')}
                </text>
                <text x={pad.left + plotW - 8} y={pad.top + 16} className="board-scatter-quadrant-label"
                    textAnchor="end" opacity="0.5">
                    {t('board.quadrant_premium')}
                </text>
                <text x={pad.left + 8} y={pad.top + plotH - 8} className="board-scatter-quadrant-label"
                    opacity="0.5">
                    {t('board.quadrant_economic')}
                </text>
                <text x={pad.left + plotW - 8} y={pad.top + plotH - 8} className="board-scatter-quadrant-label"
                    fill="var(--color-error)" fontWeight="600" textAnchor="end" opacity="0.7">
                    {t('board.quadrant_avoid')}
                </text>

                {/* X axis ticks */}
                {Array.from({ length: xTicks + 1 }).map((_, i) => {
                    const val = xMin + i * xStep;
                    const x = toX(val);
                    return (
                        <g key={`xt-${i}`}>
                            <line x1={x} y1={pad.top + plotH} x2={x} y2={pad.top + plotH + 4}
                                className="board-scatter-axis" />
                            <text x={x} y={pad.top + plotH + 18} fontSize="9"
                                fill="var(--text-secondary)" textAnchor="middle">
                                {currencyFormatter.format(val)}
                            </text>
                        </g>
                    );
                })}
                <text x={w / 2} y={h - 4} fontSize="10" fill="var(--text-secondary)"
                    textAnchor="middle" fontWeight="500">
                    {t('board.axis_price')}
                </text>

                {/* Y axis ticks */}
                {Array.from({ length: yTicks + 1 }).map((_, i) => {
                    const val = yMin + i * yStep;
                    const y = toY(val);
                    return (
                        <g key={`yt-${i}`}>
                            <line x1={pad.left - 4} y1={y} x2={pad.left} y2={y}
                                className="board-scatter-axis" />
                            <text x={pad.left - 8} y={y + 3} fontSize="9"
                                fill="var(--text-secondary)" textAnchor="end">
                                {val.toFixed(1)}
                            </text>
                        </g>
                    );
                })}
                <text x={14} y={h / 2} fontSize="10" fill="var(--text-secondary)"
                    textAnchor="middle" fontWeight="500"
                    transform={`rotate(-90, 14, ${h / 2})`}>
                    {t('board.axis_score')}
                </text>

                {/* Data points */}
                {scatterData.map((d, i) => {
                    const cx = toX(d.price);
                    const cy = toY(d.score);
                    return (
                        <g key={i}>
                            <circle cx={cx} cy={cy} r={8} fill={d.color}
                                className="board-scatter-dot" stroke="white" strokeWidth="2" />
                            <text x={cx} y={cy - 12} className="board-scatter-label" textAnchor="middle">
                                {displayName(d.name)}
                            </text>
                        </g>
                    );
                })}
            </svg>
        );
    };

    /* ================================================================ */
    /*  CONFIDENCE GAUGE (donut ring)                                   */
    /* ================================================================ */
    const renderConfidenceGauge = () => {
        const pct = Math.min(100, Math.max(0, confidence.overall));
        const level = getConfidenceLevel(pct);
        const color = level === 'high' ? 'var(--color-success)' : level === 'medium' ? 'var(--color-warning)' : 'var(--color-error)';

        const size = 160;
        const cx = size / 2;
        const cy = size / 2;
        const r = 62;
        const strokeW = 10;
        const circumference = 2 * Math.PI * r;
        const dashOffset = circumference * (1 - pct / 100);

        return (
            <svg viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
                {/* Background ring */}
                <circle cx={cx} cy={cy} r={r}
                    fill="none" stroke="var(--border-color)" strokeWidth={strokeW} />
                {/* Value ring */}
                <circle cx={cx} cy={cy} r={r}
                    fill="none" stroke={color} strokeWidth={strokeW}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
                {/* Center text */}
                <text x={cx} y={cy - 2} fontSize="28" fontWeight="800" fill={color}
                    textAnchor="middle" dominantBaseline="central">
                    {pct.toFixed(0)}%
                </text>
            </svg>
        );
    };

    /* ================================================================ */
    /*  RENDER                                                          */
    /* ================================================================ */
    return (
        <div className="board-report" ref={reportRef}>

            {/* ============================================================ */}
            {/* SECTION 1 - Report Header                                    */}
            {/* ============================================================ */}
            <header className="board-header">
                <div className="board-header-top">
                    <div className="board-header-meta">
                        <h1>{t('board.report_title')}</h1>
                        <div className="board-header-meta-row">
                            {project && (
                                <>
                                    {project.project_type && (
                                        <span className="board-header-badge">{project.project_type}</span>
                                    )}
                                    <span className="board-header-date">{project.display_name}</span>
                                    {project.reference_code && (
                                        <span className="board-header-ref">{project.reference_code}</span>
                                    )}
                                    <span className="board-header-date">
                                        {new Date(scoringResults?.statistics?.evaluation_date || Date.now()).toLocaleDateString(
                                            language === 'es' ? 'es-ES' : 'en-US',
                                            { year: 'numeric', month: 'long', day: 'numeric' }
                                        )}
                                    </span>
                                </>
                            )}
                        </div>
                        <span className="board-header-confidential">{t('board.confidential')}</span>
                    </div>
                    <div className="board-header-actions">
                        <button className="board-action-btn board-action-excel" onClick={handleExportExcel} title={t('board.export_excel')}>
                            <FileSpreadsheet size={18} />
                            Excel
                        </button>
                        <button className="board-action-btn board-action-pdf" onClick={handleDownloadPdf} title={t('board.download_pdf')}>
                            <Download size={18} />
                            PDF
                        </button>
                        <button className="board-print-btn" onClick={() => window.print()} title={t('board.print')}>
                            <Printer size={20} />
                            {t('board.print')}
                        </button>
                    </div>
                </div>
            </header>

            {/* ============================================================ */}
            {/* SECTION 2 - Recommended Provider & "Why They Win"            */}
            {/* ============================================================ */}
            <section className="board-section">
                <h2 className="board-section-title">
                    <Trophy size={20} />
                    {t('board.section_recommendation')}
                </h2>

                <div className="board-winner-card">
                    <div className="board-winner-badge">
                        <Trophy size={24} style={{ color: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
                        <span className="board-winner-name">{displayName(winner.provider_name)}</span>
                        <span className="board-winner-score">{winner.overall_score.toFixed(2)} / 10</span>
                        {runnerUp && (
                            <span className="board-winner-margin">
                                +{(winner.overall_score - runnerUp.overall_score).toFixed(2)} {t('board.pts')}
                            </span>
                        )}
                    </div>

                    {winner.summary && (
                        <p className="board-winner-summary">{winner.summary}</p>
                    )}
                </div>

                {/* Side by side strengths comparison */}
                {runnerUp && (
                    <div className="board-comparison">
                        <div className="board-comparison-col">
                            <h4 style={{ color: getProviderColor(winner.provider_name, projectProviders) }}>
                                <TrendingUp size={16} />
                                {displayName(winner.provider_name)} - {t('board.strengths')}
                            </h4>
                            {(winner.strengths || []).length > 0
                                ? winner.strengths!.map((s, i) => (
                                    <div key={i} className="board-strength-item">{s}</div>
                                ))
                                : <div className="board-strength-item" style={{ opacity: 0.5 }}>{t('board.no_data_available')}</div>
                            }
                        </div>
                        <div className="board-comparison-col">
                            <h4 style={{ color: getProviderColor(runnerUp.provider_name, projectProviders) }}>
                                <TrendingUp size={16} />
                                {displayName(runnerUp.provider_name)} - {t('board.strengths')}
                            </h4>
                            {(runnerUp.strengths || []).length > 0
                                ? runnerUp.strengths!.map((s, i) => (
                                    <div key={i} className="board-strength-item">{s}</div>
                                ))
                                : <div className="board-strength-item" style={{ opacity: 0.5 }}>{t('board.no_data_available')}</div>
                            }
                        </div>
                    </div>
                )}

                {/* Differentiating criteria */}
                {differentiatingCriteria.length > 0 && (
                    <div className="board-differentiators">
                        <h4>{t('board.differentiating_criteria')}</h4>
                        {differentiatingCriteria.map((c, i) => (
                            <div key={i} className="board-diff-item">
                                <span className="board-diff-criterion">
                                    {c.key.replace(/_/g, ' ')}
                                </span>
                                <div className="board-diff-scores">
                                    <span className="board-diff-score winner">
                                        {displayName(winner.provider_name)}: {c.winnerScore.toFixed(2)}
                                    </span>
                                    <span className="board-diff-score">
                                        {runnerUp ? displayName(runnerUp.provider_name) : ''}: {c.runnerUpScore.toFixed(2)}
                                    </span>
                                    <span className="board-diff-score winner">
                                        +{c.diff.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ============================================================ */}
            {/* SECTION 3 - Scatter Plot Price vs Quality                    */}
            {/* ============================================================ */}
            <section className="board-section">
                <h2 className="board-section-title">
                    <Target size={20} />
                    {t('board.section_scatter')}
                </h2>
                <div className="board-scatter-container">
                    {renderScatterPlot()}
                </div>
            </section>

            {/* ============================================================ */}
            {/* SECTION 4 - Confidence Level                                 */}
            {/* ============================================================ */}
            <section className="board-section">
                <h2 className="board-section-title">
                    <PieChart size={20} />
                    {t('board.section_confidence')}
                </h2>

                <div className="board-confidence">
                    <div className="board-gauge-container">
                        {renderConfidenceGauge()}
                        <span className="board-gauge-label">{t('board.confidence_overall')}</span>
                    </div>

                    <div className="board-confidence-factors">
                        {[
                            { label: t('board.factor_coverage'), value: confidence.coverage, weight: '30%' },
                            { label: t('board.factor_extraction'), value: confidence.extraction, weight: '25%' },
                            { label: t('board.factor_completeness'), value: confidence.completeness, weight: '25%' },
                            { label: t('board.factor_differentiation'), value: confidence.differentiation, weight: '20%' },
                        ].map((f, i) => {
                            const level = getConfidenceLevel(f.value);
                            return (
                                <div key={i} className="board-factor">
                                    <div className="board-factor-label">
                                        <span>{f.label}</span>
                                        <span>{f.value.toFixed(0)}% ({f.weight})</span>
                                    </div>
                                    <div className="board-factor-bar">
                                        <div
                                            className={`board-factor-fill ${level}`}
                                            style={{ width: `${Math.min(100, f.value)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Provider confidence dots */}
                <div className="board-provider-confidence">
                    {sortedRanking.map((p, i) => {
                        const c = p.compliance_percentage;
                        const dotClass = c >= 75 ? 'green' : c >= 50 ? 'yellow' : 'red';
                        return (
                            <div key={i} className="board-provider-confidence-item"
                                title={`${displayName(p.provider_name)}: ${c.toFixed(0)}%`}>
                                <span className={`board-provider-dot ${dotClass}`} />
                                <span>{displayName(p.provider_name)}</span>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ============================================================ */}
            {/* SECTION 5 - Category Breakdown (detailed with subcriteria)   */}
            {/* ============================================================ */}
            <section className="board-section">
                <h2 className="board-section-title">
                    <BarChart3 size={20} />
                    {t('board.section_categories')}
                </h2>

                {hasConfiguration && categories.length > 0 ? (
                    <div className="board-table-wrapper">
                        <table className="board-categories-table">
                            <thead>
                                <tr>
                                    <th>{t('board.col_category')}</th>
                                    <th style={{ textAlign: 'center' }}>{t('board.col_weight')}</th>
                                    {sortedRanking.map((p, i) => (
                                        <th key={i} style={{
                                            textAlign: 'center',
                                            borderTop: `3px solid ${getProviderColor(p.provider_name, projectProviders)}`
                                        }}>
                                            {displayName(p.provider_name)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((cat, ci) => {
                                    const catKey = cat.name.toLowerCase();
                                    const catCriteria = scoringCriteria.filter(c => c.category === cat.name);

                                    // Category average per provider
                                    const catWeightTotal = cat.weight || 0;
                                    const providerCatAvgs = sortedRanking.map(p => {
                                        if (catCriteria.length === 0) return p.scores?.[catKey] ?? 0;
                                        const wSum = catCriteria.reduce((s, crit) => {
                                            const score = p.individual_scores?.[crit.id] ?? 0;
                                            const w = customWeights[crit.id] ?? crit.weight ?? 0;
                                            return s + score * w;
                                        }, 0);
                                        return catWeightTotal > 0 ? wSum / catWeightTotal : 0;
                                    });
                                    const bestCatAvg = Math.max(...providerCatAvgs);

                                    return (
                                        <React.Fragment key={ci}>
                                            {/* Category header row */}
                                            <tr className="board-cat-header-row">
                                                <td colSpan={2 + sortedRanking.length}
                                                    style={{ borderLeft: `4px solid ${cat.color || 'var(--color-primary)'}` }}>
                                                    <span className="board-cat-header-label">
                                                        {getCategoryLabel(cat)} ({cat.weight}%)
                                                    </span>
                                                </td>
                                            </tr>

                                            {/* Subcriteria rows */}
                                            {catCriteria.map((crit, cri) => {
                                                const provScores = sortedRanking.map(p =>
                                                    p.individual_scores?.[crit.id] ?? 0
                                                );
                                                const bestCritScore = Math.max(...provScores);

                                                return (
                                                    <tr key={`${ci}-${cri}`}>
                                                        <td>
                                                            <div className="board-criterion-name">
                                                                {crit.displayName}
                                                            </div>
                                                        </td>
                                                        <td className="board-cat-weight" style={{ textAlign: 'center' }}>
                                                            <span className="board-weight-badge">
                                                                {crit.weight}%
                                                            </span>
                                                        </td>
                                                        {sortedRanking.map((p, pi) => {
                                                            const score = p.individual_scores?.[crit.id] ?? 0;
                                                            const isBest = score === bestCritScore && bestCritScore > 0;
                                                            return (
                                                                <td key={pi}
                                                                    className={isBest ? 'board-cell-winner' : ''}
                                                                    style={{ textAlign: 'center' }}>
                                                                    <span className="board-cell-score">
                                                                        {score > 0 ? score.toFixed(2) : '-'}
                                                                    </span>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}

                                            {/* Category average row */}
                                            <tr className="board-cat-avg-row">
                                                <td>
                                                    <span className="board-cat-avg-label"
                                                        style={{ color: cat.color || 'var(--color-primary)' }}>
                                                        {getCategoryLabel(cat)} {t('board.average') || 'Average'}
                                                    </span>
                                                </td>
                                                <td className="board-cat-weight" style={{ textAlign: 'center', fontWeight: 700 }}>
                                                    {cat.weight}%
                                                </td>
                                                {sortedRanking.map((_p, pi) => {
                                                    const avg = providerCatAvgs[pi];
                                                    const isBest = avg === bestCatAvg && bestCatAvg > 0;
                                                    return (
                                                        <td key={pi} style={{ textAlign: 'center' }}
                                                            className={isBest ? 'board-cell-winner' : ''}>
                                                            <span className="board-cell-score" style={{ fontWeight: 700 }}>
                                                                {avg.toFixed(2)}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}

                                {/* OVERALL SCORE row */}
                                <tr className="board-overall-row">
                                    <td colSpan={2} style={{ textAlign: 'center' }}>
                                        <span className="board-overall-label">{t('board.overall_score')}:</span>
                                    </td>
                                    {sortedRanking.map((p, pi) => (
                                        <td key={pi} style={{ textAlign: 'center' }}>
                                            <span className="board-overall-score">
                                                {p.overall_score.toFixed(2)}
                                            </span>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="board-scatter-empty">
                        <BarChart3 size={32} />
                        <p>{t('board.no_scoring_config')}</p>
                    </div>
                )}
            </section>

            {/* ============================================================ */}
            {/* SECTION 5.5 - ESG Profile & Certifications                   */}
            {/* ============================================================ */}
            <section className="board-section">
                <h2 className="board-section-title">
                    <Leaf size={20} />
                    {t('esg.section_title')}
                </h2>

                {(() => {
                    // Build ESG profiles for each provider
                    const avgEsg = sortedRanking.reduce((s, p) => {
                        // Try multiple key patterns for ESG category score
                        const esgScore = p.scores?.esg_sustainability
                            || p.scores?.esg
                            || p.scores?.hse_compliance
                            || p.scores?.hse_esg
                            || 0;
                        return s + esgScore;
                    }, 0) / (sortedRanking.length || 1);

                    const profiles = sortedRanking.map(p => {
                        const esgScore = p.scores?.esg_sustainability
                            || p.scores?.esg
                            || p.scores?.hse_compliance
                            || p.scores?.hse_esg
                            || 0;
                        return {
                            provider_name: p.provider_name,
                            certifications: (p.esg_certifications || []) as ESGCertification[],
                            esg_score: esgScore,
                            benchmark_vs_avg: esgScore - avgEsg,
                        };
                    });

                    const hasCerts = profiles.some(p => p.certifications.length > 0);

                    if (!hasCerts && avgEsg === 0) {
                        return (
                            <div className="board-scatter-empty">
                                <Leaf size={32} />
                                <p>{t('esg.no_data')}</p>
                            </div>
                        );
                    }

                    // Group catalog by category for table rows
                    const catGroups = [
                        { key: 'environmental' as const, entries: ESG_CATALOG.filter(c => c.category === 'environmental') },
                        { key: 'social' as const, entries: ESG_CATALOG.filter(c => c.category === 'social') },
                        { key: 'governance' as const, entries: ESG_CATALOG.filter(c => c.category === 'governance') },
                    ];

                    // SVG benchmark bar dimensions
                    const bW = 500;
                    const bH = sortedRanking.length * 36 + 40;
                    const bPad = { left: 140, right: 40, top: 20, bottom: 20 };
                    const bPlotW = bW - bPad.left - bPad.right;
                    const maxDelta = Math.max(1, ...profiles.map(p => Math.abs(p.benchmark_vs_avg)));

                    return (
                        <>
                            {/* Certification matrix table */}
                            {hasCerts && (
                                <div className="board-table-wrapper" style={{ marginBottom: '24px' }}>
                                    <table className="board-categories-table">
                                        <thead>
                                            <tr>
                                                <th>{t('esg.certifications')}</th>
                                                {sortedRanking.map((p, i) => (
                                                    <th key={i} style={{
                                                        textAlign: 'center',
                                                        borderTop: `3px solid ${getProviderColor(p.provider_name, projectProviders)}`
                                                    }}>
                                                        {displayName(p.provider_name)}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {catGroups.map(group => (
                                                <React.Fragment key={group.key}>
                                                    <tr className="board-cat-header-row">
                                                        <td colSpan={1 + sortedRanking.length}
                                                            style={{ borderLeft: `4px solid ${group.key === 'environmental' ? '#10b981' : group.key === 'social' ? '#3b82f6' : '#8b5cf6'}` }}>
                                                            <span className="board-cat-header-label">
                                                                {ESG_CATEGORY_LABELS[group.key][language]}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    {group.entries.map(entry => (
                                                        <tr key={entry.id}>
                                                            <td>
                                                                <div className="board-criterion-name">
                                                                    {language === 'es' ? entry.display_name_es : entry.display_name}
                                                                </div>
                                                            </td>
                                                            {profiles.map((prof, pi) => {
                                                                const cert = prof.certifications.find(c => c.id === entry.id);
                                                                const status = cert?.status || 'not_detected';
                                                                return (
                                                                    <td key={pi} style={{ textAlign: 'center' }}>
                                                                        {status === 'confirmed' && (
                                                                            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '1rem' }} title={t('esg.confirmed')}>&#10003;</span>
                                                                        )}
                                                                        {status === 'mentioned' && (
                                                                            <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem' }} title={t('esg.mentioned')}>?</span>
                                                                        )}
                                                                        {status === 'not_detected' && (
                                                                            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }} title={t('esg.not_detected')}>-</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* ESG Benchmark diverging bars */}
                            {avgEsg > 0 && (
                                <div>
                                    <h4 style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                        color: 'var(--text-secondary)',
                                        margin: '0 0 12px 0'
                                    }}>
                                        {t('esg.benchmark_title')}
                                    </h4>
                                    <div className="board-esg-benchmark">
                                        <svg viewBox={`0 0 ${bW} ${bH}`} style={{ width: '100%', height: 'auto' }}>
                                            {/* Center line (average) */}
                                            <line
                                                x1={bPad.left + bPlotW / 2}
                                                y1={bPad.top}
                                                x2={bPad.left + bPlotW / 2}
                                                y2={bH - bPad.bottom}
                                                stroke="var(--border-color)"
                                                strokeDasharray="4 4"
                                                strokeWidth={1.5}
                                            />
                                            <text
                                                x={bPad.left + bPlotW / 2}
                                                y={bPad.top - 6}
                                                fontSize="9"
                                                fill="var(--text-tertiary)"
                                                textAnchor="middle"
                                                fontWeight="600"
                                            >
                                                {t('esg.avg_label')} ({avgEsg.toFixed(1)})
                                            </text>

                                            {/* Bars */}
                                            {profiles.map((p, i) => {
                                                const y = bPad.top + i * 36 + 8;
                                                const barH = 22;
                                                const center = bPad.left + bPlotW / 2;
                                                const scale = (bPlotW / 2) / maxDelta;
                                                const barWidth = Math.abs(p.benchmark_vs_avg) * scale;
                                                const barX = p.benchmark_vs_avg >= 0 ? center : center - barWidth;
                                                const color = getProviderColor(p.provider_name, projectProviders);

                                                return (
                                                    <g key={i}>
                                                        {/* Provider name */}
                                                        <text
                                                            x={bPad.left - 8}
                                                            y={y + barH / 2 + 1}
                                                            fontSize="11"
                                                            fill="var(--text-primary)"
                                                            textAnchor="end"
                                                            fontWeight="600"
                                                            dominantBaseline="middle"
                                                        >
                                                            {displayName(p.provider_name).length > 16
                                                                ? displayName(p.provider_name).slice(0, 15) + '...'
                                                                : displayName(p.provider_name)}
                                                        </text>

                                                        {/* Bar */}
                                                        <rect
                                                            x={barX}
                                                            y={y}
                                                            width={Math.max(2, barWidth)}
                                                            height={barH}
                                                            rx={4}
                                                            fill={color}
                                                            opacity={0.8}
                                                        />

                                                        {/* Score label */}
                                                        <text
                                                            x={p.benchmark_vs_avg >= 0 ? barX + barWidth + 6 : barX - 6}
                                                            y={y + barH / 2 + 1}
                                                            fontSize="10"
                                                            fill="var(--text-primary)"
                                                            textAnchor={p.benchmark_vs_avg >= 0 ? 'start' : 'end'}
                                                            fontWeight="700"
                                                            dominantBaseline="middle"
                                                        >
                                                            {p.benchmark_vs_avg >= 0 ? '+' : ''}{p.benchmark_vs_avg.toFixed(1)}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </>
                    );
                })()}
            </section>

            {/* ============================================================ */}
            {/* SECTION 6 - Economic Comparison Condensed                    */}
            {/* ============================================================ */}
            <section className="board-section">
                <h2 className="board-section-title">
                    <DollarSign size={20} />
                    {t('board.section_economic')}
                </h2>

                {comparison.length > 0 ? (
                    <div className="board-table-wrapper">
                        <table className="board-economic-table">
                            <thead>
                                <tr>
                                    <th>{t('board.econ_provider')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('board.econ_price')}</th>
                                    <th>{t('board.econ_discount')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('board.econ_net')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('board.econ_vs_cheapest')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('board.econ_tco')}</th>
                                    <th style={{ textAlign: 'center' }}>{t('board.econ_flags')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparison.map((c, i) => {
                                    const cheapest = comparison[0]?.net_price ?? 1;
                                    const vsCheapest = cheapest > 0 ? ((c.net_price - cheapest) / cheapest) * 100 : 0;
                                    const offer = offers.find(o => norm(o.provider_name) === norm(c.provider_name));
                                    const flags = economicFlags[norm(c.provider_name)] || [];

                                    return (
                                        <tr key={i}>
                                            <td>
                                                <div className="board-cat-name">
                                                    <span className="cat-indicator"
                                                        style={{ backgroundColor: getProviderColor(c.provider_name, projectProviders) }} />
                                                    {displayName(c.provider_name)}
                                                </div>
                                            </td>
                                            <td className="board-price-cell">
                                                {c.total_price != null ? currencyFormatter.format(c.total_price) : '-'}
                                            </td>
                                            <td className="board-discount-cell">
                                                {c.discount_percentage > 0 ? `${c.discount_percentage.toFixed(1)}%` : '-'}
                                            </td>
                                            <td className="board-price-cell">
                                                {currencyFormatter.format(c.net_price)}
                                            </td>
                                            <td className={`board-vs-cheapest ${i === 0 ? 'neutral' : 'positive'}`}>
                                                {i === 0 ? t('board.cheapest') : `+${vsCheapest.toFixed(1)}%`}
                                            </td>
                                            <td className="board-price-cell">
                                                {offer?.tco_value != null ? currencyFormatter.format(offer.tco_value) : '-'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {flags.length > 0 ? (
                                                    <span className="board-flag" title={flags.join('\n')}>
                                                        <span className="board-flag-icon">
                                                            <AlertTriangle size={14} />
                                                        </span>
                                                        {flags.length}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="board-scatter-empty">
                        <DollarSign size={32} />
                        <p>{t('board.no_economic_data')}</p>
                    </div>
                )}
            </section>

            {/* ============================================================ */}
            {/* SECTION 7 - Alerts, Risks and Recommendations               */}
            {/* ============================================================ */}
            <section className="board-section">
                <h2 className="board-section-title">
                    <TrendingUp size={20} />
                    {t('board.section_risks')}
                </h2>

                <div className="board-risks">
                    {risks.length > 0 ? (
                        risks.map((risk, i) => {
                            const Icon = risk.severity === 'high' ? AlertTriangle
                                : risk.severity === 'medium' ? AlertCircle : Info;
                            return (
                                <div key={i} className={`board-risk-item board-risk-${risk.severity}`}>
                                    <div className="board-risk-icon">
                                        <Icon size={18} />
                                    </div>
                                    <div className="board-risk-content">
                                        <span className="board-risk-badge">
                                            {risk.severity === 'high' ? t('board.severity_high')
                                                : risk.severity === 'medium' ? t('board.severity_medium')
                                                : t('board.severity_low')}
                                        </span>
                                        <p className="board-risk-text">{risk.message}</p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="board-risk-item board-risk-low">
                            <div className="board-risk-icon">
                                <ShieldCheck size={18} />
                            </div>
                            <div className="board-risk-content">
                                <p className="board-risk-text">{t('board.no_risks')}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* AI Recommendations */}
                {winner.recommendations && winner.recommendations.length > 0 && (
                    <div className="board-recommendations">
                        <h4>
                            <Info size={16} />
                            {t('board.ai_recommendations')}
                        </h4>
                        <div className="board-rec-list">
                            {winner.recommendations.map((rec, i) => (
                                <div key={i} className="board-rec-item">{rec}</div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* ============================================================ */}
            {/* SECTION 8 - Provider Profiles                                */}
            {/* ============================================================ */}
            <section className="board-section">
                <h2 className="board-section-title">
                    <User size={20} />
                    {t('board.section_profiles')}
                </h2>

                <div className="board-profiles-grid">
                    {sortedRanking.map((provider, idx) => {
                        const color = getProviderColor(provider.provider_name, projectProviders);
                        const hasStrengths = (provider.strengths || []).length > 0;
                        const hasWeaknesses = (provider.weaknesses || []).length > 0;
                        const hasSummary = !!provider.summary;

                        return (
                            <div key={idx} className="board-profile-card" style={{ borderTopColor: color }}>
                                <div className="board-profile-header">
                                    <div className="board-profile-rank" style={{ background: color }}>
                                        #{idx + 1}
                                    </div>
                                    <div className="board-profile-info">
                                        <h3 className="board-profile-name">{displayName(provider.provider_name)}</h3>
                                        <div className="board-profile-score">
                                            <span className="board-profile-score-value">{provider.overall_score.toFixed(2)}</span>
                                            <span className="board-profile-score-label">/ 10</span>
                                        </div>
                                    </div>
                                </div>

                                {hasSummary && (
                                    <p className="board-profile-summary">{provider.summary}</p>
                                )}

                                <div className="board-profile-lists">
                                    {hasStrengths && (
                                        <div className="board-profile-list">
                                            <h4 className="board-profile-list-title board-profile-list-strengths">
                                                <CheckCircle size={14} />
                                                {t('board.strengths')}
                                            </h4>
                                            <ul>
                                                {provider.strengths!.map((s, si) => (
                                                    <li key={si} className="board-profile-item board-profile-item-strength">
                                                        {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {hasWeaknesses && (
                                        <div className="board-profile-list">
                                            <h4 className="board-profile-list-title board-profile-list-weaknesses">
                                                <XCircle size={14} />
                                                {t('board.weaknesses')}
                                            </h4>
                                            <ul>
                                                {provider.weaknesses!.map((w, wi) => (
                                                    <li key={wi} className="board-profile-item board-profile-item-weakness">
                                                        {w}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {!hasSummary && !hasStrengths && !hasWeaknesses && (
                                    <p className="board-profile-no-data">{t('board.no_data_available')}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Footer */}
            <footer className="board-footer">
                <p>{t('board.footer_disclaimer')}</p>
            </footer>
        </div>
    );
};

export default BoardReport;
