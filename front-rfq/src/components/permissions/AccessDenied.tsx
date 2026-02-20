import React from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import './AccessDenied.css';

interface AccessDeniedProps {
  requiredRoles?: string[];
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ requiredRoles }) => {
  const { language } = useLanguageStore();

  const title = language === 'es' ? 'Acceso Restringido' : 'Access Restricted';
  const message = language === 'es'
    ? 'No tienes permisos para ver esta seccion.'
    : 'You do not have permission to view this section.';
  const rolesHint = language === 'es'
    ? 'Necesitas rol: '
    : 'Required role: ';
  const defaultRoles = language === 'es'
    ? ['Admin', 'Evaluador', 'Visor Economico']
    : ['Admin', 'Evaluator', 'Economic Viewer'];

  return (
    <div className="access-denied">
      <div className="access-denied-card">
        <div className="access-denied-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            <circle cx="12" cy="16" r="1" />
          </svg>
        </div>
        <h2 className="access-denied-title">{title}</h2>
        <p className="access-denied-message">{message}</p>
        <p className="access-denied-roles">
          {rolesHint}
          <span className="access-denied-roles-list">
            {(requiredRoles || defaultRoles).join(', ')}
          </span>
        </p>
      </div>
    </div>
  );
};
