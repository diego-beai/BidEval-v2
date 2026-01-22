import React, { useState, useEffect, useRef } from 'react';
import './SidebarLayout.css';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useActiveSessions } from '../../hooks/useActiveSessions';
import { useSessionViewStore } from '../../stores/useSessionViewStore';
import { TourProvider } from '../onboarding/TourProvider';
import { useOnboardingStore } from '../../stores/useOnboardingStore';
import { ProjectSelector } from '../common/ProjectSelector';
import { useRfqStore } from '../../stores/useRfqStore';
import { useQAStore } from '../../stores/useQAStore';

interface SidebarLayoutProps {
    children: React.ReactNode;
    activeView: string;
    onNavigate: (view: string) => void;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children, activeView, onNavigate }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);
    const { t, language, setLanguage } = useLanguageStore();
    const activeSessions = useActiveSessions();
    const markAsViewed = useSessionViewStore(state => state.markAsViewed);
    const { resetTour, startTour, hasCompletedTour } = useOnboardingStore();
    const { isProcessing, processingFileCount, processingStartTime } = useRfqStore();
    const { notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead, loadNotifications } = useQAStore();
    const [elapsedTime, setElapsedTime] = useState(0);

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

    // Update elapsed time every second when processing
    useEffect(() => {
        if (isProcessing && processingStartTime) {
            const interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - processingStartTime) / 1000));
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setElapsedTime(0);
        }
    }, [isProcessing, processingStartTime]);

    // Format elapsed time as MM:SS
    const formatElapsedTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    const toggleSidebar = () => setIsExpanded(!isExpanded);

    // Marcar como visto cuando el usuario entra a una sección
    useEffect(() => {
        // Solo marcar como visto si es una de las secciones con sesiones
        if (['chat', 'mail', 'upload'].includes(activeView)) {
            markAsViewed(activeView);
        }
    }, [activeView, markAsViewed]);

    // Check if a module has unread content (not just any content)
    const hasActiveSession = (module: string): boolean => {
        return activeSessions.some(s => s.module === module && s.hasUnreadContent);
    };

    const keyMap: Record<string, string> = {
        'home': 'header.home',
        'upload': 'header.upload',
        'table': 'header.table',
        'qa': 'header.qa',
        'decision': 'header.decision',
        'chat': 'header.chat',
        'mail': 'header.mail'
    };

    const NavItem = ({ view, labelKey, icon }: { view: string, labelKey: string, icon: React.ReactNode }) => {
        const hasSession = hasActiveSession(view);

        return (
            <button
                className={`nav-item ${activeView === view ? 'active' : ''} ${hasSession ? 'has-session' : ''}`}
                onClick={() => onNavigate(view)}
                title={!isExpanded ? t(labelKey) : ''}
                data-tour={`nav-${view}`}
            >
                <div className="nav-icon">{icon}</div>
                <span className="nav-label">{t(labelKey)}</span>
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
                    <div className="sidebar-brand"><span style={{ color: '#ffffff' }}>Bid</span><span style={{ color: '#12b5b0' }}>Eval</span></div>

                    {/* Toggle Button */}
                    <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="9" y1="3" x2="9" y2="21"></line>
                        </svg>
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <NavItem
                        view="home"
                        labelKey="nav.home"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
                    />
                    <NavItem
                        view="upload"
                        labelKey="nav.upload"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                    />
                    <NavItem
                        view="table"
                        labelKey="nav.table"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18v16H3V4zm0 5h18M3 14h18M9 4v16M15 4v16" /></svg>}
                    />
                    <NavItem
                        view="qa"
                        labelKey="nav.qa"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                    <NavItem
                        view="decision"
                        labelKey="nav.decision"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                    />
                    <NavItem
                        view="chat"
                        labelKey="nav.chat"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
                    />
                    <NavItem
                        view="mail"
                        labelKey="nav.mail"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
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

                        <h2 className="page-title">
                            {t(keyMap[activeView] || 'header.home')}
                        </h2>

                        {/* Global Project Selector */}
                        <div style={{ marginLeft: '16px' }}>
                            <ProjectSelector />
                        </div>

                        {/* Global Processing Indicator - shows when processing proposals */}
                        {isProcessing && (
                            <button
                                onClick={() => onNavigate('upload')}
                                style={{
                                    marginLeft: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 14px',
                                    background: 'rgba(18, 181, 176, 0.1)',
                                    border: '1px solid rgba(18, 181, 176, 0.3)',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    animation: 'pulse-glow 2s ease-in-out infinite'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(18, 181, 176, 0.2)';
                                    e.currentTarget.style.borderColor = 'rgba(18, 181, 176, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(18, 181, 176, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(18, 181, 176, 0.3)';
                                }}
                                title={t('sidebar.click_view_status')}
                            >
                                {/* Spinner */}
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    border: '2px solid rgba(18, 181, 176, 0.3)',
                                    borderTopColor: '#12b5b0',
                                    animation: 'spin 0.8s linear infinite'
                                }}></div>

                                {/* Text */}
                                <span style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: '#12b5b0',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {t('sidebar.processing_files').replace('{count}', processingFileCount.toString())}
                                </span>

                                {/* Elapsed time */}
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: '#12b5b0',
                                    background: 'rgba(18, 181, 176, 0.15)',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontFamily: 'monospace'
                                }}>
                                    {formatElapsedTime(elapsedTime)}
                                </span>
                            </button>
                        )}
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

                                                        {/* Unread indicator */}
                                                        {!notification.is_read && (
                                                            <div style={{
                                                                width: '8px',
                                                                height: '8px',
                                                                borderRadius: '50%',
                                                                background: 'var(--color-cyan)',
                                                                flexShrink: 0,
                                                                marginTop: '6px'
                                                            }}></div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 8px' }}></div>
                        <ThemeToggle />
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-secondary)', color: 'white', display: 'grid', placeItems: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                            D
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
        </div>
    );
};
