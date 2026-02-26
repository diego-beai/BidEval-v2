import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useLanguageStore } from '../stores/useLanguageStore';
import './AuthPages.css';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuthStore();
  const { language } = useLanguageStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await signIn(email, password);
    setIsSubmitting(false);

    if (signInError) {
      setError(signInError);
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span style={{ color: 'var(--text-primary)' }}>Bid</span>
            <span style={{ color: '#12b5b0' }}>Eval</span>
          </div>
          <h1 className="auth-title">
            {language === 'es' ? 'Iniciar sesion' : 'Sign in'}
          </h1>
          <p className="auth-subtitle">
            {language === 'es'
              ? 'Ingresa con tu cuenta para acceder a la plataforma.'
              : 'Sign in with your account to access the platform.'}
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

          <div className="auth-field">
            <label htmlFor="password">
              {language === 'es' ? 'Contrasena' : 'Password'}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={isSubmitting}>
            {isSubmitting
              ? (language === 'es' ? 'Ingresando...' : 'Signing in...')
              : (language === 'es' ? 'Iniciar sesion' : 'Sign in')}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/forgot-password" className="auth-link">
            {language === 'es' ? 'Olvidaste tu contrasena?' : 'Forgot password?'}
          </Link>
          <span className="auth-link-separator">|</span>
          <Link to="/signup" className="auth-link">
            {language === 'es' ? 'Crear cuenta' : 'Create account'}
          </Link>
        </div>
      </div>
    </div>
  );
};
