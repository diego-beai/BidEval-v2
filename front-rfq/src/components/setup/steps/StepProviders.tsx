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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const StepProviders: React.FC<StepProvidersProps> = ({ data, onChange }) => {
  const { t } = useLanguageStore();
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newContact, setNewContact] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editData, setEditData] = useState<ProviderEntry>({ name: '', email: '', contact: '' });

  const handleAdd = () => {
    const trimmedName = newName.trim();
    const trimmedEmail = newEmail.trim();

    if (!trimmedName) return;

    // Check duplicate
    if (data.providers.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      setFieldError(t('setup.providers.duplicate') || 'Ya existe un proveedor con ese nombre');
      return;
    }

    // Validate email if provided
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      setFieldError(t('setup.providers.invalid_email') || 'El formato del email no es válido');
      return;
    }

    const newProvider: ProviderEntry = {
      name: trimmedName,
      email: trimmedEmail,
      contact: newContact.trim(),
    };

    onChange({ providers: [...data.providers, newProvider] });
    setNewName('');
    setNewEmail('');
    setNewContact('');
    setFieldError(null);
  };

  const handleRemove = (idx: number) => {
    if (editingIdx === idx) setEditingIdx(null);
    onChange({ providers: data.providers.filter((_, i) => i !== idx) });
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditData({ ...data.providers[idx] });
  };

  const cancelEdit = () => {
    setEditingIdx(null);
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    const trimmedName = editData.name.trim();
    const trimmedEmail = editData.email.trim();
    if (!trimmedName) return;

    // Check duplicate (excluding self)
    if (data.providers.some((p, i) => i !== editingIdx && p.name.toLowerCase() === trimmedName.toLowerCase())) {
      return;
    }

    // Validate email
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      return;
    }

    const updated = data.providers.map((p, i) =>
      i === editingIdx ? { name: trimmedName, email: trimmedEmail, contact: editData.contact.trim() } : p
    );
    onChange({ providers: updated });
    setEditingIdx(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  // Clear error when user modifies inputs
  const handleNameChange = (val: string) => {
    setNewName(val);
    if (fieldError) setFieldError(null);
  };

  const handleEmailChange = (val: string) => {
    setNewEmail(val);
    if (fieldError) setFieldError(null);
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
          onChange={(e) => handleNameChange(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={100}
        />
        <input
          className={`setup-input ${fieldError && newEmail.trim() ? 'setup-input-error' : ''}`}
          type="email"
          placeholder={t('setup.providers.email_placeholder') || 'Email (opcional)'}
          value={newEmail}
          onChange={(e) => handleEmailChange(e.target.value)}
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

      {fieldError && (
        <div className="setup-field-error">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {fieldError}
        </div>
      )}

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
                {getInitials(editingIdx === idx ? editData.name || provider.name : provider.name)}
              </div>
              {editingIdx === idx ? (
                <div className="provider-info" style={{ display: 'flex', gap: '6px', flex: 1, alignItems: 'center' }}>
                  <input
                    className="setup-input"
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData(d => ({ ...d, name: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                    placeholder={t('setup.providers.name_placeholder') || 'Nombre'}
                    style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem' }}
                    autoFocus
                  />
                  <input
                    className="setup-input"
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData(d => ({ ...d, email: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                    placeholder="Email"
                    style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem' }}
                  />
                  <input
                    className="setup-input"
                    type="text"
                    value={editData.contact}
                    onChange={(e) => setEditData(d => ({ ...d, contact: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                    placeholder={t('setup.providers.contact_placeholder') || 'Contacto'}
                    style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem' }}
                  />
                  <button className="setup-provider-remove" onClick={saveEdit} style={{ color: 'var(--accent, #12b5b0)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <button className="setup-provider-remove" onClick={cancelEdit}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <div className="provider-info">
                    <div className="provider-name">{provider.name}</div>
                    {provider.email && <div className="provider-email">{provider.email}</div>}
                    {provider.contact && <div className="provider-contact">{provider.contact}</div>}
                  </div>
                  <button className="setup-provider-remove" onClick={() => startEdit(idx)} title={t('setup.providers.edit') || 'Editar'}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button className="setup-provider-remove" onClick={() => handleRemove(idx)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </>
              )}
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
