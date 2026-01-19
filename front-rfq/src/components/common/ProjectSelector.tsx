import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore, Project } from '../../stores/useProjectStore';
import { useToastStore } from '../../stores/useToastStore';
import './ProjectSelector.css';

interface ProjectSelectorProps {
  compact?: boolean;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ compact = false }) => {
  const {
    projects,
    activeProjectId,
    isLoading,
    setActiveProject,
    getActiveProject,
    loadProjects,
    createProject
  } = useProjectStore();

  const { addToast } = useToastStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeProject = getActiveProject();

  // Sort projects so "PROJECT H2 PLANT IN LA ZAIDA, ZARAGOZA (SPAIN)" always appears first
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.display_name === 'PROJECT H2 PLANT IN LA ZAIDA, ZARAGOZA (SPAIN)') return -1;
    if (b.display_name === 'PROJECT H2 PLANT IN LA ZAIDA, ZARAGOZA (SPAIN)') return 1;
    return 0;
  });

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
      addToast('Please enter a project name', 'warning');
      return;
    }

    if (trimmedName.length < 3) {
      addToast('Project name must be at least 3 characters', 'warning');
      return;
    }

    // Check if project already exists
    const existingProject = projects.find(
      p => p.display_name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingProject) {
      addToast('A project with this name already exists', 'warning');
      setActiveProject(existingProject.id);
      setIsCreating(false);
      setIsOpen(false);
      return;
    }

    setIsSubmitting(true);

    try {
      const newProject = await createProject(trimmedName);

      if (newProject) {
        addToast(`Project "${trimmedName}" created successfully`, 'success');
        setIsCreating(false);
        setNewProjectName('');
        setIsOpen(false);
      } else {
        addToast('Error creating project', 'error');
      }
    } catch (err) {
      console.error('Error creating project:', err);
      addToast('Error creating project', 'error');
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

  const formatProjectName = (name: string) => {
    // Truncate long names
    const maxLength = compact ? 20 : 35;
    if (name.length > maxLength) {
      return name.substring(0, maxLength) + '...';
    }
    return name;
  };

  return (
    <div className={`project-selector ${compact ? 'compact' : ''}`} ref={dropdownRef} data-tour="project-selector">
      <button
        className={`project-selector-btn ${isOpen ? 'active' : ''} ${!activeProject ? 'placeholder' : ''}`}
        onClick={handleToggle}
        disabled={isLoading}
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
            {isLoading ? 'Loading...' : (activeProject?.display_name ? formatProjectName(activeProject.display_name) : 'Select Project')}
          </span>

          {activeProject && !compact && (
            <span className="project-stats">
              {activeProject.document_count} docs
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
            <span>Select Project</span>
            {isLoading && <span className="loading-indicator" />}
          </div>

          <div className="project-list">
            {sortedProjects.length === 0 && !isLoading ? (
              <div className="no-projects">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>No projects found</span>
              </div>
            ) : (
              sortedProjects.map((project) => (
                <button
                  key={project.id}
                  className={`project-item ${project.id === activeProjectId ? 'active' : ''}`}
                  onClick={() => handleSelectProject(project)}
                >
                  <div className="project-item-main">
                    <span className="project-item-name" title={project.display_name}>
                      {formatProjectName(project.display_name)}
                    </span>
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
                  </div>
                </button>
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
                placeholder="Enter project name..."
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
                  Create
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
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button className="new-project-btn" onClick={handleStartCreating}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Project
            </button>
          )}
        </div>
      )}
    </div>
  );
};
