import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useTechnicalReportStore, type TechnicalReportData, type ReportType } from '../stores/useTechnicalReportStore';
import { useScoringStore } from '../stores/useScoringStore';
import { useScoringConfigStore } from '../stores/useScoringConfigStore';
import { useScoringAuditStore } from '../stores/useScoringAuditStore';
import { useProjectStore } from '../stores/useProjectStore';
import { useLanguageStore } from '../stores/useLanguageStore';
import { usePdfTemplateStore } from '../stores/usePdfTemplateStore';
import { getProviderDisplayName } from '../types/provider.types';
import './TechnicalReportPage.css';

const REPORT_TYPE_LABELS: Record<ReportType, { es: string; en: string }> = {
  evaluation: { es: 'Informe de Evaluación', en: 'Evaluation Report' },
  comparison: { es: 'Informe Comparativo', en: 'Comparison Report' },
  executive_summary: { es: 'Resumen Ejecutivo', en: 'Executive Summary' },
  award_justification: { es: 'Justificación de Adjudicación', en: 'Award Justification' },
};

export const TechnicalReportPage: React.FC = () => {
  const { t } = useLanguageStore();
  const { activeProjectId, projects } = useProjectStore();
  const { scoringResults, customWeights } = useScoringStore();
  const { categories: dynamicCategories, hasConfiguration } = useScoringConfigStore();
  const { changeLog, loadChangeLog } = useScoringAuditStore();
  const { reports, activeReport, isLoading, isGenerating, loadReports, generateReport, deleteReport, setActiveReport } = useTechnicalReportStore();
  const pdfConfig = usePdfTemplateStore();

  const [selectedType, setSelectedType] = useState<ReportType>('evaluation');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const activeProject = projects.find(p => p.id === activeProjectId);

  useEffect(() => {
    if (activeProjectId) {
      loadReports(activeProjectId);
      loadChangeLog(activeProjectId);
    }
  }, [activeProjectId, loadReports, loadChangeLog]);

  // Build scoring criteria
  const scoringCriteria = useMemo(() => {
    const categories = Array.isArray(dynamicCategories) ? dynamicCategories : [];
    if (hasConfiguration && categories.length > 0) {
      const criteria: Array<{ id: string; category: string; weight: number; display: string }> = [];
      categories.forEach((cat: any) => {
        if (!cat?.name) return;
        const catCriteria = Array.isArray(cat.criteria) ? cat.criteria : [];
        const criteriaSum = catCriteria.reduce((s: number, c: any) => s + (c.weight || 0), 0);
        const isRelative = catCriteria.length > 0 && Math.abs(criteriaSum - 100) < 1;
        catCriteria.forEach((crit: any) => {
          if (!crit?.name) return;
          const w = isRelative ? ((crit.weight || 0) * (cat.weight || 0)) / 100 : (crit.weight || 0);
          criteria.push({
            id: String(crit.name),
            category: String(cat.name),
            weight: parseFloat(w.toFixed(2)),
            display: String(crit.display_name || crit.name),
          });
        });
      });
      return criteria;
    }
    return [];
  }, [hasConfiguration, dynamicCategories]);

  // Recalculated ranking
  const sorted = useMemo(() => {
    const providers = scoringResults?.ranking || [];
    if (providers.length === 0) return [];

    const catWeightsMap: Record<string, number> = {};
    const categories = Array.isArray(dynamicCategories) ? dynamicCategories : [];
    if (hasConfiguration && categories.length > 0) {
      categories.forEach((cat: any) => { if (cat?.name) catWeightsMap[String(cat.name)] = Number(cat.weight) || 0; });
    } else {
      for (const crit of scoringCriteria) catWeightsMap[crit.category] = (catWeightsMap[crit.category] || 0) + (customWeights[crit.id] ?? crit.weight ?? 0);
    }

    return providers.map(provider => {
      const ind = provider.individual_scores || {};
      const newOverall = scoringCriteria.reduce((total, c) => {
        const score = ind[c.id] || 0;
        const weight = customWeights[c.id] ?? c.weight ?? 0;
        return total + (score * weight / 100);
      }, 0);

      const newScores: Record<string, number> = {};
      for (const [catName, catWeight] of Object.entries(catWeightsMap)) {
        const cc = scoringCriteria.filter(c => c.category === catName);
        if (catWeight > 0 && cc.length > 0) {
          const ws = cc.reduce((sum, crit) => sum + ((ind[crit.id] || 0) * (customWeights[crit.id] ?? crit.weight ?? 0)), 0);
          newScores[catName] = ws / catWeight;
        } else newScores[catName] = 0;
      }
      return { ...provider, overall_score: newOverall, scores: newScores };
    }).sort((a, b) => b.overall_score - a.overall_score);
  }, [scoringResults, customWeights, scoringCriteria, hasConfiguration, dynamicCategories]);

  const handleGenerate = useCallback(async () => {
    if (!activeProjectId || sorted.length === 0) return;

    const scores = sorted.map(p => p.overall_score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stdDev = Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length);

    const categories = Array.isArray(dynamicCategories) ? dynamicCategories : [];
    const methodologyCategories = hasConfiguration && categories.length > 0
      ? categories.filter(c => c?.name).map(c => ({
          name: String(c.display_name || c.name),
          weight: Number(c.weight) || 0,
          criteria_count: Array.isArray(c.criteria) ? c.criteria.length : 0,
        }))
      : [
          { name: t('category.technical'), weight: 30, criteria_count: 3 },
          { name: t('category.economic'), weight: 35, criteria_count: 4 },
          { name: t('category.execution'), weight: 20, criteria_count: 3 },
          { name: t('category.hse_compliance'), weight: 15, criteria_count: 2 },
        ];

    const data: TechnicalReportData = {
      methodology: {
        description: t('report.methodology_desc'),
        scoring_model: t('report.scoring_model_weighted'),
        categories: methodologyCategories,
        total_weight: methodologyCategories.reduce((s, c) => s + c.weight, 0),
      },
      ranking: sorted.map((p, i) => {
        const ind = p.individual_scores || {};
        const sortedScores = Object.entries(ind).sort((a, b) => (b[1] as number) - (a[1] as number));
        return {
          position: i + 1,
          provider_name: getProviderDisplayName(p.provider_name),
          overall_score: p.overall_score,
          category_scores: p.scores || {},
          strengths: sortedScores.slice(0, 3).map(([k]) => {
            const found = scoringCriteria.find(c => c.id === k);
            return found ? found.display : k;
          }),
          weaknesses: sortedScores.slice(-2).map(([k]) => {
            const found = scoringCriteria.find(c => c.id === k);
            return found ? found.display : k;
          }),
          compliance_percentage: p.compliance_percentage || 0,
        };
      }),
      analysis: {
        score_distribution: { min: Math.min(...scores), max: Math.max(...scores), avg, std_dev: stdDev },
        winner_margin: sorted.length > 1 ? sorted[0].overall_score - sorted[1].overall_score : 0,
        risk_factors: stdDev < 0.5 ? [t('report.risk_close_scores')] : [],
        recommendations: sorted[0].overall_score < 6 ? [t('report.rec_low_score')] : [],
      },
      change_log: changeLog.slice(0, 20).map(entry => ({
        date: new Date(entry.created_at).toLocaleDateString(),
        change_type: entry.change_type,
        field: entry.field_changed,
        description: entry.reason || `${entry.field_changed}: ${JSON.stringify(entry.old_value)} → ${JSON.stringify(entry.new_value)}`,
      })),
      generated_at: new Date().toISOString(),
      generated_by: 'BidEval v2',
    };

    const typeLabel = REPORT_TYPE_LABELS[selectedType];
    const lang = useLanguageStore.getState().language;
    const title = `${lang === 'es' ? typeLabel.es : typeLabel.en} - ${activeProject?.display_name || 'Project'} - v${(reports.filter(r => r.report_type === selectedType).length || 0) + 1}`;

    await generateReport(activeProjectId, selectedType, title, data);
  }, [activeProjectId, sorted, selectedType, dynamicCategories, hasConfiguration, scoringCriteria, customWeights, changeLog, t, reports, generateReport, activeProject]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!activeProjectId) {
    return (
      <div className="report-viewer-empty" style={{ padding: '60px 20px' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span>{t('report.select_project')}</span>
      </div>
    );
  }

  return (
    <div className="report-page">
      {/* Hero header — same pattern as winner-banner */}
      <div className="report-hero">
        <div className="report-hero-info">
          <h2>{t('report.title')}</h2>
          <div className="report-hero-subtitle">
            {activeProject?.display_name || ''} — {reports.length} {t('report.versions_generated')}
          </div>
        </div>

        <div className="report-hero-actions">
          <select
            className="report-type-select"
            value={selectedType}
            onChange={e => setSelectedType(e.target.value as ReportType)}
          >
            {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map(type => {
              const label = REPORT_TYPE_LABELS[type];
              const lang = useLanguageStore.getState().language;
              return <option key={type} value={type}>{lang === 'es' ? label.es : label.en}</option>;
            })}
          </select>
          <button
            className="report-generate-btn"
            onClick={handleGenerate}
            disabled={isGenerating || sorted.length === 0}
          >
            {isGenerating ? t('report.generating') : t('report.generate')}
          </button>
        </div>
      </div>

      {/* Body: sidebar + viewer */}
      <div className="report-body">
        {/* Version history sidebar */}
        <div className="report-sidebar">
          <div className="report-sidebar-title">{t('report.history')}</div>
          <div className="report-sidebar-list">
            {isLoading ? (
              <div className="report-sidebar-empty">{t('report.loading')}</div>
            ) : reports.length === 0 ? (
              <div className="report-sidebar-empty">{t('report.no_reports')}</div>
            ) : (
              reports.map(report => (
                <div
                  key={report.id}
                  className={`report-sidebar-item ${activeReport?.id === report.id ? 'active' : ''}`}
                  onClick={() => setActiveReport(report)}
                >
                  <div className="report-sidebar-item-title">{report.title}</div>
                  <div className="report-sidebar-item-meta">
                    <span className="report-sidebar-item-version">
                      v{report.version} — {formatDate(report.created_at)}
                    </span>
                    <button
                      className="report-delete-btn"
                      onClick={e => { e.stopPropagation(); setShowDeleteConfirm(report.id); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    </button>
                  </div>

                  {showDeleteConfirm === report.id && (
                    <div className="report-delete-confirm">
                      <button
                        className="report-delete-confirm-cancel"
                        onClick={e => { e.stopPropagation(); setShowDeleteConfirm(null); }}
                      >
                        {t('report.cancel')}
                      </button>
                      <button
                        className="report-delete-confirm-yes"
                        onClick={e => { e.stopPropagation(); deleteReport(report.id); setShowDeleteConfirm(null); }}
                      >
                        {t('report.delete')}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Report viewer */}
        <div className="report-viewer-panel">
          {activeReport ? (
            <ReportViewer report={activeReport} pdfConfig={pdfConfig} t={t} />
          ) : (
            <div className="report-viewer-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span>{t('report.select_or_generate')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Report Viewer ─── */
interface ReportViewerProps {
  report: any;
  pdfConfig: any;
  t: (key: string) => string;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ report, pdfConfig, t }) => {
  const data = report.report_data as TechnicalReportData | undefined;
  if (!data) return <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>{t('report.no_data')}</div>;

  return (
    <div>
      {/* Report header */}
      <div className="report-viewer-header">
        {pdfConfig.logoDataUrl && (
          <img src={pdfConfig.logoDataUrl} alt="Logo" />
        )}
        <h2>{report.title}</h2>
        <div className="report-viewer-header-meta">
          v{report.version} — {new Date(report.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          {' '} — {t('report.generated_by')} {data.generated_by}
        </div>
      </div>

      {/* 1. Methodology */}
      <div className="report-section">
        <div className="report-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
          {t('report.section_methodology')}
        </div>
        <p className="report-section-desc">{data.methodology.description}</p>
        <div className="report-methodology-grid">
          {data.methodology.categories.map(cat => (
            <div key={cat.name} className="report-methodology-card">
              <div className="report-methodology-card-name">{cat.name}</div>
              <div className="report-methodology-card-weight">{cat.weight}%</div>
              <div className="report-methodology-card-count">{cat.criteria_count} {t('report.criteria')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Ranking */}
      <div className="report-section">
        <div className="report-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
          {t('report.section_ranking')}
        </div>
        <table className="report-ranking-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t('report.provider')}</th>
              <th className="center">{t('report.score')}</th>
              <th className="center hide-mobile">{t('report.compliance')}</th>
              <th>{t('report.strengths')}</th>
            </tr>
          </thead>
          <tbody>
            {data.ranking.map(entry => (
              <tr key={entry.provider_name} className={entry.position === 1 ? 'winner' : ''}>
                <td className={entry.position <= 3 ? 'pos-top3' : 'pos-other'}>
                  {entry.position}
                </td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {entry.provider_name}
                </td>
                <td className={`center ${entry.overall_score >= 7 ? 'score-high' : entry.overall_score >= 5 ? 'score-mid' : 'score-low'}`}>
                  {entry.overall_score.toFixed(2)}
                </td>
                <td className="center hide-mobile" style={{ fontWeight: 600 }}>
                  {entry.compliance_percentage.toFixed(0)}%
                </td>
                <td>
                  <div className="report-strength-tags">
                    {entry.strengths.slice(0, 3).map(s => (
                      <span key={s} className="report-strength-tag">{s}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. Analysis */}
      <div className="report-section">
        <div className="report-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          {t('report.section_analysis')}
        </div>
        <div className="report-stats-grid">
          {[
            { label: t('report.min_score'), value: data.analysis.score_distribution.min.toFixed(2) },
            { label: t('report.max_score'), value: data.analysis.score_distribution.max.toFixed(2) },
            { label: t('report.avg_score'), value: data.analysis.score_distribution.avg.toFixed(2) },
            { label: t('report.winner_margin'), value: `+${data.analysis.winner_margin.toFixed(2)}` },
          ].map(stat => (
            <div key={stat.label} className="report-stat-card">
              <div className="report-stat-label">{stat.label}</div>
              <div className="report-stat-value">{stat.value}</div>
            </div>
          ))}
        </div>

        {data.analysis.risk_factors.length > 0 && (
          <div className="report-alert-section">
            <div className="report-alert-title warning">{t('report.risk_factors')}</div>
            {data.analysis.risk_factors.map(r => (
              <div key={r} className="report-alert-item">{r}</div>
            ))}
          </div>
        )}

        {data.analysis.recommendations.length > 0 && (
          <div className="report-alert-section">
            <div className="report-alert-title info">{t('report.recommendations')}</div>
            {data.analysis.recommendations.map(r => (
              <div key={r} className="report-alert-item">{r}</div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Change Log */}
      {data.change_log.length > 0 && (
        <div className="report-section">
          <div className="report-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            {t('report.section_changelog')}
          </div>
          <div className="report-changelog-list">
            {data.change_log.map(entry => (
              <div key={`${entry.date}-${entry.field}`} className="report-changelog-entry">
                <span className="report-changelog-date">{entry.date}</span>
                <span className="report-changelog-type">{entry.change_type}</span>
                <span className="report-changelog-desc">{entry.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="report-viewer-footer">
        {pdfConfig.footerText || 'BidEval v2'} — {t('report.generated_at')} {new Date(data.generated_at).toLocaleString()}
      </div>
    </div>
  );
};

export default TechnicalReportPage;
