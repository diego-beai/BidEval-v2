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
              const { data, error } = await supabase!
                .from('v_projects_with_stats')
                .select('*')
                .order('updated_at', { ascending: false });

              if (error) {
                console.error('Error loading projects:', error);
                set({
                  error: error.message,
                  isLoading: false
                });
                return;
              }

              const projects: Project[] = (data || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                display_name: p.display_name,
                description: p.description,
                created_at: p.created_at,
                updated_at: p.updated_at,
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
