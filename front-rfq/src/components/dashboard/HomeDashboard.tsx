import React from 'react';
import { useRfqStore } from '../../stores/useRfqStore';
import { useLanguageStore } from '../../stores/useLanguageStore';

interface HomeDashboardProps {
    onNavigate: (view: string) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigate }) => {
    const { results } = useRfqStore();
    const { t } = useLanguageStore();

    const metrics = {
        totalPropuestas: results ? results.length : 24,
        activeRfqs: 12,
        completedToday: 8,
        avgProcessingTime: '2.4h',
        providers: ['Técnicas Reunidas', 'IDOM', 'SACYR', 'Worley', 'SENER'],
        recentActivity: {
            lastUpload: '2 hours ago',
            pendingReviews: 3,
            activeDecisions: 2
        },
        systemHealth: {
            accuracyRate: 98.5,
            automationLevel: 94,
            totalProcessed: 156
        }
    };

    return (
        <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Hero Section */}
            <div style={{
                background: 'linear-gradient(135deg, var(--color-primary), #0d9488)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px 32px',
                color: 'white',
                boxShadow: '0 8px 24px rgba(18, 181, 176, 0.2)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative background elements */}
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '200px',
                    height: '200px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    filter: 'blur(40px)'
                }}></div>
                <div style={{
                    position: 'absolute',
                    bottom: '-30px',
                    left: '-30px',
                    width: '150px',
                    height: '150px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '50%',
                    filter: 'blur(30px)'
                }}></div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h1 style={{ margin: '0 0 12px 0', fontSize: '2rem', fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        {t('home.hero.title')}
                    </h1>
                    <p style={{ margin: 0, opacity: 0.95, maxWidth: '650px', lineHeight: '1.6', fontSize: '1.05rem' }}>
                        {t('home.hero.desc')}
                    </p>
                    <div style={{ marginTop: '28px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                            className="btn"
                            style={{
                                background: 'white',
                                color: 'var(--color-primary)',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 600,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                transition: 'all 0.2s'
                            }}
                            onClick={() => onNavigate('upload')}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            {t('home.hero.btn_new')}
                        </button>
                        <button
                            className="btn"
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.3)',
                                backdropFilter: 'blur(8px)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                            onClick={() => onNavigate('decision')}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            {t('home.hero.btn_reports')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
                <DashboardCard
                    title="Total Processed"
                    value={metrics.systemHealth.totalProcessed.toString()}
                    trend="+24 this week"
                    icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                    }
                    color="var(--color-primary)"
                />
                <DashboardCard
                    title="Active RFQs"
                    value={metrics.activeRfqs.toString()}
                    trend="Processing"
                    icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    }
                    color="#f59e0b"
                />
                <DashboardCard
                    title="AI Accuracy"
                    value={`${metrics.systemHealth.accuracyRate}%`}
                    trend="Excellent performance"
                    icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                            <path d="M2 17l10 5 10-5"></path>
                            <path d="M2 12l10 5 10-5"></path>
                        </svg>
                    }
                    color="var(--color-cyan)"
                />
                <DashboardCard
                    title="Automation"
                    value={`${metrics.systemHealth.automationLevel}%`}
                    trend="Very high"
                    icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"></path>
                        </svg>
                    }
                    color="#8b5cf6"
                />
            </div>

            {/* Quick Stats Row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                padding: '24px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                        Average Time
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {metrics.avgProcessingTime}
                    </div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                        Completed Today
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-cyan)' }}>
                        {metrics.completedToday}
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                        Active Providers
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>
                        {metrics.providers.length}
                    </div>
                </div>
            </div>


            {/* Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '24px' }}>
                <div className="card" style={{
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.3s'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {t('home.chart.evaluations_by_provider')}
                            </h3>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {t('home.chart.distribution')}
                            </span>
                        </div>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-cyan)',
                            opacity: 0.8
                        }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="20" x2="18" y2="10"></line>
                                <line x1="12" y1="20" x2="12" y2="4"></line>
                                <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                        </div>
                    </div>

                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-around',
                        height: '240px',
                        paddingBottom: '16px',
                        borderBottom: '2px solid var(--border-color)',
                        gap: '12px'
                    }}>
                        <StackedBar
                            provider="Técnicas Reunidas"
                            evaluations={[
                                { type: 'Technical', score: 9.2, color: 'rgba(20, 184, 166, 0.8)' },
                                { type: 'Economical', score: 8.1, color: 'rgba(245, 158, 11, 0.8)' },
                                { type: 'Pre-FEED', score: 8.8, color: 'rgba(59, 130, 246, 0.8)' },
                                { type: 'FEED', score: 7.5, color: 'rgba(139, 92, 246, 0.8)' }
                            ]}
                        />
                        <StackedBar
                            provider="IDOM"
                            evaluations={[
                                { type: 'Technical', score: 8.5, color: 'rgba(20, 184, 166, 0.8)' },
                                { type: 'Economical', score: 9.2, color: 'rgba(245, 158, 11, 0.8)' },
                                { type: 'Pre-FEED', score: 8.2, color: 'rgba(59, 130, 246, 0.8)' },
                                { type: 'FEED', score: 8.0, color: 'rgba(139, 92, 246, 0.8)' }
                            ]}
                        />
                        <StackedBar
                            provider="SACYR"
                            evaluations={[
                                { type: 'Technical', score: 7.8, color: 'rgba(20, 184, 166, 0.8)' },
                                { type: 'Economical', score: 7.5, color: 'rgba(245, 158, 11, 0.8)' },
                                { type: 'Pre-FEED', score: 8.5, color: 'rgba(59, 130, 246, 0.8)' },
                                { type: 'FEED', score: 7.0, color: 'rgba(139, 92, 246, 0.8)' }
                            ]}
                        />
                        <StackedBar
                            provider="Worley"
                            evaluations={[
                                { type: 'Technical', score: 9.0, color: 'rgba(20, 184, 166, 0.8)' },
                                { type: 'Economical', score: 7.2, color: 'rgba(245, 158, 11, 0.8)' },
                                { type: 'Pre-FEED', score: 9.2, color: 'rgba(59, 130, 246, 0.8)' },
                                { type: 'FEED', score: 8.8, color: 'rgba(139, 92, 246, 0.8)' }
                            ]}
                        />
                        <StackedBar
                            provider="SENER"
                            evaluations={[
                                { type: 'Technical', score: 8.2, color: 'rgba(20, 184, 166, 0.8)' },
                                { type: 'Economical', score: 8.8, color: 'rgba(245, 158, 11, 0.8)' },
                                { type: 'Pre-FEED', score: 8.0, color: 'rgba(59, 130, 246, 0.8)' },
                                { type: 'FEED', score: 7.8, color: 'rgba(139, 92, 246, 0.8)' }
                            ]}
                        />
                    </div>

                    {/* Legend */}
                    <div style={{
                        marginTop: '24px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '16px',
                        justifyContent: 'center'
                    }}>
                        <LegendItem color="rgba(20, 184, 166, 0.8)" label="Technical" />
                        <LegendItem color="rgba(245, 158, 11, 0.8)" label="Economical" />
                        <LegendItem color="rgba(59, 130, 246, 0.8)" label="Pre-FEED" />
                        <LegendItem color="rgba(139, 92, 246, 0.8)" label="FEED" />
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="card" style={{
                    padding: '0',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '28px 24px',
                        borderBottom: '1px solid var(--border-color)',
                        background: 'var(--bg-surface-alt)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {t('home.activity.title')}
                            </h3>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Recent activity
                            </span>
                        </div>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-info)',
                            opacity: 0.8
                        }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div style={{ padding: '0' }}>
                        <ActivityItem
                            title={`${t('home.activity.offer_received')} - Técnicas Reunidas`}
                            desc={t('home.activity.offer_desc')}
                            time={t('home.activity.ago_2h')}
                            type="success"
                        />
                        <ActivityItem
                            title={t('home.activity.alert')}
                            desc={`IDOM ${t('home.activity.alert_desc')}`}
                            time={t('home.activity.ago_5h')}
                            type="warning"
                        />
                        <ActivityItem
                            title={t('home.activity.created')}
                            desc={t('home.activity.created_desc')}
                            time={t('home.activity.yesterday')}
                            type="info"
                        />
                        <ActivityItem
                            title={`Diego - ${t('home.activity.user')}`}
                            desc="Log"
                            time={t('home.activity.yesterday')}
                            type="neutral"
                        />
                    </div>
                </div>

            </div>

        </div >
    );
};

// Sub-components for cleaner internal code
const DashboardCard = ({ title, value, trend, icon, color }: any) => {
    const [isHovered, setIsHovered] = React.useState(false);
    return (
        <div
            className="stat-card"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                cursor: 'pointer'
            }}
        >
            {/* Decorative gradient background */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
                opacity: isHovered ? 1 : 0.5,
                transition: 'opacity 0.3s'
            }}></div>

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                    <div style={{ flex: 1 }}>
                        <span style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            {title}
                        </span>
                        <div style={{
                            fontSize: '2.25rem',
                            fontWeight: 700,
                            margin: '12px 0 4px 0',
                            color: 'var(--text-primary)',
                            lineHeight: 1
                        }}>
                            {value}
                        </div>
                    </div>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        position: 'relative',
                        color: color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0deg)',
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: color,
                            opacity: 0.12,
                            borderRadius: 'inherit'
                        }} />
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex' }}>
                            {icon}
                        </div>
                    </div>
                </div>
                <div style={{
                    fontSize: '0.875rem',
                    color: color,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                        <polyline points="17 6 23 6 23 12"></polyline>
                    </svg>
                    {trend}
                </div>
            </div>
        </div>
    );
};


const ActivityItem = ({ title, desc, time, type }: any) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const colors: any = {
        success: 'var(--color-cyan)',
        warning: '#f59e0b',
        info: '#3b82f6',
        neutral: '#64748b'
    };

    const icons: any = {
        success: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        ),
        warning: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
        ),
        info: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
        ),
        neutral: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"></circle>
            </svg>
        )
    };

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                padding: '18px 24px',
                display: 'flex',
                gap: '16px',
                borderBottom: '1px solid var(--border-color)',
                alignItems: 'center',
                background: isHovered ? 'var(--bg-hover)' : 'transparent',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
            }}
        >
            <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: `${colors[type] || colors.neutral}20`,
                color: colors[type] || colors.neutral,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.3s',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)'
            }}>
                {icons[type] || icons.neutral}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {title}
                </div>
                <div style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {desc}
                </div>
            </div>
            <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-tertiary)',
                whiteSpace: 'nowrap',
                fontWeight: 500,
                padding: '4px 8px',
                background: 'var(--bg-surface-alt)',
                borderRadius: '6px'
            }}>
                {time}
            </div>
        </div>
    );
};

const StackedBar = ({ provider, evaluations }: {
    provider: string,
    evaluations: { type: string, score: number, color: string }[]
}) => {
    const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
    const [isBarHovered, setIsBarHovered] = React.useState(false);

    // Max score per category is 10, total max (if stacked) is 40
    const maxPossible = 40;

    return (
        <div
            onMouseEnter={() => setIsBarHovered(true)}
            onMouseLeave={() => {
                setIsBarHovered(false);
                setHoveredIdx(null);
            }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                height: '100%',
                justifyContent: 'flex-end',
                cursor: 'pointer',
                transition: 'all 0.3s',
                flex: 1,
                minWidth: '40px',
                maxWidth: '60px'
            }}
        >
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {/* Custom Tooltip */}
                {isBarHovered && hoveredIdx !== null && (
                    <div style={{
                        position: 'absolute',
                        top: '-70px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        zIndex: 100,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        animation: 'fadeInUp 0.2s ease-out'
                    }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: evaluations[hoveredIdx].color, marginBottom: '2px' }}>
                            {evaluations[hoveredIdx].type}
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {evaluations[hoveredIdx].score.toFixed(1)}/10
                        </div>
                        <div style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid var(--border-color)' }}></div>
                    </div>
                )}

                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column-reverse', // Stack from bottom
                    justifyContent: 'flex-start',
                    borderRadius: '8px 8px 0 0',
                    overflow: 'hidden',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: isBarHovered ? 'scaleX(1.1) translateY(-8px)' : 'scaleX(1)',
                    boxShadow: isBarHovered ? '0 12px 28px rgba(0,0,0,0.2)' : 'none',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(4px)'
                }}>
                    {evaluations.map((ev, i) => (
                        <div
                            key={i}
                            onMouseEnter={() => setHoveredIdx(i)}
                            style={{
                                height: `${(ev.score / maxPossible) * 100}%`,
                                background: ev.color,
                                opacity: hoveredIdx === null || hoveredIdx === i ? 1 : 0.4,
                                transition: 'all 0.2s',
                                borderTop: i < evaluations.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    ))}
                </div>
            </div>

            <span style={{
                fontSize: '0.75rem',
                color: isBarHovered ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isBarHovered ? 700 : 500,
                textAlign: 'center',
                lineHeight: '1.2',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
            }}>
                {provider.split(' ')[0]}
            </span>
        </div>
    );
};

const LegendItem = ({ color, label }: any) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 8px',
        background: 'var(--bg-surface)',
        borderRadius: '6px',
        border: '1px solid var(--border-color)'
    }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color }}></div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
        <style>{`
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        `}</style>
    </div>
);

