import React, { useState } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { useSetupStore } from '../../../stores/useSetupStore';
import type { DocCategory, EvaluationLink } from '../../../types/database.types';

// ============================================
// CONSTANTS
// ============================================

const CATEGORY_COLORS: Record<DocCategory, string> = {
  technical: '#3b82f6',
  economic: '#f59e0b',
  administrative: '#8b5cf6',
  legal: '#64748b',
  hse: '#ef4444',
  custom: '#12b5b0',
};

const EVAL_LINK_LABELS: Record<EvaluationLink, string> = {
  technical: 'Tecnica',
  economic: 'Economica',
  info: 'Informativa',
};

const DOC_CATEGORIES: DocCategory[] = [
  'technical',
  'economic',
  'administrative',
  'legal',
  'hse',
  'custom',
];

const EVAL_LINKS: EvaluationLink[] = ['technical', 'economic', 'info'];

// ============================================
// COMPONENT
// ============================================

export const StepDocumentTypes: React.FC = () => {
  const { t } = useLanguageStore();
  const {
    documentTypes,
    addDocumentType,
    updateDocumentType,
    deleteDocumentType,
    loadDocumentPresets,
  } = useSetupStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<DocCategory>('technical');
  const [newEvalLink, setNewEvalLink] = useState<EvaluationLink>('technical');
  const [newMandatory, setNewMandatory] = useState(true);

  // Inline-editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const getCategoryLabel = (cat: DocCategory): string => {
    const key = `setup.doctypes.categories.${cat}`;
    const fallbacks: Record<DocCategory, string> = {
      technical: 'Tecnico',
      economic: 'Economico',
      administrative: 'Administrativo',
      legal: 'Legal',
      hse: 'HSE',
      custom: 'Personalizado',
    };
    return t(key) || fallbacks[cat];
  };

  const getEvalLabel = (link: EvaluationLink): string => {
    return EVAL_LINK_LABELS[link];
  };

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    addDocumentType({
      id: crypto.randomUUID(),
      name: trimmed,
      docCategory: newCategory,
      evaluationLink: newEvalLink,
      isMandatory: newMandatory,
      sortOrder: documentTypes.length,
    });

    setNewName('');
    setNewCategory('technical');
    setNewEvalLink('technical');
    setNewMandatory(true);
    setIsAdding(false);
  };

  const startEditName = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const saveEditName = () => {
    if (editingId && editName.trim()) {
      updateDocumentType(editingId, { name: editName.trim() });
    }
    setEditingId(null);
    setEditName('');
  };

  return (
    <div>
      {/* Hint */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          {t('setup.doctypes.hint') || 'Define que documentos deben entregar los proveedores y como se vinculan a la evaluacion.'}
        </p>
      </div>

      {/* Empty State */}
      {documentTypes.length === 0 && !isAdding && (
        <div className="setup-criteria-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: '8px' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', margin: '0 0 12px 0' }}>
            {t('setup.doctypes.empty') || 'No hay tipos de documento definidos.'}
          </p>
          <button
            className="setup-btn setup-btn-primary"
            onClick={loadDocumentPresets}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {t('setup.doctypes.load_presets') || 'Cargar presets'}
          </button>
        </div>
      )}

      {/* Load Presets Bar (when items exist) */}
      {documentTypes.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '16px',
          padding: '10px 14px',
          background: 'var(--bg-surface-alt)',
          borderRadius: 'var(--radius-md, 10px)',
          border: '1px solid var(--border-color)',
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary, #12b5b0)" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {documentTypes.length} {documentTypes.length === 1 ? 'tipo de documento' : 'tipos de documento'}
          </span>
          <button
            className="setup-btn setup-btn-secondary"
            onClick={loadDocumentPresets}
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            {t('setup.doctypes.load_presets') || 'Cargar presets'}
          </button>
        </div>
      )}

      {/* Document Type Cards */}
      {documentTypes.map((doc) => (
        <div key={doc.id} className="setup-category-card">
          <div className="setup-category-header" style={{ cursor: 'default' }}>
            {/* Color indicator */}
            <div
              className="setup-category-color"
              style={{ background: CATEGORY_COLORS[doc.docCategory] }}
            />

            {/* Name (editable inline) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {editingId === doc.id ? (
                <input
                  className="setup-input"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEditName();
                    if (e.key === 'Escape') { setEditingId(null); setEditName(''); }
                  }}
                  onBlur={saveEditName}
                  autoFocus
                  style={{ padding: '4px 8px', fontSize: '0.85rem', fontWeight: 600 }}
                />
              ) : (
                <span
                  className="setup-category-name"
                  onClick={() => startEditName(doc.id, doc.name)}
                  style={{ cursor: 'text' }}
                  title={t('setup.doctypes.name') || 'Nombre del documento'}
                >
                  {doc.name}
                </span>
              )}

              {/* Badges row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {/* Category badge */}
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  background: `${CATEGORY_COLORS[doc.docCategory]}18`,
                  color: CATEGORY_COLORS[doc.docCategory],
                  border: `1px solid ${CATEGORY_COLORS[doc.docCategory]}30`,
                }}>
                  {getCategoryLabel(doc.docCategory)}
                </span>

                {/* Eval link badge */}
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 500,
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  {getEvalLabel(doc.evaluationLink)}
                </span>

                {/* Mandatory indicator */}
                {doc.isMandatory && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {t('setup.doctypes.mandatory') || 'Obligatorio'}
                  </span>
                )}
              </div>
            </div>

            {/* Inline controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Category selector */}
              <select
                value={doc.docCategory}
                onChange={(e) => updateDocumentType(doc.id, { docCategory: e.target.value as DocCategory })}
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: '4px 6px',
                  fontSize: '0.72rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
                title={t('setup.doctypes.category') || 'Categoria'}
              >
                {DOC_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                ))}
              </select>

              {/* Eval link selector */}
              <select
                value={doc.evaluationLink}
                onChange={(e) => updateDocumentType(doc.id, { evaluationLink: e.target.value as EvaluationLink })}
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: '4px 6px',
                  fontSize: '0.72rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
                title={t('setup.doctypes.eval_link') || 'Vinculacion evaluacion'}
              >
                {EVAL_LINKS.map((link) => (
                  <option key={link} value={link}>{getEvalLabel(link)}</option>
                ))}
              </select>

              {/* Mandatory toggle */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  color: doc.isMandatory ? '#ef4444' : 'var(--text-tertiary)',
                  fontWeight: doc.isMandatory ? 600 : 400,
                  whiteSpace: 'nowrap',
                }}
                title={t('setup.doctypes.mandatory') || 'Obligatorio'}
              >
                <input
                  type="checkbox"
                  checked={doc.isMandatory}
                  onChange={(e) => updateDocumentType(doc.id, { isMandatory: e.target.checked })}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '14px',
                    height: '14px',
                    accentColor: '#ef4444',
                    cursor: 'pointer',
                  }}
                />
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </label>
            </div>

            {/* Delete button */}
            <div className="setup-category-actions">
              <button
                className="setup-category-action-btn delete"
                onClick={() => deleteDocumentType(doc.id)}
                title={t('setup.doctypes.delete') || 'Eliminar'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Add Document Type */}
      {isAdding ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '14px',
          border: '2px dashed var(--accent, #12b5b0)',
          borderRadius: '10px',
          background: 'rgba(18, 181, 176, 0.05)',
        }}>
          {/* Row 1: Name input */}
          <input
            className="setup-input"
            type="text"
            placeholder={t('setup.doctypes.name') || 'Nombre del documento'}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') setIsAdding(false);
            }}
            autoFocus
            style={{ fontSize: '0.85rem' }}
          />

          {/* Row 2: Category, Eval Link, Mandatory, Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Category select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {t('setup.doctypes.category') || 'Categoria'}:
              </span>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as DocCategory)}
                style={{
                  padding: '5px 8px',
                  fontSize: '0.8rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                {DOC_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                ))}
              </select>
            </div>

            {/* Eval link select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {t('setup.doctypes.eval_link') || 'Vinculacion'}:
              </span>
              <select
                value={newEvalLink}
                onChange={(e) => setNewEvalLink(e.target.value as EvaluationLink)}
                style={{
                  padding: '5px 8px',
                  fontSize: '0.8rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                {EVAL_LINKS.map((link) => (
                  <option key={link} value={link}>{getEvalLabel(link)}</option>
                ))}
              </select>
            </div>

            {/* Mandatory checkbox */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
            }}>
              <input
                type="checkbox"
                checked={newMandatory}
                onChange={(e) => setNewMandatory(e.target.checked)}
                style={{ width: '14px', height: '14px', accentColor: '#ef4444', cursor: 'pointer' }}
              />
              {t('setup.doctypes.mandatory') || 'Obligatorio'}
            </label>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Confirm / Cancel */}
            <button
              className="setup-btn setup-btn-primary"
              onClick={handleAdd}
              disabled={!newName.trim()}
              style={{ padding: '6px 12px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <button
              className="setup-btn setup-btn-secondary"
              onClick={() => setIsAdding(false)}
              style={{ padding: '6px 12px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <button className="setup-add-category-btn" onClick={() => setIsAdding(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('setup.doctypes.add') || 'Anadir tipo de documento'}
        </button>
      )}
    </div>
  );
};
