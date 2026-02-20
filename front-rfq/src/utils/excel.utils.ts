/**
 * Excel Utility Functions
 *
 * Parse Excel templates, build comparison matrices, and export filled workbooks.
 * Uses the `xlsx` library (SheetJS) which is already in package.json.
 */

import * as XLSX from 'xlsx';
import type { ExcelTemplateData, EconomicFieldEntry } from '../types/setup.types';
import type { EconomicOffer } from '../stores/useEconomicStore';

// ============================================
// PUBLIC TYPES
// ============================================

export interface ExcelComparisonData {
    headers: string[];
    rows: ExcelComparisonRow[];
    totals: Record<string, number>;
    validationIssues: ExcelValidationIssue[];
}

export interface ExcelComparisonRow {
    field: string;
    fieldType: 'header' | 'item' | 'subtotal' | 'total';
    values: Record<string, number | string | null>;
    unit?: string;
    isOutlier?: boolean;
}

export interface ExcelValidationIssue {
    provider: string;
    field: string;
    issue: 'missing' | 'outlier' | 'total_mismatch' | 'negative';
    message: string;
    severity: 'error' | 'warning';
}

// ============================================
// PARSE EXCEL TEMPLATE
// ============================================

/**
 * Parse an Excel file and extract its structure.
 * Reads the first sheet by default, returns sheet names, column headers,
 * row count, and the raw JSON representation.
 */
export function parseExcelTemplate(file: File): Promise<ExcelTemplateData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                if (!data) {
                    reject(new Error('Failed to read file'));
                    return;
                }

                const workbook = XLSX.read(data, { type: 'array' });
                const sheetNames = workbook.SheetNames;

                if (sheetNames.length === 0) {
                    reject(new Error('Excel file has no sheets'));
                    return;
                }

                // Use the first sheet for structure extraction
                const firstSheet = workbook.Sheets[sheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
                    defval: null,
                });

                // Extract column headers from the first row keys
                const columns: string[] =
                    jsonData.length > 0
                        ? Object.keys(jsonData[0])
                        : extractHeadersFromRange(firstSheet);

                resolve({
                    fileName: file.name,
                    sheetNames,
                    columns,
                    rowCount: jsonData.length,
                    rawData: jsonData,
                    uploadedAt: new Date().toISOString(),
                });
            } catch (err) {
                reject(err instanceof Error ? err : new Error('Failed to parse Excel file'));
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * Fallback header extraction from the sheet range when JSON is empty.
 */
function extractHeadersFromRange(sheet: XLSX.WorkSheet): string[] {
    const range = sheet['!ref'];
    if (!range) return [];

    const decoded = XLSX.utils.decode_range(range);
    const headers: string[] = [];

    for (let col = decoded.s.c; col <= decoded.e.c; col++) {
        const cellAddr = XLSX.utils.encode_cell({ r: decoded.s.r, c: col });
        const cell = sheet[cellAddr];
        headers.push(cell ? String(cell.v) : `Col_${col + 1}`);
    }

    return headers;
}

// ============================================
// BUILD COMPARISON MATRIX
// ============================================

/**
 * Build a comparison matrix from economic offers mapped to template structure.
 *
 * Strategy:
 * 1. Use economicFields if available to define the row structure.
 * 2. Fall back to template columns/rawData if no fields are defined.
 * 3. Map each supplier's price_breakdown to the corresponding rows.
 * 4. Detect outliers (values >20% away from the mean).
 */
export function buildExcelComparison(
    templateData: ExcelTemplateData,
    offers: EconomicOffer[],
    economicFields: EconomicFieldEntry[]
): ExcelComparisonData {
    const providerNames = offers.map((o) => o.provider_name);
    const headers = ['', ...providerNames]; // First column is the field label
    const rows: ExcelComparisonRow[] = [];
    const totals: Record<string, number> = {};
    const validationIssues: ExcelValidationIssue[] = [];

    // Determine row structure from economic fields or template columns
    const rowDefs = economicFields.length > 0
        ? economicFields.map((f) => ({
              key: f.name,
              label: f.name,
              unit: f.unit,
              fieldType: mapFieldType(f.fieldType),
          }))
        : templateData.columns.map((col) => ({
              key: col,
              label: col,
              unit: undefined as string | undefined,
              fieldType: 'item' as const,
          }));

    for (const def of rowDefs) {
        const values: Record<string, number | string | null> = {};

        for (const offer of offers) {
            const breakdown = offer.price_breakdown || {};
            const rawValue = breakdown[def.key] ?? breakdown[normalizeKey(def.key)] ?? null;

            if (rawValue === null || rawValue === undefined) {
                values[offer.provider_name] = null;
                if (def.fieldType === 'item' || def.fieldType === 'total') {
                    validationIssues.push({
                        provider: offer.provider_name,
                        field: def.label,
                        issue: 'missing',
                        message: `${offer.provider_name}: valor faltante en "${def.label}"`,
                        severity: 'warning',
                    });
                }
            } else {
                const numVal = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
                if (isNaN(numVal)) {
                    values[offer.provider_name] = String(rawValue);
                } else {
                    values[offer.provider_name] = numVal;

                    if (numVal < 0) {
                        validationIssues.push({
                            provider: offer.provider_name,
                            field: def.label,
                            issue: 'negative',
                            message: `${offer.provider_name}: valor negativo en "${def.label}"`,
                            severity: 'error',
                        });
                    }
                }
            }
        }

        // Detect outliers among numeric values
        const numericValues = Object.values(values).filter(
            (v): v is number => typeof v === 'number' && !isNaN(v)
        );
        const isOutlier = detectOutlier(numericValues);

        if (isOutlier) {
            // Mark individual outlier providers
            const mean = numericValues.reduce((s, v) => s + v, 0) / numericValues.length;
            for (const offer of offers) {
                const val = values[offer.provider_name];
                if (typeof val === 'number' && Math.abs(val - mean) / mean > 0.2) {
                    validationIssues.push({
                        provider: offer.provider_name,
                        field: def.label,
                        issue: 'outlier',
                        message: `${offer.provider_name}: valor atipico en "${def.label}" (>20% de la media)`,
                        severity: 'warning',
                    });
                }
            }
        }

        rows.push({
            field: def.label,
            fieldType: def.fieldType,
            values,
            unit: def.unit,
            isOutlier,
        });
    }

    // Calculate per-supplier totals
    for (const offer of offers) {
        let sum = 0;
        for (const row of rows) {
            const val = row.values[offer.provider_name];
            if (typeof val === 'number') {
                sum += val;
            }
        }
        totals[offer.provider_name] = sum;
    }

    // Validate totals against offer.total_price
    for (const offer of offers) {
        if (offer.total_price != null && totals[offer.provider_name] > 0) {
            const diff = Math.abs(totals[offer.provider_name] - offer.total_price);
            const pct = offer.total_price > 0 ? (diff / offer.total_price) * 100 : 0;
            if (pct > 5) {
                validationIssues.push({
                    provider: offer.provider_name,
                    field: 'Total',
                    issue: 'total_mismatch',
                    message: `${offer.provider_name}: la suma del desglose (${totals[offer.provider_name].toFixed(0)}) difiere del total declarado (${offer.total_price.toFixed(0)}) en ${pct.toFixed(1)}%`,
                    severity: 'warning',
                });
            }
        }
    }

    return { headers, rows, totals, validationIssues };
}

// ============================================
// EXPORT FILLED EXCEL
// ============================================

/**
 * Export a filled Excel workbook with supplier data in the original template structure.
 * Creates one sheet with the template fields as rows and suppliers as columns.
 */
export function exportFilledExcel(
    templateData: ExcelTemplateData,
    offers: EconomicOffer[],
    projectName: string,
    currency: string
): Blob {
    const wb = XLSX.utils.book_new();

    // Build header row: [Field, Unit, ...provider names]
    const providerNames = offers.map((o) => o.provider_name);
    const headerRow = ['Campo', 'Unidad', ...providerNames];

    // Build data rows from template columns
    const dataRows: (string | number | null)[][] = [];

    for (const col of templateData.columns) {
        const row: (string | number | null)[] = [col, ''];

        for (const offer of offers) {
            const breakdown = offer.price_breakdown || {};
            const val = breakdown[col] ?? breakdown[normalizeKey(col)] ?? null;

            if (val === null || val === undefined) {
                row.push(null);
            } else if (typeof val === 'number') {
                row.push(val);
            } else {
                const num = parseFloat(String(val));
                row.push(isNaN(num) ? String(val) as unknown as null : num);
            }
        }

        dataRows.push(row);
    }

    // Add totals row
    const totalsRow: (string | number | null)[] = ['TOTAL', currency];
    for (const offer of offers) {
        totalsRow.push(offer.total_price ?? null);
    }
    dataRows.push(totalsRow);

    // Create worksheet
    const wsData = [headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
        { wch: 30 }, // Field name
        { wch: 10 }, // Unit
        ...providerNames.map(() => ({ wch: 18 })),
    ];

    const safeName = projectName.replace(/[^a-zA-Z0-9_ -]/g, '').slice(0, 28) || 'Comparativa';
    XLSX.utils.book_append_sheet(wb, ws, safeName);

    // Write to buffer and return as Blob
    const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbOut], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
}

// ============================================
// HELPERS
// ============================================

/**
 * Normalize a key for fuzzy matching: lowercase, replace spaces/dashes with underscores.
 */
function normalizeKey(key: string): string {
    return key.toLowerCase().replace(/[\s-]+/g, '_').trim();
}

/**
 * Map EconomicFieldType to comparison row field type.
 */
function mapFieldType(fieldType: string): 'header' | 'item' | 'subtotal' | 'total' {
    switch (fieldType) {
        case 'section':
        case 'group':
            return 'header';
        case 'subtotal':
            return 'subtotal';
        case 'total':
        case 'formula':
            return 'total';
        default:
            return 'item';
    }
}

/**
 * Detect if any values in the set are outliers (>20% deviation from mean).
 */
function detectOutlier(values: number[]): boolean {
    if (values.length < 2) return false;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    if (mean === 0) return false;
    return values.some((v) => Math.abs(v - mean) / mean > 0.2);
}
