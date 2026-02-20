import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useToastStore } from './useToastStore';

// ============================================
// TYPES
// ============================================

export interface ScoringChangeLogEntry {
  id: string;
  project_id: string;
  provider_name: string;
  changed_by: string;
  change_type: string;
  field_changed: string;
  old_value: unknown;
  new_value: unknown;
  reason?: string;
  created_at: string;
}

export interface ScoringSimulation {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  alternative_weights: Record<string, number>;
  results: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

// ============================================
// STORE INTERFACE
// ============================================

interface ScoringAuditState {
  changeLog: ScoringChangeLogEntry[];
  simulations: ScoringSimulation[];
  isLoading: boolean;

  loadChangeLog: (projectId: string) => Promise<void>;
  logChange: (entry: Omit<ScoringChangeLogEntry, 'id' | 'created_at'>) => Promise<void>;
  loadSimulations: (projectId: string) => Promise<void>;
  saveSimulation: (
    projectId: string,
    name: string,
    weights: Record<string, number>,
    results: Record<string, unknown>
  ) => Promise<void>;
  deleteSimulation: (id: string) => Promise<void>;
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useScoringAuditStore = create<ScoringAuditState>()(
  devtools(
    (set, get) => ({
      changeLog: [],
      simulations: [],
      isLoading: false,

      loadChangeLog: async (projectId: string) => {
        if (!supabase) return;

        set({ isLoading: true });

        try {
          const { data, error } = await (supabase as any)
            .from('scoring_change_log')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

          if (error) {
            // If table doesn't exist, just return empty
            const isTableNotFound =
              error.code === '42P01' ||
              error.message?.includes('does not exist');
            if (isTableNotFound) {
              set({ changeLog: [], isLoading: false });
              return;
            }
            throw error;
          }

          set({ changeLog: data || [], isLoading: false });
        } catch (err: any) {
          set({ changeLog: [], isLoading: false });
        }
      },

      logChange: async (entry) => {
        if (!supabase) return;

        try {
          const { error } = await (supabase as any)
            .from('scoring_change_log')
            .insert({
              project_id: entry.project_id,
              provider_name: entry.provider_name,
              changed_by: entry.changed_by,
              change_type: entry.change_type,
              field_changed: entry.field_changed,
              old_value: entry.old_value,
              new_value: entry.new_value,
              reason: entry.reason || null,
            });

          if (error) throw error;

          // Refresh the log
          await get().loadChangeLog(entry.project_id);
        } catch (err: any) {
          useToastStore.getState().addToast(`Error logging change: ${err.message}`, 'error');
        }
      },

      loadSimulations: async (projectId: string) => {
        if (!supabase) return;

        set({ isLoading: true });

        try {
          const { data, error } = await (supabase as any)
            .from('scoring_simulations')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

          if (error) {
            const isTableNotFound =
              error.code === '42P01' ||
              error.message?.includes('does not exist');
            if (isTableNotFound) {
              set({ simulations: [], isLoading: false });
              return;
            }
            throw error;
          }

          set({ simulations: data || [], isLoading: false });
        } catch (err: any) {
          set({ simulations: [], isLoading: false });
        }
      },

      saveSimulation: async (projectId, name, weights, results) => {
        if (!supabase) return;
        const { addToast } = useToastStore.getState();

        try {
          const { error } = await (supabase as any)
            .from('scoring_simulations')
            .insert({
              project_id: projectId,
              name,
              alternative_weights: weights,
              results,
              created_by: 'current_user',
            });

          if (error) throw error;

          addToast(
            name ? `Scenario "${name}" saved` : 'Scenario saved',
            'success'
          );

          // Refresh
          await get().loadSimulations(projectId);
        } catch (err: any) {
          addToast(`Error saving simulation: ${err.message}`, 'error');
        }
      },

      deleteSimulation: async (id: string) => {
        if (!supabase) return;
        const { addToast } = useToastStore.getState();

        try {
          // Get project_id before deleting for refresh
          const sim = get().simulations.find((s) => s.id === id);

          const { error } = await (supabase as any)
            .from('scoring_simulations')
            .delete()
            .eq('id', id);

          if (error) throw error;

          addToast('Scenario deleted', 'info');

          if (sim) {
            await get().loadSimulations(sim.project_id);
          } else {
            // Just remove locally
            set({ simulations: get().simulations.filter((s) => s.id !== id) });
          }
        } catch (err: any) {
          addToast(`Error deleting simulation: ${err.message}`, 'error');
        }
      },
    }),
    { name: 'ScoringAuditStore' }
  )
);
