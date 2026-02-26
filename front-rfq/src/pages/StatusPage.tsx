import { useEffect, useState, useCallback } from 'react';
import { useLanguageStore } from '../stores/useLanguageStore';
import './StatusPage.css';

interface HealthCheck {
  status: string;
  latency_ms?: number;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  latency_ms: number;
  checks: Record<string, HealthCheck>;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: '#10b981',
  degraded: '#f59e0b',
  unhealthy: '#ef4444',
};

export const StatusPage = () => {
  const { language } = useLanguageStore();
  const isEs = language === 'es';
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/health', { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth({
        status: 'unhealthy',
        version: 'unknown',
        timestamp: new Date().toISOString(),
        latency_ms: 0,
        checks: {
          frontend: { status: 'unhealthy', error: 'Health endpoint unreachable' },
        },
      });
    } finally {
      setIsLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const getStatusIcon = (status: string) => {
    const color = STATUS_COLORS[status] || STATUS_COLORS.unhealthy;
    return (
      <div className="status-indicator" style={{ background: color }}>
        <div className="status-indicator-ping" style={{ background: color }} />
      </div>
    );
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, Record<string, string>> = {
      es: { healthy: 'Operativo', degraded: 'Degradado', unhealthy: 'Caido' },
      en: { healthy: 'Operational', degraded: 'Degraded', unhealthy: 'Down' },
    };
    return labels[isEs ? 'es' : 'en'][status] || status;
  };

  return (
    <div className="status-page">
      <div className="status-container">
        <div className="status-header">
          <h1>{isEs ? 'Estado del Sistema' : 'System Status'}</h1>
          <p>{isEs ? 'Monitoreo en tiempo real de los servicios de BidEval' : 'Real-time monitoring of BidEval services'}</p>
        </div>

        {isLoading ? (
          <div className="status-loading">
            <div className="status-spinner" />
            <p>{isEs ? 'Verificando servicios...' : 'Checking services...'}</p>
          </div>
        ) : health && (
          <>
            {/* Overall Status */}
            <div className={`status-overall status-${health.status}`}>
              {getStatusIcon(health.status)}
              <div>
                <h2>{getStatusLabel(health.status)}</h2>
                <p>
                  {isEs ? 'Todos los sistemas' : 'All systems'}
                  {' — '}
                  {health.latency_ms}ms
                </p>
              </div>
            </div>

            {/* Individual Checks */}
            <div className="status-checks">
              {Object.entries(health.checks).map(([name, check]) => (
                <div key={name} className="status-check-row">
                  <div className="status-check-info">
                    {getStatusIcon(check.status)}
                    <span className="status-check-name">
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </span>
                  </div>
                  <div className="status-check-meta">
                    {check.latency_ms != null && (
                      <span className="status-check-latency">{check.latency_ms}ms</span>
                    )}
                    <span
                      className="status-check-badge"
                      style={{ color: STATUS_COLORS[check.status] || STATUS_COLORS.unhealthy }}
                    >
                      {getStatusLabel(check.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Meta */}
            <div className="status-meta">
              <span>v{health.version}</span>
              {lastChecked && (
                <span>
                  {isEs ? 'Ultima verificacion' : 'Last checked'}:{' '}
                  {lastChecked.toLocaleTimeString()}
                </span>
              )}
              <span>{isEs ? 'Actualiza cada 30s' : 'Refreshes every 30s'}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
