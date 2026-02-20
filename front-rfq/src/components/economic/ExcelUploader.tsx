/**
 * ExcelUploader
 *
 * Drag-and-drop uploader for Excel templates within the economic section.
 * Parses the uploaded file and displays a preview of its structure.
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, X, Table, Layers, Columns3 } from 'lucide-react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { parseExcelTemplate } from '../../utils/excel.utils';
import type { ExcelTemplateData } from '../../types/setup.types';

interface ExcelUploaderProps {
    onTemplateLoaded: (data: ExcelTemplateData) => void;
}

export const ExcelUploader: React.FC<ExcelUploaderProps> = ({ onTemplateLoaded }) => {
    const { t } = useLanguageStore();
    const [templateData, setTemplateData] = useState<ExcelTemplateData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            const file = acceptedFiles[0];
            if (!file) return;

            setIsProcessing(true);
            setError(null);

            try {
                const data = await parseExcelTemplate(file);
                setTemplateData(data);
                onTemplateLoaded(data);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : t('econ.excel.parse_error')
                );
            } finally {
                setIsProcessing(false);
            }
        },
        [onTemplateLoaded, t]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
        },
        maxFiles: 1,
        multiple: false,
    });

    const handleRemove = () => {
        setTemplateData(null);
        setError(null);
    };

    // Preview: first 5 rows
    const previewRows = templateData ? templateData.rawData.slice(0, 5) : [];

    return (
        <div style={styles.container}>
            {!templateData ? (
                <>
                    <div
                        {...getRootProps()}
                        style={{
                            ...styles.dropzone,
                            ...(isDragActive ? styles.dropzoneActive : {}),
                            ...(isProcessing ? styles.dropzoneDisabled : {}),
                        }}
                    >
                        <input {...getInputProps()} />

                        {isProcessing ? (
                            <div style={styles.processingWrap}>
                                <div style={styles.spinner} />
                                <span style={styles.dropLabel}>{t('econ.excel.processing')}</span>
                            </div>
                        ) : (
                            <>
                                <Upload size={28} style={styles.dropIcon} />
                                <span style={styles.dropLabel}>
                                    {isDragActive
                                        ? t('econ.excel.drop_here')
                                        : t('econ.excel.drag_or_click')}
                                </span>
                                <span style={styles.dropHint}>.xlsx, .xls</span>
                            </>
                        )}
                    </div>

                    {error && (
                        <div style={styles.errorBox}>
                            <span>{error}</span>
                        </div>
                    )}
                </>
            ) : (
                <div style={styles.resultWrap}>
                    {/* File info header */}
                    <div style={styles.fileHeader}>
                        <div style={styles.fileInfo}>
                            <FileSpreadsheet size={20} style={{ color: 'var(--color-primary)' }} />
                            <div>
                                <span style={styles.fileName}>{templateData.fileName}</span>
                                <div style={styles.fileMeta}>
                                    <span style={styles.metaChip}>
                                        <Layers size={13} />
                                        {templateData.sheetNames.length} {t('econ.excel.sheets')}
                                    </span>
                                    <span style={styles.metaChip}>
                                        <Columns3 size={13} />
                                        {templateData.columns.length} {t('econ.excel.columns')}
                                    </span>
                                    <span style={styles.metaChip}>
                                        <Table size={13} />
                                        {templateData.rowCount} {t('econ.excel.rows')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleRemove}
                            style={styles.removeBtn}
                            title={t('econ.excel.remove')}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Preview table */}
                    {previewRows.length > 0 && (
                        <div style={styles.previewWrap}>
                            <span style={styles.previewLabel}>
                                {t('econ.excel.preview')} ({Math.min(5, templateData.rowCount)} / {templateData.rowCount})
                            </span>
                            <div style={styles.tableScroll}>
                                <table style={styles.previewTable}>
                                    <thead>
                                        <tr>
                                            {templateData.columns.map((col) => (
                                                <th key={col} style={styles.th}>
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewRows.map((row, idx) => (
                                            <tr key={idx}>
                                                {templateData.columns.map((col) => (
                                                    <td key={col} style={styles.td}>
                                                        {row[col] != null ? String(row[col]) : ''}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ============================================
// INLINE STYLES (CSS Variables for theming)
// ============================================

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    dropzone: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '32px 20px',
        borderRadius: '12px',
        border: '2px dashed var(--border-color)',
        background: 'var(--bg-surface-alt)',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    dropzoneActive: {
        borderColor: 'var(--color-primary)',
        background: 'rgba(18, 181, 176, 0.06)',
    },
    dropzoneDisabled: {
        opacity: 0.6,
        pointerEvents: 'none' as const,
    },
    dropIcon: {
        color: 'var(--text-tertiary)',
    },
    dropLabel: {
        fontSize: '0.9rem',
        fontWeight: 500,
        color: 'var(--text-secondary)',
    },
    dropHint: {
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)',
    },
    processingWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    spinner: {
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        border: '2.5px solid var(--border-color)',
        borderTopColor: 'var(--color-primary)',
        animation: 'econSpin 0.8s linear infinite',
    },
    errorBox: {
        padding: '10px 14px',
        borderRadius: '8px',
        background: 'rgba(239, 68, 68, 0.08)',
        color: '#ef4444',
        fontSize: '0.85rem',
        fontWeight: 500,
    },
    resultWrap: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    fileHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderRadius: '10px',
        background: 'var(--bg-surface-alt)',
        border: '1px solid var(--border-color)',
    },
    fileInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    fileName: {
        fontSize: '0.9rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
    },
    fileMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginTop: '4px',
    },
    metaChip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)',
    },
    removeBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-surface)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s',
    },
    previewWrap: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    previewLabel: {
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
    },
    tableScroll: {
        overflowX: 'auto',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
    },
    previewTable: {
        width: '100%',
        borderCollapse: 'collapse' as const,
        fontSize: '0.8rem',
        minWidth: '400px',
    },
    th: {
        padding: '8px 12px',
        textAlign: 'left' as const,
        fontSize: '0.72rem',
        fontWeight: 600,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.4px',
        background: 'var(--bg-surface-alt)',
        borderBottom: '1px solid var(--border-color)',
        whiteSpace: 'nowrap' as const,
    },
    td: {
        padding: '6px 12px',
        color: 'var(--text-primary)',
        borderBottom: '1px solid var(--border-color)',
        whiteSpace: 'nowrap' as const,
        maxWidth: '200px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
};
