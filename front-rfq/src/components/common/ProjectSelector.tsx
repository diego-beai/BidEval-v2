import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore, Project } from '../../stores/useProjectStore';
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
    loadProjects
  } = useProjectStore();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Reload projects when dropdown opens
  const handleToggle = () => {
    if (!isOpen) {
      loadProjects();
    }
    setIsOpen(!isOpen);
  };

  const handleSelectProject = (project: Project) => {
    setActiveProject(project.id);
    setIsOpen(false);
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
        </div>
      )}
    </div>
  );
};
