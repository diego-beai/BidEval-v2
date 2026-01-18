import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Provider, PROVIDER_DISPLAY_NAMES } from '../../types/provider.types';
import { FileWithMetadata, isFileMetadataComplete } from '../../types/rfq.types';
import { useProjectStore } from '../../stores/useProjectStore';
import { formatFileSize } from '../../utils/formatters';
import './MultiFileMetadataModal.css';

// Evaluation types available
const EVALUATION_TYPES = [
  'Technical Evaluation',
  'Economical Evaluation',
  'Pre-FEED Deliverables',
  'FEED Deliverables'
];

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

interface MultiFileMetadataModalProps {
  files: FileWithMetadata[];
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRemoveFile: (index: number) => void;
  onUpdateMetadata: (index: number, metadata: Partial<FileWithMetadata['metadata']>) => void;
  onCopyFromPrevious: (targetIndex: number) => void;
  onAddFiles?: (files: File[]) => void;
  disabled?: boolean;
}

export function MultiFileMetadataModal({
  files,
  open,
  onClose,
  onConfirm,
  onRemoveFile,
  onUpdateMetadata,
  onCopyFromPrevious,
  onAddFiles,
  disabled = false
}: MultiFileMetadataModalProps) {
  const [expandedIndex, setExpandedIndex] = useState<number>(0);
  const { projects } = useProjectStore();
  const providers = Object.values(Provider);

  // Hidden file input ref for adding more files
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle adding more files from within modal
  const handleAddMoreFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length > 0 && onAddFiles) {
      onAddFiles(newFiles);
      // Expand the first new file
      setExpandedIndex(files.length);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onAddFiles, files.length]);

  // Dropdown visibility state per file
  const [activeDropdown, setActiveDropdown] = useState<{
    fileIndex: number;
    type: 'project' | 'provider' | 'evaluation';
  } | null>(null);

  // Position for the portal dropdown
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);

  // Refs for dropdown buttons to calculate position
  const dropdownButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const configuredCount = useMemo(() => {
    return files.filter(isFileMetadataComplete).length;
  }, [files]);

  const allConfigured = configuredCount === files.length && files.length > 0;

  // Calculate dropdown position when opening
  const openDropdown = useCallback((fileIndex: number, type: 'project' | 'provider' | 'evaluation') => {
    const key = `${fileIndex}-${type}`;
    const button = dropdownButtonRefs.current.get(key);

    if (button) {
      const rect = button.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
      setActiveDropdown({ fileIndex, type });
    }
  }, []);

  const closeDropdown = useCallback(() => {
    setActiveDropdown(null);
    setDropdownPosition(null);
  }, []);

  // Ref for the dropdown menu to detect scroll inside it
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on scroll outside the dropdown menu
  useEffect(() => {
    if (activeDropdown) {
      const handleScroll = (e: Event) => {
        // Don't close if scrolling inside the dropdown menu
        if (dropdownMenuRef.current && dropdownMenuRef.current.contains(e.target as Node)) {
          return;
        }
        closeDropdown();
      };
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [activeDropdown, closeDropdown]);

  const handleProjectSelect = (fileIndex: number, project: { display_name: string }) => {
    onUpdateMetadata(fileIndex, { proyecto: project.display_name });
    closeDropdown();
  };

  const handleProviderSelect = (fileIndex: number, provider: Provider) => {
    onUpdateMetadata(fileIndex, { proveedor: provider });
    closeDropdown();
  };

  const handleEvaluationToggle = (fileIndex: number, evaluation: string) => {
    const currentEvaluations = files[fileIndex].metadata.tipoEvaluacion;
    const isSelected = currentEvaluations.includes(evaluation);
    const newEvaluations = isSelected
      ? currentEvaluations.filter(e => e !== evaluation)
      : [...currentEvaluations, evaluation];

    onUpdateMetadata(fileIndex, { tipoEvaluacion: newEvaluations });
  };

  const toggleAllEvaluations = (fileIndex: number) => {
    const currentEvaluations = files[fileIndex].metadata.tipoEvaluacion;
    const allSelected = currentEvaluations.length === EVALUATION_TYPES.length;
    onUpdateMetadata(fileIndex, {
      tipoEvaluacion: allSelected ? [] : [...EVALUATION_TYPES]
    });
  };

  // Store button ref
  const setButtonRef = useCallback((fileIndex: number, type: string, el: HTMLButtonElement | null) => {
    const key = `${fileIndex}-${type}`;
    if (el) {
      dropdownButtonRefs.current.set(key, el);
    } else {
      dropdownButtonRefs.current.delete(key);
    }
  }, []);

  if (!open) return null;

  // Render dropdown menu via portal
  const renderDropdownPortal = () => {
    if (!activeDropdown || !dropdownPosition) return null;

    const { fileIndex, type } = activeDropdown;
    const metadata = files[fileIndex]?.metadata;
    if (!metadata) return null;

    let content: React.ReactNode = null;

    if (type === 'project') {
      content = (
        <div
          ref={dropdownMenuRef}
          className="mfm-dropdown-menu mfm-dropdown-portal"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 10000
          }}>
          {projects.length === 0 ? (
            <div className="mfm-dropdown-item mfm-dropdown-item--disabled">
              No projects available
            </div>
          ) : (
            projects.map(project => (
              <button
                key={project.id}
                type="button"
                className={`mfm-dropdown-item ${metadata.proyecto === project.display_name ? 'mfm-dropdown-item--selected' : ''}`}
                onClick={() => handleProjectSelect(fileIndex, project)}
              >
                <span>{project.display_name}</span>
                {metadata.proyecto === project.display_name && (
                  <span className="mfm-check">✓</span>
                )}
              </button>
            ))
          )}
        </div>
      );
    } else if (type === 'provider') {
      content = (
        <div
          ref={dropdownMenuRef}
          className="mfm-dropdown-menu mfm-dropdown-portal"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 10000
          }}>
          {providers.map(provider => (
            <button
              key={provider}
              type="button"
              className={`mfm-dropdown-item ${metadata.proveedor === provider ? 'mfm-dropdown-item--selected' : ''}`}
              onClick={() => handleProviderSelect(fileIndex, provider)}
            >
              {PROVIDER_DISPLAY_NAMES[provider]}
              {metadata.proveedor === provider && (
                <span className="mfm-check">✓</span>
              )}
            </button>
          ))}
        </div>
      );
    } else if (type === 'evaluation') {
      content = (
        <div
          ref={dropdownMenuRef}
          className="mfm-dropdown-menu mfm-checkbox-menu mfm-dropdown-portal"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 10000
          }}>
          <label className="mfm-checkbox-item mfm-checkbox-all">
            <input
              type="checkbox"
              checked={metadata.tipoEvaluacion.length === EVALUATION_TYPES.length}
              onChange={() => toggleAllEvaluations(fileIndex)}
            />
            <span>Select all</span>
          </label>
          <div className="mfm-divider" />
          {EVALUATION_TYPES.map(evaluation => (
            <label key={evaluation} className="mfm-checkbox-item">
              <input
                type="checkbox"
                checked={metadata.tipoEvaluacion.includes(evaluation)}
                onChange={() => handleEvaluationToggle(fileIndex, evaluation)}
              />
              <span>{evaluation}</span>
            </label>
          ))}
        </div>
      );
    }

    return createPortal(
      <>
        <div className="mfm-dropdown-overlay" onClick={closeDropdown} style={{ zIndex: 9999 }} />
        {content}
      </>,
      document.body
    );
  };

  return (
    <>
      <div className="mfm-overlay" onClick={onClose} />
      <div className="mfm-modal">
        <div className="mfm-header">
          <div className="mfm-header-title">
            <h3>Configure {files.length} file{files.length > 1 ? 's' : ''}</h3>
            <span className={`mfm-badge ${allConfigured ? 'mfm-badge--complete' : ''}`}>
              {configuredCount}/{files.length} ready
            </span>
          </div>
          <button className="mfm-close-btn" onClick={onClose} title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mfm-body">
          {/* Hidden file input for adding more files */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />

          {files.map((fileWithMeta, index) => {
            const isExpanded = expandedIndex === index;
            const isConfigured = isFileMetadataComplete(fileWithMeta);
            const { file, metadata } = fileWithMeta;

            return (
              <div key={`${file.name}-${index}`} className={`mfm-accordion ${isExpanded ? 'mfm-accordion--expanded' : ''}`}>
                <button
                  type="button"
                  className="mfm-accordion-header"
                  onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                >
                  <div className="mfm-file-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="mfm-file-info">
                    <span className="mfm-file-name" title={file.name}>{file.name}</span>
                    <span className="mfm-file-size">{formatFileSize(file.size)}</span>
                  </div>
                  <div className={`mfm-status-icon ${isConfigured ? 'mfm-status-icon--complete' : ''}`}>
                    {isConfigured ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    )}
                  </div>
                  <button
                    type="button"
                    className="mfm-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(index);
                    }}
                    title="Remove file"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <div className={`mfm-chevron ${isExpanded ? 'mfm-chevron--up' : ''}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mfm-accordion-content">
                    {/* Copy from previous button */}
                    {index > 0 && (
                      <button
                        type="button"
                        className="mfm-copy-btn"
                        onClick={() => onCopyFromPrevious(index)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy from previous file
                      </button>
                    )}

                    <div className="mfm-form-grid">
                      {/* Project dropdown */}
                      <div className="mfm-field">
                        <label className="mfm-label">
                          Project <span className="mfm-required">*</span>
                        </label>
                        <div className="mfm-dropdown-container">
                          <button
                            type="button"
                            ref={(el) => setButtonRef(index, 'project', el)}
                            className={`mfm-dropdown-btn ${!metadata.proyecto ? 'mfm-placeholder' : ''}`}
                            onClick={() => {
                              if (activeDropdown?.fileIndex === index && activeDropdown?.type === 'project') {
                                closeDropdown();
                              } else {
                                openDropdown(index, 'project');
                              }
                            }}
                            disabled={disabled}
                          >
                            <span title={metadata.proyecto}>
                              {metadata.proyecto || 'Select project...'}
                            </span>
                            <span className="mfm-arrow">
                              {activeDropdown?.fileIndex === index && activeDropdown?.type === 'project' ? '▲' : '▼'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Provider dropdown */}
                      <div className="mfm-field">
                        <label className="mfm-label">
                          Provider <span className="mfm-required">*</span>
                        </label>
                        <div className="mfm-dropdown-container">
                          <button
                            type="button"
                            ref={(el) => setButtonRef(index, 'provider', el)}
                            className={`mfm-dropdown-btn ${!metadata.proveedor ? 'mfm-placeholder' : ''}`}
                            onClick={() => {
                              if (activeDropdown?.fileIndex === index && activeDropdown?.type === 'provider') {
                                closeDropdown();
                              } else {
                                openDropdown(index, 'provider');
                              }
                            }}
                            disabled={disabled}
                          >
                            {metadata.proveedor
                              ? PROVIDER_DISPLAY_NAMES[metadata.proveedor]
                              : 'Select provider...'}
                            <span className="mfm-arrow">
                              {activeDropdown?.fileIndex === index && activeDropdown?.type === 'provider' ? '▲' : '▼'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Evaluation types */}
                      <div className="mfm-field mfm-field--full">
                        <label className="mfm-label">
                          Evaluation Types <span className="mfm-required">*</span>
                        </label>
                        <div className="mfm-dropdown-container">
                          <button
                            type="button"
                            ref={(el) => setButtonRef(index, 'evaluation', el)}
                            className={`mfm-dropdown-btn ${metadata.tipoEvaluacion.length === 0 ? 'mfm-placeholder' : ''}`}
                            onClick={() => {
                              if (activeDropdown?.fileIndex === index && activeDropdown?.type === 'evaluation') {
                                closeDropdown();
                              } else {
                                openDropdown(index, 'evaluation');
                              }
                            }}
                            disabled={disabled}
                          >
                            <span className="mfm-dropdown-text">
                              {metadata.tipoEvaluacion.length === 0
                                ? 'Select types...'
                                : metadata.tipoEvaluacion.length === EVALUATION_TYPES.length
                                  ? 'All types'
                                  : metadata.tipoEvaluacion.join(', ')}
                            </span>
                            <span className="mfm-arrow">
                              {activeDropdown?.fileIndex === index && activeDropdown?.type === 'evaluation' ? '▲' : '▼'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add more files button */}
          {onAddFiles && files.length < 7 && (
            <button
              type="button"
              className="mfm-add-more-btn"
              onClick={handleAddMoreFiles}
              disabled={disabled}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add more files
              <span className="mfm-file-count">({files.length}/7)</span>
            </button>
          )}
        </div>

        <div className="mfm-footer">
          <button type="button" className="mfm-btn mfm-btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="mfm-btn mfm-btn--primary"
            disabled={!allConfigured || disabled}
            onClick={onConfirm}
          >
            Process {files.length} file{files.length > 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* Render dropdown via portal */}
      {renderDropdownPortal()}
    </>
  );
}
