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
  addLocalProvider: (name: string) => void;
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
        const { data, error } = await supabase
          .from('document_metadata')
          .select('provider')
          .eq('project_id', projectId)
          .not('provider', 'is', null);

        if (error) {
          console.error('[useProviderStore] Error fetching providers:', error.message);
          set({ projectProviders: [], isLoading: false });
          return;
        }

        const uniqueProviders = new Set<string>();
        (data || []).forEach((row: any) => {
          const p = (row.provider || '').trim().toUpperCase();
          if (p) uniqueProviders.add(p);
        });

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

  addLocalProvider: (name: string) => {
    const normalized = name.trim().toUpperCase();
    if (!normalized) return;
    const current = get().projectProviders;
    if (!current.includes(normalized)) {
      set({ projectProviders: [...current, normalized].sort() });
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
