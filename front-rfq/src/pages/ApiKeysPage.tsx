import React, { useEffect, useState } from 'react';
import { useLanguageStore } from '../stores/useLanguageStore';
import { useAuthStore } from '../stores/useAuthStore';
import './ApiKeysPage.css';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  rate_limit_per_hour: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export const ApiKeysPage: React.FC = () => {
  const { language } = useLanguageStore();
  const { session } = useAuthStore();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const loadKeys = async () => {
    if (!supabaseUrl || !session?.access_token) return;
    setIsLoading(true);

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/api-keys`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const { data } = await res.json();
      if (data) setKeys(data);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadKeys(); }, [session?.access_token]);

  const handleCreate = async () => {
    if (!newKeyName.trim() || !supabaseUrl || !session?.access_token) return;
    setIsCreating(true);

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/api-keys`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newKeyName.trim(), permissions: ['read', 'write'] }),
      });
      const { data } = await res.json();
      if (data?.key) {
        setCreatedKey(data.key);
        setNewKeyName('');
        await loadKeys();
      }
    } catch { /* ignore */ }
    finally { setIsCreating(false); }
  };

  const handleRevoke = async (keyId: string) => {
    if (!supabaseUrl || !session?.access_token) return;

    await fetch(`${supabaseUrl}/functions/v1/api-keys?id=${keyId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    await loadKeys();
  };

  return (
    <div className="apikeys-page">
      <div className="apikeys-header">
        <h1>{language === 'es' ? 'API Keys' : 'API Keys'}</h1>
        <button className="apikeys-btn-primary" onClick={() => setShowCreate(true)}>
          + {language === 'es' ? 'Nueva API Key' : 'New API Key'}
        </button>
      </div>

      {/* Created key banner */}
      {createdKey && (
        <div className="apikeys-created-banner">
          <div className="apikeys-created-header">
            {language === 'es' ? 'API Key creada. Copiala ahora — no se mostrara de nuevo.' : 'API Key created. Copy it now — it won\'t be shown again.'}
          </div>
          <div className="apikeys-created-key">
            <code>{createdKey}</code>
            <button onClick={() => { navigator.clipboard.writeText(createdKey); }}>
              {language === 'es' ? 'Copiar' : 'Copy'}
            </button>
          </div>
          <button className="apikeys-dismiss" onClick={() => setCreatedKey(null)}>
            {language === 'es' ? 'Entendido' : 'Got it'}
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && !createdKey && (
        <div className="apikeys-create-form">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder={language === 'es' ? 'Nombre de la key (ej: CI/CD Pipeline)' : 'Key name (e.g.: CI/CD Pipeline)'}
            autoFocus
          />
          <button className="apikeys-btn-primary" onClick={handleCreate} disabled={isCreating || !newKeyName.trim()}>
            {isCreating ? '...' : (language === 'es' ? 'Crear' : 'Create')}
          </button>
          <button onClick={() => setShowCreate(false)}>
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </button>
        </div>
      )}

      {/* Keys table */}
      {isLoading ? (
        <div className="apikeys-loading">{language === 'es' ? 'Cargando...' : 'Loading...'}</div>
      ) : keys.length === 0 ? (
        <div className="apikeys-empty">
          {language === 'es' ? 'No hay API keys. Crea una para empezar.' : 'No API keys. Create one to get started.'}
        </div>
      ) : (
        <table className="apikeys-table">
          <thead>
            <tr>
              <th>{language === 'es' ? 'Nombre' : 'Name'}</th>
              <th>Key</th>
              <th>{language === 'es' ? 'Estado' : 'Status'}</th>
              <th>{language === 'es' ? 'Ultimo uso' : 'Last used'}</th>
              <th>{language === 'es' ? 'Acciones' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td>{k.name}</td>
                <td><code>{k.key_prefix}...</code></td>
                <td>
                  <span className={`apikeys-status ${k.is_active ? 'active' : 'revoked'}`}>
                    {k.is_active ? (language === 'es' ? 'Activa' : 'Active') : (language === 'es' ? 'Revocada' : 'Revoked')}
                  </span>
                </td>
                <td>
                  {k.last_used_at
                    ? new Date(k.last_used_at).toLocaleDateString()
                    : (language === 'es' ? 'Nunca' : 'Never')}
                </td>
                <td>
                  {k.is_active && (
                    <button className="apikeys-btn-danger" onClick={() => handleRevoke(k.id)}>
                      {language === 'es' ? 'Revocar' : 'Revoke'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
