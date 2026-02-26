import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { setSentryUser, clearSentryUser } from '../lib/sentry';
import { setCurrentUserEmailCache } from '../services/n8n.service';
import { logAudit } from '../services/audit.service';
import { usePermissionsStore } from './usePermissionsStore';
import type { User, Session } from '@supabase/supabase-js';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  organizationId: string | null;
  organizationRole: string | null;
  organizationName: string | null;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  loadOrganization: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: isDemoMode,
      organizationId: null,
      organizationRole: null,
      organizationName: null,

      initialize: async () => {
        if (isDemoMode) {
          set({ isLoading: false, isAuthenticated: true });
          return;
        }

        if (!supabase) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            set({
              user: session.user,
              session,
              isAuthenticated: true,
              isLoading: false,
            });
            await get().loadOrganization();
            setSentryUser({
              id: session.user.id,
              email: session.user.email,
              organizationId: get().organizationId || undefined,
            });
            if (session.user.email) setCurrentUserEmailCache(session.user.email);
            usePermissionsStore.getState().syncFromAuth(get().organizationRole);
          } else {
            set({ isLoading: false, isAuthenticated: false });
          }
        } catch {
          set({ isLoading: false, isAuthenticated: false });
        }

        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            set({
              user: session.user,
              session,
              isAuthenticated: true,
            });
            await get().loadOrganization();
            setSentryUser({
              id: session.user.id,
              email: session.user.email,
              organizationId: get().organizationId || undefined,
            });
            if (session.user.email) setCurrentUserEmailCache(session.user.email);
            usePermissionsStore.getState().syncFromAuth(get().organizationRole);
          } else if (event === 'SIGNED_OUT') {
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              organizationId: null,
              organizationRole: null,
              organizationName: null,
            });
            clearSentryUser();
          } else if (event === 'TOKEN_REFRESHED' && session) {
            set({ session });
          }
        });
      },

      signIn: async (email, password) => {
        if (!supabase) return { error: 'Supabase not configured' };

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        logAudit('user.login', 'user', undefined, { email });
        return { error: null };
      },

      signUp: async (email, password, fullName) => {
        if (!supabase) return { error: 'Supabase not configured' };

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) return { error: error.message };
        return { error: null };
      },

      signOut: async () => {
        if (!supabase) return;
        logAudit('user.logout', 'user');
        await supabase.auth.signOut();
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          organizationId: null,
          organizationRole: null,
          organizationName: null,
        });
        clearSentryUser();
      },

      resetPassword: async (email) => {
        if (!supabase) return { error: 'Supabase not configured' };

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) return { error: error.message };
        return { error: null };
      },

      loadOrganization: async () => {
        if (!supabase) return;

        const { user } = get();
        if (!user) return;

        try {
          // First get the membership
          const { data: membership, error: memError } = await (supabase as any)
            .from('organization_members')
            .select('organization_id, role')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();

          if (memError || !membership) {
            set({ organizationId: null, organizationRole: null, organizationName: null });
            return;
          }

          // Then get the org name
          const { data: org } = await (supabase as any)
            .from('organizations')
            .select('name')
            .eq('id', membership.organization_id)
            .maybeSingle();

          set({
            organizationId: membership.organization_id,
            organizationRole: membership.role,
            organizationName: org?.name || null,
          });
        } catch {
          set({ organizationId: null, organizationRole: null, organizationName: null });
        }
      },
    }),
    { name: 'auth-store' }
  )
);
