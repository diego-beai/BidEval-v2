import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { useLanguageStore } from '../stores/useLanguageStore';
import './AuthPages.css';

export const AcceptInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, loadOrganization } = useAuthStore();
  const { language } = useLanguageStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !token || !supabase) return;

    const accept = async () => {
      try {
        const { error: rpcError } = await (supabase as any).rpc('accept_invite', {
          p_token: token,
        });

        if (rpcError) {
          setError(rpcError.message);
          setStatus('error');
          return;
        }

        await loadOrganization();
        setStatus('success');

        // Redirect to home after a brief success screen
        setTimeout(() => navigate('/', { replace: true }), 2000);
      } catch {
        setError(language === 'es' ? 'Error al aceptar la invitacion.' : 'Error accepting invitation.');
        setStatus('error');
      }
    };

    accept();
  }, [isAuthenticated, isLoading, token, navigate, loadOrganization, language]);

  // If not authenticated, redirect to signup with invite token
  if (!isLoading && !isAuthenticated) {
    return <Navigate to={`/signup?invite=${token}`} replace />;
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span style={{ color: 'var(--text-primary)' }}>Bid</span>
            <span style={{ color: '#12b5b0' }}>Eval</span>
          </div>

          {status === 'loading' && (
            <>
              <div style={{
                width: '40px',
                height: '40px',
                margin: '0 auto 16px',
                border: '3px solid var(--border-color)',
                borderTopColor: 'var(--color-cyan)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <h1 className="auth-title">
                {language === 'es' ? 'Aceptando invitacion...' : 'Accepting invitation...'}
              </h1>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="auth-success-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h1 className="auth-title">
                {language === 'es' ? 'Te uniste a la organizacion' : 'You joined the organization'}
              </h1>
              <p className="auth-subtitle">
                {language === 'es' ? 'Redirigiendo...' : 'Redirecting...'}
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="auth-success-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h1 className="auth-title">
                {language === 'es' ? 'Error' : 'Error'}
              </h1>
              <p className="auth-subtitle">{error}</p>
              <div className="auth-links" style={{ marginTop: 16 }}>
                <button onClick={() => navigate('/')} className="auth-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  {language === 'es' ? 'Ir al inicio' : 'Go to home'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
