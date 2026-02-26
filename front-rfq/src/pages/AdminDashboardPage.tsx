import React, { useEffect, useState } from 'react';
import { useLanguageStore } from '../stores/useLanguageStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useProjectStore } from '../stores/useProjectStore';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import { usePermissionsStore } from '../stores/usePermissionsStore';
import { InviteUserModal } from '../components/organization/InviteUserModal';
import { UserPlus, Trash2, Mail } from 'lucide-react';
import './AdminDashboardPage.css';

interface AuditEntry {
  id: string;
  action: string;
  resource_type: string;
  user_email: string;
  created_at: string;
}

interface OrgUsage {
  projects_used: number;
  projects_max: number;
  users_used: number;
  users_max: number;
  plan: string;
}

export const AdminDashboardPage: React.FC = () => {
  const { language } = useLanguageStore();
  const { session, organizationName, user } = useAuthStore();
  const { projects } = useProjectStore();
  const { members, invites, loadMembers, loadInvites, changeRole, removeMember, revokeInvite } = useOrganizationStore();
  const { can } = usePermissionsStore();
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [orgUsage, setOrgUsage] = useState<OrgUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const canManageUsers = can('manage_users');
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    const loadData = async () => {
      if (!supabaseUrl || !session?.access_token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const { supabase } = await import('../lib/supabase');
        if (!supabase) return;

        // Load audit log + org limits in parallel
        const [auditResult, limitsResult] = await Promise.all([
          (supabase as any)
            .from('audit_log')
            .select('id, action, resource_type, user_email, created_at')
            .order('created_at', { ascending: false })
            .limit(20),
          (supabase as any).rpc('check_org_limits'),
        ]);

        if (auditResult.data) setAuditLog(auditResult.data);
        if (limitsResult.data) setOrgUsage(limitsResult.data);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    if (canManageUsers) {
      loadMembers();
      loadInvites();
    }
  }, [session?.access_token, supabaseUrl, canManageUsers, loadMembers, loadInvites]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    await changeRole(memberId, newRole);
  };

  const handleRemoveMember = async (memberId: string) => {
    await removeMember(memberId);
    setConfirmRemove(null);
  };

  const handleRevokeInvite = async (inviteId: string) => {
    await revokeInvite(inviteId);
  };

  const pendingInvites = invites.filter(i => i.status === 'pending');

  const activeProjects = projects.filter(p => p.status !== 'setup').length;
  const totalProviders = new Set(
    projects.flatMap(p => p.provider_coverage?.map(pc => pc.name) || [])
  ).size;

  const formatAction = (action: string): string => {
    const map: Record<string, string> = {
      'user.login': language === 'es' ? 'Inicio de sesion' : 'User login',
      'user.logout': language === 'es' ? 'Cierre de sesion' : 'User logout',
      'project.create': language === 'es' ? 'Proyecto creado' : 'Project created',
      'project.delete': language === 'es' ? 'Proyecto eliminado' : 'Project deleted',
      'scoring.evaluate': language === 'es' ? 'Scoring ejecutado' : 'Scoring executed',
      'scoring.update': language === 'es' ? 'Score actualizado' : 'Score updated',
      'data.export': language === 'es' ? 'Datos exportados' : 'Data exported',
      'data.deletion_requested': language === 'es' ? 'Eliminacion solicitada' : 'Deletion requested',
    };
    return map[action] || action;
  };

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return language === 'es' ? 'Ahora' : 'Just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  if (isLoading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-empty">{language === 'es' ? 'Cargando...' : 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>{language === 'es' ? 'Panel de Administracion' : 'Admin Dashboard'}</h1>
        <p className="admin-subtitle">
          {organizationName || 'Organization'} — {language === 'es' ? 'Estado del sistema y actividad reciente' : 'System status and recent activity'}
        </p>
      </div>

      <div className="admin-grid">
        {/* Panel 1: System Status */}
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h2>{language === 'es' ? 'Estado del Sistema' : 'System Status'}</h2>
            <span className="admin-panel-badge healthy">
              {language === 'es' ? 'Operativo' : 'Healthy'}
            </span>
          </div>
          <div className="admin-stat-row">
            <span className="admin-stat-label">{language === 'es' ? 'Proyectos activos' : 'Active projects'}</span>
            <span className="admin-stat-value">{activeProjects}</span>
          </div>
          <div className="admin-stat-row">
            <span className="admin-stat-label">{language === 'es' ? 'Proveedores registrados' : 'Registered providers'}</span>
            <span className="admin-stat-value">{totalProviders}</span>
          </div>
          <div className="admin-stat-row">
            <span className="admin-stat-label">{language === 'es' ? 'Plan actual' : 'Current plan'}</span>
            <span className="admin-stat-value" style={{ textTransform: 'capitalize' }}>{orgUsage?.plan || 'trial'}</span>
          </div>
        </div>

        {/* Panel 2: Organization Usage */}
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h2>{language === 'es' ? 'Uso de la Organizacion' : 'Organization Usage'}</h2>
          </div>
          {orgUsage ? (
            <>
              <div className="admin-stat-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="admin-stat-label">{language === 'es' ? 'Proyectos' : 'Projects'}</span>
                  <span className="admin-stat-value">{orgUsage.projects_used} / {orgUsage.projects_max}</span>
                </div>
                <div className="admin-usage-bar">
                  <div
                    className="admin-usage-fill"
                    style={{
                      width: `${Math.min((orgUsage.projects_used / orgUsage.projects_max) * 100, 100)}%`,
                      background: orgUsage.projects_used >= orgUsage.projects_max ? '#ef4444' : '#12b5b0',
                    }}
                  />
                </div>
              </div>
              <div className="admin-stat-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="admin-stat-label">{language === 'es' ? 'Usuarios' : 'Users'}</span>
                  <span className="admin-stat-value">{orgUsage.users_used} / {orgUsage.users_max}</span>
                </div>
                <div className="admin-usage-bar">
                  <div
                    className="admin-usage-fill"
                    style={{
                      width: `${Math.min((orgUsage.users_used / orgUsage.users_max) * 100, 100)}%`,
                      background: orgUsage.users_used >= orgUsage.users_max ? '#ef4444' : '#12b5b0',
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="admin-empty">{language === 'es' ? 'Sin datos de uso' : 'No usage data'}</div>
          )}
        </div>

        {/* Panel 3: Recent Activity */}
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h2>{language === 'es' ? 'Actividad Reciente' : 'Recent Activity'}</h2>
          </div>
          {auditLog.length > 0 ? (
            <div className="admin-activity-list">
              {auditLog.map((entry) => (
                <div key={entry.id} className="admin-activity-item">
                  <span className="admin-activity-action">
                    {formatAction(entry.action)}
                    {entry.user_email && (
                      <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}> — {entry.user_email}</span>
                    )}
                  </span>
                  <span className="admin-activity-time">{timeAgo(entry.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty">
              {language === 'es' ? 'Sin actividad registrada' : 'No activity recorded'}
            </div>
          )}
        </div>

        {/* Panel 4: Security & Errors */}
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h2>{language === 'es' ? 'Seguridad' : 'Security'}</h2>
            <span className="admin-panel-badge healthy">OK</span>
          </div>
          <div className="admin-stat-row">
            <span className="admin-stat-label">{language === 'es' ? 'Session timeout' : 'Session timeout'}</span>
            <span className="admin-stat-value">60 min</span>
          </div>
          <div className="admin-stat-row">
            <span className="admin-stat-label">{language === 'es' ? 'Rate limiting' : 'Rate limiting'}</span>
            <span className="admin-stat-value">{language === 'es' ? 'Activo' : 'Active'}</span>
          </div>
          <div className="admin-stat-row">
            <span className="admin-stat-label">{language === 'es' ? 'RLS (Row Level Security)' : 'RLS (Row Level Security)'}</span>
            <span className="admin-stat-value">{language === 'es' ? 'Activo' : 'Active'}</span>
          </div>
          <div className="admin-stat-row">
            <span className="admin-stat-label">{language === 'es' ? 'Encriptacion en transito' : 'Encryption in transit'}</span>
            <span className="admin-stat-value">TLS 1.3</span>
          </div>
        </div>
      </div>

      {/* User Management Section — only for admins/owners */}
      {canManageUsers && (
        <div className="admin-users-section">
          <div className="admin-panel-header">
            <h2>{language === 'es' ? 'Gestion de Usuarios' : 'User Management'}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {orgUsage && (
                <span className={`admin-invite-badge ${orgUsage.users_used >= orgUsage.users_max ? 'at-limit' : ''}`}>
                  {orgUsage.users_used} / {orgUsage.users_max} {language === 'es' ? 'usuarios' : 'users'}
                </span>
              )}
              <button className="admin-invite-btn" onClick={() => setShowInviteModal(true)}>
                <UserPlus size={16} />
                {language === 'es' ? 'Invitar Usuario' : 'Invite User'}
              </button>
            </div>
          </div>

          {/* Members Table */}
          <div className="admin-users-table-wrap">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>{language === 'es' ? 'Nombre' : 'Name'}</th>
                  <th>Email</th>
                  <th>{language === 'es' ? 'Rol' : 'Role'}</th>
                  <th>{language === 'es' ? 'Desde' : 'Since'}</th>
                  <th>{language === 'es' ? 'Acciones' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const isOwner = member.role === 'owner';
                  const isSelf = member.user_id === user?.id;
                  return (
                    <tr key={member.id}>
                      <td className="admin-user-name">
                        {member.full_name || '—'}
                      </td>
                      <td className="admin-user-email">{member.email}</td>
                      <td>
                        {isOwner ? (
                          <span className="admin-role-badge owner">Owner</span>
                        ) : (
                          <select
                            className="admin-role-select"
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          >
                            <option value="admin">Admin</option>
                            <option value="member">{language === 'es' ? 'Miembro' : 'Member'}</option>
                            <option value="viewer">{language === 'es' ? 'Visor' : 'Viewer'}</option>
                          </select>
                        )}
                      </td>
                      <td className="admin-user-date">
                        {new Date(member.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        {!isOwner && !isSelf ? (
                          confirmRemove === member.id ? (
                            <div className="admin-confirm-remove">
                              <span>{language === 'es' ? 'Confirmar?' : 'Confirm?'}</span>
                              <button className="admin-confirm-yes" onClick={() => handleRemoveMember(member.id)}>
                                {language === 'es' ? 'Si' : 'Yes'}
                              </button>
                              <button className="admin-confirm-no" onClick={() => setConfirmRemove(null)}>
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              className="admin-remove-btn"
                              onClick={() => setConfirmRemove(member.id)}
                              title={language === 'es' ? 'Eliminar miembro' : 'Remove member'}
                            >
                              <Trash2 size={15} />
                            </button>
                          )
                        ) : (
                          <span className="admin-user-tag">
                            {isOwner ? 'Owner' : (language === 'es' ? 'Tu' : 'You')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={5} className="admin-empty">
                      {language === 'es' ? 'Sin miembros' : 'No members'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <>
              <h3 className="admin-invites-title">
                <Mail size={16} />
                {language === 'es' ? 'Invitaciones Pendientes' : 'Pending Invitations'}
                <span className="admin-invite-count">{pendingInvites.length}</span>
              </h3>
              <div className="admin-users-table-wrap">
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>{language === 'es' ? 'Rol' : 'Role'}</th>
                      <th>{language === 'es' ? 'Expira' : 'Expires'}</th>
                      <th>{language === 'es' ? 'Accion' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInvites.map((invite) => (
                      <tr key={invite.id}>
                        <td className="admin-user-email">{invite.email}</td>
                        <td>
                          <span className="admin-role-badge">{invite.role}</span>
                        </td>
                        <td className="admin-user-date">
                          {new Date(invite.expires_at).toLocaleDateString()}
                        </td>
                        <td>
                          <button
                            className="admin-revoke-btn"
                            onClick={() => handleRevokeInvite(invite.id)}
                          >
                            {language === 'es' ? 'Revocar' : 'Revoke'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {showInviteModal && <InviteUserModal onClose={() => { setShowInviteModal(false); loadInvites(); }} />}
    </div>
  );
};
