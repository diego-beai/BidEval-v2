import { useLanguageStore } from '../stores/useLanguageStore';
import './ErrorFallbackPage.css';

interface ErrorFallbackProps {
  error?: Error;
  eventId?: string;
  resetError?: () => void;
}

export const ErrorFallbackPage = ({ error, eventId, resetError }: ErrorFallbackProps) => {
  const { language } = useLanguageStore();
  const isEs = language === 'es';

  return (
    <div className="error-fallback">
      <div className="error-fallback-card">
        <div className="error-fallback-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 className="error-fallback-title">
          {isEs ? 'Algo salio mal' : 'Something went wrong'}
        </h1>

        <p className="error-fallback-message">
          {isEs
            ? 'Se produjo un error inesperado. Nuestro equipo ha sido notificado automaticamente.'
            : 'An unexpected error occurred. Our team has been notified automatically.'}
        </p>

        {error && (
          <details className="error-fallback-details">
            <summary>{isEs ? 'Detalles del error' : 'Error details'}</summary>
            <pre>{error.message}</pre>
          </details>
        )}

        {eventId && (
          <p className="error-fallback-event-id">
            Event ID: <code>{eventId}</code>
          </p>
        )}

        <div className="error-fallback-actions">
          <button
            className="error-fallback-btn primary"
            onClick={() => window.location.reload()}
          >
            {isEs ? 'Recargar pagina' : 'Reload page'}
          </button>
          {resetError && (
            <button
              className="error-fallback-btn secondary"
              onClick={resetError}
            >
              {isEs ? 'Intentar de nuevo' : 'Try again'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
