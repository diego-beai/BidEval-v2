import React, { useState, useCallback, useEffect } from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useToastStore } from '../../stores/useToastStore';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useScoringConfigStore } from '../../stores/useScoringConfigStore';
import { useSetupStore } from '../../stores/useSetupStore';
import { StepBasicInfo } from './steps/StepBasicInfo';
import { StepDeadlines } from './steps/StepDeadlines';
import { StepProviders } from './steps/StepProviders';
import { StepDocumentTypes } from './steps/StepDocumentTypes';
import { StepEconomicModel } from './steps/StepEconomicModel';
import { StepCriteria } from './steps/StepCriteria';
import { StepValidation } from './steps/StepValidation';
import './ProjectSetupWizard.css';

export interface ProjectSetupData {
  // Step 1: Basic info
  name: string;
  description: string;
  projectType: 'RFP' | 'RFQ' | 'RFI';
  referenceCode: string;
  owner: string;
  currency: string;
  defaultLanguage: 'es' | 'en';
  // Step 2: Deadlines (legacy fields kept for backward compat)
  dateOpening: string;
  dateSubmissionDeadline: string;
  dateEvaluation: string;
  dateAward: string;
  // Step 3: Providers
  providers: ProviderEntry[];
  // Step 4: Document Types (uses useSetupStore)
  // Step 5: Economic Model (uses useSetupStore)
  // Step 6: Criteria (uses useScoringConfigStore)
  // Step 7: Validation (read-only summary)
}

export interface ProviderEntry {
  name: string;
  email: string;
  contact: string;
}

interface ProjectSetupWizardProps {
  onClose: () => void;
  onCreated?: (projectId: string) => void;
  initialStep?: number;
}

const STEPS = [
  { key: 'basic', icon: '1' },
  { key: 'deadlines', icon: '2' },
  { key: 'providers', icon: '3' },
  { key: 'doctypes', icon: '4' },
  { key: 'economic', icon: '5' },
  { key: 'criteria', icon: '6' },
  { key: 'validation', icon: '7' },
];

export const ProjectSetupWizard: React.FC<ProjectSetupWizardProps> = ({
  onClose,
  onCreated,
  initialStep = 0,
}) => {
  const { t } = useLanguageStore();
  const { loadProjects, setActiveProject } = useProjectStore();
  const { addToast } = useToastStore();
  const resetSetup = useSetupStore(s => s.resetSetup);

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset setup store when wizard opens
  useEffect(() => {
    resetSetup();
  }, [resetSetup]);

  // Form data
  const [formData, setFormData] = useState<ProjectSetupData>({
    name: '',
    description: '',
    projectType: 'RFP',
    referenceCode: '',
    owner: '',
    currency: 'EUR',
    defaultLanguage: 'es',
    dateOpening: '',
    dateSubmissionDeadline: '',
    dateEvaluation: '',
    dateAward: '',
    providers: [],
  });

  const updateFormData = useCallback((updates: Partial<ProjectSetupData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const stepLabels = [
    t('setup.step.basic') || 'Info',
    t('setup.step.deadlines') || 'Plazos',
    t('setup.step.providers') || 'Proveedores',
    t('setup.step.doctypes') || 'Documentos',
    t('setup.step.economic') || 'Económico',
    t('setup.step.criteria') || 'Criterios',
    t('setup.step.validation') || 'Validación',
  ];

  // Per-step validation: returns null if valid, or a warning string
  const getStepWarning = (step: number): string | null => {
    switch (step) {
      case 0:
        if (formData.name.trim().length < 3) return t('setup.warn.name_short') || 'Nombre demasiado corto';
        return null;
      case 1:
        return null; // Deadlines are optional
      case 2:
        return null; // Providers are optional
      case 3:
        return null; // Document types are optional
      case 4:
        return null; // Economic model is optional
      case 5: {
        const scoringStore = useScoringConfigStore.getState();
        const cats = scoringStore.draftCategories;
        if (cats.length > 0) {
          const total = cats.reduce((s, c) => s + c.weight, 0);
          if (Math.abs(total - 100) >= 0.01) {
            return (t('setup.warn.weights_invalid') || 'Los pesos no suman 100%') + ` (${total.toFixed(0)}%)`;
          }
          for (const cat of cats) {
            if (cat.criteria && cat.criteria.length > 0) {
              const criteriaSum = cat.criteria.reduce((s, c) => s + c.weight, 0);
              if (Math.abs(criteriaSum - cat.weight) >= 0.1) {
                return t('setup.warn.criteria_mismatch') || 'Hay criterios descuadrados en alguna categoría';
              }
            }
          }
        }
        return null;
      }
      case 6:
        return null; // Validation step shows its own detailed checks
      default:
        return null;
    }
  };

  const canGoNext = () => {
    if (currentStep === 0) {
      return formData.name.trim().length >= 3;
    }
    return true; // Other steps are optional
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleGoToStep = useCallback((step: number) => {
    if (step >= 0 && step < STEPS.length) {
      setCurrentStep(step);
    }
  }, []);

  const handleSave = async () => {
    if (!isSupabaseConfigured()) {
      addToast(t('setup.error.no_supabase') || 'Supabase no configurado', 'error');
      return;
    }

    if (!formData.name.trim()) {
      addToast(t('setup.error.name_required') || 'El nombre es obligatorio', 'warning');
      setCurrentStep(0);
      return;
    }

    // Validate criteria weights if categories exist
    const scoringStore = useScoringConfigStore.getState();
    const cats = scoringStore.draftCategories;
    if (cats.length > 0) {
      const total = cats.reduce((s, c) => s + c.weight, 0);
      if (Math.abs(total - 100) >= 0.01) {
        addToast(
          (t('setup.error.weights_not_100') || 'Los pesos de las categorías deben sumar 100%') + ` (${total.toFixed(0)}%)`,
          'warning'
        );
        setCurrentStep(5);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Create the project
      const { data: projectId, error: projError } = await (supabase! as any)
        .rpc('get_or_create_project', {
          p_display_name: formData.name.trim(),
          p_description: formData.description.trim() || null,
          p_project_type: formData.projectType,
          p_date_opening: formData.dateOpening || null,
          p_date_submission_deadline: formData.dateSubmissionDeadline || null,
          p_date_evaluation: formData.dateEvaluation || null,
          p_date_award: formData.dateAward || null,
        });

      if (projError) {
        // Fallback: try old signature if new RPC not deployed yet
        const { data: fallbackId, error: fallbackError } = await (supabase! as any)
          .rpc('get_or_create_project', {
            p_display_name: formData.name.trim(),
            p_description: formData.description.trim() || null,
          });

        if (fallbackError) throw fallbackError;

        if (fallbackId) {
          await (supabase! as any)
            .from('projects')
            .update({
              project_type: formData.projectType,
              currency: formData.currency,
              default_language: formData.defaultLanguage,
              date_opening: formData.dateOpening || null,
              date_submission_deadline: formData.dateSubmissionDeadline || null,
              date_evaluation: formData.dateEvaluation || null,
              date_award: formData.dateAward || null,
            })
            .eq('id', fallbackId);

          if (formData.referenceCode.trim() || formData.owner.trim()) {
            await (supabase! as any)
              .from('projects')
              .update({
                reference_code: formData.referenceCode.trim() || null,
                owner_name: formData.owner.trim() || null,
              })
              .eq('id', fallbackId);
          }
        }

        await saveProjectData(fallbackId);
        return;
      }

      await saveProjectData(projectId);
    } catch (err: any) {
      addToast(err.message || t('setup.error.generic') || 'Error al crear proyecto', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveProjectData = async (projectId: string) => {
    if (!projectId) {
      addToast('Error: no se recibió ID del proyecto', 'error');
      return;
    }

    try {
      // 2. Save invited providers
      if (formData.providers.length > 0) {
        const providerRows = formData.providers.map(p => ({
          project_id: projectId,
          provider_name: p.name,
          provider_email: p.email || null,
          provider_contact: p.contact || null,
        }));

        const { error: provError } = await (supabase! as any)
          .from('project_providers')
          .upsert(providerRows, { onConflict: 'project_id,provider_name' });

        if (provError) {
          await (supabase! as any)
            .from('project_providers')
            .delete()
            .eq('project_id', projectId);

          await (supabase! as any)
            .from('project_providers')
            .insert(providerRows);
        }

        const supplierNames = formData.providers.map(p => p.name);
        await (supabase! as any)
          .from('projects')
          .update({ invited_suppliers: supplierNames })
          .eq('id', projectId);
      }

      // 3. Save scoring criteria (use store)
      const scoringStore = useScoringConfigStore.getState();
      if (scoringStore.draftCategories.length > 0) {
        await scoringStore.saveConfiguration(projectId);
      } else {
        await scoringStore.initializeDefaultConfig(projectId, formData.projectType);
      }

      // 4. Save setup store data (milestones, document types, economic fields)
      const setupStore = useSetupStore.getState();
      await setupStore.saveToProject(projectId);

      // 5. Update the project fields
      await (supabase! as any)
        .from('projects')
        .update({
          project_type: formData.projectType,
          currency: formData.currency,
          default_language: formData.defaultLanguage,
          date_opening: formData.dateOpening || null,
          date_submission_deadline: formData.dateSubmissionDeadline || null,
          date_evaluation: formData.dateEvaluation || null,
          date_award: formData.dateAward || null,
        })
        .eq('id', projectId);

      if (formData.referenceCode.trim() || formData.owner.trim()) {
        await (supabase! as any)
          .from('projects')
          .update({
            reference_code: formData.referenceCode.trim() || null,
            owner_name: formData.owner.trim() || null,
          })
          .eq('id', projectId);
      }

      // Reload projects, set active, notify
      await loadProjects();
      setActiveProject(projectId);
      addToast(t('setup.success') || 'Proyecto creado correctamente', 'success');
      onCreated?.(projectId);
      onClose();
    } catch (err: any) {
      addToast(err.message || t('setup.error.generic') || 'Error al guardar detalles', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <StepBasicInfo data={formData} onChange={updateFormData} />;
      case 1:
        return <StepDeadlines data={formData} onChange={updateFormData} />;
      case 2:
        return <StepProviders data={formData} onChange={updateFormData} />;
      case 3:
        return <StepDocumentTypes />;
      case 4:
        return <StepEconomicModel currency={formData.currency} />;
      case 5:
        return <StepCriteria projectType={formData.projectType} />;
      case 6:
        return <StepValidation data={formData} onGoToStep={handleGoToStep} />;
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div
      className="setup-wizard-overlay"
      role="button"
      tabIndex={0}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onClose(); } }}
    >
      <div
        className="setup-wizard"
        role="button"
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}
      >
        {/* Header */}
        <div className="setup-wizard-header">
          <h2>{t('setup.title') || 'Configurar Proyecto'}</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
            {currentStep + 1} / {STEPS.length}
          </span>
          <button className="setup-wizard-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step Indicators */}
        <div className="setup-wizard-steps">
          {STEPS.map((step, idx) => {
            const warning = idx < currentStep ? getStepWarning(idx) : null;
            return (
              <div
                key={step.key}
                className={`setup-step-item ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''} ${warning ? 'has-warning' : ''}`}
                role="button"
                tabIndex={idx <= currentStep ? 0 : -1}
                onClick={() => { if (idx <= currentStep) setCurrentStep(idx); }}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && idx <= currentStep) { e.preventDefault(); setCurrentStep(idx); } }}
                style={{ cursor: idx <= currentStep ? 'pointer' : 'default' }}
              >
                <div className="setup-step-number">
                  {warning ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  ) : idx < currentStep ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className="setup-step-label">{stepLabels[idx]}</span>
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="setup-wizard-body">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="setup-wizard-footer">
          <div className="setup-wizard-footer-left">
            {currentStep > 0 && (
              <button className="setup-btn setup-btn-secondary" onClick={handleBack} disabled={isSubmitting}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                {t('setup.back') || 'Atrás'}
              </button>
            )}
          </div>
          <div className="setup-wizard-footer-right">
            {currentStep > 0 && !isLastStep && (
              <button className="setup-btn setup-btn-skip" onClick={handleSkip}>
                {t('setup.skip') || 'Omitir'}
              </button>
            )}
            {isLastStep ? (
              <button
                className="setup-btn setup-btn-primary"
                onClick={handleSave}
                disabled={isSubmitting || !formData.name.trim()}
              >
                {isSubmitting ? (
                  <span className="loading-indicator" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {t('setup.create_project') || 'Crear Proyecto'}
              </button>
            ) : (
              <button
                className="setup-btn setup-btn-primary"
                onClick={handleNext}
                disabled={!canGoNext()}
              >
                {t('setup.next') || 'Siguiente'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
