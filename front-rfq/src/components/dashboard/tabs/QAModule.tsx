import React, { useEffect, useState } from 'react';
import { useQAStore } from '../../../stores/useQAStore';
import { generateTechnicalAudit } from '../../../services/n8n.service';
import type { QAQuestion, Disciplina, EstadoPregunta, Importancia } from '../../../types/qa.types';
import './QAModule.css';

// Available projects
const AVAILABLE_PROJECTS = [
  'Hydrogen Production Plant – La Zaida, Spain'
];

// Icons
const Icons = {
  Delete: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  Save: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  Cancel: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Edit: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Approve: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Discard: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  Send: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Paper: () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Error: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Filter: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  Download: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
};

export const QAModule: React.FC = () => {
  const {
    questions,
    isLoading,
    isGenerating,
    statusMessage,
    error,
    filters,
    loadQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    setFilters,
    clearFilters,
    setQuestions,
    setGenerating,
    setStatusMessage,
    getGroupedByDisciplina,
    getStats,
    subscribeToChanges,
    unsubscribeFromChanges
  } = useQAStore();

  const [projectId, setProjectId] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [addingToDisciplina, setAddingToDisciplina] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [expandedDisciplina, setExpandedDisciplina] = useState<Disciplina | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [isCustomProject, setIsCustomProject] = useState(false);
  const [newQuestionTexts, setNewQuestionTexts] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Available providers (sync with existing dashboard)
  const availableProviders = ['TECNICASREUNIDAS', 'IDOM', 'SACYR', 'EA', 'SENER', 'TRESCA', 'WORLEY'];

  // Subscribe to real-time changes
  useEffect(() => {
    if (projectId) {
      loadQuestions(projectId);
      subscribeToChanges(projectId);
    }

    return () => {
      unsubscribeFromChanges();
    };
  }, [projectId]);

  const handleProjectSelect = (project: string) => {
    if (project === 'CUSTOM') {
      setIsCustomProject(true);
      setProjectId('');
    } else {
      setIsCustomProject(false);
      setProjectId(project);
    }
    setShowProjectDropdown(false);
  };

  const handleCustomProjectChange = (value: string) => {
    setProjectId(value);
  };

  // Excel Export
  const handleExportExcel = async () => {
    try {
      // Import dynamic to avoid bundle bloat
      const XLSX = await import('xlsx');

      // Filter only approved questions or all? User said "las que le demos a aprobar"
      const approvedQuestions = questions.filter(q => q.estado === 'Aprobada');

      if (approvedQuestions.length === 0) {
        alert('No approved questions to export. Please approve some questions first.');
        return;
      }

      const exportData = approvedQuestions.map(q => ({
        'Project': projectId,
        'Provider': q.proveedor,
        'Discipline': q.disciplina,
        'Importance': q.importancia,
        'Question': q.pregunta_texto,
        'Created At': new Date(q.created_at).toLocaleDateString()
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Technical Audit');

      const fileName = `Technical_Audit_${selectedProvider || 'P2X'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert('Error exporting to Excel');
    }
  };

  const handleGenerateAudit = async () => {
    if (!projectId || !selectedProvider) {
      alert('Please select a project and a provider');
      return;
    }

    setGenerating(true);
    setStatusMessage('Analyzing deficiencies and generating technical audit questions...');

    try {
      const result = await generateTechnicalAudit({
        project_id: projectId,
        provider: selectedProvider
      });

      if (result.success && result.data) {
        // Map the raw data from webhook to QAQuestion objects
        const newQuestions: QAQuestion[] = result.data.map((item: any, index: number) => {
          // n8n now returns English keys: discipline, question, importance
          const qData = item["output.questions"] || item?.output?.questions || item;

          // Map English disciplines to Spanish ones for the DB/Types
          const disciplineMapping: Record<string, Disciplina> = {
            'Electrical': 'Eléctrica',
            'Mechanical': 'Mecánica',
            'Civil': 'Civil',
            'Process': 'Proceso',
            'General': 'General'
          };

          // Map English importance to Spanish ones
          const importanceMapping: Record<string, Importancia> = {
            'High': 'Alta',
            'Medium': 'Media',
            'Low': 'Baja'
          };

          return {
            id: `temp-${Date.now()}-${index}`,
            created_at: new Date().toISOString(),
            project_id: projectId,
            proveedor: selectedProvider,
            disciplina: disciplineMapping[qData.discipline] || qData.disciplina || 'General',
            pregunta_texto: qData.question || qData.pregunta || qData.pregunta_texto || '',
            estado: 'Borrador',
            importancia: importanceMapping[qData.importance] || qData.importancia || 'Media'
          };
        });

        // Add to existing questions by prepending them
        setQuestions([...newQuestions, ...questions]);

        setStatusMessage(`Success! ${result.preguntas_generadas} questions generated and displayed.`);
      } else {
        setStatusMessage(`Warning: ${result.message || 'The process finished with no results.'}`);
      }

      // Clear message after a longer delay
      setTimeout(() => setStatusMessage(null), 8000);
    } catch (err) {
      console.error('Error generating audit:', err);
      setStatusMessage(null);
      alert(err instanceof Error ? err.message : 'Error generating technical audit');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddManualQuestion = async (disciplina: string) => {
    const text = newQuestionTexts[disciplina]?.trim();
    if (!text || !projectId || !selectedProvider) {
      alert('Please enter a question and ensure project/provider are selected');
      return;
    }

    try {
      await createQuestion({
        project_id: projectId,
        proveedor: selectedProvider,
        disciplina: disciplina as Disciplina,
        pregunta_texto: text,
        estado: 'Borrador',
        importancia: 'Media'
      });

      // Reset text
      setNewQuestionTexts(prev => ({ ...prev, [disciplina]: '' }));
      setAddingToDisciplina(null);
    } catch (err) {
      console.error('Error adding question:', err);
      alert('Error adding question');
    }
  };

  const handleEditQuestion = (question: QAQuestion) => {
    setEditingQuestion(question.id);
    setEditedText(question.pregunta_texto);
  };

  const handleSaveQuestion = async (questionId: string) => {
    await updateQuestion(questionId, { pregunta_texto: editedText });
    setEditingQuestion(null);
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setEditedText('');
  };

  const handleUpdateStatus = async (questionId: string, estado: EstadoPregunta) => {
    await updateQuestion(questionId, { estado });
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      await deleteQuestion(questionId);
    }
  };

  const getImportanciaClass = (importancia?: Importancia | null) => {
    switch (importancia) {
      case 'Alta': return 'importancia-alta';
      case 'Media': return 'importancia-media';
      case 'Baja': return 'importancia-baja';
      default: return '';
    }
  };

  const getEstadoClass = (estado: EstadoPregunta) => {
    switch (estado) {
      case 'Borrador': return 'estado-borrador';
      case 'Pendiente': return 'estado-pendiente';
      case 'Aprobada': return 'estado-aprobada';
      case 'Enviada': return 'estado-enviada';
      case 'Respondida': return 'estado-respondida';
      case 'Descartada': return 'estado-descartada';
      default: return '';
    }
  };

  const groupedQuestions = getGroupedByDisciplina();
  const stats = getStats();

  // Discipline name mapping
  const disciplineMap: Record<string, string> = {
    'Eléctrica': 'Electrical',
    'Mecánica': 'Mechanical',
    'Civil': 'Civil',
    'Proceso': 'Process',
    'General': 'General'
  };

  return (
    <div className="qa-module">
      {/* Header */}
      <div className="qa-header">
        <div className="qa-header-content">
          <h1 className="qa-title">Q&A & Technical Audit</h1>
          <p className="qa-subtitle">
            Automated technical question management by discipline
          </p>
        </div>

        <div className="qa-header-actions">
          {/* Project Selector */}
          <div className="qa-project-selector-group">
            <div className="qa-dropdown-container">
              <button
                type="button"
                className={`qa-dropdown-btn ${!projectId || isCustomProject ? 'placeholder' : ''}`}
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              >
                <span title={isCustomProject ? 'Custom Project' : projectId}>
                  {isCustomProject ? 'Custom Project' : (projectId || 'Select project...')}
                </span>
                <span className="dropdown-arrow">{showProjectDropdown ? '▲' : '▼'}</span>
              </button>

              {showProjectDropdown && (
                <>
                  <div
                    className="dropdown-overlay"
                    onClick={() => setShowProjectDropdown(false)}
                  />
                  <div className="qa-dropdown-menu">
                    {AVAILABLE_PROJECTS.map(project => (
                      <button
                        key={project}
                        type="button"
                        className={`dropdown-item ${projectId === project && !isCustomProject ? 'selected' : ''}`}
                        onClick={() => handleProjectSelect(project)}
                      >
                        {project}
                        {projectId === project && !isCustomProject && (
                          <span className="check-icon">✓</span>
                        )}
                      </button>
                    ))}
                    <div className="dropdown-divider"></div>
                    <button
                      type="button"
                      className={`dropdown-item ${isCustomProject ? 'selected' : ''}`}
                      onClick={() => handleProjectSelect('CUSTOM')}
                    >
                      {isCustomProject ? 'Custom (Selected)' : 'Other (Custom)'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {isCustomProject && (
              <input
                type="text"
                className="qa-input custom-project-input"
                placeholder="Enter custom project name..."
                value={projectId}
                onChange={(e) => handleCustomProjectChange(e.target.value)}
                autoFocus
              />
            )}
          </div>

          <div className="qa-provider-selector-group">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="qa-select"
            >
              <option value="">Select Provider</option>
              {availableProviders.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerateAudit}
            disabled={isGenerating || !projectId || !selectedProvider}
            className="btn btnPrimary qa-generate-btn"
          >
            {isGenerating ? (
              <>
                <span className="spinner"></span>
                Generating...
              </>
            ) : (
              'Generate Technical Audit'
            )}
          </button>

          {/* Export Button */}
          {questions.some(q => q.estado === 'Aprobada') && (
            <button
              onClick={handleExportExcel}
              className="btn btnSecondary qa-export-btn"
              title="Export approved questions to Excel"
            >
              <Icons.Download />
              Export
            </button>
          )}

          {/* Filters Toggle Button */}
          <div className="qa-filters-wrapper">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn btnSecondary qa-filter-toggle-btn ${showFilters ? 'active' : ''}`}
            >
              <Icons.Filter />
              Filters
              {Object.values(filters).some(v => v !== null) && <span className="filter-dot" />}
            </button>

            {showFilters && (
              <>
                <div className="dropdown-overlay" onClick={() => setShowFilters(false)} />
                <div className="qa-filters-menu card">
                  <div className="filter-menu-header">
                    <h4>Search Filters</h4>
                    <button onClick={clearFilters} className="text-btn btn-sm">Clear All</button>
                  </div>

                  <div className="filter-group">
                    <label>Provider</label>
                    <select
                      value={filters.proveedor || ''}
                      onChange={(e) => setFilters({ proveedor: e.target.value || null })}
                      className="filter-select"
                    >
                      <option value="">All Providers</option>
                      {availableProviders.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Status</label>
                    <select
                      value={filters.estado || ''}
                      onChange={(e) => setFilters({ estado: e.target.value as EstadoPregunta || null })}
                      className="filter-select"
                    >
                      <option value="">All Statuses</option>
                      <option value="Borrador">Draft</option>
                      <option value="Pendiente">Pending</option>
                      <option value="Aprobada">Approved</option>
                      <option value="Enviada">Sent</option>
                      <option value="Respondida">Answered</option>
                      <option value="Descartada">Discarded</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Importance</label>
                    <select
                      value={filters.importancia || ''}
                      onChange={(e) => setFilters({ importancia: e.target.value as Importancia || null })}
                      className="filter-select"
                    >
                      <option value="">All Importances</option>
                      <option value="Alta">High</option>
                      <option value="Media">Medium</option>
                      <option value="Baja">Low</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Status Messages */}
      {statusMessage && (
        <div className={`qa-status-banner ${statusMessage.includes('Success') || statusMessage.includes('completed') ? 'success' : ''}`}>
          {isGenerating && <span className="spinner"></span>}
          {statusMessage}
        </div>
      )}

      {/* Global Statistics */}
      {stats.total > 0 && (
        <div className="qa-stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Questions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.porEstado['Aprobada'] || 0}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.porEstado['Pendiente'] || 0}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.porImportancia?.['Alta'] || 0}</div>
            <div className="stat-label">High Importance</div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {
        error && (
          <div className="qa-error">
            <Icons.Error /> {error}
          </div>
        )
      }

      {/* Loading State */}
      {
        isLoading && (
          <div className="qa-loading">
            <span className="spinner"></span>
            Loading questions...
          </div>
        )
      }

      {/* Disciplines View */}
      <div className="qa-disciplinas-container">
        {groupedQuestions.map((group) => (
          <div key={group.disciplina} className="disciplina-group card">
            {/* Discipline Header */}
            <div
              className="disciplina-header"
              onClick={() => setExpandedDisciplina(
                expandedDisciplina === group.disciplina ? null : group.disciplina
              )}
            >
              <div className="disciplina-info">
                <h3 className="disciplina-name">{disciplineMap[group.disciplina] || group.disciplina}</h3>
                <div className="disciplina-badges">
                  <span className="badge badge-total">{group.stats.total} questions</span>
                  {group.stats.borradores > 0 && (
                    <span className="badge badge-borrador">{group.stats.borradores} drafts</span>
                  )}
                  {group.stats.aprobadas > 0 && (
                    <span className="badge badge-aprobada">{group.stats.aprobadas} approved</span>
                  )}
                  {group.stats.alta > 0 && (
                    <span className="badge badge-alta">{group.stats.alta} high</span>
                  )}
                </div>
              </div>
              <div className="disciplina-toggle">
                {expandedDisciplina === group.disciplina ? '▼' : '▶'}
              </div>
            </div>

            {/* Question List (Expandable) */}
            {expandedDisciplina === group.disciplina && (
              <div className="preguntas-list">
                {group.preguntas.map((question) => (
                  <div key={question.id} className="question-card">
                    {/* Question Header */}
                    <div className="question-header">
                      <div className="question-meta">
                        <span className={`badge ${getEstadoClass(question.estado)}`}>
                          {question.estado}
                        </span>
                        {question.importancia && (
                          <span className={`badge ${getImportanciaClass(question.importancia)}`}>
                            {question.importancia}
                          </span>
                        )}
                        <span className="question-provider">{question.proveedor}</span>
                      </div>
                      <div className="question-actions-top">
                        {question.estado === 'Borrador' && (
                          <button
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="icon-btn icon-btn-danger"
                            title="Delete"
                          >
                            <Icons.Delete />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="question-body">
                      {editingQuestion === question.id ? (
                        <textarea
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          className="question-edit-textarea"
                          rows={4}
                        />
                      ) : (
                        <p className="question-text">{question.pregunta_texto}</p>
                      )}
                    </div>

                    {/* Provider Response */}
                    {question.respuesta_proveedor && (
                      <div className="question-response">
                        <strong>Response:</strong>
                        <p>{question.respuesta_proveedor}</p>
                        <small>Answered on {new Date(question.fecha_respuesta || '').toLocaleDateString()}</small>
                      </div>
                    )}

                    {/* Internal Notes */}
                    {question.notas_internas && (
                      <div className="question-notes">
                        <strong>Internal notes:</strong>
                        <p>{question.notas_internas}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="question-actions">
                      {editingQuestion === question.id ? (
                        <>
                          <button
                            onClick={() => handleSaveQuestion(question.id)}
                            className="btn btnPrimary btn-sm"
                          >
                            <Icons.Save /> Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="btn btnSecondary btn-sm"
                          >
                            <Icons.Cancel /> Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {question.estado === 'Borrador' && (
                            <>
                              <button
                                onClick={() => handleEditQuestion(question)}
                                className="btn btnSecondary btn-sm"
                              >
                                <Icons.Edit /> Edit
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(question.id, 'Aprobada')}
                                className="btn btnPrimary btn-sm"
                              >
                                <Icons.Approve /> Approve
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(question.id, 'Descartada')}
                                className="btn btnDanger btn-sm"
                              >
                                <Icons.Discard /> Discard
                              </button>
                            </>
                          )}
                          {question.estado === 'Aprobada' && (
                            <button
                              onClick={() => handleUpdateStatus(question.id, 'Enviada')}
                              className="btn btnPrimary btn-sm"
                            >
                              <Icons.Send /> Send
                            </button>
                          )}
                          {question.estado === 'Enviada' && (
                            <span className="status-message">
                              Question sent to provider
                            </span>
                          )}
                          {question.estado === 'Respondida' && (
                            <span className="status-message success">
                              Question answered
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {/* Manual Question Addition */}
                <div className="add-question-area">
                  {addingToDisciplina === group.disciplina ? (
                    <div className="new-question-input card">
                      <textarea
                        placeholder="Write your question here..."
                        value={newQuestionTexts[group.disciplina] || ''}
                        onChange={(e) => setNewQuestionTexts(prev => ({
                          ...prev,
                          [group.disciplina]: e.target.value
                        }))}
                        className="question-edit-textarea"
                        rows={3}
                        autoFocus
                      />
                      <div className="new-question-actions">
                        <button
                          onClick={() => handleAddManualQuestion(group.disciplina)}
                          className="btn btnPrimary btn-sm"
                        >
                          <Icons.Save /> Save Question
                        </button>
                        <button
                          onClick={() => setAddingToDisciplina(null)}
                          className="btn btnSecondary btn-sm"
                        >
                          <Icons.Cancel /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingToDisciplina(group.disciplina)}
                      className="btn btnSecondary btn-sm add-manual-btn"
                    >
                      + Add another question
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {
        !isLoading && questions.length === 0 && (
          <div className="qa-empty">
            <div className="empty-icon">
              <Icons.Paper />
            </div>
            <h3>No questions generated</h3>
            <p>Select a project and provider, then click "Generate Technical Audit"</p>
          </div>
        )
      }
    </div >
  );
};
