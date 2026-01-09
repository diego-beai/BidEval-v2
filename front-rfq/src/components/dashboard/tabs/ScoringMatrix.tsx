import React from 'react';
import { useDashboardStore } from '../../../stores/useDashboardStore';
import { useLanguageStore } from '../../../stores/useLanguageStore';

export const ScoringMatrix: React.FC = () => {
    const { data, updateScore } = useDashboardStore();
    const { t } = useLanguageStore();

    if (!data) return <div>Loading...</div>;

    const calculateWeightedScore = (providerId: string) => {
        const provider = data.providers.find(p => p.id === providerId);
        if (!provider) return 0;

        let totalScore = 0;
        let totalWeight = 0;

        provider.responses.forEach(resp => {
            const req = data.requirements.find(r => r.id === resp.req_id);
            if (req) {
                const score = resp.user_score !== undefined ? resp.user_score : resp.auto_score;
                totalScore += score * req.weight;
                totalWeight += req.weight;
            }
        });

        return totalScore;
    };

    // Calculate rankings
    const providerScores = data.providers.map(p => ({
        id: p.id,
        name: p.name,
        score: calculateWeightedScore(p.id)
    })).sort((a, b) => b.score - a.score);

    const getRank = (providerId: string) => {
        return providerScores.findIndex(p => p.id === providerId) + 1;
    };

    const getRankBadge = (rank: number) => {
        return `#${rank}`;
    };

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'var(--color-primary)';
        if (score >= 5) return 'var(--text-secondary)';
        return 'var(--text-tertiary)';
    };

    return (
        <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            boxShadow: 'var(--shadow-sm)',
            animation: 'fadeInUp 0.5s ease-out'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '28px',
                paddingBottom: '20px',
                borderBottom: '2px solid var(--border-color)'
            }}>
                <div>
                    <h3 style={{
                        margin: '0 0 6px 0',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)'
                    }}>
                        {t('scoring.req')}
                    </h3>
                    <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        fontWeight: 500
                    }}>
                        {t('scoring.subtitle')}
                    </p>
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
                        <path d="M3 3h18v18H3zM9 3v18M3 9h18M3 15h18"></path>
                    </svg>
                </div>
            </div>

            {/* Table */}
            <div className="scoring-grid-container">
                <table className="scoring-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-surface-alt)' }}>
                            <th style={{
                                width: '40%',
                                padding: '16px',
                                textAlign: 'left',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                color: 'var(--text-secondary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                borderTopLeftRadius: '10px'
                            }}>
                                {t('scoring.req')}
                            </th>
                            <th style={{
                                width: '10%',
                                padding: '16px',
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                color: 'var(--text-secondary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                {t('scoring.weight')}
                            </th>
                            {data.providers.map((p, idx) => {
                                const rank = getRank(p.id);
                                const isWinner = rank === 1;
                                return (
                                    <th key={p.id} style={{
                                        padding: '16px',
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        fontSize: '0.875rem',
                                        color: isWinner ? 'var(--color-primary)' : 'var(--text-secondary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        borderTopRightRadius: idx === data.providers.length - 1 ? '10px' : 0,
                                        background: 'transparent',
                                        position: 'relative'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: 'var(--text-tertiary)',
                                                marginBottom: '2px'
                                            }}>
                                                {getRankBadge(rank)}
                                            </div>
                                            <div>{p.name}</div>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {data.requirements.map((req, index) => (
                            <tr key={req.id} style={{
                                background: index % 2 === 0 ? 'transparent' : 'var(--bg-surface-alt)',
                                transition: 'all 0.2s'
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'transparent' : 'var(--bg-surface-alt)'}
                            >
                                <td style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                        {req.text}
                                    </div>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        color: 'var(--text-secondary)',
                                        padding: '2px 8px',
                                        background: 'var(--color-primary)15',
                                        borderRadius: '6px',
                                        display: 'inline-block',
                                        fontWeight: 500
                                    }}>
                                        {req.category}
                                    </div>
                                </td>
                                <td style={{ textAlign: 'center', padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                    <span style={{
                                        padding: '4px 10px',
                                        background: 'var(--color-warning)20',
                                        color: 'var(--color-warning)',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        fontSize: '0.85rem'
                                    }}>
                                        {(req.weight * 100).toFixed(0)}%
                                    </span>
                                </td>
                                {data.providers.map(p => {
                                    const resp = p.responses.find(r => r.req_id === req.id);
                                    const score = resp ? (resp.user_score ?? resp.auto_score) : 0;

                                    return (
                                        <td key={p.id} style={{
                                            textAlign: 'center',
                                            padding: '16px',
                                            borderBottom: '1px solid var(--border-color)',
                                            background: 'transparent'
                                        }}>
                                            <input
                                                type="number"
                                                min="0"
                                                max="10"
                                                step="0.1"
                                                className="scoring-input"
                                                value={score}
                                                onChange={(e) => updateScore(p.id, req.id, Number(e.target.value))}
                                                style={{
                                                    width: '70px',
                                                    padding: '8px 12px',
                                                    border: '2px solid var(--border-color)',
                                                    borderRadius: '8px',
                                                    textAlign: 'center',
                                                    fontWeight: 600,
                                                    fontSize: '0.95rem',
                                                    background: 'var(--bg-surface)',
                                                    color: getScoreColor(score),
                                                    transition: 'all 0.2s'
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = 'var(--color-primary)';
                                                    e.target.style.boxShadow = '0 0 0 3px var(--color-primary)20';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = 'var(--border-color)';
                                                    e.target.style.boxShadow = 'none';
                                                }}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        <tr style={{
                            background: 'var(--bg-surface-alt)',
                            fontWeight: 700
                        }}>
                            <td colSpan={2} style={{
                                textAlign: 'right',
                                padding: '20px',
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                borderBottomLeftRadius: '10px'
                            }}>
                                {t('scoring.total')}:
                            </td>
                            {data.providers.map((p, idx) => {
                                const totalScore = calculateWeightedScore(p.id);
                                const rank = getRank(p.id);
                                const isWinner = rank === 1;
                                return (
                                    <td key={p.id} style={{
                                        textAlign: 'center',
                                        padding: '20px',
                                        borderBottomRightRadius: idx === data.providers.length - 1 ? '10px' : 0,
                                        background: 'transparent'
                                    }}>
                                        <div style={{
                                            fontSize: '1.5rem',
                                            fontWeight: 700,
                                            color: isWinner ? 'var(--color-primary)' : getScoreColor(totalScore),
                                            padding: '10px 18px',
                                            background: 'var(--bg-surface)',
                                            borderRadius: '10px',
                                            boxShadow: isWinner ? '0 4px 16px var(--color-primary)30' : '0 2px 8px rgba(0,0,0,0.1)',
                                            display: 'inline-block',
                                            border: isWinner ? '2px solid var(--color-primary)' : '2px solid var(--border-color)'
                                        }}>
                                            {totalScore.toFixed(2)}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
