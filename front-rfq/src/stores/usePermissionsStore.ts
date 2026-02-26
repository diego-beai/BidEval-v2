import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'admin' | 'evaluator' | 'viewer' | 'economic_viewer';

export type PermissionAction =
  | 'view_economic'
  | 'edit_scoring'
  | 'approve_results'
  | 'send_qa'
  | 'manage_users';

const ROLE_PERMISSIONS: Record<Role, PermissionAction[]> = {
  admin: ['view_economic', 'edit_scoring', 'approve_results', 'send_qa', 'manage_users'],
  evaluator: ['view_economic', 'edit_scoring', 'approve_results', 'send_qa'],
  economic_viewer: ['view_economic'],
  viewer: [],
};

// NOTE: ScoringMatrix.tsx should also gate edit_scoring actions (e.g. opening ScoringSetupWizard).
// This was not modified here — coordinate with the scoring agent.

export const ROLE_LABELS: Record<Role, { es: string; en: string }> = {
  admin: { es: 'Admin', en: 'Admin' },
  evaluator: { es: 'Evaluador', en: 'Evaluator' },
  economic_viewer: { es: 'Visor Econ.', en: 'Econ. Viewer' },
  viewer: { es: 'Visor', en: 'Viewer' },
};

export const ALL_ROLES: Role[] = ['admin', 'evaluator', 'economic_viewer', 'viewer'];

interface PermissionsState {
  role: Role;
  setRole: (role: Role) => void;
  can: (action: PermissionAction) => boolean;
  syncFromAuth: (orgRole: string | null) => void;
}

const ORG_ROLE_MAP: Record<string, Role> = {
  owner: 'admin',
  admin: 'admin',
  member: 'evaluator',
  viewer: 'viewer',
};

export const usePermissionsStore = create<PermissionsState>()(
  persist(
    (set, get) => ({
      role: 'evaluator' as Role,
      setRole: (role) => set({ role }),
      can: (action) => ROLE_PERMISSIONS[get().role].includes(action),
      syncFromAuth: (orgRole) => {
        const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
        if (isDemoMode || !orgRole) return;
        const mapped = ORG_ROLE_MAP[orgRole] || 'viewer';
        set({ role: mapped });
      },
    }),
    { name: 'permissions-storage' }
  )
);
