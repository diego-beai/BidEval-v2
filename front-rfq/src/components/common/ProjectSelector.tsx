import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore, Project } from '../../stores/useProjectStore';
import { useToastStore } from '../../stores/useToastStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import './ProjectSelector.css';

interface ProjectSelectorProps {
  compact?: boolean;
  onNewProject?: () => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ compact = false, onNewProject }) => {
  const {
    projects,
    activeProjectId,
    isLoading,
    setActiveProject,
    getActiveProject,
    loadProjects,
    createProject,
    updateProjectName,
    deleteProject
  } = useProjectStore();

  const { addToast } = useToastStore();
  const { t } = useLanguageStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const activeProject = getActiveProject();

  // Sort projects: active project first, then alphabetically
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.id === activeProjectId) return -1;
    if (b.id === activeProjectId) return 1;
    return a.display_name.localeCompare(b.display_name);
  });

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when creating
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  // Focus input when editing
  useEffect(() => {
    if (editingProjectId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingProjectId]);

  // Reload projects when dropdown opens
  const handleToggle = () => {
    if (!isOpen) {
      loadProjects();
      setIsCreating(false);
      setNewProjectName('');
    }
    setIsOpen(!isOpen);
  };

  const handleSelectProject = (project: Project) => {
    setActiveProject(project.id);
    setIsOpen(false);
    setIsCreating(false);
  };

  const handleStartCreating = () => {
    setIsCreating(true);
    setNewProjectName('');
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewProjectName('');
  };

  const handleCreateProject = async () => {
    const trimmedName = newProjectName.trim();

    if (!trimmedName) {
      addToast(t('project.enter_name'), 'warning');
      return;
    }

    if (trimmedName.length < 3) {
      addToast(t('project.name_min_chars'), 'warning');
      return;
    }

    // Check if project already exists
    const existingProject = projects.find(
      p => p.display_name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingProject) {
      addToast(t('project.already_exists'), 'warning');
      setActiveProject(existingProject.id);
      setIsCreating(false);
      setIsOpen(false);
      return;
    }

    setIsSubmitting(true);

    try {
      const newProject = await createProject(trimmedName);

      if (newProject) {
        addToast(`${t('project.created_success')}: "${trimmedName}"`, 'success');
        setIsCreating(false);
        setNewProjectName('');
        setIsOpen(false);
      } else {
        addToast(t('project.error_creating'), 'error');
      }
    } catch (err) {
      addToast(t('project.error_creating'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateProject();
    } else if (e.key === 'Escape') {
      handleCancelCreate();
    }
  };

  const handleStartEditing = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingProjectName(project.display_name);
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null);
    setEditingProjectName('');
  };

  const handleUpdateProject = async () => {
    if (!editingProjectId) return;

    const trimmedName = editingProjectName.trim();

    if (!trimmedName) {
      addToast(t('project.enter_name'), 'warning');
      return;
    }

    if (trimmedName.length < 3) {
      addToast(t('project.name_min_chars'), 'warning');
      return;
    }

    // Check if another project already has this name
    const existingProject = projects.find(
      p => p.id !== editingProjectId && p.display_name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingProject) {
      addToast(t('project.already_exists'), 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await updateProjectName(editingProjectId, trimmedName);

      if (success) {
        addToast(t('project.updated_success'), 'success');
        setEditingProjectId(null);
        setEditingProjectName('');
      } else {
        addToast(t('project.error_updating'), 'error');
      }
    } catch (err) {
      addToast(t('project.error_updating'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUpdateProject();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setDeletingProjectId(projectId);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProjectId) return;

    setIsSubmitting(true);

    try {
      const success = await deleteProject(deletingProjectId);

      if (success) {
        addToast(t('project.deleted_success'), 'success');
        setDeletingProjectId(null);
      } else {
        addToast(t('project.error_deleting'), 'error');
      }
    } catch (err) {
      addToast(t('project.error_deleting'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeletingProjectId(null);
  };

  const formatProjectName = (name: string) => {
    return name.replace(/_/g, ' ');
  };

  return (
    <div className={`project-selector ${compact ? 'compact' : ''}`} ref={dropdownRef} data-tour="project-selector">
      <button
        className={`project-selector-btn ${isOpen ? 'active' : ''} ${!activeProject ? 'placeholder' : ''}`}
        onClick={handleToggle}
      >
        <div className="project-selector-content">
          <svg
            className="project-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>

          <span className="project-name" title={activeProject?.display_name}>
            {activeProject?.display_name ? formatProjectName(activeProject.display_name) : t('project.select')}
          </span>

          {activeProject?.project_type && (
            <span style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              background: activeProject.project_type === 'RFP' ? 'rgba(18, 181, 176, 0.15)' : activeProject.project_type === 'RFQ' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: activeProject.project_type === 'RFP' ? '#12b5b0' : activeProject.project_type === 'RFQ' ? '#3b82f6' : '#f59e0b',
            }}>
              {activeProject.project_type}
            </span>
          )}

          {activeProject && !compact && (
            <span className="project-stats">
              {activeProject.document_count} {t('project.docs')}
            </span>
          )}
        </div>

        <svg
          className={`dropdown-chevron ${isOpen ? 'open' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="project-dropdown">
          <div className="project-dropdown-header">
            <span>{t('project.select')}</span>
            {isLoading && <span className="loading-indicator" />}
          </div>

          <div className="project-list">
            {sortedProjects.length === 0 && !isLoading ? (
              <div className="no-projects">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>{t('project.no_projects')}</span>
              </div>
            ) : (
              sortedProjects.map((project) => (
                <div key={project.id} className={`project-item-wrapper ${editingProjectId === project.id ? 'editing' : ''}`}>
                  {editingProjectId === project.id ? (
                    <div className="edit-project-form">
                      <input
                        ref={editInputRef}
                        type="text"
                        className="edit-project-input"
                        value={editingProjectName}
                        onChange={(e) => setEditingProjectName(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        disabled={isSubmitting}
                        maxLength={100}
                      />
                      <div className="edit-project-actions">
                        <button
                          className="edit-project-btn confirm"
                          onClick={handleUpdateProject}
                          disabled={isSubmitting || !editingProjectName.trim()}
                          title={t('project.save')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                        <button
                          className="edit-project-btn cancel"
                          onClick={handleCancelEdit}
                          disabled={isSubmitting}
                          title={t('project.cancel')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className={`project-item ${project.id === activeProjectId ? 'active' : ''}`}
                      onClick={() => handleSelectProject(project)}
                    >
                      <div className="project-item-main">
                        <span className="project-item-name" title={project.display_name}>
                          {formatProjectName(project.display_name)}
                        </span>
                        {project.project_type && (
                          <span style={{
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: project.project_type === 'RFP' ? 'rgba(18, 181, 176, 0.15)' : project.project_type === 'RFQ' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: project.project_type === 'RFP' ? '#12b5b0' : project.project_type === 'RFQ' ? '#3b82f6' : '#f59e0b',
                            flexShrink: 0,
                          }}>
                            {project.project_type}
                          </span>
                        )}
                        {project.id === activeProjectId && (
                          <svg
                            className="check-icon"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <div className="project-item-stats">
                        <span className="stat">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          {project.document_count}
                        </span>
                        <span className="stat">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="8" y1="6" x2="21" y2="6" />
                            <line x1="8" y1="12" x2="21" y2="12" />
                            <line x1="8" y1="18" x2="21" y2="18" />
                            <line x1="3" y1="6" x2="3.01" y2="6" />
                            <line x1="3" y1="12" x2="3.01" y2="12" />
                            <line x1="3" y1="18" x2="3.01" y2="18" />
                          </svg>
                          {project.requirement_count}
                        </span>
                        <span className="stat">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                          {project.qa_count}
                        </span>
                        <div className="project-actions">
                          <button
                            className="project-action-btn edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditing(project);
                            }}
                            title={t('project.edit')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="project-action-btn delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                            title={t('project.delete')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Create New Project Section */}
          {isCreating ? (
            <div className="create-project-form">
              <input
                ref={inputRef}
                type="text"
                className="create-project-input"
                placeholder={t('project.enter_name_placeholder')}
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
                maxLength={100}
              />
              <div className="create-project-actions">
                <button
                  className="create-project-btn confirm"
                  onClick={handleCreateProject}
                  disabled={isSubmitting || !newProjectName.trim()}
                >
                  {isSubmitting ? (
                    <span className="loading-indicator" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {t('project.create')}
                </button>
                <button
                  className="create-project-btn cancel"
                  onClick={handleCancelCreate}
                  disabled={isSubmitting}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  {t('project.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button className="new-project-btn" onClick={() => {
              if (onNewProject) {
                setIsOpen(false);
                onNewProject();
              } else {
                handleStartCreating();
              }
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t('project.new')}
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProjectId && (
        <div className="project-delete-modal-overlay" onClick={handleCancelDelete}>
          <div className="project-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <h3>{t('project.confirm_delete')}</h3>
            </div>
            <p className="modal-message">
              {t('project.confirm_delete_message', {
                name: projects.find(p => p.id === deletingProjectId)?.display_name
              })}
            </p>
            <p className="modal-warning">
              {t('project.delete_warning')}
            </p>
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={handleCancelDelete}
                disabled={isSubmitting}
              >
                {t('project.cancel')}
              </button>
              <button
                className="modal-btn confirm"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="loading-indicator" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                )}
                {t('project.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
