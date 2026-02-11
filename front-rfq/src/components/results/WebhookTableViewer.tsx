import { useState, useMemo, useRef, useEffect } from 'react';
import { getProviderDisplayName } from '../../types/provider.types';
import { useProviderStore } from '../../stores/useProviderStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { RfqResult, RfqItem } from '../../types/rfq.types';
import { API_CONFIG } from '../../config/constants';
import { fetchWithTimeout } from '../../services/api.service';
import * as XLSX from 'xlsx';
import './ResultsTable.css';

interface Filters {
  searchText: string;
  selectedEvaluations: string[];
  selectedFases: string[];
  selectedProviders: string[];
  rfqRequisitoSearch: string;
}

/**
 * Transforma los resultados de n8n a RfqResult[]
 * Dynamically detects provider columns from item keys
 */
function transformResults(items: RfqItem[]): RfqResult[] {
  // Known non-provider columns
  const KNOWN_COLUMNS = new Set([
    'id', 'rfq_project_id', 'project_name', 'evaluation', 'fase',
    'requisito_rfq', 'createdAt', 'updatedAt', 'created_at', 'updated_at',
    'evaluation_type', 'phase', 'requirement_text', 'Provider', 'provider'
  ]);

  return items.map((item) => {
    const evaluations: Record<string, any> = {};

    // Detect provider columns dynamically
    Object.keys(item).forEach(key => {
      if (KNOWN_COLUMNS.has(key)) return;
      const value = item[key];
      if (value && typeof value === 'string') {
        evaluations[key] = {
          provider: key,
          evaluation: value,
          hasValue: value !== 'NO COTIZADO' && value !== 'SIN INFORMACIÓN' && value !== 'NOT QUOTED' && value !== 'NO INFORMATION'
        };
      }
    });

    const result: RfqResult = {
      id: item.id,
      projectName: String(item.project_name || ''),
      fase: String(item.fase || ''),
      evaluation: String(item.evaluation || ''),
      rfq_requisito: item.requisito_rfq,
      evaluations,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };

    return result;
  });
}

export function WebhookTableViewer() {
  const { projectProviders } = useProviderStore();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<RfqResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estado de filtros
  const [filters, setFilters] = useState<Filters>({
    searchText: '',
    selectedEvaluations: [],
    selectedFases: [],
    selectedProviders: [],
    rfqRequisitoSearch: ''
  });

  // Estado para mostrar/ocultar filtros
  const [showFilters, setShowFilters] = useState(false);

  // Estado para mostrar/ocultar dropdowns
  const [showEvaluationDropdown, setShowEvaluationDropdown] = useState(false);
  const [showFaseDropdown, setShowFaseDropdown] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showRequisitoSuggestions, setShowRequisitoSuggestions] = useState(false);

  // Refs para detectar clics fuera de los dropdowns
  const evaluationDropdownRef = useRef<HTMLDivElement>(null);
  const faseDropdownRef = useRef<HTMLDivElement>(null);
  const providerDropdownRef = useRef<HTMLDivElement>(null);
  const requisitoSuggestionsRef = useRef<HTMLDivElement>(null);

  // Función para cargar datos del webhook
  const loadTableData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const projectId = useProjectStore.getState().activeProjectId;
      const tablaUrl = projectId
        ? `${API_CONFIG.N8N_TABLA_URL}?project_id=${projectId}`
        : API_CONFIG.N8N_TABLA_URL;
      const response = await fetchWithTimeout(
        tablaUrl,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        API_CONFIG.REQUEST_TIMEOUT
      );

      const data = await response.json();

      // Si n8n devuelve un array directamente, úsalo
      let items: RfqItem[] = [];
      if (Array.isArray(data)) {
        items = data as RfqItem[];
      } else if (data.success && data.results) {
        items = data.results;
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No se recibieron resultados del servidor');
      }

      // Transformar y establecer resultados
      const transformedResults = transformResults(items);
      setResults(transformedResults);
      setIsVisible(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar los datos';
      setError(errorMessage);
      console.error('Error al cargar tabla desde webhook:', err);
    } finally {
      setIsLoading(false);
    }
  };

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

  // Extraer requisitos únicos para autocompletar
  const uniqueRequisitos = useMemo(() => {
    if (!results) return [];
    const requisitos = results
      .map(r => r.rfq_requisito)
      .filter((req): req is string => Boolean(req) && typeof req === 'string' && req.trim() !== '');
    return Array.from(new Set(requisitos)).sort();
  }, [results]);

  // Filtrar sugerencias de requisitos basadas en el texto de búsqueda
  const requisitoSuggestions = useMemo(() => {
    if (!filters.rfqRequisitoSearch || filters.rfqRequisitoSearch.trim().length < 2) {
      return [];
    }
    const searchLower = filters.rfqRequisitoSearch.toLowerCase();
    return uniqueRequisitos
      .filter(req => req.toLowerCase().includes(searchLower))
      .slice(0, 10); // Limitar a 10 sugerencias
  }, [filters.rfqRequisitoSearch, uniqueRequisitos]);

  // Filtrar resultados
  const filteredResults = useMemo(() => {
    if (!results) return [];
    return results.filter(result => {
      // Filtro por texto de búsqueda
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        if (!result.projectName.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Filtro por evaluación
      if (filters.selectedEvaluations.length > 0 &&
        !filters.selectedEvaluations.includes(result.evaluation)) {
        return false;
      }

      // Filtro por fase
      if (filters.selectedFases.length > 0 &&
        !filters.selectedFases.includes(result.fase)) {
        return false;
      }

      // Filtro por requisito RFQ
      if (filters.rfqRequisitoSearch && filters.rfqRequisitoSearch.trim().length > 0) {
        const searchLower = filters.rfqRequisitoSearch.toLowerCase();
        if (!result.rfq_requisito || !result.rfq_requisito.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [results, filters.searchText, filters.selectedEvaluations, filters.selectedFases, filters.rfqRequisitoSearch]);

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
      selectedProviders: [],
      rfqRequisitoSearch: ''
    });
    setShowRequisitoSuggestions(false);
  };

  // Verificar si hay filtros activos
  const hasActiveFilters =
    filters.searchText ||
    filters.selectedEvaluations.length > 0 ||
    filters.selectedFases.length > 0 ||
    filters.selectedProviders.length > 0 ||
    filters.rfqRequisitoSearch;

  const handleExportCSV = () => {
    const dataToExport = filteredResults;

    const headers = [
      'ID',
      'Proyecto',
      'Evaluación',
      'Fase',
      'Requisito RFQ',
      ...providersToShow.map(provider => getProviderDisplayName(provider))
    ];

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

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tabla-webhook-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const dataToExport = filteredResults;

    const headers = [
      'ID',
      'Proyecto',
      'Evaluación',
      'Fase',
      'Requisito RFQ',
      ...providersToShow.map(provider => getProviderDisplayName(provider))
    ];

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

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const columnWidths = [
      { wch: 8 },
      { wch: 20 },
      { wch: 18 },
      { wch: 12 },
      { wch: 40 },
      ...providersToShow.map(() => ({ wch: 22 }))
    ];
    ws['!cols'] = columnWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tabla Webhook');

    XLSX.writeFile(wb, `tabla-webhook-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Efecto para cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (evaluationDropdownRef.current &&
        !evaluationDropdownRef.current.contains(event.target as Node)) {
        setShowEvaluationDropdown(false);
      }

      if (faseDropdownRef.current &&
        !faseDropdownRef.current.contains(event.target as Node)) {
        setShowFaseDropdown(false);
      }

      if (providerDropdownRef.current &&
        !providerDropdownRef.current.contains(event.target as Node)) {
        setShowProviderDropdown(false);
      }

      if (requisitoSuggestionsRef.current &&
        !requisitoSuggestionsRef.current.contains(event.target as Node)) {
        setShowRequisitoSuggestions(false);
      }
    };

    if (showEvaluationDropdown || showFaseDropdown || showProviderDropdown || showRequisitoSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEvaluationDropdown, showFaseDropdown, showProviderDropdown, showRequisitoSuggestions]);

  return (
    <div className="webhook-table-viewer">
      {/* Botón para mostrar/cargar tabla */}
      <div className="webhook-table-button-container" style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
        <button
          onClick={() => {
            if (!isVisible) {
              loadTableData();
            } else {
              setIsVisible(false);
            }
          }}
          className="btn btnSecondary"
          disabled={isLoading}
        >
          {isLoading ? 'Cargando...' : isVisible ? 'Ocultar tabla' : 'Ver tabla'}
        </button>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="webhook-table-error">
          <p>{error}</p>
        </div>
      )}

      {/* Tabla de resultados */}
      {isVisible && results && results.length > 0 && (
        <div className="results-container">
          <div className="results-header">
            <h3 className="results-title">
              Tabla de Datos ({results.length} {results.length === 1 ? 'registro' : 'registros'})
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

          {/* Sección de Filtros */}
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

                <div className="filter-item">
                  <label className="filter-label">Buscar requisito RFQ</label>
                  <div className="provider-dropdown-container" ref={requisitoSuggestionsRef} style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="filter-input"
                      placeholder="Escribe para buscar (ej: modelo, sistema...)..."
                      value={filters.rfqRequisitoSearch}
                      onChange={(e) => {
                        setFilters({ ...filters, rfqRequisitoSearch: e.target.value });
                        if (e.target.value.trim().length >= 2) {
                          setShowRequisitoSuggestions(true);
                        } else {
                          setShowRequisitoSuggestions(false);
                        }
                      }}
                      onFocus={() => {
                        if (filters.rfqRequisitoSearch.trim().length >= 2 && requisitoSuggestions.length > 0) {
                          setShowRequisitoSuggestions(true);
                        }
                      }}
                    />

                    {/* Sugerencias de autocompletar */}
                    {showRequisitoSuggestions && requisitoSuggestions.length > 0 && (
                      <div className="provider-checkboxes" style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        zIndex: 1000
                      }}>
                        {requisitoSuggestions.map((requisito, index) => (
                          <div
                            key={index}
                            className="checkbox-item"
                            style={{
                              cursor: 'pointer',
                              padding: '10px 12px',
                              transition: 'background 0.2s ease'
                            }}
                            onClick={() => {
                              setFilters({ ...filters, rfqRequisitoSearch: requisito });
                              setShowRequisitoSuggestions(false);
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ fontSize: '0.85rem' }}>{requisito}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Mensaje cuando no hay sugerencias pero hay búsqueda */}
                    {showRequisitoSuggestions && filters.rfqRequisitoSearch.trim().length >= 2 && requisitoSuggestions.length === 0 && (
                      <div className="provider-checkboxes" style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        zIndex: 1000,
                        padding: '12px',
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem'
                      }}>
                        No se encontraron requisitos con "{filters.rfqRequisitoSearch}"
                      </div>
                    )}

                    {/* Botón para limpiar búsqueda */}
                    {filters.rfqRequisitoSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilters({ ...filters, rfqRequisitoSearch: '' });
                          setShowRequisitoSuggestions(false);
                        }}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
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
      )}
    </div>
  );
}
