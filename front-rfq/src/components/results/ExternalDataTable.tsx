import React, { useEffect, useState, useRef } from 'react';
import { useRfqStore, TableFilters } from '../../stores/useRfqStore';
import * as XLSX from 'xlsx';

export const ExternalDataTable: React.FC = () => {
    // State declarations first
    const [data, setData] = useState<any[]>([]);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);

    const {
        rfqMetadata,
        applyTableFilters,
        setApplyTableFilters,
        tableFilters,
        setTableFilters,
        projects,
        fetchPivotTableData,
        pivotTableData,
        error,
        isProcessing
    } = useRfqStore();

    // Sync pivotTableData with internal data state - use direct Supabase data
    useEffect(() => {
        if (pivotTableData && pivotTableData.length > 0) {
            // Use the pivot data directly as it comes from Supabase with provider columns
            setData(pivotTableData);
        } else {
            setData([]);
        }
    }, [pivotTableData]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeDropdown && filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeDropdown]);

    useEffect(() => {
        if (applyTableFilters && rfqMetadata) {
            setTableFilters({
                project_name: rfqMetadata.proyecto || '',
                provider: rfqMetadata.proveedor ? [rfqMetadata.proveedor] : [],
                evaluation_type: rfqMetadata.tipoEvaluacion || []
            });
            setApplyTableFilters(false);

            // Auto-load if project matches - el filtrado se hace automáticamente en el useEffect
        }
    }, [applyTableFilters, rfqMetadata, setApplyTableFilters, setTableFilters]);

    // Cargar datos solo cuando se accede al apartado por primera vez
    useEffect(() => {
        if (!hasLoadedRef.current) {
            loadData();
            hasLoadedRef.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleFilter = (key: keyof TableFilters, value: string) => {
        setTableFilters((prev) => {
            const current = (prev as any)[key];
            if (!Array.isArray(current)) return prev;

            const next = current.includes(value)
                ? current.filter((v: any) => v !== value)
                : [...current, value];
            return { ...prev, [key]: next };
        });
    };

    const loadData = async () => {
        try {
            // Usar llamada directa a Supabase para obtener datos pivoteados
            await fetchPivotTableData();

            // No aplicar filtros automáticos - dejar que el usuario elija
        } catch (err: any) {
            console.error('Error loading pivot table data:', err);
            // Error will be handled by the store
        }
    };



    const downloadExcel = () => {
        if (!data.length) return;
        const worksheet = XLSX.utils.json_to_sheet(filteredData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, "rfq_data_export.xlsx");
    };

    const downloadCSV = () => {
        if (!data.length) return;
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...filteredData.map(row => headers.map(h => {
                const val = row[h] || '';
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'rfq_data_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isProcessing) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div className="spinner" style={{ margin: '0 auto 16px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', width: 24, height: 24, animation: 'spin 1s linear infinite' }}></div>
            Loading Data Table...
        </div>
    );

    if (error) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-danger)' }}>
            <p>Error loading table data</p>
            <small>{error}</small>
            <br />
            <button className="btn btnSecondary" onClick={fetchPivotTableData} style={{ marginTop: 16 }}>Retry</button>
        </div>
    );

    if (!data.length && !isProcessing) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ marginBottom: '16px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.5 }}>
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            </div>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>No Data Available</h3>
            <p style={{ margin: '0 0 16px 0' }}>
                {projects.length === 0
                    ? 'No projects found. Trying to load general data or the data source may be temporarily unavailable.'
                    : 'No data available for the selected filters. Try selecting a different project or clearing filters.'
                }
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btnSecondary" onClick={fetchPivotTableData}>
                    Reload Data
                </button>
                {tableFilters.project_name && (
                    <button
                        className="btn btnSecondary"
                        onClick={() => {
                            setTableFilters({ project_name: '' });
                            loadData();
                        }}
                    >
                        Clear Project Filter
                    </button>
                )}
                {projects.length === 0 && (
                    <button
                        className="btn btnPrimary"
                        onClick={async () => {
                            try {
                                await fetchPivotTableData();
                            } catch (err) {
                                console.error('Error loading pivot table data:', err);
                            }
                        }}
                    >
                        Load All Data
                    </button>
                )}
            </div>
        </div>
    );

    // Determine columns dynamically from pivot data
    const baseColumns = ['project_name', 'evaluation_type', 'phase', 'requirement_text'];

    // Get all provider columns (any column that is not a base column)
    const providerColumns = data.length > 0
        ? Object.keys(data[0]).filter(col => !baseColumns.includes(col) && col !== 'id' && col !== 'project_id' && col !== 'created_at')
        : [];

    // Combine base columns with provider columns
    const columns = [...baseColumns, ...providerColumns];

    const getColumnWidth = (col: string, isProviderColumn: boolean) => {
        if (col === 'project_name') return '200px';
        if (col === 'evaluation_type') return '120px';
        if (col === 'phase') return '70px';
        if (col === 'requirement_text') return '230px';
        if (isProviderColumn) return '240px';
        return '160px';
    };

    // Filter Options
    const filterOptions = {
        evaluations: [...new Set(data.map(d => d.evaluation_type))].filter(Boolean) as string[],
        rfqRequirements: [...new Set(data.map(d => d.phase))].filter(Boolean) as string[],
        providers: providerColumns // Now we have provider columns to filter
    };

    const filteredData = data.filter(row => {
        const matchProject = !tableFilters.project_name || row.project_name?.toLowerCase().includes(tableFilters.project_name.toLowerCase());
        const matchEvalType = tableFilters.evaluation_type.length === 0 || tableFilters.evaluation_type.includes(String(row.evaluation_type));
        const matchPhase = tableFilters.phase.length === 0 || tableFilters.phase.includes(String(row.phase));
        // Provider filter: check if any selected provider has data in this row
        const matchProvider = tableFilters.provider.length === 0 ||
            tableFilters.provider.some(provider => row[provider] && String(row[provider]).trim() !== '');
        return matchProject && matchEvalType && matchPhase && matchProvider;
    });

    const activeFilterCount = (tableFilters.evaluation_type.length + tableFilters.phase.length + tableFilters.provider.length + (tableFilters.project_name ? 1 : 0));

    const FilterDropdown = ({ label, options, selected, onToggle, id, displayMap }: any) => {
        const isOpen = activeDropdown === id;
        const selectedCount = selected.length;

        return (
            <div style={{ position: 'relative', flex: '1 1 180px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>{label}</label>
                <div
                    onClick={() => setActiveDropdown(isOpen ? null : id)}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-body)',
                        color: selectedCount > 0 ? 'var(--color-cyan)' : 'var(--text-primary)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        userSelect: 'none'
                    }}
                >
                    <span>{selectedCount > 0 ? `${selectedCount} selected` : `All ${label}s`}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>

                {isOpen && (
                    <div className="fade-in" style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: 'var(--bg-surface, #ffffff)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        zIndex: 1000,
                        maxHeight: '250px',
                        overflowY: 'auto',
                        padding: '8px 0',
                        opacity: 1
                    }}>
                        {options.map((opt: string) => (
                            <label key={opt} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 16px',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }} className="dropdown-item-hover">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(opt)}
                                    onChange={() => onToggle(opt)}
                                    style={{ accentColor: 'var(--color-cyan)' }}
                                />
                                <span style={{ color: selected.includes(opt) ? 'var(--color-cyan)' : 'var(--text-primary)' }}>
                                    {displayMap ? displayMap(opt) : opt}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Requirements & Provider Evaluations</h3>
                    {activeFilterCount > 0 && (
                        <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--color-cyan)', color: '#000', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                            {activeFilterCount} filters active
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="btn btnSecondary"
                        onClick={async () => {
                            // Reset filters first
                            setTableFilters({
                                project_name: '',
                                evaluation_type: [],
                                phase: [],
                                provider: [],
                                rfqSearch: ''
                            });
                            // Then reload data
                            await fetchPivotTableData();
                        }}
                        title="Reload Data & Reset Filters"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 4v6h-6" />
                            <path d="M1 20v-6h6" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                    </button>
                    <button
                        className={`btn ${showFilterPanel ? 'btnPrimary' : 'btnSecondary'}`}
                        onClick={() => {
                            setShowFilterPanel(!showFilterPanel);
                            setActiveDropdown(null);
                        }}
                        style={showFilterPanel ? { backgroundColor: 'var(--color-cyan)', color: '#000', borderColor: 'var(--color-cyan)' } : {}}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                        Filters
                    </button>
                    <button
                        onClick={downloadCSV}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--color-cyan)',
                            color: 'var(--color-cyan)',
                            background: 'transparent',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        CSV
                    </button>
                    <button
                        onClick={downloadExcel}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--color-cyan)',
                            color: 'var(--color-cyan)',
                            background: 'transparent',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        Excel
                    </button>
                </div>
            </div>

            {/* Improved Filters Panel with Dropdowns */}
            {showFilterPanel && (
                <div ref={filterPanelRef} className="fade-in" style={{
                    padding: '16px 24px',
                    backgroundColor: 'var(--bg-surface)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    gap: '20px',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                    position: 'relative',
                    zIndex: 150
                }}>

                    {/* Project Filter - Now a Dropdown */}
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>Project Name</label>
                        <select
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-body)', color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer' }}
                            value={tableFilters.project_name}
                            onChange={(e) => {
                                const val = e.target.value;
                                setTableFilters({ project_name: val });
                                // El filtrado se hace automáticamente en el componente basado en tableFilters.project_name
                            }}
                        >
                            <option value="">Select Project...</option>
                            {projects.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    <FilterDropdown
                        label="Evaluation Type"
                        id="eval"
                        options={filterOptions.evaluations}
                        selected={tableFilters.evaluation_type}
                        onToggle={(v: string) => toggleFilter('evaluation_type', v)}
                    />

                    {/* RFQ Requirement Searchable Autocomplete */}
                    <div style={{ position: 'relative', flex: '2 1 300px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>Phase</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Type to search requirements..."
                                style={{ width: '100%', padding: '8px 12px', paddingRight: '30px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-body)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                value={tableFilters.rfqSearch}
                                onChange={(e) => {
                                    setTableFilters({ rfqSearch: e.target.value });
                                    setActiveDropdown('rfq_req');
                                }}
                                onFocus={() => setActiveDropdown('rfq_req')}
                            />
                            {tableFilters.phase.length > 0 && (
                                <span style={{ position: 'absolute', right: '35px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', backgroundColor: 'var(--color-cyan)', color: '#000', padding: '1px 6px', borderRadius: '6px' }}>
                                    {tableFilters.phase.length}
                                </span>
                            )}
                            <button
                                onClick={() => setActiveDropdown(activeDropdown === 'rfq_req' ? null : 'rfq_req')}
                                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transform: activeDropdown === 'rfq_req' ? 'rotate(180deg)' : 'rotate(0)' }}>
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                        </div>

                        {activeDropdown === 'rfq_req' && (
                            <div className="fade-in" style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '4px',
                                backgroundColor: 'var(--bg-surface, #ffffff)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                                zIndex: 1000,
                                maxHeight: '300px',
                                overflowY: 'auto',
                                padding: '8px 0',
                                opacity: 1
                            }}>
                                {filterOptions.rfqRequirements
                                    .filter(opt => opt.toLowerCase().includes(tableFilters.rfqSearch.toLowerCase()))
                                    .slice(0, 50) // Limit results for performance
                                    .map((opt: string) => (
                                        <label key={opt} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '8px 16px',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s'
                                        }} className="dropdown-item-hover">
                                            <input
                                                type="checkbox"
                                                checked={tableFilters.phase.includes(opt)}
                                                onChange={() => toggleFilter('phase', opt)}
                                                style={{ accentColor: 'var(--color-cyan)' }}
                                            />
                                            <span style={{ color: tableFilters.phase.includes(opt) ? 'var(--color-cyan)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {opt}
                                            </span>
                                        </label>
                                    ))}
                                {filterOptions.rfqRequirements.filter(opt => opt.toLowerCase().includes(tableFilters.rfqSearch.toLowerCase())).length === 0 && (
                                    <div style={{ padding: '8px 16px', fontSize: '0.85rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>No matches found</div>
                                )}
                            </div>
                        )}
                    </div>

                    <FilterDropdown
                        label="Provider"
                        id="provider"
                        options={filterOptions.providers}
                        selected={tableFilters.provider}
                        onToggle={(v: string) => toggleFilter('provider', v)}
                        displayMap={(v: string) => v.replace(/_/g, ' ')}
                    />

                    <div style={{ alignSelf: 'flex-end', paddingBottom: '2px' }}>
                        <button
                            className="btn btnSecondary"
                            style={{ height: '36px', padding: '0 16px', fontSize: '0.85rem' }}
                            onClick={() => {
                                setTableFilters({
                                    project_name: '',
                                    evaluation_type: [],
                                    phase: [],
                                    provider: [],
                                    rfqSearch: ''
                                });
                                setActiveDropdown(null);
                            }}
                        >
                            Reset All
                        </button>
                    </div>
                </div>
            )}

            <div style={{ overflow: 'auto', flex: 1, backgroundColor: 'var(--bg-surface)' }}>
                <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', tableLayout: 'fixed' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-body)', zIndex: 1 }}>
                        <tr>
                            {columns.map(col => {
                                const isProviderColumn = providerColumns.includes(col);
                                const colWidth = getColumnWidth(col, isProviderColumn);
                                return (
                                    <th key={col} style={{
                                        padding: '12px 10px',
                                        textAlign: 'left',
                                        borderBottom: '2px solid var(--color-cyan)',
                                        textTransform: 'capitalize',
                                        whiteSpace: 'nowrap',
                                        color: 'var(--color-cyan)',
                                        fontWeight: 700,
                                        fontSize: '0.75rem',
                                        width: colWidth,
                                        minWidth: colWidth,
                                        maxWidth: colWidth,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {(
                                            {
                                                'project_name': 'Project',
                                                'evaluation_type': 'Evaluation Type',
                                                'phase': 'Phase',
                                                'requirement_text': 'Requirement'
                                            }[col] || col.replace(/_/g, ' ')
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                {columns.map(col => {
                                    const isProviderColumn = providerColumns.includes(col);
                                    const colWidth = getColumnWidth(col, isProviderColumn);
                                    return (
                                        <td key={col} style={{
                                            padding: '12px 10px',
                                            verticalAlign: 'top',
                                            color: 'var(--text-primary)',
                                            lineHeight: '1.2',
                                            width: colWidth,
                                            minWidth: colWidth,
                                            maxWidth: colWidth,
                                            wordBreak: 'break-word',
                                            whiteSpace: 'normal'
                                        }}>
                                            {(() => {
                                                const value = row[col];
                                                if (value === null || value === undefined) return '-';
                                                const strValue = String(value).trim();
                                                return strValue !== '' ? strValue : '-';
                                            })()}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .dropdown-item-hover:hover {
                    background-color: var(--bg-hover);
                }
            `}</style>
        </div>
    );
};
