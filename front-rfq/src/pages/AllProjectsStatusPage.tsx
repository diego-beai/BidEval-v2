import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useProjectStore, Project, REQUIRED_EVAL_TYPES } from '../stores/useProjectStore';
import { useLanguageStore } from '../stores/useLanguageStore';
import { useToastStore } from '../stores/useToastStore';
import { ProjectDetailModal } from '../components/common/ProjectDetailModal';

import './AllProjectsStatusPage.css';

type ViewMode = 'cards' | 'table';
type SortKey = 'progress' | 'name' | 'date';
type StatusFilter = 'all' | 'setup' | 'extracting' | 'waiting_proposals' | 'evaluation' | 'completed';

const STATUS_ORDER: StatusFilter[] = ['all', 'setup', 'extracting', 'waiting_proposals', 'evaluation', 'completed'];

const STATUS_COLORS: Record<string, string> = {
    setup: '#94a3b8',
    extracting: '#fbbf24',
    waiting_proposals: '#f59e0b',
    evaluation: '#06b6d4',
    completed: '#10b981',
};

function getStatusColor(status: string): string {
    return STATUS_COLORS[status?.toLowerCase()] || '#94a3b8';
}

function getProgressPercent(p: Project): number {
    if (p.status === 'completed') return 100;
    if (p.status === 'evaluation') {
        const total = p.providers_with_scoring.length + p.providers_without_scoring.length;
        if (total > 0) {
            return Math.round(60 + (p.providers_with_scoring.length / total) * 35);
        }
        return 60;
    }
    if (p.status === 'waiting_proposals') {
        return 30 + Math.min(25, Math.round((p.qualifying_providers / 2) * 25));
    }
    if (p.status === 'extracting') return 20;
    if (p.rfq_count > 0) return Math.max(5, Math.round((p.rfq_types_covered.length / REQUIRED_EVAL_TYPES.length) * 15));
    return 5;
}

export const AllProjectsStatusPage: React.FC = () => {
    const { projects, loadProjects, updateProjectName, deleteProject } = useProjectStore();
    const { t, language } = useLanguageStore();
    const { addToast } = useToastStore();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [sortKey, setSortKey] = useState<SortKey>('progress');
    const [viewMode, setViewMode] = useState<ViewMode>('cards');
    const [detailProject, setDetailProject] = useState<Project | null>(null);

    // Edit state
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editingProjectName, setEditingProjectName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const editInputRef = useRef<HTMLInputElement>(null);

    // Delete state
    const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    // Focus input when editing
    useEffect(() => {
        if (editingProjectId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingProjectId]);

    const filtered = useMemo(() => {
        let list = [...projects];

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(p =>
                (p.display_name || p.name).toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q)
            );
        }

        if (statusFilter !== 'all') {
            list = list.filter(p => p.status === statusFilter);
        }

        list.sort((a, b) => {
            switch (sortKey) {
                case 'progress':
                    return getProgressPercent(b) - getProgressPercent(a);
                case 'name':
                    return (a.display_name || a.name).localeCompare(b.display_name || b.name);
                case 'date':
                    return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
                default:
                    return 0;
            }
        });

        return list;
    }, [projects, search, statusFilter, sortKey]);

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: projects.length };
        for (const p of projects) {
            counts[p.status] = (counts[p.status] || 0) + 1;
        }
        return counts;
    }, [projects]);

    const handleProjectClick = (project: Project) => {
        if (editingProjectId) return; // Don't open modal while editing
        setDetailProject(project);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    // --- Edit handlers ---
    const handleStartEditing = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation();
        setEditingProjectId(project.id);
        setEditingProjectName(project.display_name || project.name);
    };

    const handleCancelEdit = () => {
        setEditingProjectId(null);
        setEditingProjectName('');
    };

    const handleUpdateProject = async () => {
        if (!editingProjectId) return;
        const trimmed = editingProjectName.trim();

        if (!trimmed || trimmed.length < 3) {
            addToast(t('project.name_min_chars'), 'warning');
            return;
        }

        const duplicate = projects.find(
            p => p.id !== editingProjectId && p.display_name.toLowerCase() === trimmed.toLowerCase()
        );
        if (duplicate) {
            addToast(t('project.already_exists'), 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const success = await updateProjectName(editingProjectId, trimmed);
            if (success) {
                addToast(t('project.updated_success'), 'success');
                setEditingProjectId(null);
                setEditingProjectName('');
            } else {
                addToast(t('project.error_updating'), 'error');
            }
        } catch {
            addToast(t('project.error_updating'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); handleUpdateProject(); }
        else if (e.key === 'Escape') handleCancelEdit();
    };

    // --- Delete handlers ---
    const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
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
        } catch {
            addToast(t('project.error_deleting'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="all-projects-page fade-in">
            {/* Header */}
            <div className="all-projects-header">
                <div>
                    <h1 className="all-projects-title">{t('projects.dashboard_title')}</h1>
                    <p className="all-projects-subtitle">
                        {t('projects.dashboard_desc')} — <strong>{projects.length}</strong> {t('projects.dashboard_desc').includes('proyectos') ? 'proyectos' : 'projects'}
                    </p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="all-projects-toolbar">
                <div className="projects-search">
                    <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        className="search-input"
                        placeholder={t('projects.search_placeholder') || (language === 'es' ? 'Buscar proyectos...' : 'Search projects...')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="search-clear" onClick={() => setSearch('')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    )}
                </div>

                <div className="status-filters">
                    {STATUS_ORDER.map(s => (
                        <button
                            key={s}
                            className={`status-chip ${statusFilter === s ? 'active' : ''}`}
                            onClick={() => setStatusFilter(s)}
                            style={statusFilter === s && s !== 'all' ? {
                                borderColor: getStatusColor(s),
                                color: getStatusColor(s),
                                background: getStatusColor(s) + '18',
                            } : undefined}
                        >
                            {s !== 'all' && <span className="chip-dot" style={{ background: getStatusColor(s) }} />}
                            {s === 'all' ? (language === 'es' ? 'Todos' : 'All') : t(`status.${s}`)}
                            <span className="chip-count">{statusCounts[s] || 0}</span>
                        </button>
                    ))}
                </div>

                <div className="toolbar-right">
                    <select
                        className="sort-select"
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as SortKey)}
                    >
                        <option value="progress">{language === 'es' ? 'Progreso' : 'Progress'}</option>
                        <option value="name">{language === 'es' ? 'Nombre' : 'Name'}</option>
                        <option value="date">{language === 'es' ? 'Fecha' : 'Date'}</option>
                    </select>

                    <div className="view-toggle">
                        <button
                            className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                            onClick={() => setViewMode('cards')}
                            title={language === 'es' ? 'Vista tarjetas' : 'Cards view'}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                            </svg>
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                            title={language === 'es' ? 'Vista tabla' : 'Table view'}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
                <div className="projects-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <p>{language === 'es' ? 'No se encontraron proyectos' : 'No projects found'}</p>
                </div>
            )}

            {/* Cards view */}
            {viewMode === 'cards' && filtered.length > 0 && (
                <div className="projects-grid">
                    {filtered.map((project) => {
                        const progress = getProgressPercent(project);
                        const color = getStatusColor(project.status || 'setup');
                        const isEditing = editingProjectId === project.id;

                        return (
                            <div
                                key={project.id}
                                className={`project-card ${isEditing ? 'editing' : ''}`}
                                onClick={() => handleProjectClick(project)}
                            >
                                <div className="card-top">
                                    <div className="card-icon" style={{ background: color + '18', color }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                        </svg>
                                    </div>
                                    <div className="card-info">
                                        {isEditing ? (
                                            <div className="card-edit-form" onClick={e => e.stopPropagation()}>
                                                <input
                                                    ref={editInputRef}
                                                    type="text"
                                                    className="card-edit-input"
                                                    value={editingProjectName}
                                                    onChange={e => setEditingProjectName(e.target.value)}
                                                    onKeyDown={handleEditKeyDown}
                                                    disabled={isSubmitting}
                                                    maxLength={100}
                                                />
                                                <div className="card-edit-actions">
                                                    <button
                                                        className="card-action-btn confirm"
                                                        onClick={handleUpdateProject}
                                                        disabled={isSubmitting || !editingProjectName.trim()}
                                                        title={t('project.save')}
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                    </button>
                                                    <button
                                                        className="card-action-btn cancel"
                                                        onClick={e => { e.stopPropagation(); handleCancelEdit(); }}
                                                        disabled={isSubmitting}
                                                        title={t('project.cancel')}
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <h3 className="card-name">{project.display_name || project.name.replace(/_/g, ' ')}</h3>
                                                <span className="card-date">{formatDate(project.updated_at || project.created_at)}</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="card-header-right">
                                        <span className="card-status-badge" style={{ background: color + '18', color, borderColor: color + '44' }}>
                                            {t(`status.${project.status || 'setup'}`)}
                                        </span>
                                        {!isEditing && (
                                            <div className="card-actions" onClick={e => e.stopPropagation()}>
                                                <button
                                                    className="card-action-btn edit"
                                                    onClick={e => handleStartEditing(e, project)}
                                                    title={t('project.edit')}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    className="card-action-btn delete"
                                                    onClick={e => handleDeleteProject(e, project.id)}
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
                                        )}
                                    </div>
                                </div>

                                {/* Stats row */}
                                <div className="card-stats">
                                    <div className="card-stat">
                                        <span className="stat-value">{project.document_count}</span>
                                        <span className="stat-label">{t('common.docs') || 'Docs'}</span>
                                    </div>
                                    <div className="card-stat">
                                        <span className="stat-value">{project.requirement_count}</span>
                                        <span className="stat-label">{t('common.reqs') || 'Reqs'}</span>
                                    </div>
                                    <div className="card-stat">
                                        <span className="stat-value">{project.proposal_count}</span>
                                        <span className="stat-label">{t('projects.proposals') || 'Proposals'}</span>
                                    </div>
                                </div>

                                {/* Progress */}
                                <div className="card-progress">
                                    <div className="progress-header">
                                        <span>{t('projects.progress')}</span>
                                        <strong>{progress}%</strong>
                                    </div>
                                    <div className="progress-track">
                                        <div className="progress-fill" style={{ width: `${progress}%`, background: color }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Table view */}
            {viewMode === 'table' && filtered.length > 0 && (
                <div className="projects-table-wrapper">
                    <table className="projects-table">
                        <thead>
                            <tr>
                                <th>{language === 'es' ? 'Proyecto' : 'Project'}</th>
                                <th>{language === 'es' ? 'Estado' : 'Status'}</th>
                                <th>{language === 'es' ? 'Progreso' : 'Progress'}</th>
                                <th>Docs</th>
                                <th>{t('common.reqs') || 'Reqs'}</th>
                                <th>Q&A</th>
                                <th>{language === 'es' ? 'Actualizado' : 'Updated'}</th>
                                <th style={{ width: 80 }}>{language === 'es' ? 'Acciones' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((project) => {
                                const progress = getProgressPercent(project);
                                const color = getStatusColor(project.status || 'setup');
                                const isEditing = editingProjectId === project.id;

                                return (
                                    <tr key={project.id} onClick={() => handleProjectClick(project)}>
                                        <td>
                                            {isEditing ? (
                                                <div className="table-edit-form" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        ref={editInputRef}
                                                        type="text"
                                                        className="table-edit-input"
                                                        value={editingProjectName}
                                                        onChange={e => setEditingProjectName(e.target.value)}
                                                        onKeyDown={handleEditKeyDown}
                                                        disabled={isSubmitting}
                                                        maxLength={100}
                                                    />
                                                    <button
                                                        className="card-action-btn confirm"
                                                        onClick={handleUpdateProject}
                                                        disabled={isSubmitting || !editingProjectName.trim()}
                                                        title={t('project.save')}
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                    </button>
                                                    <button
                                                        className="card-action-btn cancel"
                                                        onClick={e => { e.stopPropagation(); handleCancelEdit(); }}
                                                        disabled={isSubmitting}
                                                        title={t('project.cancel')}
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="table-project-name">
                                                    {project.display_name || project.name.replace(/_/g, ' ')}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className="table-status-badge" style={{ background: color + '18', color, borderColor: color + '44' }}>
                                                <span className="table-status-dot" style={{ background: color }} />
                                                {t(`status.${project.status || 'setup'}`)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-progress">
                                                <div className="progress-track small">
                                                    <div className="progress-fill" style={{ width: `${progress}%`, background: color }} />
                                                </div>
                                                <span className="progress-pct">{progress}%</span>
                                            </div>
                                        </td>
                                        <td className="table-num">{project.document_count}</td>
                                        <td className="table-num">{project.requirement_count}</td>
                                        <td className="table-num">{project.qa_count}</td>
                                        <td className="table-date">{formatDate(project.updated_at || project.created_at)}</td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className="table-actions">
                                                <button
                                                    className="card-action-btn edit"
                                                    onClick={e => handleStartEditing(e, project)}
                                                    title={t('project.edit')}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    className="card-action-btn delete"
                                                    onClick={e => handleDeleteProject(e, project.id)}
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
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail modal */}
            {detailProject && (
                <ProjectDetailModal
                    project={detailProject}
                    onClose={() => setDetailProject(null)}
                />
            )}

            {/* Delete confirmation modal */}
            {deletingProjectId && (
                <div className="project-delete-overlay" onClick={() => setDeletingProjectId(null)}>
                    <div className="project-delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <h3>{t('project.confirm_delete')}</h3>
                        </div>
                        <p className="delete-modal-message">
                            {t('project.confirm_delete_message', {
                                name: projects.find(p => p.id === deletingProjectId)?.display_name
                            })}
                        </p>
                        <p className="delete-modal-warning">{t('project.delete_warning')}</p>
                        <div className="delete-modal-actions">
                            <button
                                className="delete-modal-btn cancel"
                                onClick={() => setDeletingProjectId(null)}
                                disabled={isSubmitting}
                            >
                                {t('project.cancel')}
                            </button>
                            <button
                                className="delete-modal-btn confirm"
                                onClick={handleConfirmDelete}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="loading-dot" />
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
