import { useState, useMemo, useRef, useEffect } from 'react';
import { useRfqStore } from '../../stores/useRfqStore';
import * as XLSX from 'xlsx';
import './ResultsTable.css';

interface Filters {
  searchText: string;
  selectedEvaluations: string[];
  selectedFases: string[];
}

export function ResultsTable() {
  const { results, selectedFiles } = useRfqStore();

  // Estado de filtros
  const [filters, setFilters] = useState<Filters>({
    searchText: '',
    selectedEvaluations: [],
    selectedFases: []
  });

  // Estado para mostrar/ocultar filtros
  const [showFilters, setShowFilters] = useState(false);

  // Estado para mostrar/ocultar dropdowns
  const [showEvaluationDropdown, setShowEvaluationDropdown] = useState(false);
  const [showFaseDropdown, setShowFaseDropdown] = useState(false);

  // Refs para detectar clics fuera de los dropdowns
  const evaluationDropdownRef = useRef<HTMLDivElement>(null);
  const faseDropdownRef = useRef<HTMLDivElement>(null);

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

  // Limpiar todos los filtros
  const clearFilters = () => {
    setFilters({
      searchText: '',
      selectedEvaluations: [],
      selectedFases: []
    });
  };

  // Verificar si hay filtros activos
  const hasActiveFilters =
    filters.searchText ||
    filters.selectedEvaluations.length > 0 ||
    filters.selectedFases.length > 0;

  const handleExportCSV = () => {
    // Usar resultados filtrados para exportación
    const dataToExport = filteredResults;

    // Crear headers con solo las columnas requeridas
    const headers = [
      'ID',
      'Evaluación',
      'Fase',
      'Descripción',
      'Requisito RFQ'
    ];

    // Crear filas con solo las columnas requeridas
    const rows = dataToExport.map(result => {
      return [
        result.id,
        `"${result.evaluation.replace(/"/g, '""')}"`,
        `"${result.fase.replace(/"/g, '""')}"`,
        `"${result.item.replace(/"/g, '""')}"`,
        `"${(result.rfq_requisito || '-').replace(/"/g, '""')}"`
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

    // Crear headers con solo las columnas requeridas
    const headers = [
      'ID',
      'Evaluación',
      'Fase',
      'Descripción',
      'Requisito RFQ'
    ];

    // Crear filas con solo las columnas requeridas
    const rows = dataToExport.map(result => {
      return [
        result.id,
        result.evaluation,
        result.fase,
        result.item,
        result.rfq_requisito || '-'
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
      { wch: 40 }  // Requisito RFQ
    ];

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
    };

    // Agregar listener solo si al menos un dropdown está abierto
    if (showEvaluationDropdown || showFaseDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEvaluationDropdown, showFaseDropdown]);

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
              <th className="col-rfq-requisito">Requisito RFQ</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={5} className="no-results">
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
                  <td className="col-rfq-requisito" title={result.rfq_requisito}>
                    {result.rfq_requisito || '-'}
                  </td>
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
