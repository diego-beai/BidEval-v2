import { useState, useMemo } from 'react';
import { useRfqStore } from '../../stores/useRfqStore';
import { Provider } from '../../types/provider.types';
import { PROVIDER_COLORS, PROVIDER_DISPLAY_NAMES } from '../../config/constants';
import * as XLSX from 'xlsx';
import './ResultsTable.css';

interface Filters {
  searchText: string;
  evaluation: string;
  fase: string;
  selectedProviders: Provider[];
}

export function ResultsTable() {
  const { results, selectedFiles } = useRfqStore();

  // Todos los proveedores disponibles
  const allProviders: Provider[] = [
    Provider.IDOM,
    Provider.TR,
    Provider.SACYR,
    Provider.EA,
    Provider.SENER,
    Provider.TRESCA,
    Provider.WORLEY
  ];

  // Estado de filtros
  const [filters, setFilters] = useState<Filters>({
    searchText: '',
    evaluation: '',
    fase: '',
    selectedProviders: allProviders // Por defecto, todos seleccionados
  });

  // Estado para mostrar/ocultar filtros
  const [showFilters, setShowFilters] = useState(false);

  // Estado para mostrar/ocultar dropdown de proveedores
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);

  // Early return si no hay resultados
  if (!results || results.length === 0) {
    return null;
  }

  // Proveedores visibles (los seleccionados en el filtro)
  const visibleProviders = filters.selectedProviders.length > 0
    ? filters.selectedProviders
    : allProviders;

  // Extraer opciones únicas para los filtros
  const uniqueEvaluations = useMemo(() => {
    const evaluations = new Set(results.map(r => r.evaluation));
    return Array.from(evaluations).sort();
  }, [results]);

  const uniqueFases = useMemo(() => {
    const fases = new Set(results.map(r => r.fase));
    return Array.from(fases).sort();
  }, [results]);

  // Filtrar resultados (solo por texto, evaluación y fase)
  const filteredResults = useMemo(() => {
    return results.filter(result => {
      // Filtro por texto de búsqueda (busca en descripción)
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        if (!result.item.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Filtro por evaluación
      if (filters.evaluation && result.evaluation !== filters.evaluation) {
        return false;
      }

      // Filtro por fase
      if (filters.fase && result.fase !== filters.fase) {
        return false;
      }

      return true;
    });
  }, [results, filters.searchText, filters.evaluation, filters.fase]);

  // Toggle selección de proveedor
  const toggleProvider = (provider: Provider) => {
    setFilters(prev => {
      const isSelected = prev.selectedProviders.includes(provider);
      const newSelected = isSelected
        ? prev.selectedProviders.filter(p => p !== provider)
        : [...prev.selectedProviders, provider];

      return { ...prev, selectedProviders: newSelected };
    });
  };

  // Seleccionar/Deseleccionar todos los proveedores
  const toggleAllProviders = () => {
    setFilters(prev => ({
      ...prev,
      selectedProviders: prev.selectedProviders.length === allProviders.length
        ? []
        : allProviders
    }));
  };

  // Limpiar todos los filtros
  const clearFilters = () => {
    setFilters({
      searchText: '',
      evaluation: '',
      fase: '',
      selectedProviders: allProviders
    });
  };

  // Verificar si hay filtros activos
  const hasActiveFilters =
    filters.searchText ||
    filters.evaluation ||
    filters.fase ||
    filters.selectedProviders.length !== allProviders.length;

  const handleExportCSV = () => {
    // Usar resultados filtrados y columnas visibles para exportación
    const dataToExport = filteredResults;

    // Crear headers solo con proveedores visibles
    const headers = [
      'ID',
      'Evaluación',
      'Fase',
      'Descripción',
      ...visibleProviders.map(p => PROVIDER_DISPLAY_NAMES[p])
    ];

    // Crear filas con datos solo de proveedores visibles
    const rows = dataToExport.map(result => {
      const providerValues = visibleProviders.map(provider => {
        const evaluation = result.evaluations[provider];
        return evaluation?.evaluation || 'Null';
      });

      return [
        result.id,
        `"${result.evaluation.replace(/"/g, '""')}"`,
        `"${result.fase.replace(/"/g, '""')}"`,
        `"${result.item.replace(/"/g, '""')}"`,
        ...providerValues.map(v => `"${v.replace(/"/g, '""')}"`)
      ];
    });

    // Generar CSV
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rfq-results-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    // Usar resultados filtrados y columnas visibles para exportación
    const dataToExport = filteredResults;

    // Crear headers solo con proveedores visibles
    const headers = [
      'ID',
      'Evaluación',
      'Fase',
      'Descripción',
      ...visibleProviders.map(p => PROVIDER_DISPLAY_NAMES[p])
    ];

    // Crear filas con datos solo de proveedores visibles
    const rows = dataToExport.map(result => {
      const providerValues = visibleProviders.map(provider => {
        const evaluation = result.evaluations[provider];
        return evaluation?.evaluation || 'Null';
      });

      return [
        result.id,
        result.evaluation,
        result.fase,
        result.item,
        ...providerValues
      ];
    });

    // Crear worksheet
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 8 },  // ID
      { wch: 25 }, // Evaluación
      { wch: 15 }, // Fase
      { wch: 50 }, // Descripción
      ...visibleProviders.map(() => ({ wch: 20 })) // Proveedores visibles
    ];

    // Crear workbook y agregar worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados RFQ');

    // Descargar
    XLSX.writeFile(wb, `rfq-results-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <h3 className="results-title">
          Resultados de Evaluación ({selectedFiles.length} {selectedFiles.length === 1 ? 'propuesta procesada' : 'propuestas procesadas'})
        </h3>
        <div className="results-actions">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`filter-toggle-btn ${hasActiveFilters ? 'has-filters' : ''}`}
          >
            Filtros {hasActiveFilters && `(activos)`}
          </button>
          <button onClick={handleExportCSV} className="export-btn export-csv">
            Exportar CSV
          </button>
          <button onClick={handleExportExcel} className="export-btn export-excel">
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Sección de Filtros (Colapsable) */}
      {showFilters && (
        <div className="filters-section">
          <div className="filters-grid">
            <div className="filter-item">
              <label className="filter-label">Buscar en descripción</label>
              <input
                type="text"
                className="filter-input"
                placeholder="Buscar ítem..."
                value={filters.searchText}
                onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
              />
            </div>

            <div className="filter-item">
              <label className="filter-label">Evaluación</label>
              <select
                className="filter-select"
                value={filters.evaluation}
                onChange={(e) => setFilters({ ...filters, evaluation: e.target.value })}
              >
                <option value="">Todas las evaluaciones</option>
                {uniqueEvaluations.map(evalType => (
                  <option key={evalType} value={evalType}>{evalType}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label className="filter-label">Fase</label>
              <select
                className="filter-select"
                value={filters.fase}
                onChange={(e) => setFilters({ ...filters, fase: e.target.value })}
              >
                <option value="">Todas las fases</option>
                {uniqueFases.map(fase => (
                  <option key={fase} value={fase}>{fase}</option>
                ))}
              </select>
            </div>

            <div className="filter-item provider-filter">
              <label className="filter-label">
                Proveedores visibles ({filters.selectedProviders.length}/{allProviders.length})
              </label>
              <div className="provider-dropdown-container">
                <button
                  type="button"
                  className="provider-dropdown-btn"
                  onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                >
                  {filters.selectedProviders.length === allProviders.length
                    ? 'Todos los proveedores'
                    : `${filters.selectedProviders.length} seleccionados`}
                  <span className="dropdown-arrow">{showProviderDropdown ? '▲' : '▼'}</span>
                </button>

                {showProviderDropdown && (
                  <div className="provider-checkboxes">
                    <label className="checkbox-item checkbox-all">
                      <input
                        type="checkbox"
                        checked={filters.selectedProviders.length === allProviders.length}
                        onChange={toggleAllProviders}
                      />
                      <span>Todos</span>
                    </label>
                    {allProviders.map(provider => (
                      <label key={provider} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={filters.selectedProviders.includes(provider)}
                          onChange={() => toggleProvider(provider)}
                        />
                        <span>{PROVIDER_DISPLAY_NAMES[provider]}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="filters-actions">
              <button onClick={clearFilters} className="clear-filters-btn">
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}

      <div className="table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th className="col-id">ID</th>
              <th className="col-evaluation">Evaluación</th>
              <th className="col-fase">Fase</th>
              <th className="col-item">Descripción del Ítem</th>
              {visibleProviders.map(provider => (
                <th
                  key={provider}
                  className="col-provider"
                  style={{
                    borderBottom: `3px solid ${PROVIDER_COLORS[provider]}`
                  }}
                >
                  {PROVIDER_DISPLAY_NAMES[provider]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={4 + visibleProviders.length} className="no-results">
                  No se encontraron resultados con los filtros aplicados
                </td>
              </tr>
            ) : (
              filteredResults.map((result) => (
                <tr key={result.id}>
                  <td className="col-id">{result.id}</td>
                  <td className="col-evaluation">{result.evaluation}</td>
                  <td className="col-fase">{result.fase}</td>
                  <td className="col-item">{result.item}</td>
                  {visibleProviders.map(provider => {
                    const evaluation = result.evaluations[provider];
                    const value = evaluation?.evaluation || 'Null';
                    const hasValue = evaluation?.hasValue ?? false;

                    return (
                      <td
                        key={provider}
                        className={`col-provider ${hasValue ? 'has-value' : 'no-value'}`}
                        title={value}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="results-summary">
        <p>
          {hasActiveFilters ? (
            <>
              <strong>Mostrando:</strong> {filteredResults.length} ítems |
              <strong> Proveedores visibles:</strong> {visibleProviders.length}/{allProviders.length}
            </>
          ) : (
            <>
              <strong>Total de ítems:</strong> {results.length} |
              <strong> Proveedores:</strong> {allProviders.length}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
