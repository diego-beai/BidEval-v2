import React, { useState, useCallback } from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useToastStore } from '../../stores/useToastStore';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useScoringConfigStore } from '../../stores/useScoringConfigStore';
import { StepBasicInfo } from './steps/StepBasicInfo';
import { StepDeadlines } from './steps/StepDeadlines';
import { StepProviders } from './steps/StepProviders';
import { StepCriteria } from './steps/StepCriteria';
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
  // Step 2: Deadlines
  dateOpening: string;
  dateSubmissionDeadline: string;
  dateEvaluation: string;
  dateAward: string;
  // Step 3: Providers
  providers: ProviderEntry[];
  // Step 4: Criteria (uses useScoringConfigStore)
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
  { key: 'criteria', icon: '4' },
];

export const ProjectSetupWizard: React.FC<ProjectSetupWizardProps> = ({
  onClose,
  onCreated,
  initialStep = 0,
}) => {
  const { t } = useLanguageStore();
  const { loadProjects, setActiveProject } = useProjectStore();
  const { addToast } = useToastStore();
  // Store accessed via useScoringConfigStore.getState() in saveProvidersAndCriteria

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    t('setup.step.criteria') || 'Criterios',
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
      case 3: {
        const scoringStore = useScoringConfigStore.getState();
        const cats = scoringStore.draftCategories;
        if (cats.length > 0) {
          const total = cats.reduce((s, c) => s + c.weight, 0);
          if (Math.abs(total - 100) >= 0.01) {
            return (t('setup.warn.weights_invalid') || 'Los pesos no suman 100%') + ` (${total.toFixed(0)}%)`;
          }
          // Check sub-criteria within each category
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
        setCurrentStep(3);
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

        // Update the project with the new fields manually
        if (fallbackId) {
          // Core fields first (always exist)
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

          // Extended fields (may not exist)
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

        // Use fallbackId for the rest
        await saveProvidersAndCriteria(fallbackId);
        return;
      }

      await saveProvidersAndCriteria(projectId);
    } catch (err: any) {
      addToast(err.message || t('setup.error.generic') || 'Error al crear proyecto', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveProvidersAndCriteria = async (projectId: string) => {
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

        // Try upsert first, fallback to insert if it fails
        const { error: provError } = await (supabase! as any)
          .from('project_providers')
          .upsert(providerRows, { onConflict: 'project_id,provider_name' });

        if (provError) {
          // Fallback: delete existing + insert fresh
          await (supabase! as any)
            .from('project_providers')
            .delete()
            .eq('project_id', projectId);

          const { error: insertError } = await (supabase! as any)
            .from('project_providers')
            .insert(providerRows);

          if (insertError) {
            // ignored
          }
        }

        // Always sync invited_suppliers array on projects table
        const supplierNames = formData.providers.map(p => p.name);
        const { error: suppError } = await (supabase! as any)
          .from('projects')
          .update({ invited_suppliers: supplierNames })
          .eq('id', projectId);

        if (suppError) {
          // ignored
        }
      }

      // 3. Save scoring criteria (use store)
      const scoringStore = useScoringConfigStore.getState();
      if (scoringStore.draftCategories.length > 0) {
        await scoringStore.saveConfiguration(projectId);
      } else {
        // Initialize with defaults if no custom config
        await scoringStore.initializeDefaultConfig(projectId);
      }

      // 4. Update the project fields (dates, reference code, owner, language)
      // First update core fields that always exist
      const { error: coreUpdateError } = await (supabase! as any)
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

      if (coreUpdateError) {
        // ignored
      }

      // Then try to update extended fields (may not exist in all schemas)
      if (formData.referenceCode.trim() || formData.owner.trim()) {
        const { error: extUpdateError } = await (supabase! as any)
          .from('projects')
          .update({
            reference_code: formData.referenceCode.trim() || null,
            owner_name: formData.owner.trim() || null,
          })
          .eq('id', projectId);

        if (extUpdateError) {
          // ignored
        }
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
        return <StepCriteria projectType={formData.projectType} />;
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="setup-wizard-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="setup-wizard" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="setup-wizard-header">
          <h2>{t('setup.title') || 'Configurar Proyecto'}</h2>
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
                onClick={() => { if (idx < currentStep || (idx <= currentStep)) setCurrentStep(idx); }}
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
