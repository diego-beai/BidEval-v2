import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import './Dashboard.css';

// Lazy-load heavy tab components (ExecutiveView uses Recharts ~200KB, ScoringMatrix has wizard)
const ExecutiveView = lazy(() => import('./tabs/ExecutiveView').then(m => ({ default: m.ExecutiveView })));
const ScoringMatrix = lazy(() => import('./tabs/ScoringMatrix').then(m => ({ default: m.ScoringMatrix })));
const BoardReport = lazy(() => import('./tabs/BoardReport'));

type DashboardTab = 'executive' | 'scoring' | 'board';

export const VendorDecisionDashboard: React.FC = () => {
    const { loadDashboardData, data, isLoading } = useDashboardStore();
    const { t } = useLanguageStore();
    const [activeTab, setActiveTab] = useState<DashboardTab>('executive');

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    if (isLoading || !data) {
        return (
            <div className="dashboard-container" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                gap: '24px'
            }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: '4px solid var(--border-color)',
                    borderTopColor: 'var(--color-primary)',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '1rem',
                    fontWeight: 500
                }}>
                    {t('dashboard.loading')}
                </p>
                <style>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-tabs">
                <button
                    className={`dashboard-tab ${activeTab === 'executive' ? 'active' : ''}`}
                    onClick={() => setActiveTab('executive')}
                >
                    {t('dashboard.tab.executive')}
                </button>
                <button
                    className={`dashboard-tab ${activeTab === 'scoring' ? 'active' : ''}`}
                    onClick={() => setActiveTab('scoring')}
                >
                    {t('dashboard.tab.scoring')}
                </button>
                <button
                    className={`dashboard-tab ${activeTab === 'board' ? 'active' : ''}`}
                    onClick={() => setActiveTab('board')}
                >
                    {t('dashboard.tab.board')}
                </button>
            </div>

            <div className="fade-in">
                <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>}>
                    {activeTab === 'executive' && <ExecutiveView />}
                    {activeTab === 'scoring' && <ScoringMatrix />}
                    {activeTab === 'board' && <BoardReport />}
                </Suspense>
            </div>
        </div>
    );
};
