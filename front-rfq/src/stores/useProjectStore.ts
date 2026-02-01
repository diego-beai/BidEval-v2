import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Project {
  id: string;
  name: string;
  display_name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  document_count: number;
  requirement_count: number;
  qa_count: number;
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
              const projectsWithStats = await Promise.all(
                (projectsData || []).map(async (p: any) => {
                  // Count documents
                  const { count: docCount } = await supabase!
                    .from('document_metadata')
                    .select('*', { count: 'exact', head: true })
                    .eq('project_id', p.id);

                  // Count requirements
                  const { count: reqCount } = await supabase!
                    .from('rfq_items_master')
                    .select('*', { count: 'exact', head: true })
                    .eq('project_id', p.id);

                  // Count QA
                  const { count: qaCount } = await supabase!
                    .from('qa_audit')
                    .select('*', { count: 'exact', head: true })
                    .eq('project_id', p.id);

                  return {
                    ...p,
                    document_count: docCount || 0,
                    requirement_count: reqCount || 0,
                    qa_count: qaCount || 0,
                  };
                })
              );

              const data = projectsWithStats;

              const projects: Project[] = (data || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                display_name: p.display_name,
                description: p.description,
                created_at: p.created_at,
                updated_at: p.updated_at,
                is_active: p.is_active,
                document_count: p.document_count || 0,
                requirement_count: p.requirement_count || 0,
                qa_count: p.qa_count || 0,
              }));

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
