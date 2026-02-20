import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useEconomicStore, EconomicOffer } from '../../stores/useEconomicStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useProjectStore, type ProjectEconomicField } from '../../stores/useProjectStore';
import { getProviderDisplayName } from '../../types/provider.types';
import { PermissionGate } from '../permissions/PermissionGate';
import { ExcelUploader } from './ExcelUploader';
import { ExcelComparison } from './ExcelComparison';
import { ChevronDown, FileSpreadsheet } from 'lucide-react';
import type { ExcelTemplateData } from '../../types/setup.types';
import './EconomicSection.css';

function formatCurrency(value: number | string | null | undefined, currency: string = 'EUR'): string {
    if (value == null) return '—';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '—';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
}

/** Capitalize raw breakdown keys: "engineering_costs" → "Engineering costs" */
function formatBreakdownKey(key: string): string {
    const text = key.replace(/_/g, ' ').trim();
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Filter numeric entries from a breakdown record */
function numericEntries(obj: Record<string, unknown>): [string, number][] {
    return Object.entries(obj)
        .map(([k, v]) => [k, typeof v === 'string' ? parseFloat(v as string) : v] as [string, unknown])
        .filter(([, v]) => typeof v === 'number' && !isNaN(v as number)) as [string, number][];
}

type SortColumn = 'total_price' | 'discount' | 'net_price' | 'tco';
type SortDir = 'asc' | 'desc';

interface SortHeaderProps {
    column: SortColumn;
    label: string;
    className?: string;
    sortColumn: SortColumn;
    sortDir: SortDir;
    onSort: (col: SortColumn) => void;
}

const SortHeader: React.FC<SortHeaderProps> = ({ column, label, className, sortColumn, sortDir, onSort }) => (
    <th
        className={`econ-sortable ${className || ''} ${sortColumn === column ? 'active' : ''}`}
        onClick={() => onSort(column)}
    >
        <span className="econ-sort-header">
            {label}
            <span className="econ-sort-icon">
                {sortColumn === column ? (
                    sortDir === 'asc' ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
                    ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                    )
                ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.3 }}><polyline points="18 15 12 9 6 15" /></svg>
                )}
            </span>
        </span>
    </th>
);

const EconomicSectionContent: React.FC = () => {
    const {
        offers, comparison, isLoading, error, loadOffers,
        excelTemplate, comparisonData,
        setExcelTemplate, exportExcel,
    } = useEconomicStore();
    const { t } = useLanguageStore();
    const { activeProjectId, projects, projectEconomicFields, loadProjectEconomicFields } = useProjectStore();
    const projectType = projects.find(p => p.id === activeProjectId)?.project_type || 'RFP';
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [sortColumn, setSortColumn] = useState<SortColumn>('net_price');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [excelSectionOpen, setExcelSectionOpen] = useState(false);

    useEffect(() => {
        loadOffers();
    }, [loadOffers, activeProjectId]);

    // Load dynamic economic fields from project setup
    useEffect(() => {
        if (activeProjectId) {
            loadProjectEconomicFields(activeProjectId);
        }
    }, [activeProjectId, loadProjectEconomicFields]);

    // Excel handlers
    const handleTemplateLoaded = useCallback((data: ExcelTemplateData) => {
        setExcelTemplate(data);
        setExcelSectionOpen(true);
    }, [setExcelTemplate]);

    const handleExcelExport = useCallback(() => {
        const projectName = projects.find(p => p.id === activeProjectId)?.name || 'project';
        const activeProject = projects.find(p => p.id === activeProjectId);
        const cur = activeProject?.currency || 'EUR';
        exportExcel(projectName, cur);
    }, [exportExcel, activeProjectId, projects]);

    const toggleRow = (id: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSort = (col: SortColumn) => {
        if (sortColumn === col) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(col);
            setSortDir('asc');
        }
    };

    // Summary stats
    const stats = useMemo(() => {
        const prices = offers.filter(o => o.total_price != null).map(o => o.total_price as number);
        if (prices.length === 0) return null;

        const sorted = [...prices].sort((a, b) => a - b);
        const lowest = sorted[0];
        const highest = sorted[sorted.length - 1];
        const average = prices.reduce((s, v) => s + v, 0) / prices.length;
        const spread = highest - lowest;
        const spreadPct = lowest > 0 ? (spread / lowest) * 100 : 0;

        // Cheapest provider
        const cheapestOffer = offers.find(o => o.total_price === lowest);
        const activeProject = projects.find(p => p.id === activeProjectId);
        const currency = activeProject?.currency || offers[0]?.currency || 'EUR';

        // Best TCO
        const tcoOffers = offers.filter(o => o.tco_value != null && o.tco_value > 0);
        let bestTco: { value: number; provider: string; years: number | null } | null = null;
        if (tcoOffers.length > 0) {
            const best = tcoOffers.reduce((a, b) => (a.tco_value! < b.tco_value! ? a : b));
            bestTco = { value: best.tco_value!, provider: best.provider_name, years: best.tco_period_years };
        }

        return { lowest, highest, average, spread, spreadPct, cheapestProvider: cheapestOffer?.provider_name || '', currency, bestTco };
    }, [offers, projects, activeProjectId]);

    // Sorted comparison
    const sortedComparison = useMemo(() => {
        const offerLookup = new Map<string, EconomicOffer>();
        for (const o of offers) offerLookup.set(o.provider_name, o);

        return [...comparison].sort((a, b) => {
            let va: number, vb: number;
            switch (sortColumn) {
                case 'total_price':
                    va = a.total_price ?? Infinity;
                    vb = b.total_price ?? Infinity;
                    break;
                case 'discount':
                    va = a.discount_percentage;
                    vb = b.discount_percentage;
                    break;
                case 'net_price':
                    va = a.net_price;
                    vb = b.net_price;
                    break;
                case 'tco': {
                    const oa = offerLookup.get(a.provider_name);
                    const ob = offerLookup.get(b.provider_name);
                    va = oa?.tco_value ?? Infinity;
                    vb = ob?.tco_value ?? Infinity;
                    break;
                }
            }
            return sortDir === 'asc' ? va - vb : vb - va;
        });
    }, [comparison, offers, sortColumn, sortDir]);

    // Max price for bar visualization
    const maxPrice = useMemo(() => {
        if (comparison.length === 0) return 1;
        return Math.max(...comparison.map(c => c.net_price));
    }, [comparison]);

    // Build a map from provider_name to offer for quick lookup
    const offerMap = useMemo(() => {
        const map = new Map<string, EconomicOffer>();
        for (const o of offers) map.set(o.provider_name, o);
        return map;
    }, [offers]);

    // CSV Export — must be before any conditional returns (Rules of Hooks)
    const handleExportCSV = useCallback(() => {
        const projectName = projects.find(p => p.id === activeProjectId)?.name || 'project';
        const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

        const headers = ['Rank', 'Provider', 'Total Price', 'Discount %', 'Net Price', 'Payment Terms', 'TCO', 'Validity Days'];
        const rows = sortedComparison.map(comp => {
            const offer = offerMap.get(comp.provider_name);
            return [
                comp.price_rank,
                getProviderDisplayName(comp.provider_name),
                comp.total_price ?? '',
                comp.discount_percentage,
                comp.net_price,
                offer?.payment_terms ?? '',
                offer?.tco_value ?? '',
                offer?.validity_days ?? '',
            ].map(v => {
                const str = String(v);
                return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
            }).join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `economic_comparison_${safeName}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }, [sortedComparison, offerMap, activeProjectId, projects]);

    // Confidence badge helper
    const getConfidenceBadge = (confidence: number | null) => {
        if (confidence == null) return null;
        let cls: string, label: string;
        if (confidence >= 0.8) {
            cls = 'confidence-high';
            label = t('econ.confidence.high');
        } else if (confidence >= 0.5) {
            cls = 'confidence-medium';
            label = t('econ.confidence.medium');
        } else {
            cls = 'confidence-low';
            label = t('econ.confidence.low');
        }
        return (
            <span className={`econ-confidence-badge ${cls}`} title={`${label}: ${(confidence * 100).toFixed(0)}%`}>
                {(confidence * 100).toFixed(0)}%
            </span>
        );
    };

    // Guard: RFI projects should never see the economic section — placed after all hooks
    if (projectType === 'RFI') return null;

    if (isLoading) {
        return (
            <div className="economic-section">
                <div className="econ-loading">
                    <div className="econ-spinner" />
                    <p>{t('econ.loading')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="economic-section">
                <div className="econ-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <p>{t('econ.error')}</p>
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    if (offers.length === 0) {
        return (
            <div className="economic-section">
                <div className="econ-header">
                    <div>
                        <h1 className="econ-title">{t('econ.title')}</h1>
                        <p className="econ-subtitle">
                            {projectType === 'RFQ' ? t('econ.rfq_subtitle') : t('econ.subtitle_compare')}
                        </p>
                    </div>
                </div>
                <div className="econ-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    <p>{t('econ.empty')}</p>
                    <span>{t('econ.empty_hint')}</span>
                </div>
            </div>
        );
    }

    const activeProject = projects.find(p => p.id === activeProjectId);
    const currency = activeProject?.currency || stats?.currency || 'EUR';

    return (
        <div className="economic-section fade-in">
            {/* Header */}
            <div className="econ-header">
                <div>
                    <h1 className="econ-title">
                        {t('econ.title')}
                        {projectType === 'RFQ' && (
                            <span style={{
                                display: 'inline-block',
                                marginLeft: '12px',
                                fontSize: '0.65em',
                                fontWeight: 600,
                                padding: '3px 10px',
                                borderRadius: '6px',
                                background: 'rgba(245, 158, 11, 0.12)',
                                color: '#f59e0b',
                                verticalAlign: 'middle',
                                letterSpacing: '0.3px'
                            }}>
                                {t('econ.rfq_badge')}
                            </span>
                        )}
                    </h1>
                    <p className="econ-subtitle">
                        {projectType === 'RFQ'
                            ? t('econ.rfq_subtitle')
                            : t('econ.subtitle', {
                                count: String(offers.length),
                                providers: String(new Set(offers.map(o => o.provider_name)).size),
                            })
                        }
                    </p>
                </div>
                <button
                    className="econ-export-btn"
                    onClick={() => loadOffers()}
                    title={t('econ.refresh') || 'Refresh'}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                </button>
            </div>

            {/* Summary cards */}
            {stats && (
                <div className="econ-summary-cards">
                    <div className="econ-summary-card highlight">
                        <span className="econ-card-label">{t('econ.card.lowest')}</span>
                        <span className="econ-card-value" style={{ color: '#10b981' }}>{formatCurrency(stats.lowest, currency)}</span>
                        <span className="econ-card-detail">{getProviderDisplayName(stats.cheapestProvider)}</span>
                    </div>
                    <div className="econ-summary-card">
                        <span className="econ-card-label">{t('econ.card.average')}</span>
                        <span className="econ-card-value">{formatCurrency(stats.average, currency)}</span>
                        <span className="econ-card-detail">{t('econ.card.offers', { count: String(offers.length) })}</span>
                    </div>
                    <div className="econ-summary-card">
                        <span className="econ-card-label">{t('econ.card.highest')}</span>
                        <span className="econ-card-value">{formatCurrency(stats.highest, currency)}</span>
                    </div>
                    <div className="econ-summary-card">
                        <span className="econ-card-label">{t('econ.card.spread')}</span>
                        <span className="econ-card-value">{formatCurrency(stats.spread, currency)}</span>
                        <span className="econ-card-detail">{t('econ.card.variation', { pct: formatPercent(stats.spreadPct) })}</span>
                    </div>
                    {stats.bestTco && (
                        <div className="econ-summary-card highlight-tco">
                            <span className="econ-card-label">{t('econ.card.best_tco')}</span>
                            <span className="econ-card-value" style={{ color: '#06b6d4' }}>
                                {formatCurrency(stats.bestTco.value, currency)}
                            </span>
                            <span className="econ-card-detail">
                                {getProviderDisplayName(stats.bestTco.provider)}
                                {stats.bestTco.years && <span style={{ marginLeft: 4, opacity: 0.7 }}>/{stats.bestTco.years}y</span>}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Dynamic Economic Fields from Setup */}
            {projectEconomicFields.length > 0 && (
                <EconomicFieldsPanel
                    fields={projectEconomicFields}
                    offers={offers}
                    currency={currency}
                    t={t}
                />
            )}

            {/* Excel Template Section */}
            <div className="econ-excel-section">
                <button
                    className={`econ-excel-toggle ${excelSectionOpen ? 'open' : ''}`}
                    onClick={() => setExcelSectionOpen(prev => !prev)}
                >
                    <div className="econ-excel-toggle-left">
                        <FileSpreadsheet size={18} />
                        <span className="econ-excel-toggle-label">
                            {t('econ.excel.section_title')}
                        </span>
                        {excelTemplate && (
                            <span className="econ-excel-toggle-badge">
                                {excelTemplate.fileName}
                            </span>
                        )}
                    </div>
                    <ChevronDown
                        size={18}
                        className={`econ-excel-chevron ${excelSectionOpen ? 'open' : ''}`}
                    />
                </button>

                {excelSectionOpen && (
                    <div className="econ-excel-content">
                        <ExcelUploader onTemplateLoaded={handleTemplateLoaded} />

                        {comparisonData && offers.length > 0 && (
                            <div style={{ marginTop: '16px' }}>
                                <ExcelComparison
                                    comparisonData={comparisonData}
                                    currency={currency}
                                    onExport={handleExcelExport}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Comparison table */}
            <div className="econ-table-wrapper">
                <div className="econ-table-header">
                    <h3 className="econ-table-title">{t('econ.table.title')}</h3>
                    <button className="econ-export-btn" onClick={handleExportCSV}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        {t('econ.export_csv')}
                    </button>
                </div>
                <table className="econ-table">
                    <thead>
                        <tr>
                            <th style={{ width: 50 }} className="col-center">#</th>
                            <th>{t('econ.table.provider')}</th>
                            <SortHeader column="total_price" label={t('econ.table.total_price')} className="col-right" sortColumn={sortColumn} sortDir={sortDir} onSort={handleSort} />
                            <SortHeader column="discount" label={t('econ.table.discount')} className="col-center" sortColumn={sortColumn} sortDir={sortDir} onSort={handleSort} />
                            <SortHeader column="net_price" label={t('econ.table.net_price')} className="col-right" sortColumn={sortColumn} sortDir={sortDir} onSort={handleSort} />
                            <th>{t('econ.table.payment_terms')}</th>
                            <SortHeader column="tco" label={t('econ.table.tco')} className="col-right" sortColumn={sortColumn} sortDir={sortDir} onSort={handleSort} />
                            <th style={{ width: 40 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedComparison.map((comp) => {
                            const offer = offerMap.get(comp.provider_name);
                            const isExpanded = offer ? expandedRows.has(offer.id) : false;
                            const isCheapest = comp.price_rank === 1;
                            const rankClass = comp.price_rank <= 3 ? `rank-${comp.price_rank}` : 'rank-other';

                            return (
                                <React.Fragment key={comp.provider_name}>
                                    <tr
                                        className={`econ-row ${isCheapest ? 'cheapest' : ''}`}
                                        onClick={() => offer && toggleRow(offer.id)}
                                    >
                                        <td className="col-center">
                                            <span className={`econ-rank ${rankClass}`}>{comp.price_rank}</span>
                                        </td>
                                        <td>
                                            <span className="econ-provider">{getProviderDisplayName(comp.provider_name)}</span>
                                        </td>
                                        <td className="col-right">
                                            <div>
                                                <span className="econ-price">{formatCurrency(comp.total_price, currency)}</span>
                                                <div className="econ-price-bar-track">
                                                    <div
                                                        className="econ-price-bar-fill"
                                                        style={{
                                                            width: `${(comp.net_price / maxPrice) * 100}%`,
                                                            background: isCheapest ? '#10b981' : 'var(--color-primary)',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="col-center">
                                            {comp.discount_percentage > 0 ? (
                                                <span className="econ-discount">{formatPercent(comp.discount_percentage)}</span>
                                            ) : (
                                                <span className="econ-discount none">—</span>
                                            )}
                                        </td>
                                        <td className="col-right">
                                            <span className={`econ-price ${isCheapest ? 'best' : ''}`}>
                                                {formatCurrency(comp.net_price, currency)}
                                            </span>
                                        </td>
                                        <td>
                                            {offer?.payment_terms ? (
                                                <span className="econ-tag">{offer.payment_terms}</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                                            )}
                                        </td>
                                        <td className="col-right">
                                            {offer?.tco_value ? (
                                                <span className="econ-price" style={{ fontSize: '0.85rem' }}>
                                                    {formatCurrency(offer.tco_value, currency)}
                                                    {offer.tco_period_years && (
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginLeft: 4 }}>
                                                            /{offer.tco_period_years}y
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                                            )}
                                        </td>
                                        <td className="col-center">
                                            <button
                                                className={`econ-expand-btn ${isExpanded ? 'open' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); offer && toggleRow(offer.id); }}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                                            </button>
                                        </td>
                                    </tr>

                                    {/* Expanded detail row */}
                                    {isExpanded && offer && (() => {
                                        const priceEntries = offer.price_breakdown ? numericEntries(offer.price_breakdown) : [];
                                        const tcoEntries = offer.tco_breakdown ? numericEntries(offer.tco_breakdown) : [];
                                        const hasLongText = !!(offer.guarantees || offer.price_escalation || offer.discount_conditions);

                                        return (
                                        <tr className="econ-detail-row">
                                            <td colSpan={8}>
                                                <div className="econ-detail-content">
                                                    {/* Confidence badge */}
                                                    {offer.extraction_confidence != null && (
                                                        <div className="econ-detail-confidence">
                                                            {getConfidenceBadge(offer.extraction_confidence)}
                                                        </div>
                                                    )}

                                                    {/* 3-column grid */}
                                                    <div className="econ-detail-grid">
                                                        {/* Col 1: Price breakdown */}
                                                        <div className="econ-detail-col">
                                                            {priceEntries.length > 0 && (
                                                                <div className="econ-detail-group">
                                                                    <span className="econ-detail-group-title">
                                                                        {t('econ.detail.price_breakdown')}
                                                                    </span>
                                                                    {priceEntries.map(([key, val]) => (
                                                                        <div key={key} className="econ-detail-item">
                                                                            <span className="label">{formatBreakdownKey(key)}</span>
                                                                            <span className="value">{formatCurrency(val, currency)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Col 2: Conditions + TCO */}
                                                        <div className="econ-detail-col">
                                                            <div className="econ-detail-group">
                                                                <span className="econ-detail-group-title">
                                                                    {t('econ.detail.conditions')}
                                                                </span>
                                                                <div className="econ-detail-item">
                                                                    <span className="label">{t('econ.detail.validity')}</span>
                                                                    <span className="value">{offer.validity_days} {t('econ.detail.days')}</span>
                                                                </div>
                                                                <div className="econ-detail-item">
                                                                    <span className="label">{t('econ.detail.taxes')}</span>
                                                                    <span className="value">
                                                                        <span className={`econ-tag ${offer.taxes_included ? 'green' : 'amber'}`}>
                                                                            {offer.taxes_included ? t('econ.detail.yes') : 'No'}
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                                <div className="econ-detail-item">
                                                                    <span className="label">{t('econ.detail.insurance')}</span>
                                                                    <span className="value">
                                                                        <span className={`econ-tag ${offer.insurance_included ? 'green' : 'amber'}`}>
                                                                            {offer.insurance_included ? t('econ.detail.yes') : 'No'}
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {tcoEntries.length > 0 && (
                                                                <div className="econ-detail-group">
                                                                    <span className="econ-detail-group-title">TCO</span>
                                                                    {tcoEntries.map(([key, val]) => (
                                                                        <div key={key} className="econ-detail-item">
                                                                            <span className="label">{formatBreakdownKey(key)}</span>
                                                                            <span className="value">{formatCurrency(val, currency)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Col 3: Alternatives + Optional items + Payment schedule */}
                                                        <div className="econ-detail-col">
                                                            {offer.alternative_offers && offer.alternative_offers.length > 0 && (
                                                                <div className="econ-detail-group">
                                                                    <span className="econ-detail-group-title">
                                                                        {t('econ.detail.alternative_offers')}
                                                                    </span>
                                                                    {offer.alternative_offers.map((alt) => (
                                                                        <div key={alt.description} className="econ-detail-item">
                                                                            <span className="label">{alt.description}</span>
                                                                            <span className="value">{formatCurrency(alt.total_price, currency)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {offer.optional_items && offer.optional_items.length > 0 && (
                                                                <div className="econ-detail-group">
                                                                    <span className="econ-detail-group-title">
                                                                        {t('econ.detail.optional_items')}
                                                                    </span>
                                                                    {offer.optional_items.map((item) => (
                                                                        <div key={item.description} className="econ-detail-item">
                                                                            <span className="label">{item.description}</span>
                                                                            <span className="value">{formatCurrency(item.price, currency)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                        </div>
                                                    </div>

                                                    {/* Payment schedule — horizontal compact row */}
                                                    {offer.payment_schedule && offer.payment_schedule.length > 0 && (
                                                        <div className="econ-schedule-section">
                                                            <span className="econ-detail-group-title">
                                                                {t('econ.detail.payment_schedule')}
                                                            </span>
                                                            <div className="econ-schedule-row">
                                                                {offer.payment_schedule.map((ps) => (
                                                                    <div key={`${ps.milestone}-${ps.event}`} className="econ-schedule-chip">
                                                                        <span className="econ-schedule-pct">{ps.milestone}%</span>
                                                                        <span className="econ-schedule-event">{ps.event}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Long text conditions — full width below grid */}
                                                    {hasLongText && (
                                                        <div className="econ-detail-longtext">
                                                            {offer.guarantees && (
                                                                <div className="econ-longtext-card">
                                                                    <span className="econ-longtext-label">{t('econ.detail.guarantees')}</span>
                                                                    <p className="econ-longtext-value">{offer.guarantees}</p>
                                                                </div>
                                                            )}
                                                            {offer.price_escalation && (
                                                                <div className="econ-longtext-card">
                                                                    <span className="econ-longtext-label">{t('econ.detail.escalation')}</span>
                                                                    <p className="econ-longtext-value">{offer.price_escalation}</p>
                                                                </div>
                                                            )}
                                                            {offer.discount_conditions && (
                                                                <div className="econ-longtext-card">
                                                                    <span className="econ-longtext-label">{t('econ.detail.discount_cond')}</span>
                                                                    <p className="econ-longtext-value">{offer.discount_conditions}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })()}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

/* ─── Dynamic Economic Fields Panel ─── */

interface EconomicFieldsPanelProps {
    fields: ProjectEconomicField[];
    offers: EconomicOffer[];
    currency: string;
    t: (key: string, vars?: Record<string, string>) => string;
}

/** Extract a value for a field from an offer's price_breakdown or custom_fields */
function extractFieldValue(offer: EconomicOffer, fieldName: string): number | string | null {
    // Normalize field name to match various formats: "Engineering Costs" → "engineering_costs"
    const normalized = fieldName.toLowerCase().replace(/\s+/g, '_');
    const nameLC = fieldName.toLowerCase();

    // Check price_breakdown first (most common location for extracted economic data)
    if (offer.price_breakdown) {
        for (const [key, val] of Object.entries(offer.price_breakdown)) {
            const keyLC = key.toLowerCase().replace(/\s+/g, '_');
            if (keyLC === normalized || key.toLowerCase() === nameLC) {
                return val as number;
            }
        }
    }

    // Check tco_breakdown
    if (offer.tco_breakdown) {
        for (const [key, val] of Object.entries(offer.tco_breakdown)) {
            const keyLC = key.toLowerCase().replace(/\s+/g, '_');
            if (keyLC === normalized || key.toLowerCase() === nameLC) {
                return val as number;
            }
        }
    }

    // Check well-known fields
    const wellKnown: Record<string, () => number | string | null> = {
        'total_price': () => offer.total_price,
        'precio_total': () => offer.total_price,
        'discount': () => offer.discount_percentage,
        'descuento': () => offer.discount_percentage,
        'discount_percentage': () => offer.discount_percentage,
        'tco': () => offer.tco_value,
        'tco_value': () => offer.tco_value,
        'payment_terms': () => offer.payment_terms,
        'condiciones_pago': () => offer.payment_terms,
        'validity': () => offer.validity_days,
        'validity_days': () => offer.validity_days,
        'validez': () => offer.validity_days,
    };

    const getter = wellKnown[normalized] || wellKnown[nameLC];
    if (getter) return getter();

    return null;
}

const EconomicFieldsPanel: React.FC<EconomicFieldsPanelProps> = ({ fields, offers, currency, t }) => {
    const providers = [...new Set(offers.map(o => o.provider_name))];

    if (providers.length === 0) return null;

    const flatFields = useMemo(() => {
        const result: (ProjectEconomicField & { indent: number })[] = [];
        const flatten = (list: ProjectEconomicField[], indent: number) => {
            for (const f of list) {
                result.push({ ...f, indent });
                if (f.children && f.children.length > 0) {
                    flatten(f.children, indent + 1);
                }
            }
        };
        flatten(fields, 0);
        return result;
    }, [fields]);

    return (
        <div className="econ-table-wrapper">
            <div className="econ-table-header">
                <h3 className="econ-table-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                    {t('econ.model.title')}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                    {flatFields.length} {t('econ.model.fields')} &middot; {providers.length} {t('econ.table.provider').toLowerCase()}s
                </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table className="econ-table">
                    <thead>
                        <tr>
                            <th style={{ minWidth: 200 }}>{t('econ.model.field')}</th>
                            <th style={{ width: 70, textAlign: 'center' }}>{t('econ.model.type')}</th>
                            {providers.map(p => (
                                <th key={p} style={{ textAlign: 'right', minWidth: 130 }}>
                                    {getProviderDisplayName(p)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {flatFields.map(field => {
                            const isParent = field.children && field.children.length > 0;
                            return (
                                <tr
                                    key={field.id}
                                    className={isParent ? 'econ-row' : ''}
                                    style={isParent ? { background: 'var(--bg-surface-alt)' } : undefined}
                                >
                                    <td style={{ paddingLeft: `${16 + field.indent * 20}px` }}>
                                        <span style={{ fontWeight: isParent ? 700 : 500, fontSize: isParent ? '0.88rem' : '0.84rem' }}>
                                            {field.name}
                                        </span>
                                        {field.isRequired && (
                                            <span style={{ color: 'var(--color-error)', marginLeft: 4, fontSize: '0.7rem' }}>*</span>
                                        )}
                                        {field.unit && (
                                            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem', marginLeft: 6 }}>
                                                ({field.unit})
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className="econ-tag" style={{ fontSize: '0.68rem' }}>
                                            {field.fieldType}
                                        </span>
                                    </td>
                                    {providers.map(provName => {
                                        const offer = offers.find(o => o.provider_name === provName);
                                        const value = offer ? extractFieldValue(offer, field.name) : null;

                                        let display: string;
                                        let cellClass = '';
                                        if (value == null) {
                                            display = '—';
                                            cellClass = field.isRequired ? 'econ-missing-required' : '';
                                        } else if (field.fieldType === 'currency') {
                                            display = formatCurrency(value as number, currency);
                                        } else if (field.fieldType === 'percentage') {
                                            display = formatPercent(value as number);
                                        } else {
                                            display = String(value);
                                        }

                                        return (
                                            <td
                                                key={provName}
                                                className={`col-right ${cellClass}`}
                                                style={{ fontWeight: isParent ? 700 : 400 }}
                                            >
                                                {display}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const EconomicSection: React.FC = () => (
    <PermissionGate action="view_economic">
        <EconomicSectionContent />
    </PermissionGate>
);
