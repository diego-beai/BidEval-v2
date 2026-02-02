import { useState, useMemo, useRef, useEffect } from 'react';
import { useRfqStore } from '../../stores/useRfqStore';
import { getProviderDisplayName } from '../../types/provider.types';
import { useProviderStore } from '../../stores/useProviderStore';
import * as XLSX from 'xlsx';
import './ResultsTable.css';

interface Filters {
  searchText: string;
  selectedEvaluations: string[];
  selectedFases: string[];
  selectedProviders: string[];
}

export function ResultsTable() {
  const { results, selectedFiles } = useRfqStore();
  const { projectProviders } = useProviderStore();

  // Estado de filtros
  const [filters, setFilters] = useState<Filters>({
    searchText: '',
    selectedEvaluations: [],
    selectedFases: [],
    selectedProviders: []
  });

  // Estado para mostrar/ocultar filtros
  const [showFilters, setShowFilters] = useState(false);

  // Estado para el nivel de zoom de la tabla (en porcentaje)
  const [zoomLevel, setZoomLevel] = useState(100);

  // Estado para mostrar/ocultar dropdowns
  const [showEvaluationDropdown, setShowEvaluationDropdown] = useState(false);
  const [showFaseDropdown, setShowFaseDropdown] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);

  // Refs para detectar clics fuera de los dropdowns
  const evaluationDropdownRef = useRef<HTMLDivElement>(null);
  const faseDropdownRef = useRef<HTMLDivElement>(null);
  const providerDropdownRef = useRef<HTMLDivElement>(null);

  // Extraer opciones únicas para los filtros
  const uniqueEvaluations = useMemo(() => {
    if (!results) return [];
    const evaluations = new Set(results.map(r => r.evaluation));
    return Array.from(evaluations).sort();
  }, [results]);

  const uniqueFases = useMemo(() => {
    if (!results) return [];
    const fases = new Set(results.map(r => r.fase));
    return Array.from(fases).sort();
  }, [results]);

  // Lista de todos los proveedores disponibles
  const allProviders = projectProviders;

  // Proveedores a mostrar (filtrados o todos)
  const providersToShow = useMemo(() => {
    return filters.selectedProviders.length > 0 ? filters.selectedProviders : allProviders;
  }, [filters.selectedProviders, allProviders]);

  // Filtrar resultados (solo por texto, evaluación y fase)
  const filteredResults = useMemo(() => {
    if (!results) return [];
    return results.filter(result => {
      // Filtro por texto de búsqueda (busca en proyecto)
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        if (!result.projectName.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Filtro por evaluación (múltiples selecciones)
      if (filters.selectedEvaluations.length > 0 &&
          !filters.selectedEvaluations.includes(result.evaluation)) {
        return false;
      }

      // Filtro por fase (múltiples selecciones)
      if (filters.selectedFases.length > 0 &&
          !filters.selectedFases.includes(result.fase)) {
        return false;
      }

      return true;
    });
  }, [results, filters.searchText, filters.selectedEvaluations, filters.selectedFases]);

  // Toggle selección de evaluación
  const toggleEvaluation = (evaluation: string) => {
    setFilters(prev => {
      const isSelected = prev.selectedEvaluations.includes(evaluation);
      const newSelected = isSelected
        ? prev.selectedEvaluations.filter(e => e !== evaluation)
        : [...prev.selectedEvaluations, evaluation];

      return { ...prev, selectedEvaluations: newSelected };
    });
  };

  // Seleccionar/Deseleccionar todas las evaluaciones
  const toggleAllEvaluations = () => {
    setFilters(prev => ({
      ...prev,
      selectedEvaluations: prev.selectedEvaluations.length === uniqueEvaluations.length
        ? []
        : uniqueEvaluations
    }));
  };

  // Toggle selección de fase
  const toggleFase = (fase: string) => {
    setFilters(prev => {
      const isSelected = prev.selectedFases.includes(fase);
      const newSelected = isSelected
        ? prev.selectedFases.filter(f => f !== fase)
        : [...prev.selectedFases, fase];

      return { ...prev, selectedFases: newSelected };
    });
  };

  // Seleccionar/Deseleccionar todas las fases
  const toggleAllFases = () => {
    setFilters(prev => ({
      ...prev,
      selectedFases: prev.selectedFases.length === uniqueFases.length
        ? []
        : uniqueFases
    }));
  };

  // Toggle selección de proveedor
  const toggleProvider = (provider: string) => {
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
      selectedEvaluations: [],
      selectedFases: [],
      selectedProviders: []
    });
  };

  // Verificar si hay filtros activos
  const hasActiveFilters =
    filters.searchText ||
    filters.selectedEvaluations.length > 0 ||
    filters.selectedFases.length > 0 ||
    filters.selectedProviders.length > 0;

  // Funciones de zoom
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 10, 150));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 10, 50));
  };

  const resetZoom = () => {
    setZoomLevel(100);
  };

  const handleExportCSV = () => {
    // Usar resultados filtrados para exportación
    const dataToExport = filteredResults;

    // Crear headers con las columnas requeridas más proveedores
    const headers = [
      'ID',
      'Proyecto',
      'Evaluación',
      'Fase',
      'Requisito RFQ',
      ...providersToShow.map(provider => getProviderDisplayName(provider))
    ];

    // Crear filas con las columnas requeridas más datos de proveedores
    const rows = dataToExport.map(result => {
      const providerData = providersToShow.map(provider => {
        const evaluation = result.evaluations[provider];
        return evaluation ? `"${evaluation.evaluation.replace(/"/g, '""')}"` : '-';
      });

      return [
        result.id,
        `"${result.projectName.replace(/"/g, '""')}"`,
        `"${result.evaluation.replace(/"/g, '""')}"`,
        `"${result.fase.replace(/"/g, '""')}"`,
        `"${(result.rfq_requisito || '-').replace(/"/g, '""')}"`,
        ...providerData
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
    // Usar resultados filtrados para exportación
    const dataToExport = filteredResults;

    // Crear headers con las columnas requeridas más proveedores
    const headers = [
      'ID',
      'Proyecto',
      'Evaluación',
      'Fase',
      'Requisito RFQ',
      ...providersToShow.map(provider => getProviderDisplayName(provider))
    ];

    // Crear filas con las columnas requeridas más datos de proveedores
    const rows = dataToExport.map(result => {
      const providerData = providersToShow.map(provider => {
        const evaluation = result.evaluations[provider];
        return evaluation ? evaluation.evaluation : '-';
      });

      return [
        result.id,
        result.projectName,
        result.evaluation,
        result.fase,
        result.rfq_requisito || '-',
        ...providerData
      ];
    });

    // Crear worksheet
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Ajustar ancho de columnas
    const columnWidths = [
      { wch: 8 },  // ID
      { wch: 20 }, // Proyecto
      { wch: 18 }, // Evaluación
      { wch: 12 }, // Fase
      { wch: 40 }, // Requisito RFQ
      ...providersToShow.map(() => ({ wch: 22 })) // Ancho uniforme para cada proveedor
    ];
    ws['!cols'] = columnWidths;

    // Crear workbook y agregar worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados RFQ');

    // Descargar
    XLSX.writeFile(wb, `rfq-results-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Efecto para cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Cerrar dropdown de evaluación
      if (evaluationDropdownRef.current &&
          !evaluationDropdownRef.current.contains(event.target as Node)) {
        setShowEvaluationDropdown(false);
      }

      // Cerrar dropdown de fase
      if (faseDropdownRef.current &&
          !faseDropdownRef.current.contains(event.target as Node)) {
        setShowFaseDropdown(false);
      }

      // Cerrar dropdown de proveedor
      if (providerDropdownRef.current &&
          !providerDropdownRef.current.contains(event.target as Node)) {
        setShowProviderDropdown(false);
      }
    };

    // Agregar listener solo si al menos un dropdown está abierto
    if (showEvaluationDropdown || showFaseDropdown || showProviderDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEvaluationDropdown, showFaseDropdown, showProviderDropdown]);

  // Early return si no hay resultados
  if (!results || results.length === 0) {
    return null;
  }

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

          {/* Controles de Zoom */}
          <div className="zoom-controls">
            <button
              onClick={zoomOut}
              className="zoom-btn"
              title="Reducir zoom"
              disabled={zoomLevel <= 50}
            >
              −
            </button>
            <button
              onClick={resetZoom}
              className="zoom-level"
              title="Restablecer zoom"
            >
              {zoomLevel}%
            </button>
            <button
              onClick={zoomIn}
              className="zoom-btn"
              title="Aumentar zoom"
              disabled={zoomLevel >= 150}
            >
              +
            </button>
          </div>

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
              <label className="filter-label">Buscar en proyecto</label>
              <input
                type="text"
                className="filter-input"
                placeholder="Buscar proyecto..."
                value={filters.searchText}
                onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
              />
            </div>

            <div className="filter-item">
              <label className="filter-label">
                Evaluación ({filters.selectedEvaluations.length}/{uniqueEvaluations.length})
              </label>
              <div className="provider-dropdown-container" ref={evaluationDropdownRef}>
                <button
                  type="button"
                  className="provider-dropdown-btn"
                  onClick={() => setShowEvaluationDropdown(!showEvaluationDropdown)}
                >
                  {filters.selectedEvaluations.length === 0
                    ? 'Todas las evaluaciones'
                    : filters.selectedEvaluations.length === uniqueEvaluations.length
                    ? 'Todas las evaluaciones'
                    : `${filters.selectedEvaluations.length} seleccionadas`}
                  <span className="dropdown-arrow">{showEvaluationDropdown ? '▲' : '▼'}</span>
                </button>

                {showEvaluationDropdown && (
                  <div className="provider-checkboxes">
                    <label className="checkbox-item checkbox-all">
                      <input
                        type="checkbox"
                        checked={filters.selectedEvaluations.length === uniqueEvaluations.length}
                        onChange={toggleAllEvaluations}
                      />
                      <span>Todas</span>
                    </label>
                    {uniqueEvaluations.map(evalType => (
                      <label key={evalType} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={filters.selectedEvaluations.includes(evalType)}
                          onChange={() => toggleEvaluation(evalType)}
                        />
                        <span>{evalType}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="filter-item">
              <label className="filter-label">
                Fase ({filters.selectedFases.length}/{uniqueFases.length})
              </label>
              <div className="provider-dropdown-container" ref={faseDropdownRef}>
                <button
                  type="button"
                  className="provider-dropdown-btn"
                  onClick={() => setShowFaseDropdown(!showFaseDropdown)}
                >
                  {filters.selectedFases.length === 0
                    ? 'Todas las fases'
                    : filters.selectedFases.length === uniqueFases.length
                    ? 'Todas las fases'
                    : `${filters.selectedFases.length} seleccionadas`}
                  <span className="dropdown-arrow">{showFaseDropdown ? '▲' : '▼'}</span>
                </button>

                {showFaseDropdown && (
                  <div className="provider-checkboxes">
                    <label className="checkbox-item checkbox-all">
                      <input
                        type="checkbox"
                        checked={filters.selectedFases.length === uniqueFases.length}
                        onChange={toggleAllFases}
                      />
                      <span>Todas</span>
                    </label>
                    {uniqueFases.map(fase => (
                      <label key={fase} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={filters.selectedFases.includes(fase)}
                          onChange={() => toggleFase(fase)}
                        />
                        <span>{fase}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="filter-item">
              <label className="filter-label">
                Proveedores ({filters.selectedProviders.length}/{allProviders.length})
              </label>
              <div className="provider-dropdown-container" ref={providerDropdownRef}>
                <button
                  type="button"
                  className="provider-dropdown-btn"
                  onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                >
                  {filters.selectedProviders.length === 0
                    ? 'Todos los proveedores'
                    : filters.selectedProviders.length === allProviders.length
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
                        <span>{getProviderDisplayName(provider)}</span>
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
        <table className="results-table" style={{ fontSize: `${zoomLevel * 0.875 / 100}rem` }}>
          <thead>
            <tr>
              <th className="col-id">ID</th>
              <th className="col-item">Proyecto</th>
              <th className="col-evaluation">Evaluación</th>
              <th className="col-fase">Fase</th>
              <th className="col-rfq-requisito">Requisito RFQ</th>
              {providersToShow.map(provider => (
                <th key={provider} className="col-provider">
                  {getProviderDisplayName(provider)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={5 + providersToShow.length} className="no-results">
                  No se encontraron resultados con los filtros aplicados
                </td>
              </tr>
            ) : (
              filteredResults.map((result) => (
                <tr key={result.id}>
                  <td className="col-id">{result.id}</td>
                  <td className="col-item">{result.projectName}</td>
                  <td className="col-evaluation">{result.evaluation}</td>
                  <td className="col-fase">{result.fase}</td>
                  <td className="col-rfq-requisito" title={result.rfq_requisito}>
                    {result.rfq_requisito || '-'}
                  </td>
                  {providersToShow.map(provider => {
                    const evaluation = result.evaluations[provider];
                    return (
                      <td key={provider} className="col-provider">
                        {evaluation ? evaluation.evaluation : '-'}
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
              <strong>Mostrando:</strong> {filteredResults.length} de {results.length} ítems
            </>
          ) : (
            <>
              <strong>Total de ítems:</strong> {results.length}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
