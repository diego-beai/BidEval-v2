import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const REQUIRED_EVAL_TYPES = [
  'Technical Evaluation',
  'Economical Evaluation',
];

/** Returns required eval types based on project type. RFI only needs Technical. */
export function getRequiredEvalTypes(projectType?: 'RFP' | 'RFQ' | 'RFI'): string[] {
  if (projectType === 'RFI') return ['Technical Evaluation'];
  return REQUIRED_EVAL_TYPES;
}

export const ALL_EVAL_TYPES = [
  'Technical Evaluation',
  'Economical Evaluation',
  'Others',
];

/** Returns all eval types based on project type. RFI excludes Economical. */
export function getAllEvalTypes(projectType?: 'RFP' | 'RFQ' | 'RFI'): string[] {
  if (projectType === 'RFI') return ['Technical Evaluation', 'Others'];
  return ALL_EVAL_TYPES;
}

export interface ProviderCoverage {
  name: string;
  types_covered: string[];
  types_missing: string[];
}

export interface Project {
  id: string;
  name: string;
  display_name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  document_count: number;
  rfq_count: number;
  proposal_count: number;
  requirement_count: number;
  qa_count: number;
  qa_open_count: number;
  status: string;
  ai_context?: string;
  // Project setup fields
  project_type?: 'RFP' | 'RFQ' | 'RFI';
  currency?: string;
  reference_code?: string | null;
  owner_name?: string | null;
  date_opening?: string | null;
  date_submission_deadline?: string | null;
  date_questions_deadline?: string | null;
  date_questions_response?: string | null;
  date_evaluation?: string | null;
  date_award?: string | null;
  default_language?: 'es' | 'en';
  // Status detail fields
  rfq_types_covered: string[];
  rfq_types_missing: string[];
  provider_coverage: ProviderCoverage[];
  qualifying_providers: number; // providers covering required types (Technical + Economical)
  providers_with_scoring: { name: string; score: number }[];
  providers_without_scoring: string[];
}

interface ProjectState {
  // State
  projects: Project[];
  activeProjectId: string | null;
  isLoading: boolean;
  error: string | null;
  resultsApprovedMap: Record<string, boolean>;

  // Actions
  loadProjects: () => Promise<void>;
  setActiveProject: (projectId: string | null) => void;
  getActiveProject: () => Project | null;
  createProject: (displayName: string, description?: string) => Promise<Project | null>;
  updateProjectName: (projectId: string, newDisplayName: string) => Promise<boolean>;
  deleteProject: (projectId: string) => Promise<boolean>;
  approveResults: (projectId: string) => void;

  // Helpers
  getProjectById: (id: string) => Project | null;
  getProjectByName: (name: string) => Project | null;
}

// --- Realtime subscription for auto-refreshing project status ---
let _realtimeChannel: any = null;
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Subscribe to DB changes that affect project status. Call once on app mount. */
export function subscribeProjectRealtime() {
  if (_realtimeChannel || !supabase) return;

  const schema = import.meta.env.VITE_SUPABASE_SCHEMA || 'public';

  const debouncedRefresh = () => {
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
      useProjectStore.getState().loadProjects();
    }, 2000); // 2s debounce to batch rapid changes
  };

  _realtimeChannel = supabase
    .channel('project-status-realtime')
    .on('postgres_changes', { event: '*', schema, table: 'document_metadata' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema, table: 'rfq_items_master' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema, table: 'ranking_proveedores' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema, table: 'projects' }, debouncedRefresh)
    .subscribe();
}

/** Unsubscribe from realtime. Call on app unmount if needed. */
export function unsubscribeProjectRealtime() {
  if (_debounceTimer) clearTimeout(_debounceTimer);
  if (_realtimeChannel && supabase) {
    supabase.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
  }
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          // Initial state
          projects: [],
          activeProjectId: null,
          isLoading: false,
          error: null,
          resultsApprovedMap: {},

          // Load projects from v_projects_with_stats view
          loadProjects: async () => {
            if (!isSupabaseConfigured()) {
              set({
                projects: [],
                isLoading: false,
                error: 'Supabase not configured'
              });
              return;
            }

            set({ isLoading: true, error: null });

            try {
              // Temporary: Query projects table directly and calculate stats
              const { data: projectsData, error: projectsError } = await supabase!
                .from('projects')
                .select('*')
                .eq('is_active', true)
                .order('updated_at', { ascending: false });

              if (projectsError) {
                set({
                  error: projectsError.message,
                  isLoading: false
                });
                return;
              }

              // Get stats for each project
              const projectResults = await Promise.all(
                (projectsData || []).map(async (p: any) => {
                  try {
                  // Fetch all project data in parallel
                  const [
                    { data: rfqDocs },
                    { data: proposalDocs },
                    { count: reqCount },
                    { count: qaCount },
                    { count: qaOpenCount },
                    { data: scoringData }
                  ] = await Promise.all([
                    supabase!.from('document_metadata').select('evaluation_types').eq('project_id', p.id).eq('document_type', 'RFQ'),
                    supabase!.from('document_metadata').select('provider, evaluation_types').eq('project_id', p.id).eq('document_type', 'PROPOSAL').not('provider', 'is', null),
                    supabase!.from('rfq_items_master').select('*', { count: 'exact', head: true }).eq('project_id', p.id),
                    supabase!.from('qa_audit').select('*', { count: 'exact', head: true }).eq('project_id', p.id),
                    supabase!.from('qa_audit').select('*', { count: 'exact', head: true }).eq('project_id', p.id).in('status', ['Sent']),
                    supabase!.from('ranking_proveedores').select('provider_name, overall_score').eq('project_id', p.id).order('overall_score', { ascending: false }),
                  ]);

                  // --- Compute RFQ type coverage (adapts to project type) ---
                  const projType = (p.project_type as 'RFP' | 'RFQ' | 'RFI') || 'RFP';
                  const requiredTypes = getRequiredEvalTypes(projType);
                  const allTypes = getAllEvalTypes(projType);
                  const rfqTypeSet = new Set<string>();
                  (rfqDocs || []).forEach((doc: any) => {
                    (doc.evaluation_types || []).forEach((t: string) => rfqTypeSet.add(t));
                  });
                  // Visual coverage in UI should include all known types (including Others)
                  const rfqTypesCovered = allTypes.filter(t => rfqTypeSet.has(t));
                  const rfqTypesMissing = allTypes.filter(t => !rfqTypeSet.has(t));
                  // Status gating keeps using required types only
                  const requiredRfqTypesMissing = requiredTypes.filter(t => !rfqTypeSet.has(t));

                  // --- Compute provider coverage ---
                  const providerMap = new Map<string, Set<string>>();
                  (proposalDocs || []).forEach((doc: any) => {
                    if (!doc.provider) return;
                    if (!providerMap.has(doc.provider)) providerMap.set(doc.provider, new Set());
                    (doc.evaluation_types || []).forEach((t: string) => providerMap.get(doc.provider)!.add(t));
                  });

                  // Ensure providers already scored are visible in Proposals coverage even if
                  // their proposal docs are incomplete/missing metadata.
                  (scoringData || []).forEach((s: any) => {
                    const providerName = (s.provider_name || '').trim();
                    if (!providerName) return;
                    if (!providerMap.has(providerName)) providerMap.set(providerName, new Set());
                  });

                  const providerCoverage: ProviderCoverage[] = Array.from(providerMap.entries()).map(([name, types]) => ({
                    name,
                    // Visual coverage includes Others
                    types_covered: allTypes.filter(t => types.has(t)),
                    types_missing: allTypes.filter(t => !types.has(t)),
                  }));

                  // Qualification keeps using required types only (adapted per project type)
                  const qualifyingProviders = Array.from(providerMap.values())
                    .filter(types => requiredTypes.every(t => types.has(t)))
                    .length;

                  // --- Scoring info ---
                  const scoredMap = new Map<string, number>();
                  (scoringData || []).forEach((s: any) => scoredMap.set(s.provider_name, s.overall_score ?? 0));
                  const allProposalProviders = Array.from(providerMap.keys());
                  const providersWithScoring = allProposalProviders
                    .filter(pv => scoredMap.has(pv))
                    .map(pv => {
                      const raw = scoredMap.get(pv)!;
                      return { name: pv, score: raw > 10 ? raw / 10 : raw };
                    })
                    .sort((a, b) => b.score - a.score);
                  const providersWithoutScoring = allProposalProviders.filter(pv => !scoredMap.has(pv));

                  // --- Counts ---
                  const rfqCount = (rfqDocs || []).length;
                  const proposalCount = (proposalDocs || []).length;
                  const docCount = rfqCount + proposalCount;
                  const requirementCount = reqCount || 0;

                  // --- Status calculation (check from completed → setup) ---
                  const hasScoring = scoredMap.size > 0;
                  const allRfqTypes = requiredRfqTypesMissing.length === 0;
                  const typeCheckFails = !allRfqTypes;
                  let status = 'setup';

                  // Manual approval required to reach "completed" (Results)
                  const isApproved = get().resultsApprovedMap[p.id] === true;

                  if (isApproved && hasScoring) {
                    status = 'completed';
                  } else if (qualifyingProviders >= 2 || (hasScoring && providersWithoutScoring.length === 0)) {
                    status = 'evaluation';
                  } else if (requirementCount > 0 && !typeCheckFails) {
                    // Has requirements AND (all types OK or no type data)
                    status = 'waiting_proposals';
                  } else if (rfqCount > 0 && !typeCheckFails) {
                    // Has RFQ docs but no requirements yet
                    status = 'extracting';
                  } else {
                    // Missing RFQ types (with type data) or no docs at all
                    status = 'setup';
                  }

                  return {
                    id: p.id,
                    name: p.name,
                    display_name: p.display_name,
                    description: p.description,
                    created_at: p.created_at,
                    updated_at: p.updated_at,
                    is_active: p.is_active,
                    project_type: p.project_type || 'RFP',
                    currency: p.currency || 'EUR',
                    reference_code: p.reference_code,
                    owner_name: p.owner_name,
                    date_opening: p.date_opening,
                    date_submission_deadline: p.date_submission_deadline,
                    date_questions_deadline: p.date_questions_deadline,
                    date_questions_response: p.date_questions_response,
                    date_evaluation: p.date_evaluation,
                    date_award: p.date_award,
                    default_language: p.default_language || 'es',
                    document_count: docCount,
                    rfq_count: rfqCount,
                    proposal_count: proposalCount,
                    requirement_count: requirementCount,
                    qa_count: qaCount || 0,
                    qa_open_count: qaOpenCount || 0,
                    status,
                    ai_context: p.ai_context,
                    rfq_types_covered: rfqTypesCovered,
                    rfq_types_missing: rfqTypesMissing,
                    provider_coverage: providerCoverage,
                    qualifying_providers: qualifyingProviders,
                    providers_with_scoring: providersWithScoring,
                    providers_without_scoring: providersWithoutScoring,
                  } as Project;
                  } catch (projectErr) {
                    // Return project with safe defaults so it still appears in the list
                    return {
                      id: p.id,
                      name: p.name,
                      display_name: p.display_name,
                      description: p.description,
                      created_at: p.created_at,
                      updated_at: p.updated_at,
                      is_active: p.is_active,
                      project_type: p.project_type || 'RFP',
                      currency: p.currency || 'EUR',
                      reference_code: p.reference_code,
                      owner_name: p.owner_name,
                      date_opening: p.date_opening,
                      date_submission_deadline: p.date_submission_deadline,
                      date_questions_deadline: p.date_questions_deadline,
                      date_questions_response: p.date_questions_response,
                      date_evaluation: p.date_evaluation,
                      date_award: p.date_award,
                      default_language: p.default_language || 'es',
                      document_count: 0,
                      rfq_count: 0,
                      proposal_count: 0,
                      requirement_count: 0,
                      qa_count: 0,
                      qa_open_count: 0,
                      status: 'setup',
                      ai_context: p.ai_context,
                      rfq_types_covered: [],
                      rfq_types_missing: [],
                      provider_coverage: [],
                      qualifying_providers: 0,
                      providers_with_scoring: [],
                      providers_without_scoring: [],
                    } as Project;
                  }
                })
              );
              const projects = projectResults.filter(Boolean) as Project[];

              set({ projects, isLoading: false, error: null });

              // If no active project and we have projects, set the first one
              const state = get();
              if (!state.activeProjectId && projects.length > 0) {
                set({ activeProjectId: projects[0].id });
              }

              // If active project no longer exists, reset it
              if (state.activeProjectId && !projects.find(p => p.id === state.activeProjectId)) {
                set({ activeProjectId: projects.length > 0 ? projects[0].id : null });
              }


            } catch (err) {
              set({
                error: err instanceof Error ? err.message : 'Unknown error',
                isLoading: false
              });
            }
          },

          // Set active project
          setActiveProject: (projectId: string | null) => {
            set({ activeProjectId: projectId });
          },

          // Get active project object
          getActiveProject: () => {
            const { projects, activeProjectId } = get();
            if (!activeProjectId) return null;
            return projects.find(p => p.id === activeProjectId) || null;
          },

          // Create a new project
          createProject: async (displayName: string, description?: string) => {
            if (!isSupabaseConfigured()) {
              return null;
            }

            set({ isLoading: true, error: null });

            try {
              // Use the database function get_or_create_project
              const { data, error } = await (supabase! as any)
                .rpc('get_or_create_project', {
                  p_display_name: displayName,
                  p_description: description || null
                });

              if (error) {
                set({ error: error.message, isLoading: false });
                return null;
              }

              // Reload projects to get the new one with stats
              await get().loadProjects();

              // Find and return the new project
              const newProject = get().projects.find(p => p.id === data);

              // Set it as active
              if (newProject) {
                set({ activeProjectId: newProject.id });
              }

              return newProject || null;

            } catch (err) {
              set({
                error: err instanceof Error ? err.message : 'Unknown error',
                isLoading: false
              });
              return null;
            }
          },

          // Helper: Get project by ID
          getProjectById: (id: string) => {
            return get().projects.find(p => p.id === id) || null;
          },

          // Helper: Get project by name (display_name or normalized name)
          getProjectByName: (name: string) => {
            const { projects } = get();
            return projects.find(
              p => p.display_name === name ||
                p.name === name ||
                p.display_name.toLowerCase() === name.toLowerCase()
            ) || null;
          },

          // Update project name
          updateProjectName: async (projectId: string, newDisplayName: string) => {
            if (!isSupabaseConfigured()) {
              return false;
            }

            set({ isLoading: true, error: null });

            try {
              const { data, error } = await (supabase! as any)
                .rpc('update_project_name', {
                  p_project_id: projectId,
                  p_new_display_name: newDisplayName
                });

              if (error) {
                set({ error: error.message, isLoading: false });
                return false;
              }

              if (!data?.success) {
                set({ error: data?.error || 'Unknown error', isLoading: false });
                return false;
              }

              // Reload projects to get the updated data
              await get().loadProjects();

              set({ isLoading: false });
              return true;

            } catch (err) {
              set({
                error: err instanceof Error ? err.message : 'Unknown error',
                isLoading: false
              });
              return false;
            }
          },

          // Soft delete project (mark as inactive)
          deleteProject: async (projectId: string) => {
            if (!isSupabaseConfigured()) {
              return false;
            }

            set({ isLoading: true, error: null });

            try {
              const { data, error } = await (supabase! as any)
                .rpc('soft_delete_project', {
                  p_project_id: projectId
                });

              if (error) {
                set({ error: error.message, isLoading: false });
                return false;
              }

              if (!data?.success) {
                set({ error: data?.error || 'Unknown error', isLoading: false });
                return false;
              }

              // If the deleted project was the active one, clear it
              const { activeProjectId } = get();
              if (activeProjectId === projectId) {
                set({ activeProjectId: null });
              }

              // Reload projects to remove the deleted one from the list
              await get().loadProjects();

              set({ isLoading: false });
              return true;

            } catch (err) {
              set({
                error: err instanceof Error ? err.message : 'Unknown error',
                isLoading: false
              });
              return false;
            }
          },

          // Approve results: move project from Scoring → Results
          approveResults: (projectId: string) => {
            set(state => ({
              resultsApprovedMap: { ...state.resultsApprovedMap, [projectId]: true },
              // Also update the project's status in the local list immediately
              projects: state.projects.map(p =>
                p.id === projectId ? { ...p, status: 'completed' } : p
              ),
            }));
          },
        }),
        {
          name: 'bideval-project-store',
          // Persist activeProjectId and results approvals
          partialize: (state) => ({
            activeProjectId: state.activeProjectId,
            resultsApprovedMap: state.resultsApprovedMap,
          }),
        }
      )
    ),
    { name: 'ProjectStore' }
  )
);

