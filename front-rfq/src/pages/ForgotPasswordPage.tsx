import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useLanguageStore } from '../stores/useLanguageStore';
import './AuthPages.css';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { resetPassword } = useAuthStore();
  const { language } = useLanguageStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: resetError } = await resetPassword(email);
    setIsSubmitting(false);

    if (resetError) {
      setError(resetError);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <span style={{ color: 'var(--text-primary)' }}>Bid</span>
              <span style={{ color: '#12b5b0' }}>Eval</span>
            </div>
            <div className="auth-success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h1 className="auth-title">
              {language === 'es' ? 'Revisa tu email' : 'Check your email'}
            </h1>
            <p className="auth-subtitle">
              {language === 'es'
                ? 'Si la cuenta existe, te enviamos un enlace para restablecer tu contrasena.'
                : 'If the account exists, we sent you a link to reset your password.'}
            </p>
          </div>
          <div className="auth-links">
            <Link to="/login" className="auth-link">
              {language === 'es' ? 'Volver al login' : 'Back to login'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span style={{ color: 'var(--text-primary)' }}>Bid</span>
            <span style={{ color: '#12b5b0' }}>Eval</span>
          </div>
          <h1 className="auth-title">
            {language === 'es' ? 'Recuperar contrasena' : 'Reset password'}
          </h1>
          <p className="auth-subtitle">
            {language === 'es'
              ? 'Ingresa tu email y te enviaremos un enlace para restablecer tu contrasena.'
              : 'Enter your email and we will send you a link to reset your password.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@empresa.com"
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={isSubmitting}>
            {isSubmitting
              ? (language === 'es' ? 'Enviando...' : 'Sending...')
              : (language === 'es' ? 'Enviar enlace' : 'Send reset link')}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login" className="auth-link">
            {language === 'es' ? 'Volver al login' : 'Back to login'}
          </Link>
        </div>
      </div>
    </div>
  );
};
