import React, { useState, useEffect } from 'react';
import './SidebarLayout.css';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useActiveSessions } from '../../hooks/useActiveSessions';
import { useSessionViewStore } from '../../stores/useSessionViewStore';

interface SidebarLayoutProps {
    children: React.ReactNode;
    activeView: string;
    onNavigate: (view: string) => void;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children, activeView, onNavigate }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { t, language, setLanguage } = useLanguageStore();
    const activeSessions = useActiveSessions();
    const markAsViewed = useSessionViewStore(state => state.markAsViewed);

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
                    <div className="sidebar-brand">Bideval AI</div>

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
        </div>
    );
};
