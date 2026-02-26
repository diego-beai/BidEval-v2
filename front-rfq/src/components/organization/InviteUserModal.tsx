import React, { useState } from 'react';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import './InviteUserModal.css';

interface InviteUserModalProps {
  onClose: () => void;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { inviteUser, canInviteUser } = useOrganizationStore();
  const { language } = useLanguageStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (!canInviteUser()) {
      setError(language === 'es' ? 'Limite de usuarios alcanzado.' : 'User limit reached.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const { error: invError, token } = await inviteUser(email.trim(), role);
    setIsSubmitting(false);

    if (invError) {
      setError(invError);
    } else if (token) {
      setInviteUrl(`${window.location.origin}/invite/${token}`);
    }
  };

  const handleCopy = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
    }
  };

  return (
    <div className="invite-modal-overlay" onClick={onClose}>
      <div className="invite-modal" onClick={(e) => e.stopPropagation()}>
        <div className="invite-modal-header">
          <h2>{language === 'es' ? 'Invitar usuario' : 'Invite user'}</h2>
          <button className="invite-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {inviteUrl ? (
          <div className="invite-modal-success">
            <div className="invite-success-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <p>{language === 'es' ? 'Invitacion enviada.' : 'Invitation sent.'}</p>
            <div className="invite-url-box">
              <input readOnly value={inviteUrl} />
              <button onClick={handleCopy} className="invite-copy-btn">
                {language === 'es' ? 'Copiar' : 'Copy'}
              </button>
            </div>
            <p className="invite-url-hint">
              {language === 'es'
                ? 'Comparte este enlace si el email no llega.'
                : 'Share this link if the email does not arrive.'}
            </p>
            <button className="invite-done-btn" onClick={onClose}>
              {language === 'es' ? 'Listo' : 'Done'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="invite-modal-form">
            <div className="invite-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@empresa.com"
                required
                autoFocus
              />
            </div>

            <div className="invite-field">
              <label>{language === 'es' ? 'Rol' : 'Role'}</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="member">{language === 'es' ? 'Miembro' : 'Member'}</option>
                <option value="viewer">{language === 'es' ? 'Visor' : 'Viewer'}</option>
              </select>
            </div>

            {error && <div className="invite-error">{error}</div>}

            <button type="submit" className="invite-submit-btn" disabled={isSubmitting}>
              {isSubmitting
                ? (language === 'es' ? 'Enviando...' : 'Sending...')
                : (language === 'es' ? 'Enviar invitacion' : 'Send invitation')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
