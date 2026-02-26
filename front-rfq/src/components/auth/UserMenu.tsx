import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import './UserMenu.css';

interface UserMenuProps {
  onNavigate?: (view: string) => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onNavigate }) => {
  const { user, organizationName, signOut, isAuthenticated } = useAuthStore();
  const { language } = useLanguageStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = () => {
    if (isDemoMode) return 'D';
    const name = user?.user_metadata?.full_name || user?.email || '';
    if (!name) return '?';
    const parts = name.split(/[\s@]+/);
    return parts.slice(0, 2).map((p: string) => p[0]?.toUpperCase() || '').join('');
  };

  const getDisplayName = () => {
    if (isDemoMode) return 'Demo User';
    return user?.user_metadata?.full_name || user?.email || 'User';
  };

  if (isDemoMode && !isAuthenticated) {
    return (
      <div className="user-menu-avatar" title="Demo">
        <span>D</span>
      </div>
    );
  }

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title={getDisplayName()}
      >
        <div className="user-menu-avatar">
          <span>{getInitials()}</span>
        </div>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-menu-info">
            <div className="user-menu-name">{getDisplayName()}</div>
            {organizationName && (
              <div className="user-menu-org">{organizationName}</div>
            )}
            {user?.email && !isDemoMode && (
              <div className="user-menu-email">{user.email}</div>
            )}
          </div>

          <div className="user-menu-divider" />

          {!isDemoMode && onNavigate && (
            <button
              className="user-menu-item"
              onClick={() => { onNavigate('organization'); setIsOpen(false); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {language === 'es' ? 'Mi Organizacion' : 'My Organization'}
            </button>
          )}

          {!isDemoMode && (
            <button
              className="user-menu-item user-menu-item-danger"
              onClick={() => { signOut(); setIsOpen(false); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {language === 'es' ? 'Cerrar sesion' : 'Sign out'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
