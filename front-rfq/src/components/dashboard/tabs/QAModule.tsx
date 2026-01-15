import React, { useEffect, useState } from 'react';
import { useQAStore } from '../../../stores/useQAStore';
import { useMailStore } from '../../../stores/useMailStore';
import { useToastStore } from '../../../stores/useToastStore';
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

export const QAModule: React.FC<{ projectId?: string }> = ({ projectId: initialProjectId = '' }) => {
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
    subscribeToChanges
    // unsubscribeFromChanges - not used currently
  } = useQAStore();

  const { addToast } = useToastStore();
  const { addQAItem } = useMailStore();

  const [projectId, setProjectId] = useState<string>(initialProjectId);
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
  const availableProviders = ['TR', 'IDOM', 'SACYR', 'EA', 'SENER', 'TRESCA', 'WORLEY'];

  // Subscribe to real-time changes
  useEffect(() => {
    // Update projectId when initialProjectId changes
    if (initialProjectId !== projectId) {
      setProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  useEffect(() => {
    // Only load questions if there is a valid projectId
    if (projectId && projectId.trim()) {
      loadQuestions(projectId);
      subscribeToChanges(projectId);
    } else if (!projectId) {
      // Only clear state when there's no project selected
      setQuestions([]);
    }
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

  // Excel Export - Approved Questions Only
  const handleExportExcel = async () => {
    try {
      // Import dynamic to avoid bundle bloat
      const XLSX = await import('xlsx');

      // Filter only approved questions or all? User said "las que le demos a aprobar"
      const approvedQuestions = questions.filter(q => q.estado === 'Approved');

      if (approvedQuestions.length === 0) {
        addToast('No approved questions to export. Please approve some questions first.', 'warning');
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
      addToast('Technical audit exported successfully to Excel', 'success');
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      addToast('Error exporting to Excel', 'error');
    }
  };

  // Excel Export - All Questions
  const handleExportAllQuestions = async () => {
    try {
      const XLSX = await import('xlsx');

      if (questions.length === 0) {
        addToast('No questions to export', 'warning');
        return;
      }

      const exportData = questions.map(q => ({
        'Discipline': q.disciplina || q.discipline,
        'Importance': q.importancia || q.importance,
        'Question': q.pregunta_texto || q.question,
        'Provider': q.proveedor || q.provider_name,
        'Status': q.estado || q.status,
        'Project': q.project_name || q.project_id,
        'Created At': new Date(q.created_at).toLocaleDateString()
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'All Questions');

      const fileName = `All_Questions_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      addToast(`${questions.length} questions exported successfully to Excel`, 'success');
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      addToast('Error exporting to Excel', 'error');
    }
  };

  const handleGenerateAudit = async () => {
    if (!projectId || !selectedProvider) {
      addToast('Please select a project and a provider', 'warning');
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

          // Map English disciplines to English ones for the DB/Types
          const disciplineMapping: Record<string, Disciplina> = {
            'Electrical': 'Electrical',
            'Mechanical': 'Mechanical',
            'Civil': 'Civil',
            'Process': 'Process',
            'General': 'General',
            'Cost': 'Cost'
          };

          // Map English importance to English ones
          const importanceMapping: Record<string, Importancia> = {
            'High': 'High',
            'Medium': 'Medium',
            'Low': 'Low'
          };

          const discipline = disciplineMapping[qData.discipline] || 'General';
          const importance = importanceMapping[qData.importance] || 'Media';

          return {
            id: `qa-${Date.now()}-${index}`,
            created_at: new Date().toISOString(),
            project_name: projectId,
            provider_name: selectedProvider,
            discipline,
            question: qData.question,
            status: 'Draft',
            importance,
            // Alias for frontend compatibility
            project_id: projectId,
            proveedor: selectedProvider,
            disciplina: discipline,
            pregunta_texto: qData.question,
            estado: 'Draft',
            importancia: importance
          };
        });

        // Add to existing questions by prepending them
        setQuestions([...newQuestions, ...questions]);

        setStatusMessage(`Success! ${result.preguntas_generadas} questions generated and displayed.`);
        addToast(`${result.preguntas_generadas} technical audit questions generated successfully`, 'success');
      } else {
        setStatusMessage(`Warning: ${result.message || 'The process finished with no results.'}`);
        addToast(result.message || 'The process finished with no results.', 'warning');
      }

      // Clear message after a longer delay
      setTimeout(() => setStatusMessage(null), 8000);
    } catch (err) {
      console.error('Error generating audit:', err);
      setStatusMessage(null);
      addToast(err instanceof Error ? err.message : 'Error generating technical audit', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddManualQuestion = async (disciplina: string) => {
    const text = newQuestionTexts[disciplina]?.trim();

    // Try to get provider from selection, or from existing questions in this discipline
    const existingProvider = questions.find(q =>
      (q.disciplina || q.discipline) === disciplina
    )?.proveedor || questions.find(q =>
      (q.disciplina || q.discipline) === disciplina
    )?.provider_name;

    const providerToUse = selectedProvider || existingProvider;

    if (!text) {
      addToast('Please enter a question', 'warning');
      return;
    }

    if (!projectId) {
      addToast('Please select a project in the form above', 'warning');
      return;
    }

    if (!providerToUse) {
      addToast('Please select a provider in the form above', 'warning');
      return;
    }

    try {
      await createQuestion({
        project_name: projectId,
        provider_name: providerToUse,
        discipline: disciplina as Disciplina,
        question: text,
        status: 'Draft',
        importance: 'Medium',
        // Alias for compatibility
        project_id: projectId,
        proveedor: providerToUse,
        disciplina: disciplina as Disciplina,
        pregunta_texto: text,
        estado: 'Draft',
        importancia: 'Medium'
      });

      // Reset text
      setNewQuestionTexts(prev => ({ ...prev, [disciplina || '']: '' }));
      setAddingToDisciplina(null);
      addToast('Question added successfully', 'success');
    } catch (err) {
      console.error('Error adding question:', err);
      addToast('Error adding question', 'error');
    }
  };

  const handleEditQuestion = (question: QAQuestion) => {
    setEditingQuestion(question.id);
    setEditedText(question.pregunta_texto || question.question || '');
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

    // When approving, add the question to the Mail store for inclusion in emails
    if (estado === 'Approved') {
      const question = questions.find(q => q.id === questionId);
      if (question) {
        addQAItem(question);
        addToast('Question approved and added to Mail queue', 'success');
      }
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      await deleteQuestion(questionId);
    }
  };

  const getImportanciaClass = (importancia?: Importancia | null) => {
    switch (importancia) {
      case 'High': return 'importancia-alta';
      case 'Medium': return 'importancia-media';
      case 'Low': return 'importancia-baja';
      default: return '';
    }
  };

  const getEstadoClass = (estado: EstadoPregunta) => {
    switch (estado) {
      case 'Draft': return 'estado-borrador';
      case 'Pending': return 'estado-pendiente';
      case 'Approved': return 'estado-aprobada';
      case 'Sent': return 'estado-enviada';
      case 'Answered': return 'estado-respondida';
      case 'Discarded': return 'estado-descartada';
      default: return '';
    }
  };

  const getProviderClass = (provider?: string | null) => {
    if (!provider) return '';
    const normalized = provider.toUpperCase().trim();
    switch (normalized) {
      case 'TR':
      case 'TECNICASREUNIDAS': return 'provider-tr';
      case 'IDOM': return 'provider-idom';
      case 'SACYR': return 'provider-sacyr';
      case 'EA': return 'provider-ea';
      case 'SENER': return 'provider-sener';
      case 'TRESCA': return 'provider-tresca';
      case 'WORLEY': return 'provider-worley';
      default: return '';
    }
  };

  const groupedQuestions = getGroupedByDisciplina();
  const stats = getStats();

  // Discipline name mapping
  const disciplineMap: Record<string, string> = {
    'Electrical': 'Electrical',
    'Mechanical': 'Mechanical',
    'Civil': 'Civil',
    'Process': 'Process',
    'General': 'General',
    'Cost': 'Cost'
  };

  return (
    <div className="module-container">
      {/* Main Header */}
      <div className="module-main-header">
        <h1 className="module-main-title">Q&A Management</h1>
        <p className="module-main-subtitle">
          Generate intelligent questions and manage technical audits
        </p>
      </div>

      {/* SECTION 1: TECHNICAL AUDIT GENERATOR */}
      <div className="module-section audit-generator-section">
        <div className="module-section-header">
          <div className="module-section-header-content">
            <Icons.Paper />
            <div>
              <h2 className="module-section-title">Technical Audit Generator</h2>
              <p className="module-section-subtitle">Generate AI-powered questions based on provider deficiencies</p>
            </div>
          </div>
        </div>

        <div className="generator-form module-card">
          <div className="form-grid">
            {/* Project Selector */}
            <div className="form-group">
              <label className="form-label">Project</label>
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

            {/* Provider Selector */}
            <div className="form-group">
              <label className="form-label">Provider</label>
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
          </div>

          <div className="module-actions">
            <button
              onClick={handleGenerateAudit}
              disabled={isGenerating || !projectId || !selectedProvider}
              className="module-btn-primary"
            >
              {isGenerating ? (
                <>
                  <span className="module-spinner"></span>
                  Generating Audit...
                </>
              ) : (
                'Generate Technical Audit'
              )}
            </button>

            {questions.some(q => q.estado === 'Approved') && (
              <button
                onClick={handleExportExcel}
                className="module-btn-secondary"
                title="Export approved questions to Excel"
              >
                <Icons.Download />
                Export to Excel
              </button>
            )}
          </div>

          {statusMessage && (
            <div className={`module-status-banner ${statusMessage.includes('Success') || statusMessage.includes('completed') ? 'success' : ''}`}>
              {isGenerating && <span className="module-spinner"></span>}
              {statusMessage}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: QUESTIONS VIEWER & MANAGEMENT */}
      <div className="module-section questions-viewer-section">
        <div className="module-section-header">
          <div className="module-section-header-content">
            <div>
              <h2 className="module-section-title">Questions Management</h2>
              <p className="module-section-subtitle">View and manage generated questions by discipline</p>
            </div>
          </div>

          <div className="module-section-header-actions">
            {/* Export All Questions Button */}
            {questions.length > 0 && (
              <button
                onClick={handleExportAllQuestions}
                className="module-btn-primary"
                title="Export all questions to Excel"
              >
                <Icons.Download />
                Export All Questions
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
                        <option value="Draft">Draft</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Sent">Sent</option>
                        <option value="Answered">Answered</option>
                        <option value="Discarded">Discarded</option>
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
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Global Statistics */}
        {stats.total > 0 && (
          <div className="module-stats-grid">
            <div className="module-stat-card">
              <div className="module-stat-value">{stats.total}</div>
              <div className="module-stat-label">Total Questions</div>
            </div>
            <div className="module-stat-card">
              <div className="module-stat-value">{stats.porEstado['Approved'] || 0}</div>
              <div className="module-stat-label">Approved</div>
            </div>
            <div className="module-stat-card">
              <div className="module-stat-value">{stats.porEstado['Pending'] || 0}</div>
              <div className="module-stat-label">Pending</div>
            </div>
            <div className="module-stat-card">
              <div className="module-stat-value">{stats.porImportancia?.['High'] || 0}</div>
              <div className="module-stat-label">High Importance</div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {
          error && (
            <div className="qa-error">
              <Icons.Error /> {error}
              {error.includes('Q&A table is not configured') && (
                <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
                  Please run the setup_qa_table.sql script in Supabase
                </div>
              )}
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
                        <span className={`badge ${getEstadoClass(question.estado || question.status)}`}>
                          {question.estado || question.status}
                        </span>
                        {(question.importancia || question.importance) && (
                          <span className={`badge ${getImportanciaClass(question.importancia || question.importance)}`}>
                            {question.importancia || question.importance}
                          </span>
                        )}
                        <span className={`question-provider ${getProviderClass(question.proveedor || question.provider_name)}`}>
                          {question.proveedor || question.provider_name}
                        </span>
                      </div>
                      <div className="question-actions-top">
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="icon-btn icon-btn-danger"
                          title="Delete question"
                        >
                          <Icons.Delete />
                        </button>
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
                        <p className="question-text">{question.pregunta_texto || question.question}</p>
                      )}
                    </div>

                    {/* Provider Response */}
                    {(question.respuesta_proveedor || question.response) && (
                      <div className="question-response">
                        <strong>Response:</strong>
                        <p>{question.respuesta_proveedor || question.response}</p>
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
                      ) : (() => {
                        const rawStatus = question.estado || question.status || 'Draft';
                        // Normalize status to handle both English and Spanish values
                        const normalizeStatus = (s: string): string => {
                          const upper = s.toUpperCase();
                          if (['DRAFT', 'BORRADOR'].includes(upper)) return 'Draft';
                          if (['PENDING', 'PENDIENTE'].includes(upper)) return 'Pending';
                          if (['APPROVED', 'APROBADO', 'APROBADA'].includes(upper)) return 'Approved';
                          if (['SENT', 'ENVIADO', 'ENVIADA'].includes(upper)) return 'Sent';
                          if (['ANSWERED', 'RESPONDIDO', 'RESPONDIDA'].includes(upper)) return 'Answered';
                          if (['DISCARDED', 'DESCARTADO', 'DESCARTADA'].includes(upper)) return 'Discarded';
                          return s;
                        };
                        const currentStatus = normalizeStatus(rawStatus);
                        return (
                          <>
                            {/* Show Edit/Approve/Discard for Draft or Pending status */}
                            {(currentStatus === 'Draft' || currentStatus === 'Pending') && (
                              <>
                                <button
                                  onClick={() => handleEditQuestion(question)}
                                  className="btn btnSecondary btn-sm"
                                >
                                  <Icons.Edit /> Edit
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(question.id, 'Approved')}
                                  className="btn btnPrimary btn-sm"
                                >
                                  <Icons.Approve /> Approve
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(question.id, 'Discarded')}
                                  className="btn btnDanger btn-sm"
                                >
                                  <Icons.Discard /> Discard
                                </button>
                              </>
                            )}
                            {currentStatus === 'Approved' && (
                              <button
                                onClick={() => handleUpdateStatus(question.id, 'Sent')}
                                className="btn btnPrimary btn-sm"
                              >
                                <Icons.Send /> Send
                              </button>
                            )}
                            {currentStatus === 'Sent' && (
                              <span className="status-message">
                                Waiting for response...
                              </span>
                            )}
                            {currentStatus === 'Answered' && (
                              <span className="status-message success">
                                Question answered
                              </span>
                            )}
                            {currentStatus === 'Discarded' && (
                              <span className="status-message" style={{ color: 'var(--color-error, #ef4444)' }}>
                                Discarded
                              </span>
                            )}
                          </>
                        );
                      })()}
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
            <div className="module-empty-state">
              <div className="module-empty-icon">
                <Icons.Paper />
              </div>
              <h3 className="module-empty-title">No questions generated</h3>
              <p className="module-empty-text">Select a project and provider, then click "Generate Technical Audit"</p>
            </div>
          )
        }
      </div>
    </div>
  );
};
