import { useState, useEffect, useRef } from 'react';
import { getProviderDisplayName } from '../../types/provider.types';
import { useProjectStore } from '../../stores/useProjectStore';
import { useProviderStore } from '../../stores/useProviderStore';
import './RfqMetadataForm.css';

export interface RfqMetadata {
  proyecto: string;
  proveedor: string;
  tipoEvaluacion: string[];
}

interface RfqMetadataFormProps {
  metadata: RfqMetadata;
  onChange: (metadata: RfqMetadata) => void;
  disabled?: boolean;
}

// Tipos de evaluacion disponibles
const EVALUATION_TYPES = [
  'Technical Evaluation',
  'Economical Evaluation',
  'Others'
];

export function RfqMetadataForm({ metadata, onChange, disabled = false }: RfqMetadataFormProps) {
  const { projects, getActiveProject } = useProjectStore();

  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showEvaluationDropdown, setShowEvaluationDropdown] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');
  const providerInputRef = useRef<HTMLInputElement>(null);

  const { activeProjectId } = useProjectStore();
  const { projectProviders, addLocalProvider } = useProviderStore();
  const activeProject = getActiveProject();

  // Filter providers by search text
  const filteredProviders = projectProviders.filter(p =>
    p.toUpperCase().includes(providerSearch.toUpperCase().trim())
  );

  // Sync with active project from global store when it changes
  useEffect(() => {
    if (activeProject?.display_name) {
      if (metadata.proyecto !== activeProject.display_name) {
        console.log('[RfqMetadataForm] Syncing with active project:', activeProject.display_name);
        onChange({ ...metadata, proyecto: activeProject.display_name });
      }
    }
  }, [activeProjectId, activeProject?.display_name]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (showProviderDropdown && providerInputRef.current) {
      providerInputRef.current.focus();
    }
  }, [showProviderDropdown]);

  const handleProjectSelect = (project: { id: string; display_name: string }) => {
    onChange({ ...metadata, proyecto: project.display_name });
    setShowProjectDropdown(false);
  };

  const handleProviderSelect = (provider: string) => {
    onChange({ ...metadata, proveedor: provider });
    setShowProviderDropdown(false);
    setProviderSearch('');
  };

  const handleProviderKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && providerSearch.trim()) {
      e.preventDefault();
      const normalized = providerSearch.trim().toUpperCase();
      addLocalProvider(normalized);
      handleProviderSelect(normalized);
    }
  };

  const handleEvaluationToggle = (evaluation: string) => {
    const isSelected = metadata.tipoEvaluacion.includes(evaluation);
    const newEvaluations = isSelected
      ? metadata.tipoEvaluacion.filter(e => e !== evaluation)
      : [...metadata.tipoEvaluacion, evaluation];

    onChange({ ...metadata, tipoEvaluacion: newEvaluations });
  };

  const toggleAllEvaluations = () => {
    const allSelected = metadata.tipoEvaluacion.length === EVALUATION_TYPES.length;
    onChange({
      ...metadata,
      tipoEvaluacion: allSelected ? [] : [...EVALUATION_TYPES]
    });
  };

  return (
    <div className="rfq-metadata-form">
      <div className="metadata-form-header">
        <h4>Proposal Information</h4>
        <p className="metadata-form-hint">Please complete the following fields before processing</p>
      </div>

      <div className="metadata-form-grid">
        {/* Campo Proyecto */}
        <div className="metadata-field">
          <label className="metadata-label">
            Project <span className="required">*</span>
          </label>
          <div className="metadata-dropdown-container">
            <button
              type="button"
              className={`metadata-dropdown-btn ${!metadata.proyecto ? 'placeholder' : ''}`}
              onClick={() => !disabled && setShowProjectDropdown(!showProjectDropdown)}
              disabled={disabled}
            >
              <span title={metadata.proyecto}>
                {metadata.proyecto || 'Select project...'}
              </span>
              <span className="dropdown-arrow">{showProjectDropdown ? '▲' : '▼'}</span>
            </button>

            {showProjectDropdown && (
              <>
                <div
                  className="dropdown-overlay"
                  onClick={() => setShowProjectDropdown(false)}
                />
                <div className="metadata-dropdown-menu">
                  {projects.length === 0 ? (
                    <div className="dropdown-item disabled" style={{ color: 'var(--text-tertiary)', cursor: 'default' }}>
                      No projects available
                    </div>
                  ) : (
                    projects.map(project => (
                      <button
                        key={project.id}
                        type="button"
                        className={`dropdown-item ${metadata.proyecto === project.display_name ? 'selected' : ''}`}
                        onClick={() => handleProjectSelect(project)}
                      >
                        <span>{project.display_name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: '8px' }}>
                          ({project.document_count} docs)
                        </span>
                        {metadata.proyecto === project.display_name && (
                          <span className="check-icon">✓</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Campo Proveedor - combobox with search + new entry */}
        <div className="metadata-field">
          <label className="metadata-label">
            Provider <span className="required">*</span>
          </label>
          <div className="metadata-dropdown-container">
            <button
              type="button"
              className={`metadata-dropdown-btn ${!metadata.proveedor ? 'placeholder' : ''}`}
              onClick={() => {
                if (!disabled) {
                  setShowProviderDropdown(!showProviderDropdown);
                  setProviderSearch('');
                }
              }}
              disabled={disabled}
            >
              {metadata.proveedor
                ? getProviderDisplayName(metadata.proveedor)
                : 'Select or type provider...'}
              <span className="dropdown-arrow">{showProviderDropdown ? '▲' : '▼'}</span>
            </button>

            {showProviderDropdown && (
              <>
                <div
                  className="dropdown-overlay"
                  onClick={() => { setShowProviderDropdown(false); setProviderSearch(''); }}
                />
                <div className="metadata-dropdown-menu">
                  {/* Search / new provider input */}
                  <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>
                    <input
                      ref={providerInputRef}
                      type="text"
                      placeholder="Search or type new name..."
                      value={providerSearch}
                      onChange={(e) => setProviderSearch(e.target.value)}
                      onKeyDown={handleProviderKeyDown}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                    />
                  </div>
                  {filteredProviders.map(provider => (
                    <button
                      key={provider}
                      type="button"
                      className={`dropdown-item ${metadata.proveedor === provider ? 'selected' : ''}`}
                      onClick={() => handleProviderSelect(provider)}
                    >
                      {getProviderDisplayName(provider)}
                      {metadata.proveedor === provider && (
                        <span className="check-icon">✓</span>
                      )}
                    </button>
                  ))}
                  {providerSearch.trim() && !filteredProviders.some(p => p === providerSearch.trim().toUpperCase()) && (
                    <button
                      type="button"
                      className="dropdown-item"
                      style={{ color: 'var(--accent)', fontWeight: 600 }}
                      onClick={() => {
                        const normalized = providerSearch.trim().toUpperCase();
                        addLocalProvider(normalized);
                        handleProviderSelect(normalized);
                      }}
                    >
                      + Add "{providerSearch.trim().toUpperCase()}"
                    </button>
                  )}
                  {filteredProviders.length === 0 && !providerSearch.trim() && (
                    <div className="dropdown-item disabled" style={{ color: 'var(--text-tertiary)', cursor: 'default' }}>
                      No providers yet. Type a name above.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Campo Tipo de Evaluacion */}
        <div className="metadata-field">
          <label className="metadata-label">
            Evaluation Types <span className="required">*</span>
          </label>
          <div className="metadata-dropdown-container">
            <button
              type="button"
              className={`metadata-dropdown-btn ${metadata.tipoEvaluacion.length === 0 ? 'placeholder' : ''}`}
              onClick={() => !disabled && setShowEvaluationDropdown(!showEvaluationDropdown)}
              disabled={disabled}
            >
              <span className="dropdown-btn-text">
                {metadata.tipoEvaluacion.length === 0
                  ? 'Select types...'
                  : metadata.tipoEvaluacion.length === EVALUATION_TYPES.length
                    ? 'All types'
                    : metadata.tipoEvaluacion.join(', ')}
              </span>
              <span className="dropdown-arrow">{showEvaluationDropdown ? '▲' : '▼'}</span>
            </button>

            {showEvaluationDropdown && (
              <>
                <div
                  className="dropdown-overlay"
                  onClick={() => setShowEvaluationDropdown(false)}
                />
                <div className="metadata-dropdown-menu checkbox-menu">
                  <label className="checkbox-item checkbox-all">
                    <input
                      type="checkbox"
                      checked={metadata.tipoEvaluacion.length === EVALUATION_TYPES.length}
                      onChange={toggleAllEvaluations}
                    />
                    <span>Select all</span>
                  </label>
                  <div className="checkbox-divider"></div>
                  {EVALUATION_TYPES.map(evaluation => (
                    <label key={evaluation} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={metadata.tipoEvaluacion.includes(evaluation)}
                        onChange={() => handleEvaluationToggle(evaluation)}
                      />
                      <span>{evaluation}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {(!metadata.proyecto || !metadata.proveedor || metadata.tipoEvaluacion.length === 0) && (
        <div className="metadata-form-warning">
          <span className="warning-icon">⚠</span>
          All fields are mandatory
        </div>
      )}
    </div>
  );
}
