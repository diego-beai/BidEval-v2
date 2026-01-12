import { useState } from 'react';
import { Provider, PROVIDER_DISPLAY_NAMES } from '../../types/provider.types';
import './RfqMetadataForm.css';

export interface RfqMetadata {
  proyecto: string;
  proveedor: Provider | '';
  tipoEvaluacion: string[];
}

interface RfqMetadataFormProps {
  metadata: RfqMetadata;
  onChange: (metadata: RfqMetadata) => void;
  disabled?: boolean;
}

// Proyectos disponibles
const AVAILABLE_PROJECTS = [
  'Hydrogen Production Plant – La Zaida, Spain'
];

// Tipos de evaluación disponibles
const EVALUATION_TYPES = [
  'Technical Evaluation',
  'Economical Evaluation',
  'Pre-FEED Deliverables',
  'FEED Deliverables'
];

export function RfqMetadataForm({ metadata, onChange, disabled = false }: RfqMetadataFormProps) {

  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showEvaluationDropdown, setShowEvaluationDropdown] = useState(false);
  const [isCustomProject, setIsCustomProject] = useState(false);

  const providers = Object.values(Provider);

  const handleProjectSelect = (project: string) => {
    if (project === 'CUSTOM') {
      setIsCustomProject(true);
      onChange({ ...metadata, proyecto: '' });
    } else {
      setIsCustomProject(false);
      onChange({ ...metadata, proyecto: project });
    }
    setShowProjectDropdown(false);
  };

  const handleCustomProjectChange = (value: string) => {
    onChange({ ...metadata, proyecto: value });
  };

  const handleProviderSelect = (provider: Provider) => {
    onChange({ ...metadata, proveedor: provider });
    setShowProviderDropdown(false);
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
          {isCustomProject ? (
            <input
              type="text"
              className="metadata-input"
              placeholder="Enter project name..."
              value={metadata.proyecto}
              onChange={(e) => handleCustomProjectChange(e.target.value)}
              disabled={disabled}
              autoFocus
            />
          ) : (
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
                    {AVAILABLE_PROJECTS.map(project => (
                      <button
                        key={project}
                        type="button"
                        className={`dropdown-item ${metadata.proyecto === project ? 'selected' : ''}`}
                        onClick={() => handleProjectSelect(project)}
                      >
                        {project}
                        {metadata.proyecto === project && (
                          <span className="check-icon">✓</span>
                        )}
                      </button>
                    ))}
                    <div className="dropdown-divider"></div>
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => handleProjectSelect('CUSTOM')}
                    >
                      Other (Custom)
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Campo Proveedor */}
        <div className="metadata-field">
          <label className="metadata-label">
            Provider <span className="required">*</span>
          </label>
          <div className="metadata-dropdown-container">
            <button
              type="button"
              className={`metadata-dropdown-btn ${!metadata.proveedor ? 'placeholder' : ''}`}
              onClick={() => !disabled && setShowProviderDropdown(!showProviderDropdown)}
              disabled={disabled}
            >
              {metadata.proveedor
                ? PROVIDER_DISPLAY_NAMES[metadata.proveedor]
                : 'Select provider...'}
              <span className="dropdown-arrow">{showProviderDropdown ? '▲' : '▼'}</span>
            </button>

            {showProviderDropdown && (
              <>
                <div
                  className="dropdown-overlay"
                  onClick={() => setShowProviderDropdown(false)}
                />
                <div className="metadata-dropdown-menu">
                  {providers.map(provider => (
                    <button
                      key={provider}
                      type="button"
                      className={`dropdown-item ${metadata.proveedor === provider ? 'selected' : ''}`}
                      onClick={() => handleProviderSelect(provider)}
                    >
                      {PROVIDER_DISPLAY_NAMES[provider]}
                      {metadata.proveedor === provider && (
                        <span className="check-icon">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Campo Tipo de Evaluación */}
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
