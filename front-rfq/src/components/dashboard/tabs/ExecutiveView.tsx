import React from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
    PieChart, Pie
} from 'recharts';
import { useDashboardStore } from '../../../stores/useDashboardStore';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { PROVIDER_COLORS } from '../../../config/constants';

export const ExecutiveView: React.FC = () => {
    const { data } = useDashboardStore();
    const { t } = useLanguageStore();

    if (!data) return <div>Loading...</div>;

    // --- 1. Calculate Overall Scores (Bar Chart) ---
    const providerScores = data.providers.map(p => {
        let score = 0;
        p.responses.forEach(r => {
            const req = data.requirements.find(req => req.id === r.req_id);
            if (req) {
                score += (r.user_score ?? r.auto_score) * req.weight;
            }
        });
        return { ...p, score };
    });

    const sortedProviders = [...providerScores].sort((a, b) => b.score - a.score);
    const winner = sortedProviders[0];
    const runnerUp = sortedProviders[1];
    const thirdPlace = sortedProviders[2];

    // --- 2. Prepare Radar Data (Category Averages) ---
    const categories = Array.from(new Set(data.requirements.map(r => r.category)));

    // Calculate category scores for winner
    const winnerCategoryScores = categories.map(cat => {
        const reqs = data.requirements.filter(r => r.category === cat);
        const winnerProvider = data.providers.find(p => p.id === winner.id);
        if (!winnerProvider || reqs.length === 0) return { category: cat, score: 0, maxScore: 0 };

        const rawSum = reqs.reduce((sum, r) => {
            const resp = winnerProvider.responses.find(res => res.req_id === r.id);
            return sum + ((resp?.user_score ?? resp?.auto_score) || 0);
        }, 0);
        const maxScore = reqs.length * 10;
        return { category: cat, score: parseFloat(rawSum.toFixed(2)), maxScore };
    });

    // Identify strengths and weaknesses
    const strengths = winnerCategoryScores
        .filter(c => c.score / c.maxScore >= 0.8)
        .map(c => c.category);

    const weaknesses = winnerCategoryScores
        .filter(c => c.score / c.maxScore < 0.6)
        .map(c => c.category)

;

    // Calculate score gap
    const scoreGap = winner.score - runnerUp.score;

    const radarData = categories.map(cat => {
        const entry: any = { subject: cat };
        data.providers.forEach(p => {
            const reqs = data.requirements.filter(r => r.category === cat);
            if (reqs.length === 0) {
                entry[p.id] = 0;
                return;
            }
            const rawSum = reqs.reduce((sum, r) => {
                const resp = p.responses.find(res => res.req_id === r.id);
                return sum + ((resp?.user_score ?? resp?.auto_score) || 0);
            }, 0);
            const avg = rawSum / reqs.length;
            entry[p.id] = parseFloat(avg.toFixed(2));
        });
        return entry;
    });

    // Helper for colors
    const getColor = (id: string, index: number) => {
        // Try direct lookup or fallback
        // @ts-ignore
        const defined = PROVIDER_COLORS[id] || PROVIDER_COLORS[Object.keys(PROVIDER_COLORS).find(k => k === id)];
        if (defined) return defined;

        const fallbacks = ['#12b5b0', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];
        return fallbacks[index % fallbacks.length];
    };

    return (
        <div className="executive-layout">

            {/* Top Section: Winner & Stats */}
            <div style={{ gridColumn: '1 / -1', marginBottom: '32px' }}>
                <div style={{
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-cyan))',
                    borderRadius: 'var(--radius-lg)',
                    padding: '40px 32px',
                    color: 'white',
                    boxShadow: '0 12px 28px rgba(18, 181, 176, 0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: 'fadeInScale 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                    {/* Decorative elements */}
                    <div style={{
                        position: 'absolute',
                        top: '-80px',
                        right: '-80px',
                        width: '250px',
                        height: '250px',
                        background: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '50%',
                        filter: 'blur(50px)'
                    }}></div>
                    <div style={{
                        position: 'absolute',
                        bottom: '-60px',
                        left: '-60px',
                        width: '200px',
                        height: '200px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '50%',
                        filter: 'blur(40px)'
                    }}></div>

                    <div style={{
                        position: 'relative',
                        zIndex: 1
                    }}>
                        {/* Main Winner Section */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '32px',
                            flexWrap: 'wrap',
                            marginBottom: '32px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, minWidth: '300px' }}>
                                {/* Award Icon */}
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.25)',
                                    backdropFilter: 'blur(10px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="8" r="7"></circle>
                                        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                                    </svg>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: '0.9rem',
                                        fontWeight: 500,
                                        opacity: 0.95,
                                        marginBottom: '8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>
                                        {t('executive.winner')}
                                    </div>
                                    <h2 style={{
                                        margin: 0,
                                        fontSize: '2rem',
                                        fontWeight: 700,
                                        textShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                    }}>
                                        {winner.name}
                                    </h2>
                                    <div style={{
                                        marginTop: '12px',
                                        padding: '8px 16px',
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        borderRadius: '8px',
                                        display: 'inline-block',
                                        backdropFilter: 'blur(10px)',
                                        fontSize: '0.9rem',
                                        fontWeight: 600
                                    }}>
                                        Score: <span style={{ fontSize: '1.3rem', marginLeft: '8px' }}>{winner.score.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                style={{
                                    background: 'white',
                                    color: 'var(--color-primary)',
                                    border: 'none',
                                    padding: '16px 32px',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                                onClick={() => {
                                    if (window.confirm(`${t('executive.award')} ${winner.name}?`)) {
                                        alert(`Contract awarded to ${winner.name}! \nTotal Score: ${winner.score.toFixed(2)}`);
                                    }
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M9 11l3 3L22 4"></path>
                                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                                </svg>
                                {t('executive.award')}
                            </button>
                        </div>

                        {/* Winner Analysis Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '16px',
                            marginTop: '24px'
                        }}>
                            {/* Lead Margin */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                <div style={{
                                    fontSize: '0.8rem',
                                    opacity: 0.9,
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Lead Margin vs {runnerUp.name}
                                </div>
                                <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 700
                                }}>
                                    +{scoreGap.toFixed(2)} pts
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    opacity: 0.8,
                                    marginTop: '4px'
                                }}>
                                    {((scoreGap / runnerUp.score) * 100).toFixed(1)}% advantage
                                </div>
                            </div>

                            {/* Strengths */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                <div style={{
                                    fontSize: '0.8rem',
                                    opacity: 0.9,
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Key Strengths
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px',
                                    marginTop: '8px'
                                }}>
                                    {strengths.length > 0 ? strengths.map((s, i) => (
                                        <span key={i} style={{
                                            background: 'rgba(255, 255, 255, 0.25)',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600
                                        }}>
                                            {s}
                                        </span>
                                    )) : (
                                        <span style={{
                                            fontSize: '0.8rem',
                                            opacity: 0.7
                                        }}>No dominant categories</span>
                                    )}
                                </div>
                            </div>

                            {/* Weaknesses */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                <div style={{
                                    fontSize: '0.8rem',
                                    opacity: 0.9,
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Areas to Review
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px',
                                    marginTop: '8px'
                                }}>
                                    {weaknesses.length > 0 ? weaknesses.map((w, i) => (
                                        <span key={i} style={{
                                            background: 'rgba(255, 200, 100, 0.25)',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: '#fef3c7'
                                        }}>
                                            {w}
                                        </span>
                                    )) : (
                                        <span style={{
                                            fontSize: '0.8rem',
                                            opacity: 0.7
                                        }}>No weak categories</span>
                                    )}
                                </div>
                            </div>

                            {/* Podium */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                <div style={{
                                    fontSize: '0.8rem',
                                    opacity: 0.9,
                                    marginBottom: '12px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Top Rankings
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    {[winner, runnerUp, thirdPlace].filter(Boolean).map((p, i) => (
                                        <div key={p.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '0.85rem',
                                            fontWeight: 600
                                        }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                minWidth: '24px'
                                            }}>
                                                #{i + 1}
                                            </span>
                                            <span style={{ flex: 1 }}>{p.name}</span>
                                            <span style={{
                                                background: 'rgba(255, 255, 255, 0.25)',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem'
                                            }}>
                                                {p.score.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <style>{`
                        @keyframes fadeInScale {
                            from {
                                opacity: 0;
                                transform: scale(0.95) translateY(20px);
                            }
                            to {
                                opacity: 1;
                                transform: scale(1) translateY(0);
                            }
                        }
                    `}</style>
                </div>
            </div>

            {/* Radar Chart */}
            <div className="widget-card" style={{
                minHeight: '480px',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                padding: '28px',
                animation: 'fadeInUp 0.5s ease-out 0.1s backwards'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px'
                }}>
                    <div>
                        <div className="widget-title" style={{ margin: '0 0 6px 0' }}>
                            {t('executive.radar.title')}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 500
                        }}>
                            {t('executive.radar.subtitle')}
                        </div>
                    </div>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'var(--color-primary)20',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-primary)'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    </div>
                </div>
                <div style={{ flex: 1, width: '100%', minHeight: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                            <defs>
                                {data.providers.map((p, i) => (
                                    <linearGradient key={`gradient-${p.id}`} id={`gradient-${p.id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={getColor(p.id, i)} stopOpacity={0.3} />
                                        <stop offset="100%" stopColor={getColor(p.id, i)} stopOpacity={0.05} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <PolarGrid
                                stroke="var(--border-color)"
                                strokeWidth={1.5}
                                strokeDasharray="3 3"
                            />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{
                                    fill: 'var(--text-primary)',
                                    fontSize: 12,
                                    fontWeight: 600
                                }}
                            />
                            <PolarRadiusAxis
                                angle={30}
                                domain={[0, 10]}
                                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                                stroke="var(--border-color)"
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--bg-surface)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    boxShadow: 'var(--shadow-lg)',
                                    padding: '12px'
                                }}
                                itemStyle={{
                                    color: 'var(--text-primary)',
                                    fontSize: '0.875rem',
                                    fontWeight: 600
                                }}
                                labelStyle={{
                                    color: 'var(--text-secondary)',
                                    fontWeight: 700,
                                    marginBottom: '8px'
                                }}
                            />
                            <Legend
                                wrapperStyle={{
                                    paddingTop: '24px',
                                    fontSize: '0.875rem',
                                    fontWeight: 600
                                }}
                                iconType="circle"
                            />
                            {data.providers.map((p, i) => (
                                <Radar
                                    key={p.id}
                                    name={p.name}
                                    dataKey={p.id}
                                    stroke={getColor(p.id, i)}
                                    fill={`url(#gradient-${p.id})`}
                                    strokeWidth={2.5}
                                    dot={{ fill: getColor(p.id, i), r: 4 }}
                                    activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--bg-surface)' }}
                                />
                            ))}
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bar Chart */}
            <div className="widget-card" style={{
                minHeight: '480px',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                padding: '28px',
                animation: 'fadeInUp 0.5s ease-out 0.2s backwards'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px'
                }}>
                    <div>
                        <div className="widget-title" style={{ margin: '0 0 6px 0' }}>
                            {t('executive.bar.title')}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 500
                        }}>
                            {t('executive.bar.subtitle')}
                        </div>
                    </div>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'var(--color-cyan)20',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-cyan)'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="20" x2="12" y2="10"></line>
                            <line x1="18" y1="20" x2="18" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="16"></line>
                        </svg>
                    </div>
                </div>
                <div style={{ flex: 1, width: '100%', minHeight: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={providerScores}
                            layout="vertical"
                            margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
                        >
                            <defs>
                                {providerScores.map((entry, index) => (
                                    <linearGradient key={`bar-gradient-${entry.id}`} id={`bar-gradient-${entry.id}`} x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor={getColor(entry.id, index)} stopOpacity={0.8} />
                                        <stop offset="100%" stopColor={getColor(entry.id, index)} stopOpacity={1} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid
                                strokeDasharray="4 4"
                                horizontal={false}
                                vertical={true}
                                stroke="var(--border-color)"
                                strokeOpacity={0.3}
                            />
                            <XAxis
                                type="number"
                                domain={[0, 10]}
                                tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }}
                                stroke="var(--border-color)"
                                tickLine={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={120}
                                tick={{ fill: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}
                                stroke="var(--border-color)"
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'var(--bg-hover)', opacity: 0.3 }}
                                contentStyle={{
                                    backgroundColor: 'var(--bg-surface)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    boxShadow: 'var(--shadow-lg)',
                                    padding: '12px'
                                }}
                                itemStyle={{
                                    color: 'var(--text-primary)',
                                    fontSize: '0.875rem',
                                    fontWeight: 600
                                }}
                                labelStyle={{
                                    color: 'var(--text-secondary)',
                                    fontWeight: 700,
                                    marginBottom: '8px'
                                }}
                                formatter={(value: any) => [`${Number(value).toFixed(2)}`, 'Score']}
                            />
                            <Bar
                                dataKey="score"
                                radius={[0, 8, 8, 0]}
                                barSize={36}
                                isAnimationActive={true}
                                animationDuration={1000}
                                animationBegin={200}
                            >
                                {providerScores.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={`url(#bar-gradient-${entry.id})`}
                                        stroke={getColor(entry.id, index)}
                                        strokeWidth={entry.id === winner.id ? 3 : 0}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Category Weight Distribution */}
            <div className="widget-card" style={{
                minHeight: '480px',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                padding: '28px',
                animation: 'fadeInUp 0.5s ease-out 0.3s backwards'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px'
                }}>
                    <div>
                        <div className="widget-title" style={{ margin: '0 0 6px 0' }}>
                            Criteria Weight Distribution
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 500
                        }}>
                            Scoring impact by category
                        </div>
                    </div>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'var(--color-success)20',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-success)'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                    </div>
                </div>
                <div style={{ flex: 1, width: '100%', minHeight: '350px', display: 'flex', alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <defs>
                                <linearGradient id="tech-gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.7} />
                                </linearGradient>
                                <linearGradient id="econ-gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0.7} />
                                </linearGradient>
                                <linearGradient id="exec-gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--color-warning)" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="var(--color-warning)" stopOpacity={0.7} />
                                </linearGradient>
                                <linearGradient id="hse-gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--color-cyan)" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="var(--color-cyan)" stopOpacity={0.7} />
                                </linearGradient>
                            </defs>
                            <Pie
                                data={[
                                    { name: 'TECHNICAL', value: 40, color: 'url(#tech-gradient)' },
                                    { name: 'ECONOMIC', value: 30, color: 'url(#econ-gradient)' },
                                    { name: 'EXECUTION', value: 20, color: 'url(#exec-gradient)' },
                                    { name: 'HSE/ESG', value: 10, color: 'url(#hse-gradient)' }
                                ]}
                                cx="50%"
                                cy="50%"
                                labelLine={{
                                    stroke: 'var(--text-secondary)',
                                    strokeWidth: 1.5
                                }}
                                label={(entry) => `${entry.value}%`}
                                outerRadius="60%"
                                dataKey="value"
                                animationBegin={300}
                                animationDuration={800}
                            >
                                {[
                                    { name: 'TECHNICAL', value: 40, color: 'url(#tech-gradient)' },
                                    { name: 'ECONOMIC', value: 30, color: 'url(#econ-gradient)' },
                                    { name: 'EXECUTION', value: 20, color: 'url(#exec-gradient)' },
                                    { name: 'HSE/ESG', value: 10, color: 'url(#hse-gradient)' }
                                ].map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--bg-surface)" strokeWidth={3} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--bg-surface)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    boxShadow: 'var(--shadow-lg)',
                                    padding: '12px'
                                }}
                                itemStyle={{
                                    color: 'var(--text-primary)',
                                    fontSize: '0.875rem',
                                    fontWeight: 600
                                }}
                                formatter={(value: any) => [`${value}%`, 'Weight']}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={50}
                                wrapperStyle={{
                                    paddingTop: '20px',
                                    fontSize: '0.875rem',
                                    fontWeight: 600
                                }}
                                iconType="circle"
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
