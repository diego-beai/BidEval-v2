import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { supabase } from '../../lib/supabase';
import { PriceComparisonChart } from './PriceComparisonChart';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface SupplierHistoryProfileProps {
  providerName: string;
  onClose: () => void;
}

interface HistoryEntry {
  projectId: string;
  projectName: string;
  projectType: string;
  totalPrice: number | null;
  currency: string;
  overallScore: number | null;
  categoryScores: Record<string, number> | null;
  projectDate: string;
  offerDate: string;
  discountPercentage: number;
  tcoValue: number | null;
  rank: number | null;
  totalProviders: number | null;
}

interface Alert {
  type: 'warning' | 'info';
  message: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export const SupplierHistoryProfile = ({ providerName, onClose }: SupplierHistoryProfileProps) => {
  const { t, language } = useLanguageStore();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Normalize score to 0-10 range
  const norm = (score: number | null): number | null => {
    if (score == null) return null;
    return score > 10 ? score / 10 : score;
  };

  /* ---- Fetch data ---- */
  const loadHistory = useCallback(async () => {
    if (!supabase) { setIsLoading(false); return; }
    setIsLoading(true);

    try {
      // 1. Fetch from v_supplier_price_history
      const { data: priceData, error: priceErr } = await (supabase as any)
        .from('v_supplier_price_history')
        .select('*')
        .ilike('provider_name', providerName)
        .order('project_date', { ascending: true });

      if (priceErr) { setIsLoading(false); return; }

      // 2. For each project, fetch ranking position
      const projectIds = (priceData || []).map((r: any) => r.project_id).filter(Boolean);
      const rankMap: Record<string, { rank: number; total: number }> = {};

      if (projectIds.length > 0) {
        const { data: allRankings } = await (supabase as any)
          .from('ranking_proveedores')
          .select('project_id, provider_name, overall_score')
          .in('project_id', projectIds)
          .order('overall_score', { ascending: false });

        if (allRankings) {
          // Group by project and compute rank
          const grouped: Record<string, Array<{ name: string; score: number }>> = {};
          for (const row of allRankings) {
            const pid = row.project_id;
            if (!grouped[pid]) grouped[pid] = [];
            grouped[pid].push({ name: row.provider_name, score: row.overall_score ?? 0 });
          }
          for (const pid of Object.keys(grouped)) {
            const sorted = grouped[pid].sort((a, b) => b.score - a.score);
            const idx = sorted.findIndex(
              (s) => s.name.toLowerCase() === providerName.toLowerCase()
            );
            rankMap[pid] = { rank: idx >= 0 ? idx + 1 : -1, total: sorted.length };
          }
        }
      }

      const entries: HistoryEntry[] = (priceData || []).map((row: any) => ({
        projectId: row.project_id,
        projectName: row.project_name,
        projectType: row.project_type || 'RFP',
        totalPrice: row.total_price,
        currency: row.currency || 'EUR',
        overallScore: row.overall_score,
        categoryScores: row.category_scores_json,
        projectDate: row.project_date,
        offerDate: row.offer_date,
        discountPercentage: row.discount_percentage ?? 0,
        tcoValue: row.tco_value,
        rank: rankMap[row.project_id]?.rank ?? null,
        totalProviders: rankMap[row.project_id]?.total ?? null,
      }));

      setHistory(entries);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [providerName]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  /* ---- Computed stats ---- */
  const stats = useMemo(() => {
    const total = history.length;
    const scored = history.filter((h) => h.overallScore != null);
    const avgScore =
      scored.length > 0
        ? scored.reduce((s, h) => s + norm(h.overallScore!)!, 0) / scored.length
        : null;

    const withPrice = history.filter((h) => h.totalPrice != null && h.totalPrice > 0);
    const avgPrice =
      withPrice.length > 0
        ? withPrice.reduce((s, h) => s + h.totalPrice!, 0) / withPrice.length
        : null;

    const wins = history.filter((h) => h.rank === 1).length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    // Trend: compare last score vs the one before
    let scoreTrend: 'up' | 'down' | 'stable' | null = null;
    if (scored.length >= 2) {
      const last = norm(scored[scored.length - 1].overallScore!)!;
      const prev = norm(scored[scored.length - 2].overallScore!)!;
      if (last > prev + 0.1) scoreTrend = 'up';
      else if (last < prev - 0.1) scoreTrend = 'down';
      else scoreTrend = 'stable';
    }

    return { total, avgScore, avgPrice, winRate, wins, scoreTrend };
  }, [history]);

  /* ---- Alerts ---- */
  const alerts = useMemo(() => {
    const result: Alert[] = [];
    const withPrice = history.filter((h) => h.totalPrice != null && h.totalPrice > 0);
    if (withPrice.length >= 2 && stats.avgPrice) {
      const lastPrice = withPrice[withPrice.length - 1].totalPrice!;
      const deviation = Math.abs(lastPrice - stats.avgPrice) / stats.avgPrice;
      if (deviation > 0.2) {
        result.push({
          type: 'warning',
          message:
            language === 'es'
              ? `Desviacion de precio del ${(deviation * 100).toFixed(0)}% respecto a la media historica.`
              : `Price deviation of ${(deviation * 100).toFixed(0)}% from historical average.`,
        });
      }
    }

    // Score trending down over last 3 projects
    const scored = history.filter((h) => h.overallScore != null);
    if (scored.length >= 3) {
      const last3 = scored.slice(-3).map((h) => norm(h.overallScore!)!);
      if (last3[2] < last3[1] && last3[1] < last3[0]) {
        result.push({
          type: 'warning',
          message:
            language === 'es'
              ? 'Tendencia descendente en scoring en los ultimos 3 proyectos.'
              : 'Downward score trend over the last 3 projects.',
        });
      }
    }

    // Missing score in most recent
    if (history.length > 0) {
      const latest = history[history.length - 1];
      if (latest.overallScore == null && latest.totalPrice == null) {
        result.push({
          type: 'info',
          message:
            language === 'es'
              ? 'El proyecto mas reciente no tiene datos de scoring ni precio.'
              : 'The most recent project has no scoring or price data.',
        });
      }
    }

    return result;
  }, [history, stats.avgPrice, language]);

  /* ---- Chart data ---- */
  const chartData = useMemo(() => {
    return history
      .filter((h) => h.totalPrice != null && h.totalPrice > 0)
      .map((h) => ({
        projectName: h.projectName,
        totalPrice: h.totalPrice!,
        currency: h.currency,
        date: h.projectDate,
        score: h.overallScore != null ? norm(h.overallScore)! : undefined,
      }));
  }, [history]);

  /* ---- Score color ---- */
  const scoreColor = (score: number | null) => {
    if (score == null) return 'var(--text-tertiary)';
    const n = norm(score)!;
    if (n >= 7) return '#10b981';
    if (n >= 5) return '#f59e0b';
    return '#ef4444';
  };

  /* ---- Format price ---- */
  const formatPrice = (price: number | null, currency: string) => {
    if (price == null) return '--';
    return price.toLocaleString(language === 'es' ? 'es-ES' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });
  };

  /* ---- Rank badge ---- */
  const rankBadge = (rank: number | null, total: number | null) => {
    if (rank == null || rank < 1) return null;
    const isFirst = rank === 1;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          padding: '2px 8px',
          borderRadius: 999,
          fontSize: '0.7rem',
          fontWeight: 700,
          background: isFirst ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-surface-alt)',
          color: isFirst ? '#f59e0b' : 'var(--text-tertiary)',
        }}
      >
        {isFirst && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )}
        #{rank}
        {total ? `/${total}` : ''}
      </span>
    );
  };

  /* ---- Type badge ---- */
  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      RFP: '#3b82f6',
      RFQ: '#8b5cf6',
      RFI: '#f59e0b',
    };
    const c = colors[type] || 'var(--text-tertiary)';
    return (
      <span
        style={{
          padding: '2px 6px',
          borderRadius: 4,
          fontSize: '0.65rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          background: `${c}18`,
          color: c,
          letterSpacing: '0.03em',
        }}
      >
        {type}
      </span>
    );
  };

  /* ---- Render ---- */
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative',
          width: 520,
          maxWidth: '95vw',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s ease-out',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(18,181,176,0.2), rgba(18,181,176,0.05))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent, #12b5b0)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 8v4l3 3" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {providerName}
              </h3>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  marginTop: 2,
                }}
              >
                {t('supplier.history.title')} &middot; {stats.total}{' '}
                {stats.total === 1
                  ? t('supplier.history.project_singular')
                  : t('supplier.history.project_plural')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {stats.avgScore != null && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: `${scoreColor(stats.avgScore * 10)}18`,
                  color: scoreColor(stats.avgScore * 10),
                }}
              >
                {stats.avgScore.toFixed(1)}
                <span style={{ fontSize: '0.6em', opacity: 0.6 }}>/10</span>
              </span>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {isLoading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 0',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '3px solid rgba(18,181,176,0.15)',
                  borderTopColor: 'var(--accent, #12b5b0)',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {t('supplier.history.loading')}
              </span>
            </div>
          ) : history.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 0',
                gap: 12,
                color: 'var(--text-tertiary)',
              }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}>
                <path d="M12 8v4l3 3" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>{t('supplier.history.empty')}</p>
            </div>
          ) : (
            <>
              {/* Summary Stat Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <StatCard
                  label={t('supplier.history.stat_participations')}
                  value={String(stats.total)}
                />
                <StatCard
                  label={t('supplier.history.stat_avg_score')}
                  value={stats.avgScore != null ? stats.avgScore.toFixed(1) : '--'}
                  suffix="/10"
                  valueColor={scoreColor(stats.avgScore != null ? stats.avgScore * 10 : null)}
                  trend={stats.scoreTrend}
                />
                <StatCard
                  label={t('supplier.history.stat_avg_price')}
                  value={stats.avgPrice != null ? formatPrice(stats.avgPrice, 'EUR') : '--'}
                />
                <StatCard
                  label={t('supplier.history.stat_win_rate')}
                  value={`${stats.winRate.toFixed(0)}%`}
                  sublabel={`${stats.wins}/${stats.total}`}
                />
              </div>

              {/* Alerts */}
              {alerts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {alerts.map((alert, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 10,
                        background:
                          alert.type === 'warning'
                            ? 'rgba(245,158,11,0.08)'
                            : 'rgba(59,130,246,0.08)',
                        border: `1px solid ${
                          alert.type === 'warning'
                            ? 'rgba(245,158,11,0.2)'
                            : 'rgba(59,130,246,0.2)'
                        }`,
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={alert.type === 'warning' ? '#f59e0b' : '#3b82f6'}
                        strokeWidth="2"
                        style={{ flexShrink: 0, marginTop: 1 }}
                      >
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color:
                            alert.type === 'warning' ? '#f59e0b' : '#3b82f6',
                          lineHeight: 1.4,
                        }}
                      >
                        {alert.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Price Chart */}
              {chartData.length >= 2 && (
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: 10,
                    }}
                  >
                    {t('supplier.history.price_evolution')}
                  </div>
                  <div
                    style={{
                      background: 'var(--bg-surface-alt)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 12,
                      padding: '12px 8px 4px',
                    }}
                  >
                    <PriceComparisonChart data={chartData} providerName={providerName} />
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: 10,
                  }}
                >
                  {t('supplier.history.timeline')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[...history].reverse().map((entry, idx) => {
                    const scoreVal = norm(entry.overallScore);
                    return (
                      <div
                        key={entry.projectId}
                        style={{
                          display: 'flex',
                          gap: 14,
                          position: 'relative',
                        }}
                      >
                        {/* Timeline line + dot */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: 20,
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background:
                                entry.rank === 1
                                  ? '#f59e0b'
                                  : scoreVal != null
                                  ? scoreColor(entry.overallScore)
                                  : 'var(--border-color)',
                              border: '2px solid var(--bg-surface)',
                              boxShadow: `0 0 0 2px ${
                                entry.rank === 1
                                  ? 'rgba(245,158,11,0.3)'
                                  : 'var(--border-color)'
                              }`,
                              flexShrink: 0,
                              zIndex: 1,
                            }}
                          />
                          {idx < history.length - 1 && (
                            <div
                              style={{
                                flex: 1,
                                width: 2,
                                background: 'var(--border-color)',
                                minHeight: 24,
                              }}
                            />
                          )}
                        </div>

                        {/* Content */}
                        <div
                          style={{
                            flex: 1,
                            paddingBottom: 16,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              flexWrap: 'wrap',
                              marginBottom: 4,
                            }}
                          >
                            {typeBadge(entry.projectType)}
                            <span
                              style={{
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                              }}
                            >
                              {entry.projectName}
                            </span>
                            {rankBadge(entry.rank, entry.totalProviders)}
                          </div>
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--text-tertiary)',
                              marginBottom: 6,
                            }}
                          >
                            {new Date(entry.projectDate).toLocaleDateString(
                              language === 'es' ? 'es-ES' : 'en-US',
                              { year: 'numeric', month: 'long' }
                            )}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              flexWrap: 'wrap',
                            }}
                          >
                            {scoreVal != null && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div
                                  style={{
                                    height: 6,
                                    width: 60,
                                    borderRadius: 3,
                                    background: 'var(--bg-surface-alt)',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div
                                    style={{
                                      height: '100%',
                                      width: `${(scoreVal / 10) * 100}%`,
                                      borderRadius: 3,
                                      background: scoreColor(entry.overallScore),
                                      transition: 'width 0.3s',
                                    }}
                                  />
                                </div>
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: scoreColor(entry.overallScore),
                                  }}
                                >
                                  {scoreVal.toFixed(1)}
                                </span>
                              </div>
                            )}
                            {entry.totalPrice != null && entry.totalPrice > 0 && (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                {formatPrice(entry.totalPrice, entry.currency)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */
interface StatCardProps {
  label: string;
  value: string;
  suffix?: string;
  sublabel?: string;
  valueColor?: string;
  trend?: 'up' | 'down' | 'stable' | null;
}

const StatCard = ({ label, value, suffix, sublabel, valueColor, trend }: StatCardProps) => (
  <div
    style={{
      padding: '12px 14px',
      background: 'var(--bg-surface-alt)',
      border: '1px solid var(--border-color)',
      borderRadius: 10,
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span
        style={{
          fontSize: '1.15rem',
          fontWeight: 700,
          color: valueColor || 'var(--text-primary)',
        }}
      >
        {value}
      </span>
      {suffix && (
        <span style={{ fontSize: '0.6em', fontWeight: 500, opacity: 0.5 }}>{suffix}</span>
      )}
      {trend === 'up' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      )}
      {trend === 'down' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </div>
    <div
      style={{
        fontSize: '0.68rem',
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginTop: 4,
      }}
    >
      {label}
    </div>
    {sublabel && (
      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
        {sublabel}
      </div>
    )}
  </div>
);
