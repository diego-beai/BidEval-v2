/**
 * ExcelComparison
 *
 * Comparison dashboard showing supplier economic data mapped to the Excel template structure.
 * Table with template rows as Y-axis, suppliers as X-axis columns.
 * Color-coded cells, validation issues, and export capability.
 */

import React, { useMemo } from 'react';
import { Download, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import type { ExcelComparisonData } from '../../utils/excel.utils';

interface ExcelComparisonProps {
    comparisonData: ExcelComparisonData;
    currency: string;
    onExport: () => void;
}

// ============================================
// FORMAT HELPERS
// ============================================

function formatNumber(value: number | string | null, currency: string): string {
    if (value == null) return '\u2014'; // em-dash
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return String(value);
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

// ============================================
// COMPONENT
// ============================================

export const ExcelComparison: React.FC<ExcelComparisonProps> = ({
    comparisonData,
    currency,
    onExport,
}) => {
    const { t } = useLanguageStore();
    const { rows, totals, validationIssues } = comparisonData;

    // Extract provider names from headers (skip index 0 which is empty label column)
    const providers = comparisonData.headers.slice(1);

    // Compute min/max per row for color coding
    const rowStats = useMemo(() => {
        const statsMap = new Map<string, { min: number; max: number }>();

        for (const row of rows) {
            if (row.fieldType === 'header') continue;

            const numericVals = providers
                .map((p) => row.values[p])
                .filter((v): v is number => typeof v === 'number' && !isNaN(v));

            if (numericVals.length >= 2) {
                statsMap.set(row.field, {
                    min: Math.min(...numericVals),
                    max: Math.max(...numericVals),
                });
            }
        }

        return statsMap;
    }, [rows, providers]);

    // Separate errors and warnings
    const errors = validationIssues.filter((i) => i.severity === 'error');
    const warnings = validationIssues.filter((i) => i.severity === 'warning');

    // Cell background based on value position
    function getCellStyle(
        value: number | string | null,
        field: string,
        isOutlier: boolean | undefined
    ): React.CSSProperties {
        if (value == null || typeof value !== 'number') return {};

        const stats = rowStats.get(field);
        if (!stats || stats.min === stats.max) return {};

        if (isOutlier) {
            // Check if this specific value is the outlier
            const mean = (stats.min + stats.max) / 2;
            if (Math.abs(value - mean) / mean > 0.2) {
                return { background: 'rgba(245, 158, 11, 0.1)' };
            }
        }

        if (value === stats.min) {
            return { background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', fontWeight: 700 };
        }
        if (value === stats.max) {
            return { background: 'rgba(239, 68, 68, 0.06)', color: '#ef4444' };
        }

        return {};
    }

    if (providers.length === 0) {
        return (
            <div style={styles.emptyState}>
                <p>{t('econ.excel.no_providers')}</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h3 style={styles.title}>{t('econ.excel.comparison_title')}</h3>
                <button style={styles.exportBtn} onClick={onExport}>
                    <Download size={16} />
                    {t('econ.excel.export_excel')}
                </button>
            </div>

            {/* Comparison table */}
            <div style={styles.tableScroll}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ ...styles.th, ...styles.stickyCol }}>
                                {t('econ.excel.field')}
                            </th>
                            {providers.map((provider) => (
                                <th key={provider} style={styles.thProvider}>
                                    {provider}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const isHeader = row.fieldType === 'header';
                            const isTotal = row.fieldType === 'total' || row.fieldType === 'subtotal';

                            return (
                                <tr
                                    key={`${row.field}-${idx}`}
                                    style={
                                        isHeader
                                            ? styles.headerRow
                                            : isTotal
                                            ? styles.totalRow
                                            : undefined
                                    }
                                >
                                    <td
                                        style={{
                                            ...styles.td,
                                            ...styles.stickyCol,
                                            ...styles.fieldCell,
                                            ...(isHeader ? styles.headerCell : {}),
                                            ...(isTotal ? styles.totalCell : {}),
                                        }}
                                    >
                                        {row.field}
                                        {row.unit && (
                                            <span style={styles.unitBadge}>{row.unit}</span>
                                        )}
                                    </td>
                                    {providers.map((provider) => {
                                        const val = row.values[provider];
                                        const cellStyle = isHeader
                                            ? {}
                                            : getCellStyle(val, row.field, row.isOutlier);

                                        return (
                                            <td
                                                key={provider}
                                                style={{
                                                    ...styles.td,
                                                    ...styles.valueCell,
                                                    ...(isHeader ? styles.headerValueCell : {}),
                                                    ...(isTotal ? styles.totalValueCell : {}),
                                                    ...cellStyle,
                                                }}
                                            >
                                                {isHeader
                                                    ? ''
                                                    : typeof val === 'number'
                                                    ? formatNumber(val, currency)
                                                    : val ?? '\u2014'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}

                        {/* Grand totals row */}
                        <tr style={styles.grandTotalRow}>
                            <td style={{ ...styles.td, ...styles.stickyCol, ...styles.grandTotalCell }}>
                                {t('econ.excel.grand_total')}
                            </td>
                            {providers.map((provider) => {
                                const total = totals[provider] ?? 0;
                                const allTotals = Object.values(totals).filter((v) => v > 0);
                                const minTotal = allTotals.length > 0 ? Math.min(...allTotals) : 0;
                                const isBest = total > 0 && total === minTotal;

                                return (
                                    <td
                                        key={provider}
                                        style={{
                                            ...styles.td,
                                            ...styles.grandTotalValue,
                                            ...(isBest ? { color: '#10b981' } : {}),
                                        }}
                                    >
                                        {formatNumber(total, currency)}
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Validation issues */}
            {validationIssues.length > 0 && (
                <div style={styles.issuesPanel}>
                    <div style={styles.issuesHeader}>
                        <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                        <span style={styles.issuesTitle}>
                            {t('econ.excel.validation_issues')} ({validationIssues.length})
                        </span>
                    </div>

                    {errors.length > 0 && (
                        <div style={styles.issuesGroup}>
                            {errors.map((issue, idx) => (
                                <div key={`err-${idx}`} style={styles.issueRow}>
                                    <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                                    <span style={styles.issueText}>{issue.message}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {warnings.length > 0 && (
                        <div style={styles.issuesGroup}>
                            {warnings.map((issue, idx) => (
                                <div key={`warn-${idx}`} style={styles.issueRow}>
                                    <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                    <span style={styles.issueText}>{issue.message}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Clean comparison badge */}
            {validationIssues.length === 0 && rows.length > 0 && (
                <div style={styles.cleanBadge}>
                    <CheckCircle size={14} style={{ color: '#10b981' }} />
                    <span>{t('econ.excel.no_issues')}</span>
                </div>
            )}
        </div>
    );
};

// ============================================
// INLINE STYLES
// ============================================

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
    },
    title: {
        margin: 0,
        fontSize: '1rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
    },
    exportBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 14px',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        background: 'var(--bg-surface)',
        color: 'var(--text-secondary)',
        fontSize: '0.8rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
    },
    tableScroll: {
        overflowX: 'auto',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse' as const,
        fontSize: '0.85rem',
        minWidth: '600px',
    },
    th: {
        padding: '10px 14px',
        textAlign: 'left' as const,
        fontSize: '0.72rem',
        fontWeight: 600,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
        background: 'var(--bg-surface-alt)',
        borderBottom: '1px solid var(--border-color)',
        whiteSpace: 'nowrap' as const,
    },
    thProvider: {
        padding: '10px 14px',
        textAlign: 'right' as const,
        fontSize: '0.72rem',
        fontWeight: 600,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
        background: 'var(--bg-surface-alt)',
        borderBottom: '1px solid var(--border-color)',
        whiteSpace: 'nowrap' as const,
    },
    stickyCol: {
        position: 'sticky' as const,
        left: 0,
        zIndex: 1,
        background: 'var(--bg-surface)',
    },
    td: {
        padding: '8px 14px',
        borderBottom: '1px solid var(--border-color)',
    },
    fieldCell: {
        fontWeight: 500,
        color: 'var(--text-primary)',
        whiteSpace: 'nowrap' as const,
        minWidth: '180px',
    },
    valueCell: {
        textAlign: 'right' as const,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap' as const,
        color: 'var(--text-primary)',
    },
    headerRow: {
        background: 'var(--bg-surface-alt)',
    },
    headerCell: {
        fontWeight: 700,
        fontSize: '0.8rem',
        color: 'var(--text-primary)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.3px',
        background: 'var(--bg-surface-alt)',
    },
    headerValueCell: {
        background: 'var(--bg-surface-alt)',
    },
    totalRow: {
        background: 'rgba(18, 181, 176, 0.03)',
    },
    totalCell: {
        fontWeight: 700,
        color: 'var(--color-primary)',
        background: 'rgba(18, 181, 176, 0.03)',
    },
    totalValueCell: {
        fontWeight: 600,
    },
    grandTotalRow: {
        borderTop: '2px solid var(--border-color)',
    },
    grandTotalCell: {
        fontWeight: 700,
        fontSize: '0.9rem',
        color: 'var(--text-primary)',
        background: 'var(--bg-surface-alt)',
    },
    grandTotalValue: {
        textAlign: 'right' as const,
        fontWeight: 700,
        fontSize: '0.9rem',
        color: 'var(--text-primary)',
        background: 'var(--bg-surface-alt)',
        fontVariantNumeric: 'tabular-nums',
    },
    unitBadge: {
        display: 'inline-flex',
        marginLeft: '6px',
        padding: '1px 6px',
        borderRadius: '4px',
        fontSize: '0.68rem',
        fontWeight: 500,
        background: 'var(--bg-surface-alt)',
        color: 'var(--text-tertiary)',
    },
    issuesPanel: {
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
    },
    issuesHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-surface-alt)',
    },
    issuesTitle: {
        fontSize: '0.82rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
    },
    issuesGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    issueRow: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '8px 16px',
        borderBottom: '1px solid var(--border-color)',
    },
    issueText: {
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.4,
    },
    cleanBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: '8px',
        background: 'rgba(16, 185, 129, 0.06)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        fontSize: '0.82rem',
        fontWeight: 500,
        color: '#10b981',
    },
    emptyState: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        color: 'var(--text-tertiary)',
        fontSize: '0.9rem',
    },
};
