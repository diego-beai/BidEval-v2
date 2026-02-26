import { useEffect } from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import './Changelog.css';

interface ChangelogEntry {
  version: string;
  date: string;
  title: Record<string, string>;
  items: Array<{
    type: 'feature' | 'fix' | 'improvement';
    text: Record<string, string>;
  }>;
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '4.0.0',
    date: '2026-02-20',
    title: { es: 'Enterprise Hardening - Fase 1', en: 'Enterprise Hardening - Phase 1' },
    items: [
      { type: 'feature', text: { es: 'Cache inteligente en stores para reducir queries', en: 'Smart caching in stores to reduce queries' } },
      { type: 'feature', text: { es: 'Paginacion en directorio de proveedores', en: 'Pagination in supplier directory' } },
      { type: 'feature', text: { es: 'Pagina de estado del sistema (/status)', en: 'System status page (/status)' } },
      { type: 'improvement', text: { es: 'Indices de base de datos para mejor rendimiento', en: 'Database indexes for improved performance' } },
      { type: 'fix', text: { es: 'Eliminado limite de 1000 en tabla de requisitos', en: 'Removed 1000-row limit on requirements table' } },
    ],
  },
  {
    version: '3.0.0',
    date: '2026-02-15',
    title: { es: 'Sistema de Adjudicacion y Scoring', en: 'Award System & Scoring' },
    items: [
      { type: 'feature', text: { es: 'Sistema de adjudicacion con justificaciones', en: 'Award system with justifications' } },
      { type: 'feature', text: { es: 'Setup wizard para configuracion de proyecto', en: 'Setup wizard for project configuration' } },
      { type: 'improvement', text: { es: 'Mejoras en el scoring con pesos dinamicos', en: 'Scoring improvements with dynamic weights' } },
    ],
  },
];

interface ChangelogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Changelog = ({ isOpen, onClose }: ChangelogProps) => {
  const { language } = useLanguageStore();

  useEffect(() => {
    if (isOpen) {
      localStorage.setItem('bideval_last_seen_version', CHANGELOG[0]?.version || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const typeIcons: Record<string, string> = {
    feature: '✦',
    fix: '⚡',
    improvement: '↑',
  };

  const typeColors: Record<string, string> = {
    feature: '#12b5b0',
    fix: '#ef4444',
    improvement: '#3b82f6',
  };

  return (
    <div className="changelog-overlay" onClick={onClose}>
      <div className="changelog-modal" onClick={e => e.stopPropagation()}>
        <div className="changelog-header">
          <h2>{language === 'es' ? 'Novedades' : "What's New"}</h2>
          <button className="changelog-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="changelog-body">
          {CHANGELOG.map(entry => (
            <div key={entry.version} className="changelog-entry">
              <div className="changelog-entry-header">
                <span className="changelog-version">v{entry.version}</span>
                <span className="changelog-date">{entry.date}</span>
              </div>
              <h3 className="changelog-entry-title">{entry.title[language] || entry.title.en}</h3>
              <ul className="changelog-items">
                {entry.items.map((item, i) => (
                  <li key={i} className="changelog-item">
                    <span
                      className="changelog-item-type"
                      style={{ color: typeColors[item.type] }}
                    >
                      {typeIcons[item.type]}
                    </span>
                    {item.text[language] || item.text.en}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export function getLatestVersion(): string {
  return CHANGELOG[0]?.version || '';
}
