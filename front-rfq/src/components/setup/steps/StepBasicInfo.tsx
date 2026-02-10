import React from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import type { ProjectSetupData } from '../ProjectSetupWizard';

interface StepBasicInfoProps {
  data: ProjectSetupData;
  onChange: (updates: Partial<ProjectSetupData>) => void;
}

const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR', symbol: '\u20AC' },
  { value: 'USD', label: 'USD', symbol: '$' },
  { value: 'GBP', label: 'GBP', symbol: '\u00A3' },
  { value: 'CHF', label: 'CHF', symbol: 'Fr' },
];

const TYPE_OPTIONS = [
  {
    value: 'RFP' as const,
    color: '#12b5b0',
    bg: 'rgba(18, 181, 176, 0.1)',
  },
  {
    value: 'RFQ' as const,
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.1)',
  },
  {
    value: 'RFI' as const,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.1)',
  },
];

export const StepBasicInfo: React.FC<StepBasicInfoProps> = ({ data, onChange }) => {
  const { t } = useLanguageStore();

  const typeDescriptions: Record<string, string> = {
    RFP: t('setup.type.rfp_desc') || 'Solicitud completa de propuesta con criterios técnicos y económicos',
    RFQ: t('setup.type.rfq_desc') || 'Solicitud de cotización centrada en precio y condiciones económicas',
    RFI: t('setup.type.rfi_desc') || 'Solicitud de información para conocer capacidades del mercado',
  };

  return (
    <div>
      {/* Project Name */}
      <div className="setup-form-group">
        <label>{t('setup.field.name') || 'Nombre del proyecto'} *</label>
        <input
          className="setup-input"
          type="text"
          placeholder={t('setup.field.name_placeholder') || 'Ej: Planta H2 Verde en Zaragoza'}
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          maxLength={150}
          autoFocus
        />
        <div className="form-hint">
          {t('setup.field.name_hint') || 'Nombre descriptivo para identificar el proyecto'}
        </div>
      </div>

      {/* Reference Code, Owner & Currency */}
      <div className="setup-form-row">
        <div className="setup-form-group">
          <label>{t('setup.field.reference_code') || 'Código de referencia'}</label>
          <input
            className="setup-input"
            type="text"
            placeholder={t('setup.field.reference_code_placeholder') || 'Ej: LIC-2026-001'}
            value={data.referenceCode}
            onChange={(e) => onChange({ referenceCode: e.target.value })}
            maxLength={50}
          />
        </div>
        <div className="setup-form-group">
          <label>{t('setup.field.owner') || 'Propietario'}</label>
          <input
            className="setup-input"
            type="text"
            placeholder={t('setup.field.owner_placeholder') || 'Ej: Juan Pérez'}
            value={data.owner}
            onChange={(e) => onChange({ owner: e.target.value })}
            maxLength={100}
          />
        </div>
        <div className="setup-form-group" style={{ maxWidth: 140 }}>
          <label>{t('setup.field.currency') || 'Moneda'}</label>
          <select
            className="setup-input"
            value={data.currency}
            onChange={(e) => onChange({ currency: e.target.value })}
          >
            {CURRENCY_OPTIONS.map(c => (
              <option key={c.value} value={c.value}>{c.symbol} {c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="setup-form-group">
        <label>{t('setup.field.description') || 'Descripción'}</label>
        <textarea
          className="setup-input setup-textarea"
          placeholder={t('setup.field.description_placeholder') || 'Describe brevemente el alcance y objetivo del proyecto...'}
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          maxLength={1000}
          rows={3}
        />
      </div>

      {/* Project Type */}
      <div className="setup-form-group">
        <label>{t('setup.field.type') || 'Tipo de proceso'}</label>
        <div className="setup-type-selector">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`setup-type-option ${data.projectType === opt.value ? 'selected' : ''}`}
              onClick={() => onChange({ projectType: opt.value })}
              type="button"
            >
              <div
                className="type-icon"
                style={{ background: opt.bg }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={opt.color} strokeWidth="2">
                  {opt.value === 'RFP' && (
                    <>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </>
                  )}
                  {opt.value === 'RFQ' && (
                    <>
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </>
                  )}
                  {opt.value === 'RFI' && (
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </>
                  )}
                </svg>
              </div>
              <div className="type-name">{opt.value}</div>
              <div className="type-desc">{typeDescriptions[opt.value]}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
