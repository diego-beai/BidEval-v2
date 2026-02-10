import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const REQUIRED_EVAL_TYPES = [
  'Technical Evaluation',
  'Economical Evaluation',
];

export const ALL_EVAL_TYPES = [
  'Technical Evaluation',
  'Economical Evaluation',
  'Others',
];

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

  // Actions
  loadProjects: () => Promise<void>;
  setActiveProject: (projectId: string | null) => void;
  getActiveProject: () => Project | null;
  createProject: (displayName: string, description?: string) => Promise<Project | null>;
  updateProjectName: (projectId: string, newDisplayName: string) => Promise<boolean>;
  deleteProject: (projectId: string) => Promise<boolean>;

  // Helpers
  getProjectById: (id: string) => Project | null;
  getProjectByName: (name: string) => Project | null;
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

          // Load projects from v_projects_with_stats view
          loadProjects: async () => {
            if (!isSupabaseConfigured()) {
              console.warn('Supabase not configured. Cannot load projects.');
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
                console.error('[ProjectStore] Error loading projects:', projectsError);
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

                  // --- Compute RFQ type coverage ---
                  const rfqTypeSet = new Set<string>();
                  (rfqDocs || []).forEach((doc: any) => {
                    (doc.evaluation_types || []).forEach((t: string) => rfqTypeSet.add(t));
                  });
                  const rfqTypesCovered = REQUIRED_EVAL_TYPES.filter(t => rfqTypeSet.has(t));
                  const rfqTypesMissing = REQUIRED_EVAL_TYPES.filter(t => !rfqTypeSet.has(t));

                  // --- Compute provider coverage ---
                  const providerMap = new Map<string, Set<string>>();
                  (proposalDocs || []).forEach((doc: any) => {
                    if (!doc.provider) return;
                    if (!providerMap.has(doc.provider)) providerMap.set(doc.provider, new Set());
                    (doc.evaluation_types || []).forEach((t: string) => providerMap.get(doc.provider)!.add(t));
                  });

                  const providerCoverage: ProviderCoverage[] = Array.from(providerMap.entries()).map(([name, types]) => ({
                    name,
                    types_covered: REQUIRED_EVAL_TYPES.filter(t => types.has(t)),
                    types_missing: REQUIRED_EVAL_TYPES.filter(t => !types.has(t)),
                  }));

                  const qualifyingProviders = providerCoverage.filter(pc => pc.types_missing.length === 0).length;

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
                  const hasOpenQA = (qaOpenCount || 0) > 0;
                  const allRfqTypes = rfqTypesMissing.length === 0;
                  const typeCheckFails = !allRfqTypes;
                  let status = 'setup';

                  if (hasScoring && providersWithoutScoring.length === 0 && !hasOpenQA) {
                    status = 'completed';
                  } else if (qualifyingProviders >= 2) {
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
                    console.error(`[ProjectStore] Error loading data for project ${p.id}:`, projectErr);
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
              console.error('Error loading projects:', err);
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
              console.warn('Supabase not configured. Cannot create project.');
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
                console.error('Error creating project:', error);
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
              console.error('Error creating project:', err);
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
              console.warn('Supabase not configured. Cannot update project.');
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
                console.error('Error updating project name:', error);
                set({ error: error.message, isLoading: false });
                return false;
              }

              if (!data?.success) {
                console.error('Error updating project name:', data?.error);
                set({ error: data?.error || 'Unknown error', isLoading: false });
                return false;
              }

              // Reload projects to get the updated data
              await get().loadProjects();

              set({ isLoading: false });
              return true;

            } catch (err) {
              console.error('Error updating project name:', err);
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
              console.warn('Supabase not configured. Cannot delete project.');
              return false;
            }

            set({ isLoading: true, error: null });

            try {
              const { data, error } = await (supabase! as any)
                .rpc('soft_delete_project', {
                  p_project_id: projectId
                });

              if (error) {
                console.error('Error deleting project:', error);
                set({ error: error.message, isLoading: false });
                return false;
              }

              if (!data?.success) {
                console.error('Error deleting project:', data?.error);
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
              console.error('Error deleting project:', err);
              set({
                error: err instanceof Error ? err.message : 'Unknown error',
                isLoading: false
              });
              return false;
            }
          },
        }),
        {
          name: 'bideval-project-store',
          // Only persist activeProjectId, not the full projects list
          partialize: (state) => ({
            activeProjectId: state.activeProjectId
          }),
        }
      )
    ),
    { name: 'ProjectStore' }
  )
);

// Subscribe to project changes for debugging
if (import.meta.env.DEV) {
  useProjectStore.subscribe(
    (state) => state.activeProjectId,
    (activeProjectId) => {
      console.log('Active project changed:', activeProjectId);
    }
  );
}
