import React, { useState, useMemo } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { useSetupStore } from '../../../stores/useSetupStore';
import { useScoringConfigStore, CATEGORY_COLORS } from '../../../stores/useScoringConfigStore';
import type { ProjectSetupData } from '../ProjectSetupWizard';
import type { DocCategory } from '../../../types/database.types';

// ============================================
// PROPS
// ============================================

interface StepValidationProps {
  data: ProjectSetupData;
  onGoToStep: (step: number) => void;
}

// ============================================
// CONSTANTS
// ============================================

const DOC_CATEGORY_LABELS: Record<DocCategory, { es: string; en: string }> = {
  technical: { es: 'tecnicos', en: 'technical' },
  economic: { es: 'economicos', en: 'economic' },
  administrative: { es: 'administrativos', en: 'administrative' },
  legal: { es: 'legales', en: 'legal' },
  hse: { es: 'HSE', en: 'HSE' },
  custom: { es: 'personalizados', en: 'custom' },
};

const STEP_LABELS: Record<number, { es: string; en: string }> = {
  1: { es: 'Informacion', en: 'Info' },
  2: { es: 'Fechas', en: 'Deadlines' },
  3: { es: 'Proveedores', en: 'Providers' },
  4: { es: 'Documentos', en: 'Documents' },
  5: { es: 'Economico', en: 'Economic' },
  6: { es: 'Criterios', en: 'Criteria' },
};

// ============================================
// ICONS (inline SVGs)
// ============================================

const IconCheck: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#22c55e' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconX: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#ef4444' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconWarning: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#f59e0b' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconEdit: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconChevron: React.FC<{ size?: number; direction?: 'down' | 'up' }> = ({ size = 16, direction = 'down' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transition: 'transform 0.2s', transform: direction === 'up' ? 'rotate(180deg)' : 'rotate(0deg)' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconSave: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const IconCheckCircle: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#22c55e' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

// ============================================
// COMPONENT
// ============================================

export const StepValidation: React.FC<StepValidationProps> = ({ data, onGoToStep }) => {
  const { t, language } = useLanguageStore();
  const { milestones, documentTypes, economicFields, validateSetup, saveAsTemplate, isLoading } = useSetupStore();
  const { draftCategories } = useScoringConfigStore();

  // Template section state
  const [templateOpen, setTemplateOpen] = useState(false);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateSaved, setTemplateSaved] = useState(false);

  // Run validation
  const validation = useMemo(
    () => validateSetup(data, draftCategories),
    [data, draftCategories, validateSetup],
  );

  // Build comprehensive check list with pass/fail per step
  const checkItems = useMemo(() => {
    const items: Array<{
      step: number;
      label: string;
      status: 'pass' | 'error' | 'warning';
      message: string;
    }> = [];

    // Step 1: Project name
    const nameError = validation.errors.find((e) => e.step === 1);
    items.push({
      step: 1,
      label: language === 'es' ? 'Nombre del proyecto valido' : 'Valid project name',
      status: nameError ? 'error' : 'pass',
      message: nameError?.message || (language === 'es' ? 'OK' : 'OK'),
    });

    // Step 2: Milestones
    const milestoneWarning = validation.warnings.find((w) => w.step === 2);
    items.push({
      step: 2,
      label: language === 'es' ? 'Al menos un hito definido' : 'At least one milestone',
      status: milestoneWarning ? 'warning' : 'pass',
      message: milestoneWarning?.message || `${milestones.length} ${language === 'es' ? 'hitos definidos' : 'milestones defined'}`,
    });

    // Check milestone date ordering
    const milestonesWithDates = milestones.filter((m) => m.dueDate);
    if (milestonesWithDates.length >= 2) {
      const sorted = [...milestonesWithDates].sort((a, b) => a.sortOrder - b.sortOrder);
      let datesInOrder = true;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].dueDate < sorted[i - 1].dueDate) {
          datesInOrder = false;
          break;
        }
      }
      if (!datesInOrder) {
        items.push({
          step: 2,
          label: language === 'es' ? 'Fechas en orden cronologico' : 'Dates in chronological order',
          status: 'warning',
          message: language === 'es' ? 'Algunas fechas no estan en orden' : 'Some dates are out of order',
        });
      }
    }

    // Step 3: Providers
    const providerCount = data.providers.length;
    items.push({
      step: 3,
      label: language === 'es' ? 'Al menos un proveedor' : 'At least one provider',
      status: providerCount === 0 ? 'warning' : 'pass',
      message: providerCount === 0
        ? (language === 'es' ? 'No se han agregado proveedores' : 'No providers added')
        : `${providerCount} ${language === 'es' ? 'proveedores' : 'providers'}`,
    });

    // Step 4: Document types
    const docWarning = validation.warnings.find((w) => w.step === 4);
    items.push({
      step: 4,
      label: language === 'es' ? 'Al menos un tipo de documento' : 'At least one document type',
      status: docWarning ? 'warning' : 'pass',
      message: docWarning?.message || `${documentTypes.length} ${language === 'es' ? 'tipos definidos' : 'types defined'}`,
    });

    // Step 5: Economic fields (only if not RFI)
    if (data.projectType !== 'RFI') {
      items.push({
        step: 5,
        label: language === 'es' ? 'Al menos un campo economico' : 'At least one economic field',
        status: economicFields.length === 0 ? 'warning' : 'pass',
        message: economicFields.length === 0
          ? (language === 'es' ? 'No se han definido campos economicos' : 'No economic fields defined')
          : `${economicFields.length} ${t('setup.validation.fields_count') || (language === 'es' ? 'campos economicos' : 'economic fields')}`,
      });
    }

    // Step 6: Scoring weights
    const weightError = validation.errors.find((e) => e.step === 6 && e.field === 'scoringWeights');
    if (draftCategories.length > 0) {
      items.push({
        step: 6,
        label: language === 'es' ? 'Pesos suman 100%' : 'Weights sum to 100%',
        status: weightError ? 'error' : 'pass',
        message: weightError?.message || 'OK',
      });
    }

    // Step 6: Sub-criteria warnings
    const subCriteriaWarnings = validation.warnings.filter(
      (w) => w.step === 6 && w.field.startsWith('scoringCriteria'),
    );
    subCriteriaWarnings.forEach((w) => {
      items.push({
        step: 6,
        label: language === 'es' ? 'Sub-criterios balanceados' : 'Sub-criteria balanced',
        status: 'warning',
        message: w.message,
      });
    });

    return items;
  }, [validation, milestones, documentTypes, economicFields, draftCategories, data, language, t]);

  // Overall status
  const overallStatus = useMemo(() => {
    if (validation.errors.length > 0) return 'error';
    if (validation.warnings.length > 0 || checkItems.some((c) => c.status === 'warning')) return 'warning';
    return 'pass';
  }, [validation, checkItems]);

  // Group checks by step
  const groupedChecks = useMemo(() => {
    const grouped = new Map<number, typeof checkItems>();
    checkItems.forEach((item) => {
      const list = grouped.get(item.step) || [];
      list.push(item);
      grouped.set(item.step, list);
    });
    return grouped;
  }, [checkItems]);

  // Document summary by category
  const docSummary = useMemo(() => {
    const counts: Partial<Record<DocCategory, number>> = {};
    documentTypes.forEach((doc) => {
      counts[doc.docCategory] = (counts[doc.docCategory] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([cat, count]) => {
        const label = DOC_CATEGORY_LABELS[cat as DocCategory];
        return `${count} ${language === 'es' ? label.es : label.en}`;
      })
      .join(', ');
  }, [documentTypes, language]);

  // Top-level economic fields (no parentId)
  const topLevelFields = useMemo(
    () => economicFields.filter((f) => !f.parentId),
    [economicFields],
  );

  // Total category weight
  const totalWeight = useMemo(
    () => draftCategories.reduce((sum, cat) => sum + cat.weight, 0),
    [draftCategories],
  );

  // Format a date string nicely
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return t('setup.validation.no_date') || 'Sin fecha';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Save template handler
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    try {
      await saveAsTemplate(templateName.trim(), templateDesc.trim(), data.projectType, data);
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 3000);
    } catch {
      // Error is handled by the store
    }
  };

  // Status icon renderer
  const StatusIcon: React.FC<{ status: 'pass' | 'error' | 'warning' }> = ({ status }) => {
    switch (status) {
      case 'pass': return <IconCheck size={16} color="#22c55e" />;
      case 'error': return <IconX size={16} color="#ef4444" />;
      case 'warning': return <IconWarning size={16} color="#f59e0b" />;
    }
  };

  // Status banner styles
  const bannerConfig = {
    pass: {
      borderColor: '#22c55e',
      background: 'rgba(34, 197, 94, 0.06)',
      color: '#22c55e',
      text: t('setup.validation.all_good') || 'Todo listo para crear el proyecto',
    },
    warning: {
      borderColor: '#f59e0b',
      background: 'rgba(245, 158, 11, 0.06)',
      color: '#f59e0b',
      text: t('setup.validation.has_warnings') || 'Hay advertencias, pero puedes continuar',
    },
    error: {
      borderColor: '#ef4444',
      background: 'rgba(239, 68, 68, 0.06)',
      color: '#ef4444',
      text: t('setup.validation.has_errors') || 'Hay errores que debes corregir antes de continuar',
    },
  };

  const banner = bannerConfig[overallStatus];

  return (
    <div>
      {/* Hint */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          {t('setup.validation.hint') || 'Revisa la configuracion completa antes de crear el proyecto.'}
        </p>
      </div>

      {/* ================================================
          SECTION 1: STATUS BANNER + VALIDATION CHECKS
          ================================================ */}

      {/* Overall Status Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 18px',
        borderRadius: '12px',
        marginBottom: '16px',
        border: `1px solid ${banner.borderColor}30`,
        borderLeft: `4px solid ${banner.borderColor}`,
        background: banner.background,
      }}>
        {overallStatus === 'pass' ? (
          <IconCheckCircle size={22} color={banner.color} />
        ) : overallStatus === 'warning' ? (
          <IconWarning size={22} color={banner.color} />
        ) : (
          <IconX size={22} color={banner.color} />
        )}
        <span style={{
          fontSize: '0.9rem',
          fontWeight: 600,
          color: banner.color,
        }}>
          {banner.text}
        </span>
      </div>

      {/* Validation Checks by Step */}
      <div style={{ marginBottom: '24px' }}>
        {Array.from(groupedChecks.entries())
          .sort(([a], [b]) => a - b)
          .map(([step, items]) => (
            <div key={step} style={{ marginBottom: '8px' }}>
              {/* Step group header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 0',
                marginBottom: '4px',
              }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: 'var(--bg-surface-alt)',
                  color: 'var(--text-tertiary)',
                  border: '1px solid var(--border-color)',
                  flexShrink: 0,
                }}>
                  {step}
                </span>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}>
                  {t('setup.validation.step') || 'Paso'} {step}: {language === 'es' ? STEP_LABELS[step]?.es : STEP_LABELS[step]?.en}
                </span>
              </div>

              {/* Check rows */}
              {items.map((item, idx) => (
                <div
                  key={`${step}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    marginBottom: '2px',
                    background: item.status === 'error'
                      ? 'rgba(239, 68, 68, 0.04)'
                      : item.status === 'warning'
                        ? 'rgba(245, 158, 11, 0.04)'
                        : 'transparent',
                  }}
                >
                  <StatusIcon status={item.status} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                    }}>
                      {item.label}
                    </span>
                    {item.status !== 'pass' && (
                      <p style={{
                        margin: '2px 0 0 0',
                        fontSize: '0.72rem',
                        color: item.status === 'error' ? '#ef4444' : '#f59e0b',
                      }}>
                        {item.message}
                      </p>
                    )}
                  </div>
                  {item.status !== 'pass' && (
                    <button
                      className="setup-btn setup-btn-secondary"
                      onClick={() => onGoToStep(item.step)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        flexShrink: 0,
                      }}
                    >
                      {t('setup.validation.fix') || 'Corregir'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
      </div>

      {/* ================================================
          SECTION 2: CONFIGURATION SUMMARY
          ================================================ */}

      <div style={{
        fontSize: '0.9rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: '12px',
      }}>
        {t('setup.validation.summary') || 'Resumen de Configuracion'}
      </div>

      {/* Info Card */}
      <div className="setup-category-card" style={{ marginBottom: '10px' }}>
        <div className="setup-category-header" style={{ cursor: 'default' }}>
          <div className="setup-category-color" style={{ background: 'var(--accent, #12b5b0)' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="setup-category-name" style={{ fontSize: '0.85rem' }}>
              {data.name || (language === 'es' ? 'Sin nombre' : 'No name')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {/* Project type badge */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 700,
                background: 'rgba(18, 181, 176, 0.12)',
                color: 'var(--accent, #12b5b0)',
                border: '1px solid rgba(18, 181, 176, 0.25)',
              }}>
                {data.projectType}
              </span>
              {/* Reference */}
              {data.referenceCode && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 500,
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                }}>
                  {data.referenceCode}
                </span>
              )}
              {/* Currency */}
              {data.currency && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 500,
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                }}>
                  {data.currency}
                </span>
              )}
              {/* Language */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 500,
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}>
                {data.defaultLanguage === 'es' ? 'ES' : 'EN'}
              </span>
            </div>
          </div>
          <button
            className="setup-category-action-btn"
            onClick={() => onGoToStep(1)}
            title={language === 'es' ? 'Editar informacion' : 'Edit info'}
          >
            <IconEdit size={14} />
          </button>
        </div>
      </div>

      {/* Deadlines Card */}
      <div className="setup-category-card" style={{ marginBottom: '10px' }}>
        <div className="setup-category-header" style={{ cursor: 'default' }}>
          <div className="setup-category-color" style={{ background: '#3b82f6' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="setup-category-name" style={{ fontSize: '0.85rem' }}>
              {language === 'es' ? 'Hitos y Fechas' : 'Milestones & Dates'}
            </span>
            {milestones.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {milestones
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((m) => (
                    <div key={m.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.75rem',
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: m.dueDate ? '#3b82f6' : 'var(--border-color)',
                        flexShrink: 0,
                      }} />
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {m.name}
                      </span>
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        {m.dueDate ? formatDate(m.dueDate) : (t('setup.validation.no_date') || 'Sin fecha')}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                {language === 'es' ? 'Sin hitos' : 'No milestones'}
              </span>
            )}
          </div>
          <button
            className="setup-category-action-btn"
            onClick={() => onGoToStep(2)}
            title={language === 'es' ? 'Editar fechas' : 'Edit deadlines'}
          >
            <IconEdit size={14} />
          </button>
        </div>
      </div>

      {/* Providers Card */}
      <div className="setup-category-card" style={{ marginBottom: '10px' }}>
        <div className="setup-category-header" style={{ cursor: 'default' }}>
          <div className="setup-category-color" style={{ background: '#8b5cf6' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="setup-category-name" style={{ fontSize: '0.85rem' }}>
              {data.providers.length} {t('setup.validation.providers_count') || (language === 'es' ? 'proveedores' : 'providers')}
            </span>
            {data.providers.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
              }}>
                {data.providers.map((p, idx) => (
                  <span key={idx} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    background: 'var(--bg-surface)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                  }}>
                    {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            className="setup-category-action-btn"
            onClick={() => onGoToStep(3)}
            title={language === 'es' ? 'Editar proveedores' : 'Edit providers'}
          >
            <IconEdit size={14} />
          </button>
        </div>
      </div>

      {/* Documents Card */}
      <div className="setup-category-card" style={{ marginBottom: '10px' }}>
        <div className="setup-category-header" style={{ cursor: 'default' }}>
          <div className="setup-category-color" style={{ background: '#f59e0b' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="setup-category-name" style={{ fontSize: '0.85rem' }}>
              {documentTypes.length} {language === 'es' ? 'tipos de documento' : 'document types'}
            </span>
            {docSummary && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {docSummary}
              </span>
            )}
          </div>
          <button
            className="setup-category-action-btn"
            onClick={() => onGoToStep(4)}
            title={language === 'es' ? 'Editar documentos' : 'Edit documents'}
          >
            <IconEdit size={14} />
          </button>
        </div>
      </div>

      {/* Economic Card (hidden for RFI) */}
      {data.projectType !== 'RFI' && (
        <div className="setup-category-card" style={{ marginBottom: '10px' }}>
          <div className="setup-category-header" style={{ cursor: 'default' }}>
            <div className="setup-category-color" style={{ background: '#10b981' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="setup-category-name" style={{ fontSize: '0.85rem' }}>
                {economicFields.length} {t('setup.validation.fields_count') || (language === 'es' ? 'campos economicos' : 'economic fields')}
              </span>
              {topLevelFields.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}>
                  {topLevelFields.slice(0, 8).map((f) => (
                    <span key={f.id} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      background: 'var(--bg-surface)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                    }}>
                      {f.name}
                    </span>
                  ))}
                  {topLevelFields.length > 8 && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      background: 'var(--bg-surface)',
                      color: 'var(--text-tertiary)',
                      border: '1px solid var(--border-color)',
                    }}>
                      +{topLevelFields.length - 8}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              className="setup-category-action-btn"
              onClick={() => onGoToStep(5)}
              title={language === 'es' ? 'Editar modelo economico' : 'Edit economic model'}
            >
              <IconEdit size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Criteria Card */}
      {draftCategories.length > 0 && (
        <div className="setup-category-card" style={{ marginBottom: '10px' }}>
          <div className="setup-category-header" style={{ cursor: 'default' }}>
            <div className="setup-category-color" style={{ background: '#6366f1' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="setup-category-name" style={{ fontSize: '0.85rem' }}>
                  {language === 'es' ? 'Criterios de Evaluacion' : 'Scoring Criteria'}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: Math.abs(totalWeight - 100) < 0.01 ? '#22c55e' : '#ef4444',
                }}>
                  {totalWeight.toFixed(0)}%
                </span>
              </div>

              {/* Weight Distribution Bar */}
              <div style={{
                display: 'flex',
                height: '8px',
                borderRadius: '4px',
                overflow: 'hidden',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
              }}>
                {draftCategories.map((cat, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: `${cat.weight}%`,
                      background: cat.color || CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                      transition: 'width 0.3s',
                    }}
                  />
                ))}
              </div>

              {/* Category names with weights */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
              }}>
                {draftCategories.map((cat, idx) => {
                  const catColor = cat.color || CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  const displayName = language === 'es' && cat.display_name_es
                    ? cat.display_name_es
                    : cat.display_name;
                  return (
                    <span key={idx} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: 500,
                      background: `${catColor}12`,
                      color: catColor,
                      border: `1px solid ${catColor}25`,
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: catColor,
                        flexShrink: 0,
                      }} />
                      {displayName} ({cat.weight}%)
                    </span>
                  );
                })}
              </div>
            </div>
            <button
              className="setup-category-action-btn"
              onClick={() => onGoToStep(6)}
              title={language === 'es' ? 'Editar criterios' : 'Edit criteria'}
            >
              <IconEdit size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ================================================
          SECTION 3: SAVE AS TEMPLATE
          ================================================ */}

      <div style={{ marginTop: '24px' }}>
        {/* Collapsible header */}
        <button
          onClick={() => setTemplateOpen(!templateOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '12px 16px',
            background: 'var(--bg-surface-alt)',
            border: '1px solid var(--border-color)',
            borderRadius: templateOpen ? '12px 12px 0 0' : '12px',
            cursor: 'pointer',
            transition: 'border-radius 0.2s',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
          }}
        >
          <IconSave size={16} />
          <span style={{ flex: 1, textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>
            {t('setup.validation.save_template') || 'Guardar como plantilla reutilizable'}
          </span>
          <IconChevron size={16} direction={templateOpen ? 'up' : 'down'} />
        </button>

        {/* Collapsible body */}
        {templateOpen && (
          <div style={{
            padding: '16px',
            border: '1px solid var(--border-color)',
            borderTop: 'none',
            borderRadius: '0 0 12px 12px',
            background: 'var(--bg-surface)',
            animation: 'fadeIn 0.2s ease-out',
          }}>
            {/* Toggle checkbox */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              marginBottom: saveTemplate ? '16px' : 0,
            }}>
              <input
                type="checkbox"
                checked={saveTemplate}
                onChange={(e) => setSaveTemplate(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: 'var(--accent, #12b5b0)',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontWeight: 500 }}>
                {language === 'es' ? 'Guardar esta configuracion como plantilla' : 'Save this configuration as template'}
              </span>
            </label>

            {saveTemplate && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Template name */}
                <div className="setup-form-group" style={{ marginBottom: 0 }}>
                  <label>
                    {t('setup.validation.template_name') || 'Nombre de la plantilla'}
                  </label>
                  <input
                    className="setup-input"
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder={language === 'es' ? 'Ej: Plantilla RFP Energia' : 'E.g.: Energy RFP Template'}
                  />
                </div>

                {/* Template description */}
                <div className="setup-form-group" style={{ marginBottom: 0 }}>
                  <label>
                    {t('setup.validation.template_desc') || 'Descripcion (opcional)'}
                  </label>
                  <textarea
                    className="setup-input setup-textarea"
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder={language === 'es' ? 'Describe el proposito de esta plantilla...' : 'Describe the purpose of this template...'}
                    style={{ minHeight: '64px' }}
                  />
                </div>

                {/* Save button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    className="setup-btn setup-btn-primary"
                    onClick={handleSaveTemplate}
                    disabled={!templateName.trim() || isLoading}
                    style={{ padding: '8px 16px' }}
                  >
                    {isLoading ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    ) : (
                      <IconSave size={14} />
                    )}
                    {language === 'es' ? 'Guardar plantilla' : 'Save template'}
                  </button>

                  {templateSaved && (
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#22c55e',
                      animation: 'fadeIn 0.3s ease-out',
                    }}>
                      <IconCheck size={14} color="#22c55e" />
                      {t('setup.validation.template_saved') || 'Plantilla guardada'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
