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

export interface SupplierEvalDetail {
  project_id: string;
  project_name: string;
  overall_score: number;
  is_winner: boolean;
  evaluation_details: {
    strengths?: string[];
    weaknesses?: string[];
    summary?: string;
    recommendations?: string[];
    category_analysis?: Record<string, { highlights: string[]; improvements: string[] }>;
    feedback?: string;
  } | null;
  created_at: string;
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
  supplierEvaluations: Record<string, SupplierEvalDetail[]>;
  isLoadingEvaluations: boolean;

  loadSuppliers: () => Promise<void>;
  setSelectedSupplier: (name: string | null) => void;
  upsertSupplier: (data: Partial<SupplierDirectoryRecord> & { name: string }) => Promise<boolean>;
  loadSupplierEvaluationDetails: (supplierName: string) => Promise<void>;
  saveSupplierFeedback: (supplierName: string, projectId: string, feedback: string) => Promise<boolean>;
}

export const useSupplierDirectoryStore = create<SupplierDirectoryState>()(
  devtools(
    (set, get) => ({
      suppliers: [],
      isLoading: false,
      error: null,
      selectedSupplier: null,
      supplierEvaluations: {},
      isLoadingEvaluations: false,

      loadSuppliers: async () => {
        if (!isSupabaseConfigured()) return;

        set({ isLoading: true, error: null });

        try {
          const { data, error } = await (supabase!
            .from('v_supplier_history' as any)
            .select('*')
            .order('project_count', { ascending: false })) as { data: any[] | null; error: any };

          if (error) {
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
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      setSelectedSupplier: (name) => set({ selectedSupplier: name }),

      loadSupplierEvaluationDetails: async (supplierName: string) => {
        if (!isSupabaseConfigured()) return;

        set({ isLoadingEvaluations: true });

        try {
          // Query ranking_proveedores for this supplier
          const { data: rankingData, error: rankingError } = await (supabase!
            .from('ranking_proveedores' as any)
            .select('project_id, overall_score, evaluation_details, created_at')
            .ilike('provider_name', supplierName)
            .order('created_at', { ascending: false })) as { data: any[] | null; error: any };

          if (rankingError) {
            set({ isLoadingEvaluations: false });
            return;
          }

          if (!rankingData || rankingData.length === 0) {
            set((state) => ({
              supplierEvaluations: { ...state.supplierEvaluations, [supplierName]: [] },
              isLoadingEvaluations: false,
            }));
            return;
          }

          // Get project names for the project IDs
          const projectIds = rankingData.map((r: any) => r.project_id).filter(Boolean);
          let projectMap: Record<string, string> = {};

          if (projectIds.length > 0) {
            const { data: projectData } = await (supabase!
              .from('projects' as any)
              .select('id, display_name, name')
              .in('id', projectIds)) as { data: any[] | null; error: any };

            if (projectData) {
              projectMap = projectData.reduce((acc: Record<string, string>, p: any) => {
                acc[p.id] = p.display_name || p.name || p.id;
                return acc;
              }, {});
            }
          }

          // Determine winners: get top scorer per project
          // winner = supplier with highest overall_score in that project
          const winnerMap: Record<string, boolean> = {};
          if (projectIds.length > 0) {
            const { data: allScores } = await (supabase!
              .from('ranking_proveedores' as any)
              .select('project_id, provider_name, overall_score')
              .in('project_id', projectIds)) as { data: any[] | null; error: any };

            if (allScores) {
              // Find max score per project
              const maxByProject: Record<string, number> = {};
              for (const row of allScores) {
                const s = row.overall_score || 0;
                if (!maxByProject[row.project_id] || s > maxByProject[row.project_id]) {
                  maxByProject[row.project_id] = s;
                }
              }
              // Mark this supplier as winner where their score equals the max
              for (const row of rankingData) {
                const max = maxByProject[row.project_id] || 0;
                winnerMap[row.project_id] = max > 0 && row.overall_score === max;
              }
            }
          }

          const parseJsonField = (val: any) => {
            if (!val) return null;
            if (typeof val === 'string') {
              try { return JSON.parse(val); } catch { return null; }
            }
            return typeof val === 'object' ? val : null;
          };

          const evaluations: SupplierEvalDetail[] = rankingData.map((row: any) => {
            const evalDetails = parseJsonField(row.evaluation_details);
            const rawScore = row.overall_score || 0;
            return {
              project_id: row.project_id,
              project_name: projectMap[row.project_id] || row.project_id,
              overall_score: rawScore > 10 ? rawScore / 10 : rawScore,
              is_winner: winnerMap[row.project_id] || false,
              evaluation_details: evalDetails ? {
                strengths: evalDetails.strengths || [],
                weaknesses: evalDetails.weaknesses || [],
                summary: evalDetails.summary || '',
                recommendations: evalDetails.recommendations || [],
                category_analysis: evalDetails.category_analysis
                  ? Object.fromEntries(
                      Object.entries(evalDetails.category_analysis).map(([k, v]) => [k.toLowerCase(), v])
                    ) as Record<string, { highlights: string[]; improvements: string[] }>
                  : undefined,
                feedback: evalDetails.feedback || '',
              } : null,
              created_at: row.created_at,
            };
          });

          set((state) => ({
            supplierEvaluations: { ...state.supplierEvaluations, [supplierName]: evaluations },
            isLoadingEvaluations: false,
          }));
        } catch {
          set({ isLoadingEvaluations: false });
        }
      },

      saveSupplierFeedback: async (supplierName: string, projectId: string, feedback: string) => {
        if (!isSupabaseConfigured()) return false;

        try {
          // First read the current evaluation_details
          const { data: current, error: readError } = await (supabase!
            .from('ranking_proveedores' as any)
            .select('evaluation_details')
            .eq('project_id', projectId)
            .eq('provider_name', supplierName)
            .single()) as { data: any; error: any };

          if (readError) return false;

          const parseJsonField = (val: any) => {
            if (!val) return {};
            if (typeof val === 'string') {
              try { return JSON.parse(val); } catch { return {}; }
            }
            return typeof val === 'object' ? val : {};
          };

          const existingDetails = parseJsonField(current?.evaluation_details);
          const updatedDetails = { ...existingDetails, feedback };

          const client = supabase as any;
          const { error: updateError } = await client
            .from('ranking_proveedores')
            .update({ evaluation_details: updatedDetails })
            .eq('project_id', projectId)
            .eq('provider_name', supplierName);

          if (updateError) return false;

          // Reload evaluations for this supplier
          await get().loadSupplierEvaluationDetails(supplierName);
          return true;
        } catch {
          return false;
        }
      },

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
            return false;
          }

          await get().loadSuppliers();
          return true;
        } catch {
          return false;
        }
      },
    }),
    { name: 'SupplierDirectoryStore' }
  )
);
