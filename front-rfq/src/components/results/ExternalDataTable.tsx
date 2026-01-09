import React, { useEffect, useState, useRef } from 'react';
import { useRfqStore, TableFilters } from '../../stores/useRfqStore';
import { API_CONFIG } from '../../config/constants';
import * as XLSX from 'xlsx';

export const ExternalDataTable: React.FC = () => {
    // State declarations first
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const filterPanelRef = useRef<HTMLDivElement>(null);

    const { rfqMetadata, applyTableFilters, setApplyTableFilters, tableFilters, setTableFilters } = useRfqStore();

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
                evaluation: rfqMetadata.tipoEvaluacion || []
            });
            setApplyTableFilters(false);
        }
    }, [applyTableFilters, rfqMetadata, setApplyTableFilters, setTableFilters]);

    useEffect(() => {
        loadData();
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
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(API_CONFIG.N8N_TABLA_URL);
            if (!res.ok) throw new Error(`Status: ${res.status}`);

            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const json = await res.json();
                let rows: any[] = [];
                if (Array.isArray(json)) {
                    rows = json;
                } else if (json && Array.isArray(json.data)) {
                    rows = json.data;
                } else if (typeof json === 'object') {
                    rows = [json];
                }
                setData(rows);
            } else {
                const text = await res.text();
                const rows = parseCSV(text);
                setData(rows);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error loading data');
        } finally {
            setLoading(false);
        }
    };

    const parseCSV = (text: string) => {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj: any = {};
            headers.forEach((h, i) => obj[h] = values[i] || '');
            return obj;
        });
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

    if (loading) return (
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
            <button className="btn btnSecondary" onClick={loadData} style={{ marginTop: 16 }}>Retry</button>
        </div>
    );

    if (!data.length) return <div style={{ padding: 40, textAlign: 'center' }}>No data available</div>;

    // Ordered columns based on user request/CSV
    const preferredOrder = ['id', 'project_name', 'evaluation', 'requisito_rfq'];
    const allKeys = data.length > 0 ? Object.keys(data[0]) : [];
    const columns = [
        ...preferredOrder.filter(k => allKeys.includes(k)),
        ...allKeys.filter(k => !preferredOrder.includes(k) && k !== 'createdAt' && k !== 'updatedAt' && k !== 'fase')
    ];

    // Filter Options
    const filterOptions = {
        evaluations: [...new Set(data.map(d => d.evaluation))].filter(Boolean) as string[],
        rfqRequirements: [...new Set(data.map(d => d.requisito_rfq))].filter(Boolean) as string[],
        providers: allKeys.filter(k => !preferredOrder.includes(k) && k !== 'fase')
    };

    const filteredData = data.filter(row => {
        const matchProject = !tableFilters.project_name || row.project_name?.toLowerCase().includes(tableFilters.project_name.toLowerCase());
        const matchEval = tableFilters.evaluation.length === 0 || tableFilters.evaluation.includes(String(row.evaluation));
        const matchRfq = tableFilters.requisito_rfq.length === 0 || tableFilters.requisito_rfq.includes(String(row.requisito_rfq));
        const matchProvider = tableFilters.provider.length === 0 || tableFilters.provider.some(p => row[p] && String(row[p]).trim() !== '');
        return matchProject && matchEval && matchRfq && matchProvider;
    });

    const activeFilterCount = (tableFilters.evaluation.length + tableFilters.requisito_rfq.length + tableFilters.provider.length + (tableFilters.project_name ? 1 : 0));

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
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Data Overview</h3>
                    {activeFilterCount > 0 && (
                        <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--color-cyan)', color: '#000', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                            {activeFilterCount} filters active
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btnSecondary" onClick={loadData} title="Reload Data">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
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

                    {/* Project Filter */}
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>Project Name</label>
                        <input
                            type="text"
                            placeholder="Enter project name..."
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-body)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                            value={tableFilters.project_name}
                            onChange={(e) => setTableFilters({ project_name: e.target.value })}
                        />
                    </div>

                    <FilterDropdown
                        label="Evaluation"
                        id="eval"
                        options={filterOptions.evaluations}
                        selected={tableFilters.evaluation}
                        onToggle={(v: string) => toggleFilter('evaluation', v)}
                    />

                    {/* RFQ Requirement Searchable Autocomplete */}
                    <div style={{ position: 'relative', flex: '2 1 300px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>RFQ Requirement</label>
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
                            {tableFilters.requisito_rfq.length > 0 && (
                                <span style={{ position: 'absolute', right: '35px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', backgroundColor: 'var(--color-cyan)', color: '#000', padding: '1px 6px', borderRadius: '6px' }}>
                                    {tableFilters.requisito_rfq.length}
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
                                                checked={tableFilters.requisito_rfq.includes(opt)}
                                                onChange={() => toggleFilter('requisito_rfq', opt)}
                                                style={{ accentColor: 'var(--color-cyan)' }}
                                            />
                                            <span style={{ color: tableFilters.requisito_rfq.includes(opt) ? 'var(--color-cyan)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                                    evaluation: [],
                                    requisito_rfq: [],
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
                                const isProvider = filterOptions.providers.includes(col);
                                const colWidth = isProvider ? '235px' : (col === 'id' ? '50px' : (col === 'requisito_rfq' ? '300px' : '150px'));
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
                                                'id': 'ID',
                                                'project_name': 'Project Name',
                                                'evaluation': 'Evaluation',
                                                'fase': 'Phase',
                                                'requisito_rfq': 'RFQ Requirement',
                                                'requisito': 'Requirement'
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
                                    const isProvider = filterOptions.providers.includes(col);
                                    const colWidth = isProvider ? '235px' : (col === 'id' ? '50px' : (col === 'requisito_rfq' ? '300px' : '150px'));
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
                                            {row[col] && String(row[col]).trim() !== '' ? row[col] : '-'}
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
