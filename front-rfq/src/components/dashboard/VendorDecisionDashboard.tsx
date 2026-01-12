import React, { useEffect, useState } from 'react';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { ScoringMatrix } from './tabs/ScoringMatrix';
import { ExecutiveView } from './tabs/ExecutiveView';
import './Dashboard.css';

type DashboardTab = 'executive' | 'scoring';

export const VendorDecisionDashboard: React.FC = () => {
    const { loadDashboardData, data, isLoading } = useDashboardStore();
    const { t } = useLanguageStore();
    const [activeTab, setActiveTab] = useState<DashboardTab>('executive');

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    if (isLoading || !data) {
        return (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <p>Loading Scoring Analysis...</p>
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
            </div>

            <div className="fade-in">
                {activeTab === 'executive' && <ExecutiveView />}
                {activeTab === 'scoring' && <ScoringMatrix />}
            </div>
        </div>
    );
};
