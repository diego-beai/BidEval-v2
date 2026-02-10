import React, { useState } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import type { ProjectSetupData, ProviderEntry } from '../ProjectSetupWizard';

interface StepProvidersProps {
  data: ProjectSetupData;
  onChange: (updates: Partial<ProjectSetupData>) => void;
}

const PROVIDER_COLORS = [
  '#12b5b0', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#22c55e', '#f97316', '#06b6d4', '#6366f1',
];

export const StepProviders: React.FC<StepProvidersProps> = ({ data, onChange }) => {
  const { t } = useLanguageStore();
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newContact, setNewContact] = useState('');

  const handleAdd = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    // Check duplicate
    if (data.providers.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      return;
    }

    const newProvider: ProviderEntry = {
      name: trimmedName,
      email: newEmail.trim(),
      contact: newContact.trim(),
    };

    onChange({ providers: [...data.providers, newProvider] });
    setNewName('');
    setNewEmail('');
    setNewContact('');
  };

  const handleRemove = (idx: number) => {
    onChange({ providers: data.providers.filter((_, i) => i !== idx) });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(/[\s_-]+/)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          {t('setup.providers.hint') || 'Añade los proveedores que participarán en el proceso. Podrás gestionar invitaciones después.'}
        </p>
      </div>

      {/* Add Provider Row */}
      <div className="setup-provider-input-row">
        <input
          className="setup-input"
          type="text"
          placeholder={t('setup.providers.name_placeholder') || 'Nombre del proveedor'}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={100}
        />
        <input
          className="setup-input"
          type="email"
          placeholder={t('setup.providers.email_placeholder') || 'Email (opcional)'}
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={150}
        />
        <input
          className="setup-input"
          type="text"
          placeholder={t('setup.providers.contact_placeholder') || 'Contacto (opcional)'}
          value={newContact}
          onChange={(e) => setNewContact(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={100}
        />
        <button
          className="setup-btn setup-btn-primary"
          onClick={handleAdd}
          disabled={!newName.trim()}
          style={{ flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('setup.providers.add') || 'Añadir'}
        </button>
      </div>

      {/* Provider List */}
      <div className="setup-provider-list">
        {data.providers.length === 0 ? (
          <div className="setup-provider-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: '8px' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <div>{t('setup.providers.empty') || 'No hay proveedores invitados aún'}</div>
          </div>
        ) : (
          data.providers.map((provider, idx) => (
            <div key={idx} className="setup-provider-chip">
              <div
                className="provider-avatar"
                style={{ background: PROVIDER_COLORS[idx % PROVIDER_COLORS.length] }}
              >
                {getInitials(provider.name)}
              </div>
              <div className="provider-info">
                <div className="provider-name">{provider.name}</div>
                {provider.email && <div className="provider-email">{provider.email}</div>}
                {provider.contact && <div className="provider-contact">{provider.contact}</div>}
              </div>
              <button className="setup-provider-remove" onClick={() => handleRemove(idx)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {data.providers.length > 0 && (
        <div style={{
          marginTop: '12px',
          fontSize: '0.8rem',
          color: 'var(--text-tertiary)',
          textAlign: 'center'
        }}>
          {data.providers.length} {t('setup.providers.count') || 'proveedor(es) invitado(s)'}
        </div>
      )}
    </div>
  );
};
