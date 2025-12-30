import { RfqResult } from '../types/rfq.types';
import { Provider } from '../types/provider.types';
import { PROVIDER_DISPLAY_NAMES } from '../config/constants';
import * as XLSX from 'xlsx';

/**
 * Exporta los resultados a formato CSV
 */
export function exportToCSV(results: RfqResult[], fileName?: string): void {
  if (!results || results.length === 0) {
    return;
  }

  // Obtener todos los proveedores presentes en los resultados
  const providers = Object.values(Provider);

  // Crear encabezados
  const headers = [
    'ID',
    'Evaluation',
    'Fase',
    'Descripción Item',
    ...providers.map(p => PROVIDER_DISPLAY_NAMES[p] || p),
    'Created At',
    'Updated At'
  ];

  // Crear filas
  const rows = results.map(result => {
    const row = [
      result.id,
      result.evaluation,
      result.fase,
      `"${result.item.replace(/"/g, '""')}"` // Escapar comillas
    ];

    // Agregar evaluación de cada proveedor
    providers.forEach(provider => {
      const evaluation = result.evaluations[provider];
      const value = evaluation?.evaluation || 'N/A';
      row.push(`"${value.replace(/"/g, '""')}"`);
    });

    // Agregar timestamps
    row.push(result.createdAt || 'N/A');
    row.push(result.updatedAt || 'N/A');

    return row;
  });

  // Combinar en CSV
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Crear y descargar archivo
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `rfq-results-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta los resultados a formato Excel (.xlsx)
 */
export function exportToExcel(results: RfqResult[], fileName?: string): void {
  if (!results || results.length === 0) {
    return;
  }

  // Obtener todos los proveedores presentes en los resultados
  const providers = Object.values(Provider);

  // Crear datos para Excel
  const data = results.map(result => {
    const row: Record<string, string | number> = {
      'ID': result.id,
      'Evaluation': result.evaluation,
      'Fase': result.fase,
      'Descripción Item': result.item
    };

    // Agregar evaluación de cada proveedor
    providers.forEach(provider => {
      const evaluation = result.evaluations[provider];
      const displayName = PROVIDER_DISPLAY_NAMES[provider] || provider;
      row[displayName] = evaluation?.evaluation || 'N/A';
    });

    // Agregar timestamps
    row['Created At'] = result.createdAt || 'N/A';
    row['Updated At'] = result.updatedAt || 'N/A';

    return row;
  });

  // Crear workbook y worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Ajustar anchos de columnas
  const colWidths = [
    { wch: 8 },  // ID
    { wch: 20 }, // Evaluation
    { wch: 12 }, // Fase
    { wch: 50 }, // Descripción Item
    ...providers.map(() => ({ wch: 35 })), // Proveedores
    { wch: 20 }, // Created At
    { wch: 20 }  // Updated At
  ];
  ws['!cols'] = colWidths;

  // Agregar worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Resultados de Propuestas');

  // Generar y descargar archivo
  const excelFileName = fileName || `rfq-results-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, excelFileName);
}
