import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  QAQuestion,
  QAFilters,
  DisciplinaGroup,
  Disciplina,
  EstadoPregunta,
  Importancia
} from '../types/qa.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface QAState {
  // Estado
  questions: QAQuestion[];
  isLoading: boolean;
  error: string | null;
  filters: QAFilters;
  selectedProjectId: string | null;

  // Generation State
  isGenerating: boolean;
  statusMessage: string | null;

  // Realtime
  realtimeChannel: RealtimeChannel | null;

  // Acciones
  loadQuestions: (projectId: string) => Promise<void>;
  createQuestion: (question: Partial<QAQuestion>) => Promise<void>;
  updateQuestion: (id: string, updates: Partial<QAQuestion>) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  bulkUpdateStatus: (ids: string[], estado: EstadoPregunta) => Promise<void>;

  // Filtros
  setFilters: (filters: Partial<QAFilters>) => void;
  clearFilters: () => void;
  setQuestions: (questions: QAQuestion[]) => void;
  setGenerating: (isGenerating: boolean) => void;
  setStatusMessage: (message: string | null) => void;

  // Helpers
  getFilteredQuestions: () => QAQuestion[];
  getGroupedByDisciplina: () => DisciplinaGroup[];
  getStats: () => {
    total: number;
    porEstado: Record<EstadoPregunta, number>;
    porDisciplina: Record<Disciplina, number>;
    porImportancia: Record<Importancia, number>;
  };

  // Realtime
  subscribeToChanges: (projectId: string) => void;
  unsubscribeFromChanges: () => void;

  // Reset
  reset: () => void;
}

const initialFilters: QAFilters = {
  proveedor: null,
  disciplina: null,
  estado: null,
  importancia: null,
};

export const useQAStore = create<QAState>((set, get) => ({
  // Estado inicial
  questions: [],
  isLoading: false,
  isGenerating: false,
  statusMessage: null,
  error: null,
  filters: initialFilters,
  selectedProjectId: null,
  realtimeChannel: null,

  // Cargar preguntas desde Supabase
  loadQuestions: async (projectId: string) => {
    set({ isLoading: true, error: null, selectedProjectId: projectId });

    // Si Supabase no está configurado, usar datos mock
    if (!isSupabaseConfigured()) {
      console.warn('📦 Supabase not configured. Using mock data.');
      set({
        questions: [],
        isLoading: false,
        error: null
      });
      return;
    }

    try {
      const { data, error } = await supabase!
        .from('QA_PENDIENTE')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({
        questions: (data || []) as QAQuestion[],
        isLoading: false
      });
    } catch (error) {
      console.error('Error loading Q&A questions:', error);
      set({
        error: error instanceof Error ? error.message : 'Error desconocido',
        isLoading: false
      });
    }
  },

  // Crear nueva pregunta
  createQuestion: async (question: Partial<QAQuestion>) => {
    if (!isSupabaseConfigured()) {
      set({ error: null });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await (supabase!
        .from('QA_PENDIENTE') as any)
        .insert([question])
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        questions: [data as QAQuestion, ...state.questions],
        isLoading: false
      }));
    } catch (error) {
      console.error('Error creating question:', error);
      set({
        error: error instanceof Error ? error.message : 'Error desconocido',
        isLoading: false
      });
    }
  },

  // Actualizar pregunta
  updateQuestion: async (id: string, updates: Partial<QAQuestion>) => {
    if (!isSupabaseConfigured()) {
      set({ error: null });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await (supabase!
        .from('QA_PENDIENTE') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        questions: state.questions.map(q =>
          q.id === id ? { ...q, ...(data as any) } : q
        ),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error updating question:', error);
      set({
        error: error instanceof Error ? error.message : 'Error desconocido',
        isLoading: false
      });
    }
  },

  // Eliminar pregunta
  deleteQuestion: async (id: string) => {
    if (!isSupabaseConfigured()) {
      set({ error: null });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase!
        .from('QA_PENDIENTE')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        questions: state.questions.filter(q => q.id !== id),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error deleting question:', error);
      set({
        error: error instanceof Error ? error.message : 'Error desconocido',
        isLoading: false
      });
    }
  },

  // Actualizar múltiples preguntas
  bulkUpdateStatus: async (ids: string[], estado: EstadoPregunta) => {
    if (!isSupabaseConfigured()) {
      set({ error: null });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { error } = await (supabase!
        .from('QA_PENDIENTE') as any)
        .update({ estado })
        .in('id', ids);

      if (error) throw error;

      set(state => ({
        questions: state.questions.map(q =>
          ids.includes(q.id) ? { ...q, estado } : q
        ),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error bulk updating questions:', error);
      set({
        error: error instanceof Error ? error.message : 'Error desconocido',
        isLoading: false
      });
    }
  },

  // Establecer filtros
  setFilters: (newFilters: Partial<QAFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters }
    }));
  },

  // Limpiar filtros
  clearFilters: () => {
    set({ filters: initialFilters });
  },

  // Establecer preguntas manualmente
  setQuestions: (questions: QAQuestion[]) => {
    set({ questions });
  },

  setGenerating: (isGenerating: boolean) => {
    set({ isGenerating });
  },

  setStatusMessage: (statusMessage: string | null) => {
    set({ statusMessage });
  },

  // Obtener preguntas filtradas
  getFilteredQuestions: () => {
    const { questions, filters } = get();

    return questions.filter(q => {
      if (filters.proveedor && q.proveedor !== filters.proveedor) return false;
      if (filters.disciplina && q.disciplina !== filters.disciplina) return false;
      if (filters.estado && q.estado !== filters.estado) return false;
      if (filters.importancia && q.importancia !== filters.importancia) return false;
      return true;
    });
  },

  // Agrupar por disciplina
  getGroupedByDisciplina: () => {
    const filteredQuestions = get().getFilteredQuestions();
    const disciplinas: Disciplina[] = ['Eléctrica', 'Mecánica', 'Civil', 'Proceso', 'General'];

    return disciplinas.map(disciplina => {
      const preguntas = filteredQuestions.filter(q => q.disciplina === disciplina);

      return {
        disciplina,
        preguntas,
        stats: {
          total: preguntas.length,
          borradores: preguntas.filter(q => q.estado === 'Borrador').length,
          aprobadas: preguntas.filter(q => q.estado === 'Aprobada').length,
          pendientes: preguntas.filter(q => q.estado === 'Pendiente').length,
          alta: preguntas.filter(q => q.importancia === 'Alta').length,
          media: preguntas.filter(q => q.importancia === 'Media').length,
          baja: preguntas.filter(q => q.importancia === 'Baja').length,
        }
      };
    });
  },

  // Obtener estadísticas generales
  getStats: () => {
    const questions = get().getFilteredQuestions();

    const estados: EstadoPregunta[] = ['Borrador', 'Pendiente', 'Aprobada', 'Enviada', 'Respondida', 'Descartada'];
    const disciplinas: Disciplina[] = ['Eléctrica', 'Mecánica', 'Civil', 'Proceso', 'General'];
    const importancias: Importancia[] = ['Alta', 'Media', 'Baja'];

    return {
      total: questions.length,
      porEstado: estados.reduce((acc, estado) => ({
        ...acc,
        [estado]: questions.filter(q => q.estado === estado).length
      }), {} as Record<EstadoPregunta, number>),
      porDisciplina: disciplinas.reduce((acc, disciplina) => ({
        ...acc,
        [disciplina]: questions.filter(q => q.disciplina === disciplina).length
      }), {} as Record<Disciplina, number>),
      porImportancia: importancias.reduce((acc, importancia) => ({
        ...acc,
        [importancia]: questions.filter(q => q.importancia === importancia).length
      }), {} as Record<Importancia, number>),
    };
  },

  // Suscribirse a cambios en tiempo real
  subscribeToChanges: (projectId: string) => {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase not configured. Realtime updates disabled.');
      return;
    }

    const channel = supabase!
      .channel('qa-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'QA_PENDIENTE',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('Q&A change received:', payload);

          // Recargar preguntas cuando hay cambios
          get().loadQuestions(projectId);
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });
  },

  // Desuscribirse de cambios
  unsubscribeFromChanges: () => {
    const { realtimeChannel } = get();

    if (realtimeChannel && isSupabaseConfigured()) {
      supabase!.removeChannel(realtimeChannel);
      set({ realtimeChannel: null });
    }
  },

  // Reset completo
  reset: () => {
    get().unsubscribeFromChanges();
    set({
      questions: [],
      isLoading: false,
      error: null,
      filters: initialFilters,
      selectedProjectId: null,
      realtimeChannel: null,
    });
  },
}));
