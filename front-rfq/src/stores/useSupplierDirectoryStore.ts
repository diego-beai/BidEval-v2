import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface SupplierEntry {
  supplier_name: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  category: string | null;
  website: string | null;
  notes: string | null;
  tags: string[];
  project_count: number;
  project_names: string[];
  avg_score: number | null;
  best_score: number | null;
  worst_score: number | null;
  times_scored: number;
  last_participation: string | null;
  statuses: string[];
}

export interface SupplierDirectoryRecord {
  id: string;
  name: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  category: string;
  website: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface SupplierDirectoryState {
  suppliers: SupplierEntry[];
  isLoading: boolean;
  error: string | null;
  selectedSupplier: string | null;

  loadSuppliers: () => Promise<void>;
  setSelectedSupplier: (name: string | null) => void;
  upsertSupplier: (data: Partial<SupplierDirectoryRecord> & { name: string }) => Promise<boolean>;
}

export const useSupplierDirectoryStore = create<SupplierDirectoryState>()(
  devtools(
    (set, get) => ({
      suppliers: [],
      isLoading: false,
      error: null,
      selectedSupplier: null,

      loadSuppliers: async () => {
        if (!isSupabaseConfigured()) return;

        set({ isLoading: true, error: null });

        try {
          const { data, error } = await (supabase!
            .from('v_supplier_history' as any)
            .select('*')
            .order('project_count', { ascending: false })) as { data: any[] | null; error: any };

          if (error) {
            console.error('[SupplierDirectory] Error loading:', error);
            set({ error: error.message, isLoading: false });
            return;
          }

          set({
            suppliers: (data || []).map((row: any) => ({
              supplier_name: row.supplier_name || '',
              display_name: row.display_name,
              email: row.email,
              phone: row.phone,
              contact_person: row.contact_person,
              category: row.category,
              website: row.website,
              notes: row.notes,
              tags: row.tags || [],
              project_count: row.project_count || 0,
              project_names: row.project_names || [],
              avg_score: row.avg_score,
              best_score: row.best_score,
              worst_score: row.worst_score,
              times_scored: row.times_scored || 0,
              last_participation: row.last_participation,
              statuses: row.statuses || [],
            })),
            isLoading: false,
          });
        } catch (err) {
          console.error('[SupplierDirectory] Error:', err);
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      setSelectedSupplier: (name) => set({ selectedSupplier: name }),

      upsertSupplier: async (data) => {
        if (!isSupabaseConfigured()) return false;

        try {
          const { error } = await (supabase!
            .from('supplier_directory' as any)
            .upsert(
              [{
                name: data.name.toUpperCase(),
                display_name: data.display_name || data.name,
                email: data.email || null,
                phone: data.phone || null,
                contact_person: data.contact_person || null,
                category: data.category || 'engineering',
                website: data.website || null,
                notes: data.notes || null,
                tags: data.tags || [],
                updated_at: new Date().toISOString(),
              }] as any,
              { onConflict: 'name' }
            )) as { error: any };

          if (error) {
            console.error('[SupplierDirectory] Error upserting:', error);
            return false;
          }

          await get().loadSuppliers();
          return true;
        } catch (err) {
          console.error('[SupplierDirectory] Error upserting:', err);
          return false;
        }
      },
    }),
    { name: 'SupplierDirectoryStore' }
  )
);
