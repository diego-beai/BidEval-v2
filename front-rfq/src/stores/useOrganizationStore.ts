import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

export interface OrgMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  created_at: string;
}

export interface OrgInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  token: string;
}

export interface OrgLimits {
  plan: string;
  projects_used: number;
  projects_max: number;
  users_used: number;
  users_max: number;
  projects_available: number;
  users_available: number;
}

interface OrganizationState {
  members: OrgMember[];
  invites: OrgInvite[];
  limits: OrgLimits | null;
  isLoading: boolean;

  loadMembers: () => Promise<void>;
  loadInvites: () => Promise<void>;
  loadLimits: () => Promise<void>;
  inviteUser: (email: string, role: string) => Promise<{ error: string | null; token?: string }>;
  changeRole: (memberId: string, newRole: string) => Promise<{ error: string | null }>;
  removeMember: (memberId: string) => Promise<{ error: string | null }>;
  revokeInvite: (inviteId: string) => Promise<{ error: string | null }>;
  updateOrgName: (name: string) => Promise<{ error: string | null }>;
  canCreateProject: () => boolean;
  canInviteUser: () => boolean;
}

export const useOrganizationStore = create<OrganizationState>()(
  devtools(
    (set, get) => ({
      members: [],
      invites: [],
      limits: null,
      isLoading: false,

      loadMembers: async () => {
        if (!supabase) return;
        set({ isLoading: true });

        try {
          const { data, error } = await (supabase as any).rpc('get_org_members');
          if (!error && data) {
            set({ members: data });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      loadInvites: async () => {
        if (!supabase) return;
        const orgId = useAuthStore.getState().organizationId;
        if (!orgId) return;

        const { data } = await (supabase as any)
          .from('organization_invites')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false });

        if (data) set({ invites: data });
      },

      loadLimits: async () => {
        if (!supabase) return;

        const { data, error } = await (supabase as any).rpc('check_org_limits');
        if (!error && data) {
          set({ limits: data });
        }
      },

      inviteUser: async (email, role) => {
        if (!supabase) return { error: 'Supabase not configured' };
        const orgId = useAuthStore.getState().organizationId;
        if (!orgId) return { error: 'No organization' };

        const limits = get().limits;
        if (limits && limits.users_available <= 0) {
          return { error: 'User limit reached for your plan' };
        }

        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { error } = await (supabase as any)
          .from('organization_invites')
          .insert({
            organization_id: orgId,
            email: email.toLowerCase().trim(),
            role,
            token,
            status: 'pending',
            expires_at: expiresAt.toISOString(),
          });

        if (error) return { error: error.message };

        // Try sending invite email via n8n (non-blocking)
        try {
          const { sendInviteEmail } = await import('../services/n8n.service');
          const user = useAuthStore.getState().user;
          const orgName = useAuthStore.getState().organizationName || 'BidEval';
          const inviteUrl = `${window.location.origin}/invite/${token}`;
          await sendInviteEmail({
            email,
            inviterName: user?.user_metadata?.full_name || user?.email || 'Admin',
            orgName,
            inviteUrl,
            role,
          });
        } catch {
          // Email sending is best-effort
        }

        await get().loadInvites();
        return { error: null, token };
      },

      changeRole: async (memberId, newRole) => {
        if (!supabase) return { error: 'Supabase not configured' };

        const { error } = await (supabase as any)
          .from('organization_members')
          .update({ role: newRole })
          .eq('id', memberId);

        if (error) return { error: error.message };
        await get().loadMembers();
        return { error: null };
      },

      removeMember: async (memberId) => {
        if (!supabase) return { error: 'Supabase not configured' };

        // Prevent self-removal
        const userId = useAuthStore.getState().user?.id;
        const member = get().members.find((m) => m.id === memberId);
        if (member && member.user_id === userId) {
          return { error: 'Cannot remove yourself' };
        }

        const { error } = await (supabase as any)
          .from('organization_members')
          .delete()
          .eq('id', memberId);

        if (error) return { error: error.message };
        await get().loadMembers();
        return { error: null };
      },

      revokeInvite: async (inviteId) => {
        if (!supabase) return { error: 'Supabase not configured' };

        const { error } = await (supabase as any)
          .from('organization_invites')
          .update({ status: 'revoked' })
          .eq('id', inviteId);

        if (error) return { error: error.message };
        await get().loadInvites();
        return { error: null };
      },

      updateOrgName: async (name) => {
        if (!supabase) return { error: 'Supabase not configured' };
        const orgId = useAuthStore.getState().organizationId;
        if (!orgId) return { error: 'No organization' };

        const { error } = await (supabase as any)
          .from('organizations')
          .update({ name })
          .eq('id', orgId);

        if (error) return { error: error.message };
        useAuthStore.setState({ organizationName: name });
        return { error: null };
      },

      canCreateProject: () => {
        const limits = get().limits;
        if (!limits) return true;
        return limits.projects_available > 0;
      },

      canInviteUser: () => {
        const limits = get().limits;
        if (!limits) return true;
        return limits.users_available > 0;
      },
    }),
    { name: 'organization-store' }
  )
);
