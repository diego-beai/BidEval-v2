import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface UploadLink {
  token: string;
  provider_name: string;
  url: string;
  expires_at: string;
}

interface ProviderState {
  projectProviders: string[];
  isLoading: boolean;
  fetchProjectProviders: (projectId: string) => Promise<void>;
  addLocalProvider: (name: string, projectId?: string) => void;
  clearProviders: () => void;
  generateUploadLink: (projectId: string, providerName: string) => Promise<UploadLink | null>;
}

export const useProviderStore = create<ProviderState>()((set, get) => ({
  projectProviders: [],
  isLoading: false,

  fetchProjectProviders: async (projectId: string) => {
    if (!projectId) {
      set({ projectProviders: [] });
      return;
    }

    set({ isLoading: true });

    try {
      if (supabase) {
        const uniqueProviders = new Set<string>();

        // 1. Fetch invited providers from project_providers table
        const { data: invited, error: invError } = await (supabase as any)
          .from('project_providers')
          .select('provider_name')
          .eq('project_id', projectId);

        if (invError) {
          console.warn('[useProviderStore] project_providers query failed:', invError.message);
        } else {
          (invited || []).forEach((row: any) => {
            const p = (row.provider_name || '').trim().toUpperCase();
            if (p) uniqueProviders.add(p);
          });
        }

        // 2. Also fetch from invited_suppliers array on projects table
        const { data: project, error: projError } = await (supabase as any)
          .from('projects')
          .select('invited_suppliers')
          .eq('id', projectId)
          .single();

        if (!projError && project?.invited_suppliers) {
          (project.invited_suppliers as string[]).forEach((name: string) => {
            const p = (name || '').trim().toUpperCase();
            if (p) uniqueProviders.add(p);
          });
        }

        // 3. Fetch providers that already have documents uploaded
        const { data: docs, error: docError } = await supabase
          .from('document_metadata')
          .select('provider')
          .eq('project_id', projectId)
          .not('provider', 'is', null);

        if (!docError) {
          (docs || []).forEach((row: any) => {
            const p = (row.provider || '').trim().toUpperCase();
            if (p) uniqueProviders.add(p);
          });
        }

        // 4. Discover providers from provider_responses table
        const { data: provResponses, error: prError } = await supabase
          .from('provider_responses')
          .select('provider_name')
          .eq('project_id', projectId);

        if (!prError) {
          (provResponses || []).forEach((row: any) => {
            const p = (row.provider_name || '').trim().toUpperCase();
            if (p) uniqueProviders.add(p);
          });
        }

        const sorted = Array.from(uniqueProviders).sort();
        console.log('[useProviderStore] Loaded providers for project', projectId, ':', sorted);
        set({ projectProviders: sorted, isLoading: false });
      } else {
        console.warn('[useProviderStore] Supabase not configured');
        set({ projectProviders: [], isLoading: false });
      }
    } catch (err: any) {
      console.error('[useProviderStore] Error:', err);
      set({ projectProviders: [], isLoading: false });
    }
  },

  addLocalProvider: (name: string, projectId?: string) => {
    const normalized = name.trim().toUpperCase();
    if (!normalized) return;
    const current = get().projectProviders;
    if (!current.includes(normalized)) {
      set({ projectProviders: [...current, normalized].sort() });
    }

    // Persist to Supabase project_providers table
    if (supabase && projectId) {
      (supabase as any)
        .from('project_providers')
        .upsert(
          { project_id: projectId, provider_name: normalized, status: 'invited' },
          { onConflict: 'project_id,provider_name' }
        )
        .then(({ error }: any) => {
          if (error) {
            console.warn('[useProviderStore] Error persisting provider:', error.message);
          } else {
            console.log('[useProviderStore] Provider persisted:', normalized);
          }
        });
    }
  },

  clearProviders: () => {
    set({ projectProviders: [] });
  },

  generateUploadLink: async (projectId: string, providerName: string) => {
    if (!supabase || !projectId || !providerName) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('supplier_upload_tokens')
        .insert([{
          project_id: projectId,
          provider_name: providerName.toUpperCase(),
        }])
        .select()
        .single();

      if (error) {
        console.error('[useProviderStore] Error generating upload link:', error);
        return null;
      }

      const baseUrl = window.location.origin;
      return {
        token: data.token,
        provider_name: data.provider_name,
        url: `${baseUrl}/upload/${data.token}`,
        expires_at: data.expires_at,
      } as UploadLink;
    } catch (err) {
      console.error('[useProviderStore] Error generating upload link:', err);
      return null;
    }
  },
}));
