/**
 * Scoring Setup Wizard
 *
 * A multi-step wizard for configuring custom scoring categories and criteria.
 * Allows users to:
 * 1. Choose a template (default or from scratch)
 * 2. Configure categories (name, weight, color)
 * 3. Configure criteria within each category
 * 4. Review and save the configuration
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useScoringConfigStore } from '../../../stores/useScoringConfigStore';
import { useProjectStore } from '../../../stores/useProjectStore';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import type { CategoryDraft, CriterionDraft } from '../../../types/scoring.types';
import {
  buildDefaultConfiguration,
  validateScoringConfiguration,
  generateSlugFromName,
  CATEGORY_COLORS,
  calculateTotalCategoryWeight,
  calculateTotalCriteriaWeight,
} from '../../../types/scoring.types';

interface ScoringSetupWizardProps {
  onClose: () => void;
}

export const ScoringSetupWizard: React.FC<ScoringSetupWizardProps> = ({ onClose }) => {
  const { activeProjectId } = useProjectStore();
  const { t } = useLanguageStore();
  const {
    draftCategories,
    setDraftCategories,
    saveConfiguration,
    isLoading,
    wizardStep,
    setWizardStep,
  } = useScoringConfigStore();

  const [selectedTemplate, setSelectedTemplate] = useState<'default' | 'scratch' | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);

  // Validation
  const validation = useMemo(() => validateScoringConfiguration(draftCategories), [draftCategories]);
  const totalCategoryWeight = useMemo(() => calculateTotalCategoryWeight(draftCategories), [draftCategories]);

  // Initialize with selected template
  const handleTemplateSelect = useCallback((template: 'default' | 'scratch') => {
    setSelectedTemplate(template);
    if (template === 'default') {
      setDraftCategories(buildDefaultConfiguration());
    } else {
      setDraftCategories([]);
    }
    setWizardStep(2);
  }, [setDraftCategories, setWizardStep]);

  // Category operations
  const handleAddCategory = useCallback(() => {
    const newCategory: CategoryDraft = {
      name: `category_${draftCategories.length + 1}`,
      display_name: '',  // Empty so placeholder shows
      weight: 0,
      color: CATEGORY_COLORS[draftCategories.length % CATEGORY_COLORS.length],
      sort_order: draftCategories.length + 1,
      criteria: [],
    };
    setDraftCategories([...draftCategories, newCategory]);
    setExpandedCategory(draftCategories.length);
  }, [draftCategories, setDraftCategories]);

  const handleUpdateCategory = useCallback((index: number, updates: Partial<CategoryDraft>) => {
    const updated = [...draftCategories];
    updated[index] = { ...updated[index], ...updates };

    // Auto-generate name from display_name if display_name changed
    if (updates.display_name && !updates.name) {
      updated[index].name = generateSlugFromName(updates.display_name);
    }

    setDraftCategories(updated);
  }, [draftCategories, setDraftCategories]);

  const handleDeleteCategory = useCallback((index: number) => {
    const updated = draftCategories.filter((_, i) => i !== index);
    setDraftCategories(updated);
    setExpandedCategory(null);
  }, [draftCategories, setDraftCategories]);

  // Criterion operations
  const handleAddCriterion = useCallback((categoryIndex: number) => {
    const category = draftCategories[categoryIndex];
    const newCriterion: CriterionDraft = {
      name: `criterion_${(category.criteria?.length || 0) + 1}`,
      display_name: '',  // Empty so placeholder shows
      weight: 0,
      sort_order: (category.criteria?.length || 0) + 1,
    };

    const updated = [...draftCategories];
    updated[categoryIndex] = {
      ...updated[categoryIndex],
      criteria: [...(updated[categoryIndex].criteria || []), newCriterion],
    };
    setDraftCategories(updated);
  }, [draftCategories, setDraftCategories]);

  const handleUpdateCriterion = useCallback((categoryIndex: number, criterionIndex: number, updates: Partial<CriterionDraft>) => {
    const updated = [...draftCategories];
    const criteria = [...(updated[categoryIndex].criteria || [])];
    criteria[criterionIndex] = { ...criteria[criterionIndex], ...updates };

    // Auto-generate name from display_name if display_name changed
    if (updates.display_name && !updates.name) {
      criteria[criterionIndex].name = generateSlugFromName(updates.display_name);
    }

    updated[categoryIndex].criteria = criteria;
    setDraftCategories(updated);
  }, [draftCategories, setDraftCategories]);

  const handleDeleteCriterion = useCallback((categoryIndex: number, criterionIndex: number) => {
    const updated = [...draftCategories];
    updated[categoryIndex].criteria = (updated[categoryIndex].criteria || []).filter((_, i) => i !== criterionIndex);
    setDraftCategories(updated);
  }, [draftCategories, setDraftCategories]);

  // Distribute weights evenly
  const handleDistributeWeights = useCallback((categoryIndex?: number) => {
    if (categoryIndex !== undefined) {
      // Distribute criteria weights within a category
      const category = draftCategories[categoryIndex];
      const criteriaCount = category.criteria?.length || 0;
      if (criteriaCount === 0) return;

      const weight = Math.floor(100 / criteriaCount);
      const remainder = 100 - (weight * criteriaCount);

      const updated = [...draftCategories];
      updated[categoryIndex].criteria = (updated[categoryIndex].criteria || []).map((crit, i) => ({
        ...crit,
        weight: weight + (i < remainder ? 1 : 0),
      }));
      setDraftCategories(updated);
    } else {
      // Distribute category weights
      const categoryCount = draftCategories.length;
      if (categoryCount === 0) return;

      const weight = Math.floor(100 / categoryCount);
      const remainder = 100 - (weight * categoryCount);

      const updated = draftCategories.map((cat, i) => ({
        ...cat,
        weight: weight + (i < remainder ? 1 : 0),
      }));
      setDraftCategories(updated);
    }
  }, [draftCategories, setDraftCategories]);

  // Save configuration
  const handleSave = useCallback(async () => {
    if (!activeProjectId) return;

    const success = await saveConfiguration(activeProjectId);
    if (success) {
      onClose();
    }
  }, [activeProjectId, saveConfiguration, onClose]);

  // Step navigation
  const canProceed = useMemo(() => {
    switch (wizardStep) {
      case 1:
        return selectedTemplate !== null;
      case 2:
        return draftCategories.length > 0 && Math.abs(totalCategoryWeight - 100) < 0.01;
      case 3:
        return validation.valid;
      case 4:
        return validation.valid;
      default:
        return false;
    }
  }, [wizardStep, selectedTemplate, draftCategories, totalCategoryWeight, validation]);

  // Render step content
  const renderStepContent = () => {
    switch (wizardStep) {
      case 1:
        return renderTemplateSelection();
      case 2:
        return renderCategoryConfiguration();
      case 3:
        return renderCriteriaConfiguration();
      case 4:
        return renderReview();
      default:
        return null;
    }
  };

  // Step 1: Template Selection
  const renderTemplateSelection = () => (
    <div style={{ padding: '24px' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        {t('wizard.step1.title')}
      </h3>
      <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        {t('wizard.step1.subtitle')}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Default Template */}
        <button
          onClick={() => handleTemplateSelect('default')}
          style={{
            padding: '24px',
            borderRadius: '12px',
            border: selectedTemplate === 'default' ? '2px solid var(--color-primary)' : '2px solid var(--border-color)',
            background: selectedTemplate === 'default' ? 'var(--color-primary)08' : 'var(--bg-surface)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--color-primary)20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
              {t('wizard.step1.default_title')}
            </div>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5 }}>
            {t('wizard.step1.default_desc')}
          </p>
        </button>

        {/* From Scratch */}
        <button
          onClick={() => handleTemplateSelect('scratch')}
          style={{
            padding: '24px',
            borderRadius: '12px',
            border: selectedTemplate === 'scratch' ? '2px solid var(--color-primary)' : '2px solid var(--border-color)',
            background: selectedTemplate === 'scratch' ? 'var(--color-primary)08' : 'var(--bg-surface)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#8b5cf620',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
              {t('wizard.step1.scratch_title')}
            </div>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5 }}>
            {t('wizard.step1.scratch_desc')}
          </p>
        </button>
      </div>
    </div>
  );

  // Step 2: Category Configuration
  const renderCategoryConfiguration = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('wizard.step2.title')}
          </h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {t('wizard.step2.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <WeightIndicator total={totalCategoryWeight} />
          <button
            onClick={() => handleDistributeWeights()}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('wizard.step2.distribute')}
          </button>
          <button
            onClick={handleAddCategory}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--color-primary)',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            {t('wizard.step2.add_category')}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {draftCategories.map((category, index) => (
          <CategoryCard
            key={index}
            category={category}
            index={index}
            onUpdate={(updates) => handleUpdateCategory(index, updates)}
            onDelete={() => handleDeleteCategory(index)}
            t={t}
          />
        ))}

        {draftCategories.length === 0 && (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-tertiary)',
            background: 'var(--bg-surface-alt)',
            borderRadius: '12px',
            border: '2px dashed var(--border-color)',
          }}>
            <p style={{ margin: 0 }}>{t('wizard.step2.no_categories')}</p>
          </div>
        )}
      </div>
    </div>
  );

  // Step 3: Criteria Configuration
  const renderCriteriaConfiguration = () => (
    <div style={{ padding: '24px' }}>
      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        {t('wizard.step3.title')}
      </h3>
      <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        {t('wizard.step3.subtitle')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {draftCategories.map((category, catIndex) => {
          const criteriaWeight = calculateTotalCriteriaWeight(category.criteria || []);
          const isExpanded = expandedCategory === catIndex;

          return (
            <div
              key={catIndex}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              {/* Category Header */}
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : catIndex)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  background: `${category.color}10`,
                  border: 'none',
                  borderLeft: `4px solid ${category.color}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontWeight: 700, color: category.color }}>
                    {category.display_name}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    ({category.weight}% {t('wizard.weight_label')})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <WeightIndicator total={criteriaWeight} size="small" />
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-secondary)"
                    strokeWidth="2"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  >
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </div>
              </button>

              {/* Criteria List */}
              {isExpanded && (
                <div style={{ padding: '16px', background: 'var(--bg-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', gap: '8px' }}>
                    <button
                      onClick={() => handleDistributeWeights(catIndex)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {t('wizard.step2.distribute')}
                    </button>
                    <button
                      onClick={() => handleAddCriterion(catIndex)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: category.color,
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14"></path>
                      </svg>
                      {t('wizard.step3.add_criterion')}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(category.criteria || []).map((criterion, critIndex) => (
                      <CriterionRow
                        key={critIndex}
                        criterion={criterion}
                        color={category.color}
                        onUpdate={(updates) => handleUpdateCriterion(catIndex, critIndex, updates)}
                        onDelete={() => handleDeleteCriterion(catIndex, critIndex)}
                        t={t}
                      />
                    ))}

                    {(!category.criteria || category.criteria.length === 0) && (
                      <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: 'var(--text-tertiary)',
                        fontSize: '0.8rem',
                      }}>
                        {t('wizard.step3.no_criteria')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Step 4: Review
  const renderReview = () => (
    <div style={{ padding: '24px' }}>
      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        {t('wizard.step4.title')}
      </h3>
      <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        {t('wizard.step4.subtitle')}
      </p>

      {/* Validation Status */}
      <div style={{
        padding: '16px',
        borderRadius: '12px',
        background: validation.valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        border: `1px solid ${validation.valid ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'}`,
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: validation.errors.length > 0 ? '8px' : 0 }}>
          {validation.valid ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(16, 185, 129)" strokeWidth="2">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
              <span style={{ fontWeight: 600, color: 'rgb(16, 185, 129)' }}>{t('wizard.step4.valid')}</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(239, 68, 68)" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"></path>
              </svg>
              <span style={{ fontWeight: 600, color: 'rgb(239, 68, 68)' }}>{t('wizard.step4.fix_errors')}</span>
            </>
          )}
        </div>
        {validation.errors.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: '24px', color: 'rgb(239, 68, 68)', fontSize: '0.8rem' }}>
            {validation.errors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Configuration Summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {draftCategories.map((category, catIndex) => {
          const criteriaWeight = calculateTotalCriteriaWeight(category.criteria || []);

          return (
            <div
              key={catIndex}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                background: `${category.color}10`,
                borderLeft: `4px solid ${category.color}`,
              }}>
                <span style={{ fontWeight: 700, color: category.color }}>
                  {category.display_name}
                </span>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: category.color,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                }}>
                  {category.weight}%
                </span>
              </div>
              <div style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {(category.criteria || []).map((crit, critIndex) => (
                      <tr key={critIndex}>
                        <td style={{ padding: '6px 0', color: 'var(--text-primary)' }}>
                          {crit.display_name}
                        </td>
                        <td style={{ padding: '6px 0', textAlign: 'right', color: category.color, fontWeight: 600 }}>
                          {crit.weight}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {Math.abs(criteriaWeight - 100) > 0.01 && (
                  <div style={{ marginTop: '8px', color: 'rgb(239, 68, 68)', fontSize: '0.75rem' }}>
                    Criteria weights sum to {criteriaWeight.toFixed(2)}% (should be 100%)
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('wizard.title')}
            </h2>
            <StepIndicator currentStep={wizardStep} totalSteps={4} />
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--bg-surface-alt)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-surface-alt)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : onClose()}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {wizardStep > 1 ? t('wizard.btn.back') : t('wizard.btn.cancel')}
          </button>

          {wizardStep < 4 ? (
            <button
              onClick={() => setWizardStep(wizardStep + 1)}
              disabled={!canProceed}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: canProceed ? 'var(--color-primary)' : 'var(--bg-surface-alt)',
                color: canProceed ? 'white' : 'var(--text-tertiary)',
                fontWeight: 600,
                cursor: canProceed ? 'pointer' : 'not-allowed',
                opacity: canProceed ? 1 : 0.6,
              }}
            >
              {t('wizard.btn.continue')}
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!validation.valid || isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: validation.valid && !isLoading ? 'rgb(16, 185, 129)' : 'var(--bg-surface-alt)',
                color: validation.valid && !isLoading ? 'white' : 'var(--text-tertiary)',
                fontWeight: 600,
                cursor: validation.valid && !isLoading ? 'pointer' : 'not-allowed',
              }}
            >
              {isLoading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                  </svg>
                  {t('wizard.btn.saving')}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5"></path>
                  </svg>
                  {t('wizard.btn.save')}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// ============================================
// HELPER COMPONENTS
// ============================================

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
    {Array.from({ length: totalSteps }, (_, i) => (
      <div
        key={i}
        style={{
          width: i + 1 === currentStep ? '24px' : '8px',
          height: '8px',
          borderRadius: '4px',
          background: i + 1 <= currentStep ? 'var(--color-primary)' : 'var(--border-color)',
          transition: 'all 0.2s',
        }}
      />
    ))}
  </div>
);

interface WeightIndicatorProps {
  total: number;
  size?: 'normal' | 'small';
}

const WeightIndicator: React.FC<WeightIndicatorProps> = ({ total, size = 'normal' }) => {
  const isValid = Math.abs(total - 100) < 0.01;
  const padding = size === 'small' ? '4px 8px' : '8px 14px';
  const fontSize = size === 'small' ? '0.7rem' : '0.8rem';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding,
      borderRadius: '8px',
      background: isValid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      border: `1px solid ${isValid ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'}`,
    }}>
      <span style={{
        fontSize,
        fontWeight: 600,
        color: isValid ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
      }}>
        {total.toFixed(1)}%
      </span>
      {isValid ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgb(16, 185, 129)" strokeWidth="3">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgb(239, 68, 68)" strokeWidth="3">
          <path d="M18 6L6 18M6 6l12 12"></path>
        </svg>
      )}
    </div>
  );
};

interface CategoryCardProps {
  category: CategoryDraft;
  index: number;
  onUpdate: (updates: Partial<CategoryDraft>) => void;
  onDelete: () => void;
  t: (key: string) => string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onUpdate, onDelete, t }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 100px 80px 40px',
    gap: '12px',
    alignItems: 'center',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    borderLeft: `4px solid ${category.color}`,
    background: 'var(--bg-surface)',
  }}>
    {/* Display Name */}
    <input
      type="text"
      value={category.display_name}
      onChange={(e) => onUpdate({ display_name: e.target.value })}
      placeholder={t('wizard.placeholder.category_name')}
      style={{
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-surface)',
        fontSize: '0.875rem',
        fontWeight: 600,
        color: category.display_name ? 'var(--text-primary)' : 'var(--text-tertiary)',
      }}
    />

    {/* Spanish Name */}
    <input
      type="text"
      value={category.display_name_es || ''}
      onChange={(e) => onUpdate({ display_name_es: e.target.value })}
      placeholder={t('wizard.placeholder.category_name_es')}
      style={{
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-surface)',
        fontSize: '0.875rem',
        color: category.display_name_es ? 'var(--text-secondary)' : 'var(--text-tertiary)',
      }}
    />

    {/* Color Picker */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input
        type="color"
        value={category.color}
        onChange={(e) => onUpdate({ color: e.target.value })}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          border: 'none',
          cursor: 'pointer',
        }}
      />
      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
        {category.color}
      </span>
    </div>

    {/* Weight */}
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <input
        type="number"
        value={category.weight}
        onChange={(e) => onUpdate({ weight: parseFloat(e.target.value) || 0 })}
        min={0}
        max={100}
        style={{
          width: '60px',
          padding: '8px 10px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          background: `${category.color}20`,
          color: category.color,
          fontWeight: 700,
          textAlign: 'center',
        }}
      />
      <span style={{ marginLeft: '4px', color: category.color, fontWeight: 700 }}>%</span>
    </div>

    {/* Delete Button */}
    <button
      onClick={onDelete}
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        border: 'none',
        background: 'rgba(239, 68, 68, 0.1)',
        color: 'rgb(239, 68, 68)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    </button>
  </div>
);

interface CriterionRowProps {
  criterion: CriterionDraft;
  color: string;
  onUpdate: (updates: Partial<CriterionDraft>) => void;
  onDelete: () => void;
  t: (key: string) => string;
}

const CriterionRow: React.FC<CriterionRowProps> = ({ criterion, color, onUpdate, onDelete, t }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 80px 32px',
    gap: '8px',
    alignItems: 'center',
    padding: '10px',
    borderRadius: '8px',
    background: 'var(--bg-surface-alt)',
  }}>
    {/* Display Name */}
    <input
      type="text"
      value={criterion.display_name}
      onChange={(e) => onUpdate({ display_name: e.target.value })}
      placeholder={t('wizard.placeholder.criterion_name')}
      style={{
        padding: '8px 10px',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-surface)',
        fontSize: '0.8rem',
        color: criterion.display_name ? 'var(--text-primary)' : 'var(--text-tertiary)',
      }}
    />

    {/* Spanish Name */}
    <input
      type="text"
      value={criterion.display_name_es || ''}
      onChange={(e) => onUpdate({ display_name_es: e.target.value })}
      placeholder={t('wizard.placeholder.criterion_name_es')}
      style={{
        padding: '8px 10px',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-surface)',
        fontSize: '0.8rem',
        color: criterion.display_name_es ? 'var(--text-secondary)' : 'var(--text-tertiary)',
      }}
    />

    {/* Weight */}
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <input
        type="number"
        value={criterion.weight}
        onChange={(e) => onUpdate({ weight: parseFloat(e.target.value) || 0 })}
        min={0}
        max={100}
        style={{
          width: '50px',
          padding: '6px 8px',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
          background: `${color}20`,
          color,
          fontWeight: 700,
          fontSize: '0.8rem',
          textAlign: 'center',
        }}
      />
      <span style={{ marginLeft: '2px', color, fontWeight: 700, fontSize: '0.8rem' }}>%</span>
    </div>

    {/* Delete Button */}
    <button
      onClick={onDelete}
      style={{
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        border: 'none',
        background: 'rgba(239, 68, 68, 0.1)',
        color: 'rgb(239, 68, 68)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 6L6 18M6 6l12 12"></path>
      </svg>
    </button>
  </div>
);

export default ScoringSetupWizard;
