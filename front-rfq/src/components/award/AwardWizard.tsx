import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './AwardWizard.css';
import { useAwardStore, AwardJustificationPayload } from '../../stores/useAwardStore';
import { useScoringStore } from '../../stores/useScoringStore';
import { useScoringConfigStore } from '../../stores/useScoringConfigStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { getProviderDisplayName, getProviderColor } from '../../types/provider.types';
import { useProviderStore } from '../../stores/useProviderStore';

interface AwardWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onAwarded?: () => void;
}

type WizardStep = 'select' | 'justify' | 'confirm';

export const AwardWizard: React.FC<AwardWizardProps> = ({ isOpen, onClose, onAwarded }) => {
  const { t } = useLanguageStore();
  const { scoringResults, customWeights } = useScoringStore();
  const { categories: dynamicCategories, hasConfiguration } = useScoringConfigStore();
  const { activeProjectId, projects, loadProjects } = useProjectStore();
  const { projectProviders } = useProviderStore();
  const {
    isGeneratingJustification,
    generatedJustification,
    isLoading,
    error,
    generateJustification,
    createAward,
    resetJustification,
  } = useAwardStore();

  const [step, setStep] = useState<WizardStep>('select');
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [justificationText, setJustificationText] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const activeProject = projects.find(p => p.id === activeProjectId);

  // Build scoring criteria for payload
  const scoringCriteria = useMemo(() => {
    const categories = Array.isArray(dynamicCategories) ? dynamicCategories : [];
    if (hasConfiguration && categories.length > 0) {
      const criteria: Array<{ id: string; category: string; weight: number }> = [];
      categories.forEach((cat: any) => {
        if (!cat?.name) return;
        const catCriteria = Array.isArray(cat.criteria) ? cat.criteria : [];
        const criteriaSum = catCriteria.reduce((s: number, c: any) => s + (c.weight || 0), 0);
        const isRelative = catCriteria.length > 0 && Math.abs(criteriaSum - 100) < 1;
        catCriteria.forEach((crit: any) => {
          if (!crit?.name) return;
          const actualWeight = isRelative
            ? ((crit.weight || 0) * (cat.weight || 0)) / 100
            : (crit.weight || 0);
          criteria.push({ id: String(crit.name), category: String(cat.name), weight: parseFloat(actualWeight.toFixed(2)) });
        });
      });
      return criteria;
    }
    return [
      { id: 'scope_facilities', category: 'technical', weight: 10 },
      { id: 'scope_work', category: 'technical', weight: 10 },
      { id: 'deliverables_quality', category: 'technical', weight: 10 },
      { id: 'total_price', category: 'economic', weight: 15 },
      { id: 'price_breakdown', category: 'economic', weight: 8 },
      { id: 'optionals_included', category: 'economic', weight: 7 },
      { id: 'capex_opex_methodology', category: 'economic', weight: 5 },
      { id: 'schedule', category: 'execution', weight: 8 },
      { id: 'resources_allocation', category: 'execution', weight: 6 },
      { id: 'exceptions', category: 'execution', weight: 6 },
      { id: 'safety_studies', category: 'hse_compliance', weight: 8 },
      { id: 'regulatory_compliance', category: 'hse_compliance', weight: 7 },
    ];
  }, [hasConfiguration, dynamicCategories]);

  // Recalculate ranking
  const sortedProviders = useMemo(() => {
    const allProviders = scoringResults?.ranking || [];
    return allProviders.map(provider => {
      const ind = provider.individual_scores || {};
      const newOverall = scoringCriteria.reduce((total, c) => {
        const score = ind[c.id] || 0;
        const weight = customWeights[c.id] ?? c.weight ?? 0;
        return total + (score * weight / 100);
      }, 0);

      const categories = Array.isArray(dynamicCategories) ? dynamicCategories : [];
      const catWeightsMap: Record<string, number> = {};
      if (hasConfiguration && categories.length > 0) {
        categories.forEach((cat: any) => { if (cat?.name) catWeightsMap[String(cat.name)] = Number(cat.weight) || 0; });
      } else {
        for (const crit of scoringCriteria) catWeightsMap[crit.category] = (catWeightsMap[crit.category] || 0) + (customWeights[crit.id] ?? crit.weight ?? 0);
      }

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

  // Auto-select winner on open
  useEffect(() => {
    if (isOpen && sortedProviders.length > 0 && !selectedWinner) {
      setSelectedWinner(sortedProviders[0].provider_name);
    }
  }, [isOpen, sortedProviders, selectedWinner]);

  // Sync generated justification to editable text
  useEffect(() => {
    if (generatedJustification) {
      setJustificationText(generatedJustification);
    }
  }, [generatedJustification]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      setSelectedWinner('');
      setJustificationText('');
      setShowSuccess(false);
      resetJustification();
    }
  }, [isOpen, resetJustification]);

  const selectedProvider = sortedProviders.find(p => p.provider_name === selectedWinner);
  const runnerUp = sortedProviders.find(p => p.provider_name !== selectedWinner);

  const handleGenerateJustification = async () => {
    if (!selectedProvider || !activeProject) return;

    const ind = selectedProvider.individual_scores || {};
    const strengths = Object.entries(ind)
      .filter(([, score]) => (score as number) >= 8)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 4)
      .map(([id]) => id);

    const weaknesses = Object.entries(ind)
      .sort(([, a], [, b]) => (a as number) - (b as number))
      .slice(0, 3)
      .map(([id]) => id);

    const categoryScores: Record<string, number> = {};
    if (selectedProvider.scores) {
      Object.entries(selectedProvider.scores).forEach(([key, val]) => {
        categoryScores[key] = val as number;
      });
    }

    const weightsSummary = scoringCriteria
      .map(c => `${c.id}: ${customWeights[c.id] ?? c.weight}%`)
      .join(', ');

    const payload: AwardJustificationPayload = {
      project_name: activeProject.display_name || activeProject.name,
      project_type: activeProject.project_type || 'RFP',
      winner_name: getProviderDisplayName(selectedProvider.provider_name),
      winner_score: selectedProvider.overall_score,
      runner_up_name: runnerUp ? getProviderDisplayName(runnerUp.provider_name) : undefined,
      runner_up_score: runnerUp?.overall_score,
      total_providers: sortedProviders.length,
      category_scores: categoryScores,
      strengths,
      weaknesses,
      scoring_criteria_summary: weightsSummary,
    };

    await generateJustification(payload);
    setStep('justify');
  };

  const handleConfirmAward = async () => {
    if (!activeProjectId || !selectedWinner || !justificationText) return;

    const result = await createAward(activeProjectId, selectedWinner, justificationText);
    if (result) {
      setShowSuccess(true);
      loadProjects();
      setTimeout(() => {
        onAwarded?.();
        onClose();
      }, 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)',
        width: '680px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
        animation: 'fadeInUp 0.3s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-cyan))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('award.wizard_title')}
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {t('award.wizard_subtitle')}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px',
            color: 'var(--text-secondary)', borderRadius: '8px',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Steps indicator */}
        <div style={{
          display: 'flex', gap: '4px', padding: '16px 24px',
          borderBottom: '1px solid var(--border-color)',
        }}>
          {(['select', 'justify', 'confirm'] as WizardStep[]).map((s, i) => {
            const labels = [t('award.step_select'), t('award.step_justify'), t('award.step_confirm')];
            const isActive = step === s;
            const isDone = (step === 'justify' && i === 0) || (step === 'confirm' && i <= 1);
            return (
              <div key={s} style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700,
                  background: isDone ? 'var(--color-success)' : isActive ? 'var(--color-primary)' : 'var(--bg-surface-alt)',
                  color: isDone || isActive ? 'white' : 'var(--text-secondary)',
                  transition: 'all 0.3s',
                }}>
                  {isDone ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : i + 1}
                </div>
                <span style={{
                  fontSize: '0.78rem', fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}>
                  {labels[i]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Success overlay */}
          {showSuccess && (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              animation: 'fadeInUp 0.4s ease-out',
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 16px',
                background: 'rgba(16, 185, 129, 0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('award.success_title')}
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {t('award.success_msg')}
              </p>
            </div>
          )}

          {/* Step 1: Select winner */}
          {step === 'select' && !showSuccess && (
            <div>
              <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {t('award.select_desc')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sortedProviders.map((p, i) => {
                  const isSelected = selectedWinner === p.provider_name;
                  const color = getProviderColor(p.provider_name, projectProviders);
                  const medals = ['#FFD700', '#C0C0C0', '#CD7F32'];
                  return (
                    <button key={p.provider_name} onClick={() => setSelectedWinner(p.provider_name)} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '14px 16px', borderRadius: 'var(--radius-md)',
                      border: isSelected ? `2px solid ${color}` : '2px solid var(--border-color)',
                      background: isSelected ? `${color}10` : 'var(--bg-surface)',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                      transition: 'all 0.2s',
                    }}>
                      {/* Position */}
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: i < 3 ? `${medals[i]}20` : 'var(--bg-surface-alt)',
                        color: i < 3 ? medals[i] : 'var(--text-secondary)',
                        fontWeight: 800, fontSize: '0.85rem',
                      }}>
                        #{i + 1}
                      </div>
                      {/* Provider info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {getProviderDisplayName(p.provider_name)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {t('executive.score')}: {p.overall_score.toFixed(2)}/10 | {t('report.compliance')}: {(p.compliance_percentage || 0).toFixed(0)}%
                        </div>
                      </div>
                      {/* Radio indicator */}
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        border: isSelected ? `6px solid ${color}` : '2px solid var(--border-color)',
                        transition: 'all 0.2s', flexShrink: 0,
                      }} />
                    </button>
                  );
                })}
              </div>
              {/* Next button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button onClick={onClose} style={{
                  padding: '10px 20px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)', background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                }}>
                  {t('report.cancel')}
                </button>
                <button onClick={handleGenerateJustification} disabled={!selectedWinner || isGeneratingJustification} style={{
                  padding: '10px 24px', borderRadius: 'var(--radius-md)', border: 'none',
                  background: selectedWinner ? 'linear-gradient(135deg, var(--color-primary), var(--color-cyan))' : 'var(--bg-surface-alt)',
                  color: selectedWinner ? 'white' : 'var(--text-secondary)',
                  fontSize: '0.85rem', fontWeight: 700, cursor: selectedWinner ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'all 0.2s',
                }}>
                  {isGeneratingJustification ? (
                    <>
                      <div style={{
                        width: '16px', height: '16px', borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      {t('award.generating')}
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      {t('award.generate_btn')}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review/Edit justification */}
          {step === 'justify' && !showSuccess && (
            <div>
              {/* Winner banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                marginBottom: '16px', padding: '12px', borderRadius: 'var(--radius-md)',
                background: 'rgba(18, 181, 176, 0.08)', border: '1px solid rgba(18, 181, 176, 0.2)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                </svg>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  {t('award.winner_label')}: {selectedProvider ? getProviderDisplayName(selectedProvider.provider_name) : ''}
                </span>
                <span style={{
                  marginLeft: 'auto', padding: '3px 10px', borderRadius: '12px',
                  background: 'var(--color-primary)', color: 'white',
                  fontSize: '0.78rem', fontWeight: 700,
                }}>
                  {selectedProvider?.overall_score.toFixed(2)}/10
                </span>
              </div>

              {/* Label + Toggle */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '8px',
              }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {t('award.justification_label')}
                </label>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem',
                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    border: '1px solid var(--border-color)',
                    background: isEditing ? 'rgba(18, 181, 176, 0.1)' : 'var(--bg-surface)',
                    color: isEditing ? 'var(--color-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {isEditing ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      Preview
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      {t('setup.providers.edit') || 'Editar'}
                    </>
                  )}
                </button>
              </div>

              {/* Content: Edit or Preview */}
              {isEditing ? (
                <textarea
                  value={justificationText}
                  onChange={e => setJustificationText(e.target.value)}
                  style={{
                    width: '100%', minHeight: '340px', padding: '14px',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)', color: 'var(--text-primary)',
                    fontSize: '0.82rem', lineHeight: 1.6, fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    resize: 'vertical', outline: 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-primary-light)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                />
              ) : (
                <div className="award-md-preview" style={{
                  maxHeight: '400px', overflowY: 'auto', padding: '20px 24px',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                  background: 'var(--bg-surface-alt)',
                }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {justificationText}
                  </ReactMarkdown>
                </div>
              )}

              <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {t('award.justification_hint')}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button onClick={() => { setStep('select'); setIsEditing(false); }} style={{
                  padding: '10px 20px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)', background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                }}>
                  {t('award.back')}
                </button>
                <button onClick={() => { setStep('confirm'); setIsEditing(false); }} disabled={!justificationText.trim()} style={{
                  padding: '10px 24px', borderRadius: 'var(--radius-md)', border: 'none',
                  background: justificationText.trim() ? 'linear-gradient(135deg, var(--color-primary), var(--color-cyan))' : 'var(--bg-surface-alt)',
                  color: justificationText.trim() ? 'white' : 'var(--text-secondary)',
                  fontSize: '0.85rem', fontWeight: 700,
                  cursor: justificationText.trim() ? 'pointer' : 'not-allowed',
                }}>
                  {t('award.next')}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && !showSuccess && (
            <div>
              <div style={{
                padding: '20px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)',
                marginBottom: '20px',
              }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {t('award.confirm_title')}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                      {t('award.confirm_project')}
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {activeProject?.display_name || activeProject?.name || '-'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                      {t('award.confirm_winner')}
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      {selectedProvider ? getProviderDisplayName(selectedProvider.provider_name) : '-'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                      {t('executive.score')}
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {selectedProvider?.overall_score.toFixed(2)}/10
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                      {t('award.confirm_date')}
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div style={{
                padding: '14px 16px', borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '20px',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <strong>{t('award.warning_title')}</strong>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {t('award.warning_msg')}
                  </p>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--color-error)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '16px',
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep('justify')} style={{
                  padding: '10px 20px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)', background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                }}>
                  {t('award.back')}
                </button>
                <button onClick={handleConfirmAward} disabled={isLoading} style={{
                  padding: '12px 28px', borderRadius: 'var(--radius-md)', border: 'none',
                  background: 'linear-gradient(135deg, var(--color-success), #059669)',
                  color: 'white', fontSize: '0.9rem', fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  opacity: isLoading ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.2s',
                }}>
                  {isLoading ? (
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {t('award.confirm_btn')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
