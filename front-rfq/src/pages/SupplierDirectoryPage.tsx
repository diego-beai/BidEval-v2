import { useEffect, useState, useMemo } from 'react';
import { useSupplierDirectoryStore, SupplierEntry } from '../stores/useSupplierDirectoryStore';
import { useLanguageStore } from '../stores/useLanguageStore';
import './SupplierDirectoryPage.css';

export const SupplierDirectoryPage = () => {
  const { t, language } = useLanguageStore();
  const { suppliers, isLoading, loadSuppliers, selectedSupplier, setSelectedSupplier, upsertSupplier } = useSupplierDirectoryStore();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const filtered = useMemo(() => {
    let list = suppliers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.supplier_name.toLowerCase().includes(q) ||
        (s.display_name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.contact_person || '').toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'all') {
      list = list.filter(s => (s.category || 'engineering') === categoryFilter);
    }
    return list;
  }, [suppliers, search, categoryFilter]);

  const stats = useMemo(() => {
    const total = suppliers.length;
    const withScore = suppliers.filter(s => s.avg_score != null).length;
    const avgScore = withScore > 0
      ? suppliers.reduce((sum, s) => sum + (s.avg_score || 0), 0) / withScore
      : 0;
    const totalProjects = new Set(suppliers.flatMap(s => s.project_names)).size;
    return { total, withScore, avgScore, totalProjects };
  }, [suppliers]);

  const categories = useMemo(() => {
    const cats = new Set(suppliers.map(s => s.category || 'engineering'));
    return Array.from(cats).sort();
  }, [suppliers]);

  const categoryLabel = (cat: string) => {
    const labels: Record<string, Record<string, string>> = {
      es: { construction: 'Construcción', engineering: 'Ingeniería', epc: 'EPC' },
      en: { construction: 'Construction', engineering: 'Engineering', epc: 'EPC' },
    };
    return labels[language]?.[cat.toLowerCase()] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  const detail = useMemo(() => {
    if (!selectedSupplier) return null;
    return suppliers.find(s => s.supplier_name === selectedSupplier) || null;
  }, [selectedSupplier, suppliers]);

  // Normalize score to 0-10 scale (some projects store 0-100, others 0-10)
  const normalizeToTen = (score: number | null): number | null => {
    if (score == null) return null;
    return score > 10 ? score / 10 : score;
  };

  const getScoreClass = (score: number | null) => {
    if (score == null) return 'none';
    const n = normalizeToTen(score)!;
    if (n >= 7) return 'high';
    if (n >= 5) return 'medium';
    return 'low';
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  if (isLoading && suppliers.length === 0) {
    return (
      <div className="supplier-dir">
        <div className="supplier-empty">
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid rgba(59, 130, 246, 0.2)',
            borderTopColor: '#3b82f6',
            animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ marginTop: 16 }}>{t('supplier.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="supplier-dir">
      {/* Header */}
      <div className="supplier-dir-header">
        <div className="supplier-dir-header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div>
          <h2>{t('supplier.title')}</h2>
          <p>{t('supplier.subtitle')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="supplier-stats-bar">
        <div className="supplier-stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">{t('supplier.stat.total')}</div>
        </div>
        <div className="supplier-stat-card">
          <div className="stat-value">{stats.totalProjects}</div>
          <div className="stat-label">{t('supplier.stat.projects')}</div>
        </div>
        <div className="supplier-stat-card">
          <div className="stat-value">{stats.withScore}</div>
          <div className="stat-label">{t('supplier.stat.scored')}</div>
        </div>
        <div className="supplier-stat-card">
          <div className="stat-value">{stats.avgScore > 0 ? <>{normalizeToTen(stats.avgScore)!.toFixed(2)}<span style={{ fontSize: '0.6em', opacity: 0.5 }}>/10</span></> : '—'}</div>
          <div className="stat-label">{t('supplier.stat.avg_score')}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="supplier-toolbar">
        <div className="supplier-search-wrapper">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="supplier-search"
            placeholder={t('supplier.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {categories.length > 1 && (
          <div className="supplier-category-filters">
            <button
              className={`supplier-category-btn ${categoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              {t('supplier.filter_all')}
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className={`supplier-category-btn ${categoryFilter === cat ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {categoryLabel(cat)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="supplier-empty">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p>{t('supplier.empty')}</p>
          <p>{t('supplier.empty_hint')}</p>
        </div>
      ) : (
        <div className="supplier-table-wrapper">
          <table className="supplier-table">
            <thead>
              <tr>
                <th>{t('supplier.col.name')}</th>
                <th>{t('supplier.col.projects')}</th>
                <th>{t('supplier.col.avg_score')}</th>
                <th>{t('supplier.col.last_participation')}</th>
                <th>{t('supplier.col.contact')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(supplier => (
                <tr key={supplier.supplier_name} onClick={() => setSelectedSupplier(supplier.supplier_name)}>
                  <td>
                    <div className="supplier-name-cell">
                      <div className="supplier-avatar">{getInitials(supplier.display_name || supplier.supplier_name)}</div>
                      <div>
                        <div className="supplier-name-text">{supplier.display_name || supplier.supplier_name}</div>
                        {supplier.category && (
                          <div className="supplier-name-sub">{categoryLabel(supplier.category)}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="supplier-projects-pills">
                      {supplier.project_names.slice(0, 3).map(pn => (
                        <span key={pn} className="supplier-project-pill">{pn}</span>
                      ))}
                      {supplier.project_names.length > 3 && (
                        <span className="supplier-project-pill">+{supplier.project_names.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`supplier-score-badge ${getScoreClass(supplier.avg_score)}`}>
                      {supplier.avg_score != null ? <>{normalizeToTen(supplier.avg_score)!.toFixed(2)}<span style={{ fontSize: '0.65em', fontWeight: 500, opacity: 0.6, marginLeft: 1 }}>/10</span></> : '—'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {supplier.last_participation
                      ? new Date(supplier.last_participation).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'short' })
                      : '—'}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {supplier.contact_person || supplier.email || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Side Panel */}
      {detail && (
        <SupplierDetailPanel
          supplier={detail}
          onClose={() => setSelectedSupplier(null)}
          onSave={upsertSupplier}
          language={language}
          t={t}
        />
      )}
    </div>
  );
};

interface DetailPanelProps {
  supplier: SupplierEntry;
  onClose: () => void;
  onSave: (data: any) => Promise<boolean>;
  language: string;
  t: (key: string) => string;
}

const SupplierDetailPanel = ({ supplier, onClose, onSave, language, t }: DetailPanelProps) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    email: supplier.email || '',
    phone: supplier.phone || '',
    contact_person: supplier.contact_person || '',
    category: supplier.category || 'engineering',
    website: supplier.website || '',
    notes: supplier.notes || '',
  });

  const handleSave = async () => {
    const ok = await onSave({
      name: supplier.supplier_name,
      display_name: supplier.display_name || supplier.supplier_name,
      ...form,
    });
    if (ok) setEditing(false);
  };

  return (
    <div className="supplier-detail-overlay">
      <div className="supplier-detail-header">
        <h3>{supplier.display_name || supplier.supplier_name}</h3>
        <button className="supplier-detail-close" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="supplier-detail-body">
        {/* Score Overview */}
        <div className="supplier-detail-section">
          <div className="supplier-detail-section-title">{t('supplier.detail.scores')}</div>
          <div className="supplier-score-overview">
            <div className="score-overview-item">
              <div className={`score-val`} style={{ color: supplier.avg_score != null && (supplier.avg_score > 10 ? supplier.avg_score / 10 : supplier.avg_score) >= 7 ? '#41d17a' : supplier.avg_score != null && (supplier.avg_score > 10 ? supplier.avg_score / 10 : supplier.avg_score) >= 5 ? '#fbbf24' : 'var(--text-tertiary)' }}>
                {supplier.avg_score != null ? <>{(supplier.avg_score > 10 ? supplier.avg_score / 10 : supplier.avg_score).toFixed(2)}<span style={{ fontSize: '0.5em', fontWeight: 500, opacity: 0.5 }}>/10</span></> : '—'}
              </div>
              <div className="score-label">{t('supplier.detail.avg')}</div>
            </div>
            <div className="score-overview-item">
              <div className="score-val">{supplier.best_score != null ? <>{(supplier.best_score > 10 ? supplier.best_score / 10 : supplier.best_score).toFixed(2)}<span style={{ fontSize: '0.5em', fontWeight: 500, opacity: 0.5 }}>/10</span></> : '—'}</div>
              <div className="score-label">{t('supplier.detail.best')}</div>
            </div>
            <div className="score-overview-item">
              <div className="score-val">{supplier.worst_score != null ? <>{(supplier.worst_score > 10 ? supplier.worst_score / 10 : supplier.worst_score).toFixed(2)}<span style={{ fontSize: '0.5em', fontWeight: 500, opacity: 0.5 }}>/10</span></> : '—'}</div>
              <div className="score-label">{t('supplier.detail.worst')}</div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="supplier-detail-section">
          <div className="supplier-detail-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {t('supplier.detail.contact')}
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              style={{
                background: 'none', border: 'none', color: 'var(--accent)',
                fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, textTransform: 'none',
                letterSpacing: 0,
              }}
            >
              {editing ? t('supplier.detail.save') : t('supplier.detail.edit')}
            </button>
          </div>

          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['email', 'phone', 'contact_person', 'category', 'website'] as const).map(field => (
                <div key={field}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>
                    {t(`supplier.field.${field}`)}
                  </label>
                  <input
                    style={{
                      width: '100%', padding: '8px 10px', background: 'var(--bg-surface-alt)',
                      border: '1px solid var(--border-color)', borderRadius: 8,
                      color: 'var(--text-primary)', fontSize: '0.85rem',
                    }}
                    value={form[field]}
                    onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>
                  {t('supplier.field.notes')}
                </label>
                <textarea
                  style={{
                    width: '100%', padding: '8px 10px', background: 'var(--bg-surface-alt)',
                    border: '1px solid var(--border-color)', borderRadius: 8,
                    color: 'var(--text-primary)', fontSize: '0.85rem', minHeight: 80, resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            <>
              <DetailField icon="mail" label={t('supplier.field.email')} value={supplier.email} />
              <DetailField icon="phone" label={t('supplier.field.phone')} value={supplier.phone} />
              <DetailField icon="user" label={t('supplier.field.contact_person')} value={supplier.contact_person} />
              <DetailField icon="tag" label={t('supplier.field.category')} value={supplier.category} />
              <DetailField icon="globe" label={t('supplier.field.website')} value={supplier.website} />
              <DetailField icon="file-text" label={t('supplier.field.notes')} value={supplier.notes} />
            </>
          )}
        </div>

        {/* Project History */}
        <div className="supplier-detail-section">
          <div className="supplier-detail-section-title">
            {t('supplier.detail.history')} ({supplier.project_count})
          </div>
          <div className="supplier-project-history">
            {supplier.project_names.map(pn => (
              <div key={pn} className="supplier-project-entry">
                <div className="entry-name">{pn}</div>
                <div className="entry-meta">
                  {supplier.last_participation
                    ? new Date(supplier.last_participation).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long' })
                    : ''}
                </div>
              </div>
            ))}
            {supplier.project_names.length === 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>
                {t('supplier.detail.no_history')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailField = ({ icon, label, value }: { icon: string; label: string; value: string | null }) => {
  const iconSvg = {
    mail: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    phone: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    user: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    tag: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    globe: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    'file-text': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  }[icon];

  return (
    <div className="supplier-detail-field">
      <div className="field-icon">{iconSvg}</div>
      <div className="field-content">
        <div className="field-label">{label}</div>
        <div className={`field-value ${!value ? 'empty' : ''}`}>{value || '—'}</div>
      </div>
    </div>
  );
};
