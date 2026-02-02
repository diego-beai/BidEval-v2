import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface ProviderState {
  projectProviders: string[];
  isLoading: boolean;
  fetchProjectProviders: (projectId: string) => Promise<void>;
  addLocalProvider: (name: string) => void;
  clearProviders: () => void;
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
  }
}));
