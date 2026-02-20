import { useState, useEffect, useMemo } from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useScoringAuditStore } from '../../stores/useScoringAuditStore';

// ============================================
// TYPES
// ============================================

interface ScoringAuditTrailProps {
  projectId: string;
}

// ============================================
// HELPERS
// ============================================

const CHANGE_TYPE_COLORS: Record<string, string> = {
  score_update: '#3b82f6',
  weight_change: '#f59e0b',
  criteria_change: '#8b5cf6',
  recalculation: '#12b5b0',
  manual_override: '#ef4444',
};

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '--';
  if (typeof val === 'number') return val.toFixed(2);
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

function relativeTime(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return lang === 'es' ? 'Hace un momento' : 'Just now';
  if (diffMin < 60) return lang === 'es' ? `Hace ${diffMin} min` : `${diffMin}m ago`;
  if (diffHours < 24) return lang === 'es' ? `Hace ${diffHours}h` : `${diffHours}h ago`;
  if (diffDays < 7) return lang === 'es' ? `Hace ${diffDays}d` : `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ============================================
// COMPONENT
// ============================================

export const ScoringAuditTrail = ({ projectId }: ScoringAuditTrailProps) => {
  const { language } = useLanguageStore();
  const { changeLog, isLoading, loadChangeLog } = useScoringAuditStore();

  const [showFull, setShowFull] = useState(false);
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (projectId) loadChangeLog(projectId);
  }, [projectId, loadChangeLog]);

  // Get unique providers and change types
  const providers = useMemo(() => {
    const set = new Set<string>();
    changeLog.forEach((e) => set.add(e.provider_name));
    return Array.from(set).sort();
  }, [changeLog]);

  const changeTypes = useMemo(() => {
    const set = new Set<string>();
    changeLog.forEach((e) => set.add(e.change_type));
    return Array.from(set);
  }, [changeLog]);

  // Filtered entries
  const filteredLog = useMemo(() => {
    let entries = changeLog;
    if (filterProvider !== 'all') {
      entries = entries.filter((e) => e.provider_name === filterProvider);
    }
    if (filterType !== 'all') {
      entries = entries.filter((e) => e.change_type === filterType);
    }
    return entries;
  }, [changeLog, filterProvider, filterType]);

  // Compact vs full
  const displayLog = showFull ? filteredLog : filteredLog.slice(0, 10);

  const changeTypeLabels: Record<string, { es: string; en: string }> = {
    score_update: { es: 'Actualizacion de score', en: 'Score update' },
    weight_change: { es: 'Cambio de peso', en: 'Weight change' },
    criteria_change: { es: 'Cambio de criterio', en: 'Criteria change' },
    recalculation: { es: 'Recalculo', en: 'Recalculation' },
    manual_override: { es: 'Override manual', en: 'Manual override' },
  };

  if (isLoading) {
    return (
      <div
        style={{
          padding: '32px',
          textAlign: 'center',
          color: 'var(--text-tertiary)',
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            border: '2px solid var(--color-primary-light)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }}
        />
        <p style={{ fontSize: '0.85rem', margin: 0 }}>
          {language === 'es' ? 'Cargando historial...' : 'Loading history...'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {language === 'es' ? 'Historial de Cambios' : 'Change History'}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
            {language === 'es'
              ? `${changeLog.length} cambios registrados`
              : `${changeLog.length} changes recorded`}
          </p>
        </div>

        {/* Filters */}
        {providers.length > 0 && (
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            style={{
              padding: '6px 10px',
              background: 'var(--bg-surface-alt)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '0.78rem',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="all">
              {language === 'es' ? 'Todos los proveedores' : 'All providers'}
            </option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}

        {changeTypes.length > 1 && (
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '6px 10px',
              background: 'var(--bg-surface-alt)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '0.78rem',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="all">
              {language === 'es' ? 'Todos los tipos' : 'All types'}
            </option>
            {changeTypes.map((ct) => (
              <option key={ct} value={ct}>
                {changeTypeLabels[ct]?.[language] || ct}
              </option>
            ))}
          </select>
        )}

        {/* Compact/Full toggle */}
        <button
          onClick={() => setShowFull(!showFull)}
          style={{
            padding: '6px 12px',
            background: 'none',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {showFull
            ? (language === 'es' ? 'Ver resumen' : 'Compact')
            : (language === 'es' ? 'Ver todo' : 'Full history')}
        </button>
      </div>

      {/* Timeline */}
      {filteredLog.length === 0 ? (
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            color: 'var(--text-tertiary)',
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-color)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ opacity: 0.4, marginBottom: '8px' }}
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p style={{ margin: '0 0 4px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {language === 'es' ? 'Sin historial de cambios' : 'No change history'}
          </p>
          <p style={{ margin: 0, fontSize: '0.8rem' }}>
            {language === 'es'
              ? 'Los cambios en scoring se registraran aqui automaticamente.'
              : 'Scoring changes will be logged here automatically.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ position: 'relative', paddingLeft: '28px' }}>
            {/* Vertical line */}
            <div
              style={{
                position: 'absolute',
                left: '8px',
                top: '6px',
                bottom: '6px',
                width: '2px',
                background: 'var(--border-color)',
                borderRadius: '1px',
              }}
            />

            {displayLog.map((entry, idx) => {
              const color = CHANGE_TYPE_COLORS[entry.change_type] || '#6b7280';
              const label =
                changeTypeLabels[entry.change_type]?.[language] || entry.change_type;

              return (
                <div
                  key={entry.id}
                  style={{
                    position: 'relative',
                    paddingBottom: idx === displayLog.length - 1 ? 0 : '20px',
                  }}
                >
                  {/* Dot on the timeline */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-24px',
                      top: '4px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: color,
                      border: '2px solid var(--bg-surface)',
                      boxShadow: `0 0 0 2px ${color}30`,
                    }}
                  />

                  {/* Entry content */}
                  <div
                    style={{
                      padding: '10px 14px',
                      background: 'var(--bg-surface-alt)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      borderLeftWidth: '3px',
                      borderLeftColor: color,
                    }}
                  >
                    {/* Top row: type badge + time */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '6px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                          color: color,
                          background: `${color}14`,
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {relativeTime(entry.created_at, language)}
                      </span>
                      <div style={{ flex: 1 }} />
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-tertiary)',
                          fontStyle: 'italic',
                        }}
                      >
                        {entry.changed_by}
                      </span>
                    </div>

                    {/* Provider + field */}
                    <div
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{entry.provider_name}</span>
                      {' -- '}
                      <span style={{ color: 'var(--text-secondary)' }}>{entry.field_changed}</span>
                    </div>

                    {/* Old -> New values */}
                    {(entry.old_value !== null || entry.new_value !== null) && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '6px',
                          fontSize: '0.78rem',
                        }}
                      >
                        <span
                          style={{
                            color: '#ef4444',
                            background: 'rgba(239, 68, 68, 0.08)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            textDecoration: 'line-through',
                          }}
                        >
                          {formatValue(entry.old_value)}
                        </span>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--text-tertiary)"
                          strokeWidth="2"
                        >
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                        <span
                          style={{
                            color: '#10b981',
                            background: 'rgba(16, 185, 129, 0.08)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                          }}
                        >
                          {formatValue(entry.new_value)}
                        </span>
                      </div>
                    )}

                    {/* Reason */}
                    {entry.reason && (
                      <div
                        style={{
                          marginTop: '6px',
                          fontSize: '0.75rem',
                          color: 'var(--text-tertiary)',
                          fontStyle: 'italic',
                          paddingLeft: '8px',
                          borderLeft: '2px solid var(--border-color)',
                        }}
                      >
                        {entry.reason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show more button */}
          {!showFull && filteredLog.length > 10 && (
            <button
              onClick={() => setShowFull(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                padding: '10px',
                marginTop: '12px',
                background: 'none',
                border: '1px dashed var(--border-color)',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
              {language === 'es'
                ? `Ver ${filteredLog.length - 10} cambios mas`
                : `Show ${filteredLog.length - 10} more changes`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
