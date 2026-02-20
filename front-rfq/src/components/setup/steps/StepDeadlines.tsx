import React, { useState, useCallback } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { useSetupStore } from '../../../stores/useSetupStore';
import type { ProjectSetupData } from '../ProjectSetupWizard';
import type { MilestoneEntry } from '../../../types/setup.types';
import type { MilestoneType } from '../../../types/database.types';

interface StepDeadlinesProps {
  data: ProjectSetupData;
  onChange: (updates: Partial<ProjectSetupData>) => void;
}

// ============================================
// CONSTANTS
// ============================================

const MILESTONE_COLORS: Record<string, string> = {
  opening: '#3b82f6',
  submission: '#f59e0b',
  questions: '#8b5cf6',
  evaluation: '#12b5b0',
  award: '#22c55e',
  negotiation: '#ec4899',
  due_diligence: '#f97316',
  kickoff: '#06b6d4',
  custom: '#64748b',
};

/** The 4 default milestone types that map to the legacy date fields */
const DEFAULT_TYPES: MilestoneType[] = ['opening', 'submission', 'evaluation', 'award'];

/** Map milestone type -> legacy ProjectSetupData date key */
const TYPE_TO_LEGACY_KEY: Partial<Record<MilestoneType, keyof ProjectSetupData>> = {
  opening: 'dateOpening',
  submission: 'dateSubmissionDeadline',
  evaluation: 'dateEvaluation',
  award: 'dateAward',
};

/** Milestone types available in the "add milestone" type selector */
const AVAILABLE_TYPES: { value: MilestoneType; label: string }[] = [
  { value: 'questions', label: 'Preguntas' },
  { value: 'negotiation', label: 'Negociacion' },
  { value: 'due_diligence', label: 'Due Diligence' },
  { value: 'kickoff', label: 'Kick-off' },
  { value: 'custom', label: 'Personalizado' },
];

// ============================================
// INLINE SVG ICONS
// ============================================

const MilestoneIcon: React.FC<{ type: MilestoneType; color: string }> = ({ type, color }) => {
  const style = { color };

  switch (type) {
    case 'opening':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={style}>
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <line x1="12" y1="3" x2="12" y2="15" />
          <polyline points="16 11 12 15 8 11" />
        </svg>
      );
    case 'submission':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={style}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'evaluation':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={style}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case 'award':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={style}>
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      );
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={style}>
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      );
  }
};

const ArrowUpIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const ArrowDownIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const PlusIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const WarningIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ============================================
// COMPONENT
// ============================================

export const StepDeadlines: React.FC<StepDeadlinesProps> = ({ data: _data, onChange }) => {
  const { t } = useLanguageStore();
  const {
    milestones,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    reorderMilestones,
  } = useSetupStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<MilestoneType>('custom');
  const [newDate, setNewDate] = useState('');
  const [newMandatory, setNewMandatory] = useState(false);

  // Sort milestones by sortOrder for display
  const sorted = [...milestones].sort((a, b) => a.sortOrder - b.sortOrder);

  // ------------------------------------------
  // Helpers
  // ------------------------------------------

  const isDefaultType = (type: MilestoneType): boolean => DEFAULT_TYPES.includes(type);

  const getColor = (type: MilestoneType): string => MILESTONE_COLORS[type] || MILESTONE_COLORS.custom;

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  /** Sync a milestone date change to the legacy ProjectSetupData fields */
  const syncLegacyDate = useCallback(
    (type: MilestoneType, dateValue: string) => {
      const legacyKey = TYPE_TO_LEGACY_KEY[type];
      if (legacyKey) {
        onChange({ [legacyKey]: dateValue });
      }
    },
    [onChange],
  );

  // ------------------------------------------
  // Out-of-order detection
  // ------------------------------------------

  const isOutOfOrder = (idx: number): boolean => {
    const current = sorted[idx];
    if (!current.dueDate) return false;
    for (let i = 0; i < idx; i++) {
      const prev = sorted[i];
      if (prev.dueDate && current.dueDate < prev.dueDate) return true;
    }
    for (let i = idx + 1; i < sorted.length; i++) {
      const next = sorted[i];
      if (next.dueDate && current.dueDate > next.dueDate) return true;
    }
    return false;
  };

  const hasOrderError = sorted.some((_, idx) => isOutOfOrder(idx));

  // ------------------------------------------
  // Handlers
  // ------------------------------------------

  const handleDateChange = (milestone: MilestoneEntry, idx: number, newValue: string) => {
    updateMilestone(milestone.id, { dueDate: newValue });
    syncLegacyDate(milestone.milestoneType, newValue);

    // Auto-fix later dates that would be before the new value
    if (newValue) {
      for (let i = idx + 1; i < sorted.length; i++) {
        const later = sorted[i];
        if (later.dueDate && later.dueDate < newValue) {
          updateMilestone(later.id, { dueDate: newValue });
          syncLegacyDate(later.milestoneType, newValue);
        }
      }
    }
  };

  const handleNameChange = (milestone: MilestoneEntry, name: string) => {
    updateMilestone(milestone.id, { name });
  };

  const handleMoveUp = (idx: number) => {
    if (idx <= 0) return;
    const ids = sorted.map((m) => m.id);
    [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
    reorderMilestones(ids);
  };

  const handleMoveDown = (idx: number) => {
    if (idx >= sorted.length - 1) return;
    const ids = sorted.map((m) => m.id);
    [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
    reorderMilestones(ids);
  };

  const handleDelete = (milestone: MilestoneEntry) => {
    // Clear legacy field if it was a default type
    syncLegacyDate(milestone.milestoneType, '');
    deleteMilestone(milestone.id);
  };

  const handleAddMilestone = () => {
    if (!newName.trim()) return;

    const entry: MilestoneEntry = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      dueDate: newDate,
      sortOrder: sorted.length,
      isMandatory: newMandatory,
      milestoneType: newType,
    };

    addMilestone(entry);
    syncLegacyDate(newType, newDate);

    // Reset form
    setNewName('');
    setNewType('custom');
    setNewDate('');
    setNewMandatory(false);
    setShowAddForm(false);
  };

  const handleCancelAdd = () => {
    setNewName('');
    setNewType('custom');
    setNewDate('');
    setNewMandatory(false);
    setShowAddForm(false);
  };

  // ------------------------------------------
  // Render
  // ------------------------------------------

  return (
    <div>
      {/* Hint */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          {t('setup.dates.hint') || 'Define las fechas clave del proceso de licitacion. Puedes dejarlas vacias y completarlas despues.'}
        </p>
      </div>

      {/* Out-of-order warning */}
      {hasOrderError && (
        <div className="milestone-warning">
          <WarningIcon />
          {t('setup.dates.order_warning') || 'Las fechas deben seguir un orden cronologico'}
        </div>
      )}

      {/* Milestone cards list */}
      <div className="milestone-list">
        {sorted.map((milestone, idx) => {
          const color = getColor(milestone.milestoneType);
          const isDefault = isDefaultType(milestone.milestoneType);
          const outOfOrder = isOutOfOrder(idx);

          return (
            <div
              key={milestone.id}
              className={`milestone-card${outOfOrder ? ' milestone-card-warning' : ''}`}
              style={{ animationDelay: `${idx * 0.04}s` }}
            >
              {/* Color bar */}
              <div className="milestone-color-bar" style={{ background: color }} />

              {/* Icon */}
              <div className="milestone-icon" style={{ background: `${color}15` }}>
                <MilestoneIcon type={milestone.milestoneType} color={color} />
              </div>

              {/* Name */}
              <div className="milestone-name-area">
                {isDefault ? (
                  <span className="milestone-name">{milestone.name}</span>
                ) : (
                  <input
                    className="milestone-name-input"
                    type="text"
                    value={milestone.name}
                    onChange={(e) => handleNameChange(milestone, e.target.value)}
                    placeholder={t('setup.milestones.name') || 'Nombre del hito'}
                  />
                )}
                <span className="milestone-type-badge" style={{ color, background: `${color}15` }}>
                  {milestone.milestoneType}
                </span>
              </div>

              {/* Date input */}
              <input
                className={`setup-input milestone-date-input${outOfOrder ? ' setup-input-error' : ''}`}
                type="date"
                value={milestone.dueDate}
                onChange={(e) => handleDateChange(milestone, idx, e.target.value)}
              />

              {/* Mandatory badge */}
              {milestone.isMandatory && (
                <span className="milestone-mandatory-badge">
                  {t('setup.milestones.mandatory') || 'Obligatorio'}
                </span>
              )}

              {/* Actions */}
              <div className="milestone-actions">
                <button
                  className="milestone-action-btn"
                  onClick={() => handleMoveUp(idx)}
                  disabled={idx === 0}
                  title="Mover arriba"
                  type="button"
                >
                  <ArrowUpIcon />
                </button>
                <button
                  className="milestone-action-btn"
                  onClick={() => handleMoveDown(idx)}
                  disabled={idx === sorted.length - 1}
                  title="Mover abajo"
                  type="button"
                >
                  <ArrowDownIcon />
                </button>
                <button
                  className="milestone-action-btn milestone-action-delete"
                  onClick={() => handleDelete(milestone)}
                  disabled={isDefault}
                  title={isDefault ? 'No se puede eliminar un hito por defecto' : 'Eliminar hito'}
                  type="button"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add milestone form */}
      {showAddForm ? (
        <div className="milestone-add-form">
          <div className="milestone-add-form-header">
            <span className="milestone-add-form-title">
              {t('setup.milestones.add') || 'Anadir hito'}
            </span>
          </div>
          <div className="milestone-add-form-body">
            <div className="milestone-add-row">
              <div className="milestone-add-field" style={{ flex: 2 }}>
                <label>{t('setup.milestones.name') || 'Nombre del hito'}</label>
                <input
                  className="setup-input"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Negociacion, Due Diligence..."
                />
              </div>
              <div className="milestone-add-field" style={{ flex: 1 }}>
                <label>{t('setup.milestones.type') || 'Tipo'}</label>
                <select
                  className="setup-input"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as MilestoneType)}
                >
                  {AVAILABLE_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="milestone-add-row">
              <div className="milestone-add-field" style={{ flex: 1 }}>
                <label>{t('setup.date.opening') ? 'Fecha' : 'Fecha'}</label>
                <input
                  className="setup-input"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div className="milestone-add-field milestone-add-checkbox-field">
                <label className="milestone-checkbox-label">
                  <input
                    type="checkbox"
                    checked={newMandatory}
                    onChange={(e) => setNewMandatory(e.target.checked)}
                  />
                  {t('setup.milestones.mandatory') || 'Obligatorio'}
                </label>
              </div>
            </div>
            <div className="milestone-add-actions">
              <button className="setup-btn setup-btn-secondary" onClick={handleCancelAdd} type="button">
                Cancelar
              </button>
              <button
                className="setup-btn setup-btn-primary"
                onClick={handleAddMilestone}
                disabled={!newName.trim()}
                type="button"
              >
                {t('setup.milestones.add') || 'Anadir hito'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          className="milestone-add-btn"
          onClick={() => setShowAddForm(true)}
          type="button"
        >
          <PlusIcon />
          {t('setup.milestones.add') || 'Anadir hito'}
        </button>
      )}

      {/* Visual Timeline */}
      {sorted.some((m) => !!m.dueDate) && (
        <div className="setup-timeline">
          <div className="timeline-track">
            {sorted.map((milestone, idx) => {
              const color = getColor(milestone.milestoneType);
              const isFilled = !!milestone.dueDate;
              const nextMilestone = sorted[idx + 1];
              const isNextFilled = nextMilestone ? !!nextMilestone.dueDate : false;
              const nextColor = nextMilestone ? getColor(nextMilestone.milestoneType) : color;

              return (
                <React.Fragment key={milestone.id}>
                  <div className="timeline-node">
                    <div className="timeline-dot-container">
                      <div
                        className={`timeline-dot ${isFilled ? 'filled' : ''}`}
                        style={isFilled ? { borderColor: color, background: color } : {}}
                      >
                        {isFilled && (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                          </svg>
                        )}
                      </div>
                      {isFilled && (
                        <div className="timeline-pulse" style={{ background: color }} />
                      )}
                    </div>
                    <div className="timeline-label-container">
                      <span
                        className={`timeline-label ${isFilled ? 'filled' : ''}`}
                        style={isFilled ? { color } : {}}
                      >
                        {milestone.name}
                      </span>
                      {isFilled && (
                        <span className="timeline-date" style={{ color }}>
                          {formatDateDisplay(milestone.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  {idx < sorted.length - 1 && (
                    <div className="timeline-line-container">
                      <div
                        className={`timeline-line ${isFilled && isNextFilled ? 'filled' : ''}`}
                        style={
                          isFilled && isNextFilled
                            ? { background: `linear-gradient(90deg, ${color} 0%, ${nextColor} 100%)` }
                            : {}
                        }
                      />
                      {isFilled && isNextFilled && (
                        <div className="timeline-flow-indicator">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
