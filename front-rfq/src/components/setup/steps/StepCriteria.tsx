import React, { useState, useCallback } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import {
  useScoringConfigStore,
  CATEGORY_COLORS,
} from '../../../stores/useScoringConfigStore';
import type { CategoryDraft, CriterionDraft } from '../../../types/scoring.types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CRITERIA,
} from '../../../types/scoring.types';

/**
 * Convert criteria from relative weights (sum=100%) to absolute weights (sum=categoryWeight).
 * E.g. if category=30% and criterion=33.33%, absolute weight = 10%
 */
function toAbsoluteWeights(criteria: CriterionDraft[], categoryWeight: number): CriterionDraft[] {
  return criteria.map(c => ({
    ...c,
    weight: parseFloat((c.weight * categoryWeight / 100).toFixed(2)),
  }));
}

interface StepCriteriaProps {
  projectType: 'RFP' | 'RFQ' | 'RFI';
}

export const StepCriteria: React.FC<StepCriteriaProps> = ({ projectType }) => {
  const { t, language } = useLanguageStore();
  const {
    draftCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    setDraftCategories,
  } = useScoringConfigStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatWeight, setNewCatWeight] = useState(10);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [addingCriteria, setAddingCriteria] = useState<Set<number>>(new Set());
  const [newCriterionNames, setNewCriterionNames] = useState<Record<number, string>>({});
  const [newCriterionWeights, setNewCriterionWeights] = useState<Record<number, number>>({});

  // Load type-specific defaults
  const loadTypeDefaults = useCallback(() => {
    let categories: CategoryDraft[];

    if (projectType === 'RFQ') {
      // RFQ: Economic-heavy defaults
      categories = DEFAULT_CATEGORIES.map(cat => {
        const weight = cat.name === 'economic' ? 50
          : cat.name === 'technical' ? 25
          : cat.name === 'execution' ? 15
          : 10;
        return {
          ...cat,
          weight,
          criteria: toAbsoluteWeights(DEFAULT_CRITERIA[cat.name] || [], weight),
        };
      });
    } else if (projectType === 'RFI') {
      // RFI: Informational, fewer categories
      categories = DEFAULT_CATEGORIES
        .filter(cat => cat.name === 'technical' || cat.name === 'execution')
        .map(cat => {
          const weight = cat.name === 'technical' ? 60 : 40;
          return {
            ...cat,
            weight,
            criteria: toAbsoluteWeights(DEFAULT_CRITERIA[cat.name] || [], weight),
          };
        });
    } else {
      // RFP: Balanced defaults
      categories = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        criteria: toAbsoluteWeights(DEFAULT_CRITERIA[cat.name] || [], cat.weight),
      }));
    }

    setDraftCategories(categories);
    // Auto-expand first category so user sees sub-criteria exist
    setExpandedCategories(new Set([0]));
  }, [projectType, setDraftCategories]);

  const totalWeight = draftCategories.reduce((sum, cat) => sum + cat.weight, 0);
  const isValid = Math.abs(totalWeight - 100) < 0.01;

  const handleWeightChange = (idx: number, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      updateCategory(idx, { weight: num });
    }
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;

    const slug = newCatName.trim().toLowerCase().replace(/\s+/g, '_');
    const colorIdx = draftCategories.length % CATEGORY_COLORS.length;

    addCategory({
      name: slug,
      display_name: newCatName.trim(),
      display_name_es: newCatName.trim(),
      weight: newCatWeight,
      color: CATEGORY_COLORS[colorIdx],
      sort_order: draftCategories.length + 1,
    });

    setNewCatName('');
    setNewCatWeight(10);
    setIsAdding(false);
  };

  const getCategoryDisplayName = (cat: CategoryDraft) => {
    if (language === 'es' && cat.display_name_es) return cat.display_name_es;
    return cat.display_name;
  };

  const toggleCategoryExpansion = (idx: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedCategories(newExpanded);
  };

  const addCriterion = (categoryIdx: number) => {
    const categoryName = newCriterionNames[categoryIdx]?.trim();
    if (!categoryName) return;

    const category = draftCategories[categoryIdx];
    const usedWeight = (category.criteria || []).reduce((s, c) => s + c.weight, 0);
    const remainingWeight = Math.max(0, category.weight - usedWeight);
    const newCriterion: CriterionDraft = {
      name: categoryName.toLowerCase().replace(/\s+/g, '_'),
      display_name: categoryName,
      display_name_es: categoryName,
      weight: newCriterionWeights[categoryIdx] ?? parseFloat(remainingWeight.toFixed(2)),
      sort_order: (category.criteria?.length || 0) + 1,
    };

    updateCategory(categoryIdx, {
      criteria: [...(category.criteria || []), newCriterion]
    });

    // Reset form
    setNewCriterionNames(prev => ({ ...prev, [categoryIdx]: '' }));
    setNewCriterionWeights(prev => ({ ...prev, [categoryIdx]: 10 }));
    setAddingCriteria(prev => {
      const newSet = new Set(prev);
      newSet.delete(categoryIdx);
      return newSet;
    });
  };

  const deleteCriterion = (categoryIdx: number, criterionIdx: number) => {
    const category = draftCategories[categoryIdx];
    const updatedCriteria = category.criteria?.filter((_, idx) => idx !== criterionIdx) || [];
    updateCategory(categoryIdx, { criteria: updatedCriteria });
  };

  const updateCriterionWeight = (categoryIdx: number, criterionIdx: number, weight: number) => {
    const category = draftCategories[categoryIdx];
    const updatedCriteria = category.criteria?.map((criterion, idx) =>
      idx === criterionIdx ? { ...criterion, weight } : criterion
    ) || [];
    updateCategory(categoryIdx, { criteria: updatedCriteria });
  };

  // Auto-balance: redistribute criteria weights proportionally to match category weight
  const autoBalanceCriteria = (categoryIdx: number) => {
    const category = draftCategories[categoryIdx];
    const criteria = category.criteria || [];
    if (criteria.length === 0) return;

    const equalWeight = parseFloat((category.weight / criteria.length).toFixed(2));
    const remainder = parseFloat((category.weight - equalWeight * criteria.length).toFixed(2));

    const balanced = criteria.map((c, i) => ({
      ...c,
      weight: i === 0 ? parseFloat((equalWeight + remainder).toFixed(2)) : equalWeight,
    }));

    updateCategory(categoryIdx, { criteria: balanced });
  };

  // Info text based on project type
  const typeInfo: Record<string, string> = {
    RFP: t('setup.criteria.rfp_info') || 'Para RFP se evalúan criterios técnicos, económicos y de experiencia.',
    RFQ: t('setup.criteria.rfq_info') || 'Para RFQ el peso económico suele ser mayor (>50%).',
    RFI: t('setup.criteria.rfi_info') || 'Para RFI la evaluación es informativa, los pesos son orientativos.',
  };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          {typeInfo[projectType]}
        </p>
      </div>

      {/* Load Defaults Button (when empty) */}
      {draftCategories.length === 0 && (
        <div className="setup-criteria-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: '8px' }}>
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="2" />
            <line x1="9" y1="12" x2="15" y2="12" />
            <line x1="9" y1="16" x2="13" y2="16" />
          </svg>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', margin: '0 0 12px 0' }}>
            {t('setup.criteria.empty') || 'No hay criterios definidos. Puedes cargar una plantilla predefinida o añadir categorías manualmente.'}
          </p>
          <button
            className="setup-btn setup-btn-primary"
            onClick={loadTypeDefaults}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {t('setup.criteria.load_defaults') || `Cargar plantilla ${projectType}`}
          </button>
        </div>
      )}

      {/* Weight Summary Bar */}
      <div className="setup-criteria-summary" style={{ display: draftCategories.length === 0 ? 'none' : undefined }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {t('setup.criteria.total_weight') || 'Peso total'}
        </span>
        <span className={`setup-criteria-total ${isValid ? 'valid' : 'invalid'}`}>
          {totalWeight.toFixed(0)}% / 100%
          {isValid ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: '6px' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: '6px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </span>
      </div>

      {/* Visual Weight Bar */}
      <div style={{
        display: 'flex',
        height: '8px',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '20px',
        background: 'var(--bg-surface-alt)',
        border: '1px solid var(--border-color)',
      }}>
        {draftCategories.map((cat, idx) => (
          <div
            key={idx}
            style={{
              width: `${cat.weight}%`,
              background: cat.color,
              transition: 'width 0.3s',
            }}
          />
        ))}
      </div>

      {/* Category Cards */}
      {draftCategories.map((cat, idx) => (
        <div key={idx} className="setup-category-card">
          <div 
            className="setup-category-header"
            onClick={() => toggleCategoryExpansion(idx)}
            style={{ cursor: 'pointer' }}
          >
            <div className="setup-category-color" style={{ background: cat.color }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className="setup-category-name">{getCategoryDisplayName(cat)}</span>
              {(cat.criteria?.length || 0) > 0 && (() => {
                const criteriaSum = (cat.criteria || []).reduce((s, c) => s + c.weight, 0);
                const isCriteriaMatch = Math.abs(criteriaSum - cat.weight) < 0.1;
                return (
                  <span style={{
                    fontSize: '0.7rem',
                    color: !isCriteriaMatch ? '#f59e0b' : expandedCategories.has(idx) ? 'var(--accent, #12b5b0)' : 'var(--text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'color 0.2s',
                  }}>
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{
                        transform: expandedCategories.has(idx) ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    {cat.criteria.length} {cat.criteria.length === 1 ? 'criterio' : 'criterios'}
                    {!isCriteriaMatch && (
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                        ({criteriaSum.toFixed(1)}% / {cat.weight}%)
                      </span>
                    )}
                  </span>
                );
              })()}
            </div>
            <input
              className="setup-category-weight-input"
              type="number"
              min="0"
              max="100"
              step="5"
              value={cat.weight}
              onChange={(e) => handleWeightChange(idx, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginRight: '8px' }}>%</span>
            <div className="setup-category-actions">
              <button
                className="setup-category-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategoryExpansion(idx);
                }}
                title={expandedCategories.has(idx) ? 'Colapsar' : 'Expandir'}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{
                    transform: expandedCategories.has(idx) ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button
                className="setup-category-action-btn delete"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCategory(idx);
                }}
                title={t('setup.criteria.delete') || 'Eliminar'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Criteria Section */}
          {expandedCategories.has(idx) && (
            <div style={{ 
              padding: '16px', 
              background: 'var(--bg-surface)', 
              borderTop: '1px solid var(--border-color)' 
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <span style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  Criterios ({cat.criteria?.length || 0})
                  {(() => {
                    const criteriaSum = (cat.criteria || []).reduce((s, c) => s + c.weight, 0);
                    const isMatch = Math.abs(criteriaSum - cat.weight) < 0.1;
                    return (
                      <span style={{
                        fontSize: '0.7rem',
                        color: isMatch ? 'var(--accent, #12b5b0)' : '#f59e0b',
                        fontWeight: '500',
                      }}>
                        {criteriaSum.toFixed(1)}% / {cat.weight}%
                        {isMatch && ' ✓'}
                      </span>
                    );
                  })()}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(() => {
                    const cSum = (cat.criteria || []).reduce((s, c) => s + c.weight, 0);
                    const off = Math.abs(cSum - cat.weight) >= 0.1;
                    if (!off || (cat.criteria?.length || 0) === 0) return null;
                    return (
                      <button
                        className="setup-category-action-btn"
                        onClick={() => autoBalanceCriteria(idx)}
                        title={t('setup.criteria.auto_balance') || 'Auto-equilibrar pesos'}
                        style={{ fontSize: '0.7rem', padding: '4px 8px', color: '#f59e0b' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                          <line x1="12" y1="3" x2="12" y2="21" />
                          <path d="M17 8l-5-5-5 5" />
                          <path d="M17 16l-5 5-5-5" />
                        </svg>
                        {t('setup.criteria.balance') || 'Equilibrar'}
                      </button>
                    );
                  })()}
                  <button
                    className="setup-category-action-btn"
                    onClick={() => {
                      setAddingCriteria(prev => new Set(prev).add(idx));
                      setNewCriterionNames(prev => ({ ...prev, [idx]: '' }));
                      setNewCriterionWeights(prev => ({ ...prev, [idx]: 10 }));
                    }}
                    title="Añadir criterio"
                    style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {t('setup.providers.add') || 'Añadir'}
                  </button>
                </div>
              </div>

              {/* Criteria List */}
              {cat.criteria?.map((criterion, critIdx) => (
                <div key={critIdx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: 'var(--bg-surface-alt)',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: cat.color,
                    flexShrink: 0
                  }} />
                  <span style={{ 
                    flex: 1, 
                    fontSize: '0.8rem', 
                    color: 'var(--text-primary)' 
                  }}>
                    {criterion.display_name}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={criterion.weight}
                    onChange={(e) => updateCriterionWeight(idx, critIdx, parseFloat(e.target.value) || 0)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '50px',
                      padding: '4px 6px',
                      fontSize: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>%</span>
                  <button
                    className="setup-category-action-btn delete"
                    onClick={() => deleteCriterion(idx, critIdx)}
                    title="Eliminar criterio"
                    style={{ padding: '2px' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Add Criterion Form */}
              {addingCriteria.has(idx) && (
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'rgba(18, 181, 176, 0.05)',
                  borderRadius: '8px',
                  border: '2px dashed var(--accent, #12b5b0)',
                  marginTop: '8px'
                }}>
                  <input
                    className="setup-input"
                    type="text"
                    placeholder="Nombre del criterio"
                    value={newCriterionNames[idx] || ''}
                    onChange={(e) => setNewCriterionNames(prev => ({ 
                      ...prev, 
                      [idx]: e.target.value 
                    }))}
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter') addCriterion(idx); 
                      if (e.key === 'Escape') {
                        setAddingCriteria(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(idx);
                          return newSet;
                        });
                      }
                    }}
                    autoFocus
                    style={{ flex: 1, fontSize: '0.8rem' }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newCriterionWeights[idx] || 10}
                    onChange={(e) => setNewCriterionWeights(prev => ({ 
                      ...prev, 
                      [idx]: parseInt(e.target.value) || 0 
                    }))}
                    style={{
                      width: '50px',
                      padding: '4px 6px',
                      fontSize: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>%</span>
                  <button 
                    className="setup-btn setup-btn-primary" 
                    onClick={() => addCriterion(idx)} 
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    ✓
                  </button>
                  <button 
                    className="setup-btn setup-btn-secondary" 
                    onClick={() => {
                      setAddingCriteria(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(idx);
                        return newSet;
                      });
                    }}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add Category */}
      {isAdding ? (
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          padding: '10px',
          border: '2px dashed var(--accent, #12b5b0)',
          borderRadius: '10px',
          background: 'rgba(18, 181, 176, 0.05)',
        }}>
          <input
            className="setup-input"
            type="text"
            placeholder={t('setup.criteria.new_name') || 'Nombre de la categoría'}
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') setIsAdding(false); }}
            autoFocus
            style={{ flex: 1 }}
          />
          <input
            className="setup-category-weight-input"
            type="number"
            min="0"
            max="100"
            value={newCatWeight}
            onChange={(e) => setNewCatWeight(parseInt(e.target.value) || 0)}
            style={{ width: '60px' }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>%</span>
          <button className="setup-btn setup-btn-primary" onClick={handleAddCategory} style={{ padding: '6px 12px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
          <button className="setup-btn setup-btn-secondary" onClick={() => setIsAdding(false)} style={{ padding: '6px 12px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ) : (
        <button className="setup-add-category-btn" onClick={() => setIsAdding(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('setup.criteria.add_category') || 'Añadir categoría'}
        </button>
      )}
    </div>
  );
};
