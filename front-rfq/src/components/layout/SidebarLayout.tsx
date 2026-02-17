import React, { useState, useEffect, useRef } from 'react';
import './SidebarLayout.css';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useActiveSessions } from '../../hooks/useActiveSessions';
import { useSessionViewStore } from '../../stores/useSessionViewStore';
import { TourProvider } from '../onboarding/TourProvider';
import { useOnboardingStore } from '../../stores/useOnboardingStore';
import { ProjectSelector } from '../common/ProjectSelector';
import { ProjectProgressStepper } from '../common/ProjectProgressStepper';
import { ProjectDetailModal } from '../common/ProjectDetailModal';
import { useQAStore } from '../../stores/useQAStore';
import { useProjectStore } from '../../stores/useProjectStore';


interface SidebarLayoutProps {
    children: React.ReactNode;
    activeView: string;
    onNavigate: (view: string) => void;
    onNewProject?: () => void;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children, activeView, onNavigate, onNewProject }) => {
    const activeProjectId = useProjectStore(state => state.activeProjectId);
    const projects = useProjectStore(state => state.projects);
    const currentProject = activeProjectId ? projects.find(p => p.id === activeProjectId) : null;
    const projectType = currentProject?.project_type || 'RFP';

    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        document.documentElement.style.setProperty(
            '--sidebar-current-width',
            isExpanded ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width-collapsed)'
        );
    }, [isExpanded]);

    const [showNotifications, setShowNotifications] = useState(false);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);
    const { t, language, setLanguage } = useLanguageStore();
    const activeSessions = useActiveSessions();
    const markAsViewed = useSessionViewStore(state => state.markAsViewed);
    const { resetTour, startTour, hasCompletedTour } = useOnboardingStore();
    const { notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead, deleteNotification, clearAllNotifications, loadNotifications } = useQAStore();

    // Fetch notifications on mount
    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    // Close notification dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const toggleSidebar = () => setIsExpanded(!isExpanded);

    // Marcar como visto cuando el usuario entra a una sección
    useEffect(() => {
        // Solo marcar como visto si es una de las secciones con sesiones
        if (['chat', 'communications', 'upload'].includes(activeView)) {
            markAsViewed(activeView);
        }
    }, [activeView, markAsViewed]);

    // Check if a module has unread content (not just any content)
    const hasActiveSession = (module: string): boolean => {
        return activeSessions.some(s => s.module === module && s.hasUnreadContent);
    };

    const NavItem = ({ view, labelKey, icon, disabled, labelParams }: { view: string, labelKey: string, icon: React.ReactNode, disabled?: boolean, labelParams?: Record<string, string> }) => {
        const hasSession = hasActiveSession(view);

        return (
            <button
                className={`nav-item ${activeView === view ? 'active' : ''} ${hasSession ? 'has-session' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && onNavigate(view)}
                title={!isExpanded ? t(labelKey, labelParams) : disabled ? (language === 'es' ? 'Selecciona un proyecto primero' : 'Select a project first') : ''}
                data-tour={`nav-${view}`}
            >
                <div className="nav-icon">{icon}</div>
                <span className="nav-label">{t(labelKey, labelParams)}</span>
                {hasSession && <div className="session-indicator" title="Active session"></div>}
            </button>
        );
    };

    return (
        <div className="app-container-sidebar">
            {/* Sidebar */}
            <aside className={`sidebar ${isExpanded ? 'expanded' : ''}`}>
                <div className="sidebar-header">
                    {/* Brand Logo or Text - Hidden when collapsed */}
                    <div className="sidebar-brand"><span style={{ color: 'var(--text-primary)' }}>Bid</span><span style={{ color: '#12b5b0' }}>Eval</span></div>

                    {/* Toggle Button */}
                    <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="9" y1="3" x2="9" y2="21"></line>
                        </svg>
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {/* General section */}
                    <NavItem
                        view="home"
                        labelKey="nav.home"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
                    />
                    <NavItem
                        view="projects-status"
                        labelKey="sidebar.projects_list"
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                        }
                    />

                    {/* Active project section */}
                    <div className="nav-section-divider" />
                    <NavItem
                        view="upload"
                        labelKey="nav.upload"
                        labelParams={{ type: projectType }}
                        disabled={!currentProject}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                    />
                    <NavItem
                        view="table"
                        labelKey="nav.table"
                        disabled={!currentProject}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18v16H3V4zm0 5h18M3 14h18M9 4v16M15 4v16" /></svg>}
                    />
                    <NavItem
                        view="qa"
                        labelKey="nav.qa"
                        disabled={!currentProject}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                    <NavItem
                        view="decision"
                        labelKey="nav.decision"
                        disabled={!currentProject}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                    />
                    {projectType !== 'RFI' && (
                        <NavItem
                            view="economic"
                            labelKey="nav.economic"
                            disabled={!currentProject}
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                            }
                        />
                    )}
                    <NavItem
                        view="communications"
                        labelKey="nav.communications"
                        disabled={!currentProject}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>}
                    />

                    {/* Tools section */}
                    <div className="nav-section-divider" />
                    <NavItem
                        view="chat"
                        labelKey="nav.chat"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
                    />
                    <NavItem
                        view="rfp-gen"
                        labelKey="nav.rfp_generator"
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <path d="M12 18v-6" />
                                <path d="M9 15l3-3 3 3" />
                            </svg>
                        }
                    />
                    <NavItem
                        view="suppliers"
                        labelKey="nav.suppliers"
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        }
                    />
                </nav>

                <div className="sidebar-footer">
                    <div className="footer-content">
                        <span className="version-badges">{t('nav.footer')}</span>
                    </div>
                    {/* Tour Help Button */}
                    {hasCompletedTour && (
                        <button
                            className="tour-help-btn-footer"
                            onClick={() => {
                                resetTour();
                                setTimeout(() => startTour(), 100);
                            }}
                            title={t('tour.btn.restart')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                        </button>
                    )}
                </div>
            </aside>
            {/* Project Detail Modal */}
            {showProjectModal && currentProject && (
                <ProjectDetailModal
                    project={currentProject}
                    onClose={() => setShowProjectModal(false)}
                />
            )}

            {/* Main Content Area */}
            <div className={`main-content ${isExpanded ? 'expanded-margin' : ''}`}>
                <header className="top-header">
                    <div className="top-header-left">
                        {/* Mobile Menu Toggle */}
                        <button
                            className="mobile-menu-btn"
                            onClick={toggleSidebar}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                padding: '8px',
                                marginRight: '8px',
                                cursor: 'pointer',
                                display: 'none' // Hidden by default, shown via CSS media query
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>

                        {/* Global Project Selector */}
                        <ProjectSelector onNewProject={onNewProject} />

                        {/* Progress Stepper */}
                        {currentProject && (
                            <ProjectProgressStepper
                                project={currentProject}
                                onClick={() => setShowProjectModal(true)}
                            />
                        )}

                        {/* Global Processing Indicator removed - was adding noise to the header */}
                    </div>

                    <div className="header-actions">
                        <button
                            className="btn-icon language-btn"
                            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
                            title={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 10px',
                                borderRadius: '12px',
                                background: 'var(--bg-surface-alt)',
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                transition: 'all 0.2s ease',
                                height: '32px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--bg-hover)';
                                e.currentTarget.style.borderColor = 'var(--text-secondary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--bg-surface-alt)';
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                            {language === 'es' ? 'ES' : 'EN'}
                        </button>

                        {/* Notification Bell */}
                        <div ref={notificationRef} style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                title={t('notifications.title') || 'Notifications'}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '12px',
                                    background: 'var(--bg-surface-alt)',
                                    border: '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    color: 'var(--text-primary)',
                                    transition: 'all 0.2s ease',
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-hover)';
                                    e.currentTarget.style.borderColor = 'var(--text-secondary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-surface-alt)';
                                    e.currentTarget.style.borderColor = 'var(--border-color)';
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                </svg>
                                {unreadNotificationCount > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        background: '#ef4444',
                                        color: 'white',
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '2px solid var(--bg-surface)'
                                    }}>
                                        {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '8px',
                                    width: '360px',
                                    maxHeight: '480px',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '12px',
                                    boxShadow: 'var(--shadow-lg)',
                                    zIndex: 1000,
                                    overflow: 'hidden'
                                }}>
                                    {/* Header */}
                                    <div style={{
                                        padding: '14px 16px',
                                        borderBottom: '1px solid var(--border-color)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                            {t('notifications.title') || 'Notifications'}
                                        </span>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {unreadNotificationCount > 0 && (
                                                <button
                                                    onClick={() => markAllNotificationsRead()}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--color-cyan)',
                                                        fontSize: '0.8rem',
                                                        cursor: 'pointer',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        transition: 'background 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(18, 181, 176, 0.1)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                >
                                                    {t('notifications.markAllRead') || 'Mark all as read'}
                                                </button>
                                            )}
                                            {notifications.length > 0 && (
                                                <button
                                                    onClick={() => clearAllNotifications()}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        fontSize: '0.8rem',
                                                        cursor: 'pointer',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        transition: 'background 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                >
                                                    {t('notifications.clearAll') || 'Clear all'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Notification List */}
                                    <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                                        {notifications.length === 0 ? (
                                            <div style={{
                                                padding: '40px 20px',
                                                textAlign: 'center',
                                                color: 'var(--text-tertiary)'
                                            }}>
                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: '12px' }}>
                                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                                </svg>
                                                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                                    {t('notifications.empty') || 'No notifications yet'}
                                                </p>
                                            </div>
                                        ) : (
                                            notifications.slice(0, 10).map((notification) => (
                                                <div
                                                    key={notification.id}
                                                    onClick={() => {
                                                        if (!notification.is_read) {
                                                            markNotificationRead(notification.id);
                                                        }
                                                        // Navigate to Q&A if it's a supplier response
                                                        if (notification.notification_type === 'supplier_responded') {
                                                            onNavigate('qa');
                                                            setShowNotifications(false);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '14px 16px',
                                                        borderBottom: '1px solid var(--border-color)',
                                                        cursor: 'pointer',
                                                        background: notification.is_read ? 'transparent' : 'rgba(18, 181, 176, 0.05)',
                                                        transition: 'background 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = notification.is_read ? 'transparent' : 'rgba(18, 181, 176, 0.05)'}
                                                >
                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                                        {/* Icon */}
                                                        <div style={{
                                                            width: '36px',
                                                            height: '36px',
                                                            borderRadius: '10px',
                                                            background: notification.notification_type === 'supplier_responded'
                                                                ? 'rgba(65, 209, 122, 0.15)'
                                                                : notification.notification_type === 'questions_sent'
                                                                    ? 'rgba(59, 130, 246, 0.15)'
                                                                    : 'rgba(251, 191, 36, 0.15)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0
                                                        }}>
                                                            {notification.notification_type === 'supplier_responded' ? (
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#41d17a" strokeWidth="2">
                                                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                                </svg>
                                                            ) : notification.notification_type === 'questions_sent' ? (
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                                                                    <path d="M22 2L11 13"></path>
                                                                    <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                                                                </svg>
                                                            ) : (
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                                                                    <path d="M12 20h9"></path>
                                                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                                                </svg>
                                                            )}
                                                        </div>

                                                        {/* Content */}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{
                                                                fontWeight: notification.is_read ? 500 : 600,
                                                                fontSize: '0.875rem',
                                                                color: 'var(--text-primary)',
                                                                marginBottom: '4px'
                                                            }}>
                                                                {notification.title}
                                                            </div>
                                                            {notification.message && (
                                                                <div style={{
                                                                    fontSize: '0.8rem',
                                                                    color: 'var(--text-secondary)',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis'
                                                                }}>
                                                                    {notification.message}
                                                                </div>
                                                            )}
                                                            <div style={{
                                                                fontSize: '0.7rem',
                                                                color: 'var(--text-tertiary)',
                                                                marginTop: '6px'
                                                            }}>
                                                                {new Date(notification.created_at).toLocaleString(language === 'es' ? 'es-ES' : 'en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Unread indicator and delete button */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                            {!notification.is_read && (
                                                                <div style={{
                                                                    width: '8px',
                                                                    height: '8px',
                                                                    borderRadius: '50%',
                                                                    background: 'var(--color-cyan)',
                                                                    marginTop: '2px'
                                                                }}></div>
                                                            )}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteNotification(notification.id);
                                                                }}
                                                                title={t('notifications.delete') || 'Delete'}
                                                                style={{
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    color: 'var(--text-tertiary)',
                                                                    cursor: 'pointer',
                                                                    padding: '4px',
                                                                    borderRadius: '4px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    transition: 'all 0.2s',
                                                                    opacity: 0.6
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                                    e.currentTarget.style.color = '#ef4444';
                                                                    e.currentTarget.style.opacity = '1';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.background = 'transparent';
                                                                    e.currentTarget.style.color = 'var(--text-tertiary)';
                                                                    e.currentTarget.style.opacity = '0.6';
                                                                }}
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>



                        <div style={{ flex: 1 }}></div>
                        <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 8px' }}></div>
                        <ThemeToggle />
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-secondary)', color: 'white', display: 'grid', placeItems: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                    </div>
                </header>

                <main className="content-wrapper">
                    <div className="fade-in">
                        {children}
                    </div>
                </main>
            </div>

            {/* Onboarding Tour */}
            <TourProvider onNavigate={onNavigate} />
        </div >
    );
};
