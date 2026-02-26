import React, { useEffect, useState } from 'react';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useLanguageStore } from '../stores/useLanguageStore';
import { usePermissionsStore } from '../stores/usePermissionsStore';
import { InviteUserModal } from '../components/organization/InviteUserModal';
import './OrganizationPage.css';

const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

const ROLE_LABELS: Record<string, Record<string, string>> = {
  owner: { es: 'Propietario', en: 'Owner' },
  admin: { es: 'Admin', en: 'Admin' },
  member: { es: 'Miembro', en: 'Member' },
  viewer: { es: 'Visor', en: 'Viewer' },
};

export const OrganizationPage: React.FC = () => {
  const { language } = useLanguageStore();
  const { organizationName, organizationRole, user } = useAuthStore();
  const { can } = usePermissionsStore();
  const {
    members, invites, limits, isLoading,
    loadMembers, loadInvites, loadLimits,
    changeRole, removeMember, revokeInvite, updateOrgName,
  } = useOrganizationStore();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(organizationName || '');

  const isAdmin = can('manage_users');

  useEffect(() => {
    loadMembers();
    loadInvites();
    loadLimits();
  }, [loadMembers, loadInvites, loadLimits]);

  useEffect(() => {
    setNameInput(organizationName || '');
  }, [organizationName]);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    await updateOrgName(nameInput.trim());
    setEditingName(false);
  };

  const usagePercent = (used: number, max: number) =>
    max > 0 ? Math.min((used / max) * 100, 100) : 0;

  return (
    <div className="org-page">
      {/* Header */}
      <div className="org-page-header">
        <h1>{language === 'es' ? 'Mi Organizacion' : 'My Organization'}</h1>
      </div>

      {/* Org Info Section */}
      <section className="org-section">
        <div className="org-section-header">
          <h2>{language === 'es' ? 'Informacion' : 'Information'}</h2>
        </div>
        <div className="org-info-grid">
          <div className="org-info-item">
            <label>{language === 'es' ? 'Nombre' : 'Name'}</label>
            {editingName ? (
              <div className="org-name-edit">
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  autoFocus
                />
                <button className="org-btn-sm org-btn-primary" onClick={handleSaveName}>
                  {language === 'es' ? 'Guardar' : 'Save'}
                </button>
                <button className="org-btn-sm" onClick={() => { setEditingName(false); setNameInput(organizationName || ''); }}>
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            ) : (
              <div className="org-name-display">
                <span>{organizationName}</span>
                {isAdmin && (
                  <button className="org-btn-icon" onClick={() => setEditingName(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="org-info-item">
            <label>Plan</label>
            <span className="org-plan-badge">{PLAN_LABELS[limits?.plan || 'trial'] || 'Trial'}</span>
          </div>
          <div className="org-info-item">
            <label>{language === 'es' ? 'Tu rol' : 'Your role'}</label>
            <span>{ROLE_LABELS[organizationRole || 'member']?.[language] || organizationRole}</span>
          </div>
        </div>

        {/* Usage bars */}
        {limits && (
          <div className="org-usage-bars">
            <div className="org-usage-item">
              <div className="org-usage-label">
                <span>{language === 'es' ? 'Proyectos' : 'Projects'}</span>
                <span>{limits.projects_used} / {limits.projects_max}</span>
              </div>
              <div className="org-usage-bar">
                <div className="org-usage-fill" style={{ width: `${usagePercent(limits.projects_used, limits.projects_max)}%` }} />
              </div>
            </div>
            <div className="org-usage-item">
              <div className="org-usage-label">
                <span>{language === 'es' ? 'Usuarios' : 'Users'}</span>
                <span>{limits.users_used} / {limits.users_max}</span>
              </div>
              <div className="org-usage-bar">
                <div className="org-usage-fill" style={{ width: `${usagePercent(limits.users_used, limits.users_max)}%` }} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Members Section */}
      <section className="org-section">
        <div className="org-section-header">
          <h2>{language === 'es' ? 'Miembros' : 'Members'} ({members.length})</h2>
          {isAdmin && (
            <button className="org-btn org-btn-primary" onClick={() => setShowInviteModal(true)}>
              + {language === 'es' ? 'Invitar' : 'Invite'}
            </button>
          )}
        </div>
        {isLoading ? (
          <div className="org-loading">{language === 'es' ? 'Cargando...' : 'Loading...'}</div>
        ) : (
          <div className="org-table-wrapper">
            <table className="org-table">
              <thead>
                <tr>
                  <th>{language === 'es' ? 'Miembro' : 'Member'}</th>
                  <th>Email</th>
                  <th>{language === 'es' ? 'Rol' : 'Role'}</th>
                  {isAdmin && <th>{language === 'es' ? 'Acciones' : 'Actions'}</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="org-member-cell">
                        <div className="org-avatar">
                          {(m.full_name || m.email)[0]?.toUpperCase()}
                        </div>
                        <span>{m.full_name || m.email.split('@')[0]}</span>
                      </div>
                    </td>
                    <td>{m.email}</td>
                    <td>
                      {isAdmin && m.user_id !== user?.id && m.role !== 'owner' ? (
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m.id, e.target.value)}
                          className="org-role-select"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">{language === 'es' ? 'Miembro' : 'Member'}</option>
                          <option value="viewer">{language === 'es' ? 'Visor' : 'Viewer'}</option>
                        </select>
                      ) : (
                        <span className={`org-role-badge org-role-${m.role}`}>
                          {ROLE_LABELS[m.role]?.[language] || m.role}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        {m.user_id !== user?.id && m.role !== 'owner' && (
                          <button
                            className="org-btn-sm org-btn-danger"
                            onClick={() => removeMember(m.id)}
                          >
                            {language === 'es' ? 'Eliminar' : 'Remove'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Invites Section */}
      {isAdmin && invites.length > 0 && (
        <section className="org-section">
          <div className="org-section-header">
            <h2>{language === 'es' ? 'Invitaciones pendientes' : 'Pending invitations'}</h2>
          </div>
          <div className="org-table-wrapper">
            <table className="org-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>{language === 'es' ? 'Rol' : 'Role'}</th>
                  <th>{language === 'es' ? 'Estado' : 'Status'}</th>
                  <th>{language === 'es' ? 'Expira' : 'Expires'}</th>
                  <th>{language === 'es' ? 'Acciones' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.email}</td>
                    <td>{ROLE_LABELS[inv.role]?.[language] || inv.role}</td>
                    <td>
                      <span className={`org-status-badge org-status-${inv.status}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>{new Date(inv.expires_at).toLocaleDateString()}</td>
                    <td>
                      {inv.status === 'pending' && (
                        <button
                          className="org-btn-sm org-btn-danger"
                          onClick={() => revokeInvite(inv.id)}
                        >
                          {language === 'es' ? 'Revocar' : 'Revoke'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteUserModal onClose={() => setShowInviteModal(false)} />
      )}
    </div>
  );
};
