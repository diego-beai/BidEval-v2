import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import './OrganizationOnboarding.css';

export const OrganizationOnboarding: React.FC = () => {
  const [orgName, setOrgName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loadOrganization } = useAuthStore();
  const { language } = useLanguageStore();

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 60);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !supabase) return;

    setIsCreating(true);
    setError(null);

    try {
      const slug = generateSlug(orgName.trim());
      const { error: rpcError } = await (supabase as any).rpc('create_organization_with_owner', {
        p_name: orgName.trim(),
        p_slug: slug,
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      await loadOrganization();
    } catch {
      setError(language === 'es' ? 'Error al crear la organizacion' : 'Error creating organization');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="org-onboarding-container">
      <div className="org-onboarding-card">
        <div className="org-onboarding-header">
          <div className="org-onboarding-logo">
            <span style={{ color: 'var(--text-primary)' }}>Bid</span>
            <span style={{ color: '#12b5b0' }}>Eval</span>
          </div>
          <h1 className="org-onboarding-title">
            {language === 'es' ? 'Configura tu organizacion' : 'Set up your organization'}
          </h1>
          <p className="org-onboarding-subtitle">
            {language === 'es'
              ? 'Crea tu organizacion para empezar a evaluar ofertas con tu equipo.'
              : 'Create your organization to start evaluating bids with your team.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="org-onboarding-form">
          <div className="org-onboarding-field">
            <label htmlFor="org-name">
              {language === 'es' ? 'Nombre de la empresa' : 'Company name'}
            </label>
            <input
              id="org-name"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder={language === 'es' ? 'Ej: Acme Energy S.L.' : 'E.g.: Acme Energy Ltd.'}
              required
              autoFocus
              maxLength={100}
            />
            {orgName.trim() && (
              <span className="org-onboarding-slug">
                {language === 'es' ? 'Slug' : 'Slug'}: {generateSlug(orgName.trim())}
              </span>
            )}
          </div>

          {error && (
            <div className="org-onboarding-error">{error}</div>
          )}

          <button
            type="submit"
            className="org-onboarding-btn"
            disabled={!orgName.trim() || isCreating}
          >
            {isCreating
              ? (language === 'es' ? 'Creando...' : 'Creating...')
              : (language === 'es' ? 'Crear organizacion' : 'Create organization')}
          </button>
        </form>
      </div>
    </div>
  );
};
