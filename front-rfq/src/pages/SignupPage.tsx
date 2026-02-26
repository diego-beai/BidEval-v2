import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useLanguageStore } from '../stores/useLanguageStore';
import './AuthPages.css';

export const SignupPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp } = useAuthStore();
  const { language } = useLanguageStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (password.length < 8) {
      setError(language === 'es' ? 'La contrasena debe tener al menos 8 caracteres.' : 'Password must be at least 8 characters.');
      setIsSubmitting(false);
      return;
    }

    const { error: signUpError } = await signUp(email, password, fullName);
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError);
    } else if (inviteToken) {
      navigate(`/invite/${inviteToken}`, { replace: true });
    } else {
      setSuccess(true);
    }
  };

  if (success) {
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
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className="auth-title">
              {language === 'es' ? 'Revisa tu email' : 'Check your email'}
            </h1>
            <p className="auth-subtitle">
              {language === 'es'
                ? 'Te enviamos un enlace de confirmacion. Revisa tu bandeja de entrada.'
                : 'We sent you a confirmation link. Check your inbox.'}
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
            {language === 'es' ? 'Crear cuenta' : 'Create account'}
          </h1>
          <p className="auth-subtitle">
            {language === 'es'
              ? 'Registrate para empezar a usar BidEval.'
              : 'Sign up to start using BidEval.'}
            {inviteToken && (
              <span className="auth-invite-badge">
                {language === 'es' ? ' (Invitacion pendiente)' : ' (Pending invitation)'}
              </span>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="fullName">
              {language === 'es' ? 'Nombre completo' : 'Full name'}
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={language === 'es' ? 'Juan Garcia' : 'John Smith'}
              required
              autoFocus
              autoComplete="name"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@empresa.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">
              {language === 'es' ? 'Contrasena' : 'Password'}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={language === 'es' ? 'Minimo 8 caracteres' : 'Minimum 8 characters'}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={isSubmitting}>
            {isSubmitting
              ? (language === 'es' ? 'Creando cuenta...' : 'Creating account...')
              : (language === 'es' ? 'Crear cuenta' : 'Create account')}
          </button>
        </form>

        <div className="auth-links">
          <span className="auth-link-text">
            {language === 'es' ? 'Ya tienes cuenta?' : 'Already have an account?'}
          </span>
          <Link to="/login" className="auth-link">
            {language === 'es' ? 'Iniciar sesion' : 'Sign in'}
          </Link>
        </div>
      </div>
    </div>
  );
};
