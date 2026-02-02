/**
 * Inline Criteria Editor
 *
 * A compact editor for adjusting criterion weights directly in the ScoringMatrix.
 * Provides quick weight adjustments without opening the full wizard.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useScoringConfigStore } from '../../../stores/useScoringConfigStore';
import { useProjectStore } from '../../../stores/useProjectStore';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import type { ScoringCategory } from '../../../types/scoring.types';

interface InlineCriteriaEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InlineCriteriaEditor: React.FC<InlineCriteriaEditorProps> = ({ isOpen, onClose }) => {
  const { activeProjectId } = useProjectStore();
  const { t } = useLanguageStore();
  const {
    categories,
    isLoading,
    setDraftCategories,
    saveConfiguration,
  } = useScoringConfigStore();

  // Local state for weight editing
  const [localCategories, setLocalCategories] = useState<ScoringCategory[]>([]);
  // Track which input is being edited (to allow free text entry without leading zeros)
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Initialize local state when opening
  useEffect(() => {
    // Ensure categories is an array
    const cats = Array.isArray(categories) ? categories : [];
    if (isOpen && cats.length > 0) {
      setLocalCategories(JSON.parse(JSON.stringify(cats)));
    }
  }, [isOpen, categories]);

  // Update category weight
  const handleCategoryWeightChange = useCallback((categoryIndex: number, weight: number) => {
    setLocalCategories((prev) => {
      const updated = [...prev];
      updated[categoryIndex] = { ...updated[categoryIndex], weight };
      return updated;
    });
  }, []);

  // Update criterion weight (receives actual total weight, converts to category-relative)
  const handleCriterionWeightChange = useCallback((categoryIndex: number, criterionIndex: number, actualWeight: number) => {
    setLocalCategories((prev) => {
      const updated = [...prev];
      const catWeight = updated[categoryIndex].weight || 1;
      // Convert actual weight back to category-relative weight
      const relativeWeight = catWeight > 0 ? (actualWeight * 100) / catWeight : 0;
      const criteria = [...(updated[categoryIndex].criteria || [])];
      criteria[criterionIndex] = { ...criteria[criterionIndex], weight: parseFloat(relativeWeight.toFixed(2)) };
      updated[categoryIndex] = { ...updated[categoryIndex], criteria };
      return updated;
    });
  }, []);

  // Calculate totals
  const cats = Array.isArray(localCategories) ? localCategories : [];
  const totalCategoryWeight = cats.reduce((sum, cat) => sum + (cat?.weight || 0), 0);
  const categoryWeightValid = Math.abs(totalCategoryWeight - 100) < 0.01;

  // Save changes
  const handleSave = useCallback(async () => {
    if (!activeProjectId) return;

    // Convert to draft format
    const drafts = localCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      display_name: cat.display_name,
      display_name_es: cat.display_name_es,
      weight: cat.weight,
      color: cat.color,
      sort_order: cat.sort_order,
      criteria: (cat.criteria || []).map((crit) => ({
        id: crit.id,
        category_id: crit.category_id,
        name: crit.name,
        display_name: crit.display_name,
        display_name_es: crit.display_name_es,
        description: crit.description,
        weight: crit.weight,
        keywords: crit.keywords,
        sort_order: crit.sort_order,
      })),
    }));

    setDraftCategories(drafts);
    const success = await saveConfiguration(activeProjectId);
    if (success) {
      onClose();
    }
  }, [activeProjectId, localCategories, setDraftCategories, saveConfiguration, onClose]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      zIndex: 9999,
      overflowY: 'auto',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '650px',
        maxHeight: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('editor.title')}
          </h3>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--bg-surface-alt)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', minHeight: 0 }}>
          {/* Category Weight Total */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '10px',
            background: categoryWeightValid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${categoryWeightValid ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'}`,
          }}>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('editor.total_category_weight')}
            </span>
            <span style={{
              fontWeight: 700,
              color: categoryWeightValid ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
            }}>
              {totalCategoryWeight.toFixed(1)}%
            </span>
          </div>

          {/* Categories and Criteria */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {cats.map((category, catIndex) => {
              const catCriteria = Array.isArray(category?.criteria) ? category.criteria : [];
              const catWeight = category?.weight || 0;
              // Calculate actual total weights for display
              const criteriaActualWeight = catCriteria.reduce((sum, c) => sum + ((c?.weight || 0) * catWeight / 100), 0);
              // Ensure all values are strings
              const catDisplayName = typeof category.display_name === 'string' ? category.display_name : String(category.display_name || '');
              const catColor = typeof category.color === 'string' ? category.color : '#12b5b0';
              const criteriaWeightValid = Math.abs(criteriaActualWeight - catWeight) < 0.1;

              return (
                <div
                  key={category.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Category Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: `${catColor}10`,
                    borderLeft: `3px solid ${catColor}`,
                  }}>
                    <span style={{ fontWeight: 700, color: catColor, fontSize: '1.05rem' }}>
                      {catDisplayName}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editingField === `cat-${catIndex}` ? editingValue : category.weight}
                        onFocus={() => {
                          setEditingField(`cat-${catIndex}`);
                          setEditingValue(category.weight.toString());
                        }}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, '');
                          setEditingValue(raw);
                          handleCategoryWeightChange(catIndex, parseFloat(raw) || 0);
                        }}
                        onBlur={() => setEditingField(null)}
                        style={{
                          width: '55px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: `${catColor}20`,
                          color: 'var(--text-primary)',
                          fontWeight: 700,
                          fontSize: '1rem',
                          textAlign: 'center',
                        }}
                      />
                      <span style={{ color: catColor, fontWeight: 700 }}>%</span>
                    </div>
                  </div>

                  {/* Criteria */}
                  <div style={{ padding: '10px 14px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                      fontSize: '0.85rem',
                      color: criteriaWeightValid ? 'var(--text-tertiary)' : 'rgb(239, 68, 68)',
                    }}>
                      <span>{t('editor.criteria_weights')}</span>
                      <span style={{ fontWeight: 600 }}>{criteriaActualWeight.toFixed(1)}% / {catWeight}%</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {catCriteria.map((criterion, critIndex) => {
                        const critDisplayName = typeof criterion.display_name === 'string'
                          ? criterion.display_name
                          : String(criterion.display_name || criterion.name || '');
                        return (
                          <div
                            key={criterion.id || critIndex}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              background: 'var(--bg-surface-alt)',
                            }}
                          >
                            <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                              {critDisplayName}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={editingField === `crit-${catIndex}-${critIndex}` ? editingValue : parseFloat(((criterion.weight * catWeight / 100) || 0).toFixed(2))}
                                onFocus={() => {
                                  setEditingField(`crit-${catIndex}-${critIndex}`);
                                  setEditingValue(parseFloat(((criterion.weight * catWeight / 100) || 0).toFixed(2)).toString());
                                }}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^0-9.]/g, '');
                                  setEditingValue(raw);
                                  handleCriterionWeightChange(catIndex, critIndex, parseFloat(raw) || 0);
                                }}
                                onBlur={() => setEditingField(null)}
                                style={{
                                  width: '60px',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-color)',
                                  background: 'var(--bg-surface)',
                                  color: 'var(--text-primary)',
                                  fontWeight: 600,
                                  fontSize: '0.95rem',
                                  textAlign: 'center',
                                }}
                              />
                              <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 20px',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-surface-alt)',
          borderRadius: '0 0 16px 16px',
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            {t('editor.btn.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!categoryWeightValid || isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: categoryWeightValid && !isLoading ? 'rgb(16, 185, 129)' : 'var(--bg-surface-alt)',
              color: categoryWeightValid && !isLoading ? 'white' : 'var(--text-tertiary)',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: categoryWeightValid && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                </svg>
                {t('editor.btn.saving')}
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
                {t('editor.btn.save')}
              </>
            )}
          </button>
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

export default InlineCriteriaEditor;
