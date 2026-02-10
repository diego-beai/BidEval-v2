import React from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import type { ProjectSetupData } from '../ProjectSetupWizard';

interface StepDeadlinesProps {
  data: ProjectSetupData;
  onChange: (updates: Partial<ProjectSetupData>) => void;
}

const DATE_FIELDS = [
  { key: 'dateOpening' as const, color: '#3b82f6' },
  { key: 'dateSubmissionDeadline' as const, color: '#f59e0b' },
  { key: 'dateEvaluation' as const, color: '#12b5b0' },
  { key: 'dateAward' as const, color: '#22c55e' },
];

export const StepDeadlines: React.FC<StepDeadlinesProps> = ({ data, onChange }) => {
  const { t } = useLanguageStore();

  const fieldLabels: Record<string, string> = {
    dateOpening: t('setup.date.opening') || 'Apertura',
    dateSubmissionDeadline: t('setup.date.submission') || 'Límite ofertas',
    dateEvaluation: t('setup.date.evaluation') || 'Evaluación',
    dateAward: t('setup.date.award') || 'Adjudicación',
  };

  const fieldIcons: Record<string, React.ReactNode> = {
    dateOpening: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#3b82f6' }}>
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <line x1="12" y1="3" x2="12" y2="15" />
        <polyline points="16 11 12 15 8 11" />
      </svg>
    ),
    dateSubmissionDeadline: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#f59e0b' }}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    dateEvaluation: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#12b5b0' }}>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    dateAward: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#22c55e' }}>
        <circle cx="12" cy="8" r="7" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      </svg>
    ),
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  };

  const filledDates = DATE_FIELDS.filter(f => !!data[f.key]);

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          {t('setup.dates.hint') || 'Define las fechas clave del proceso de licitación. Puedes dejarlas vacías y completarlas después.'}
        </p>
      </div>

      <div className="setup-dates-grid">
        {DATE_FIELDS.map(field => (
          <div key={field.key} className="setup-date-field">
            <label>
              <div className="date-icon" style={{ background: `${field.color}15` }}>
                {fieldIcons[field.key]}
              </div>
              {fieldLabels[field.key]}
            </label>
            <input
              className="setup-input"
              type="date"
              value={data[field.key]}
              onChange={(e) => onChange({ [field.key]: e.target.value })}
            />
          </div>
        ))}
      </div>

      {/* Visual Timeline */}
      {filledDates.length > 0 && (
        <div className="setup-timeline">
          <div className="timeline-track">
            {DATE_FIELDS.map((field, idx) => {
              const isFilled = !!data[field.key];
              const nextField = DATE_FIELDS[idx + 1];
              const isNextFilled = nextField ? !!data[nextField.key] : false;
              
              return (
                <React.Fragment key={field.key}>
                  <div className="timeline-node">
                    <div className="timeline-dot-container">
                      <div
                        className={`timeline-dot ${isFilled ? 'filled' : ''}`}
                        style={isFilled ? { borderColor: field.color, background: field.color } : {}}
                      >
                        {isFilled && (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                          </svg>
                        )}
                      </div>
                      {isFilled && (
                        <div 
                          className="timeline-pulse" 
                          style={{ background: field.color }}
                        />
                      )}
                    </div>
                    <div className="timeline-label-container">
                      <span className={`timeline-label ${isFilled ? 'filled' : ''}`} style={isFilled ? { color: field.color } : {}}>
                        {fieldLabels[field.key]}
                      </span>
                      {isFilled && (
                        <span className="timeline-date" style={{ color: field.color }}>
                          {formatDateDisplay(data[field.key])}
                        </span>
                      )}
                    </div>
                  </div>
                  {idx < DATE_FIELDS.length - 1 && (
                    <div className="timeline-line-container">
                      <div
                        className={`timeline-line ${isFilled && isNextFilled ? 'filled' : ''}`}
                        style={isFilled && isNextFilled ? { background: `linear-gradient(90deg, ${field.color} 0%, ${nextField.color} 100%)` } : {}}
                      />
                      {isFilled && isNextFilled && (
                        <div className="timeline-flow-indicator">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
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
