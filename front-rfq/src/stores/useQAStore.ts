import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  type QAQuestion,
  type QAFilters,
  type DisciplinaGroup,
  type Disciplina,
  type EstadoPregunta,
  type Importancia
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

// Function to map from qa_audit table to frontend format
function mapQAAuditToQAQuestion(dbItem: any): QAQuestion {
  return {
    id: dbItem.id,
    created_at: dbItem.created_at,
    project_name: dbItem.project_name || dbItem.project_id,
    provider_name: dbItem.provider_name || dbItem.proveedor,
    discipline: dbItem.discipline || dbItem.disciplina,
    question: dbItem.question || dbItem.pregunta_texto,
    status: dbItem.status || dbItem.estado,
    importance: dbItem.importance || dbItem.importancia,
    response: dbItem.response || dbItem.respuesta_proveedor,
    // Alias for frontend compatibility
    project_id: dbItem.project_name || dbItem.project_id,
    proveedor: dbItem.provider_name || dbItem.proveedor,
    disciplina: dbItem.discipline || dbItem.disciplina,
    pregunta_texto: dbItem.question || dbItem.pregunta_texto,
    estado: dbItem.status || dbItem.estado,
    importancia: dbItem.importance || dbItem.importancia,
    respuesta_proveedor: dbItem.response || dbItem.respuesta_proveedor,
    fecha_respuesta: dbItem.fecha_respuesta,
    notas_internas: dbItem.notas_internas,
  };
}

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
      // Asegurar que el project_id está correctamente codificado para URL
      const encodedProjectId = projectId.trim();
      
        console.log('📋 Loading Q&A questions from Supabase:', {
        projectId: encodedProjectId,
        table: 'qa_audit',
        hasCredentials: isSupabaseConfigured()
      });
      
      const { data, error } = await supabase!
        .from('qa_audit')
        .select('*')
        .eq('project_name', encodedProjectId)
        .order('created_at', { ascending: false });

      console.log('📋 Q&A query result:', {
        projectId: encodedProjectId,
        dataCount: data?.length || 0,
        data: data,
        error: error
      });

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          table: 'qa_audit',
          projectId: encodedProjectId
        });
        
        // If it's a 404 error or table not found, show clearer message
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('⚠️ The qa_audit table does not exist in Supabase. Check the database structure.');
          set({
            questions: [],
            isLoading: false,
            error: 'The Q&A table is not configured. Contact the administrator.'
          });
          return;
        }
        
        throw error;
      }

      set({
        questions: (data || []).map((item: any) => mapQAAuditToQAQuestion(item)),
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Error loading Q&A questions:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error loading questions';
      
      // If it's a 404 error, the table may not exist or have no permissions
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('does not exist'))) {
        console.warn('⚠️ qa_audit table not found or no permissions. Verify it exists in Supabase and you have the correct permissions.');
        set({
          error: 'The Q&A table is not available. Contact the administrator.',
          isLoading: false,
          questions: []
        });
        return;
      }
      
      set({
        error: errorMessage,
        isLoading: false,
        questions: []
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
      const currentProjectId = get().selectedProjectId;
      // Use correct DB column names (English)
      const { data, error } = await (supabase!
        .from('qa_audit') as any)
        .insert([{
          project_name: question.project_name || question.project_id || currentProjectId,
          provider_name: question.provider_name || question.proveedor,
          discipline: question.discipline || question.disciplina,
          question: question.question || question.pregunta_texto,
          status: question.status || question.estado || 'Draft',
          importance: question.importance || question.importancia || 'Medium',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Map the returned data to include both English and Spanish field aliases
      const mappedData = mapQAAuditToQAQuestion(data);

      set(state => ({
        questions: [mappedData, ...state.questions],
        isLoading: false
      }));
    } catch (error) {
      console.error('Error creating question:', error);
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
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
      // Build update object with only defined fields, using correct DB column names
      const updateData: Record<string, any> = {};

      if (updates.provider_name || updates.proveedor) {
        updateData.provider_name = updates.provider_name || updates.proveedor;
      }
      if (updates.discipline || updates.disciplina) {
        updateData.discipline = updates.discipline || updates.disciplina;
      }
      if (updates.question || updates.pregunta_texto) {
        updateData.question = updates.question || updates.pregunta_texto;
      }
      if (updates.status || updates.estado) {
        updateData.status = updates.status || updates.estado;
      }
      if (updates.importance !== undefined || updates.importancia !== undefined) {
        updateData.importance = updates.importance || updates.importancia;
      }
      if (updates.response || updates.respuesta_proveedor) {
        updateData.response = updates.response || updates.respuesta_proveedor;
      }

      const { data, error } = await (supabase!
        .from('qa_audit') as any)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Map the returned data to include both English and Spanish field aliases
      const mappedData = mapQAAuditToQAQuestion(data);

      set(state => ({
        questions: state.questions.map(q =>
          q.id === id ? { ...q, ...mappedData } : q
        ),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error updating question:', error);
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
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
        .from('qa_audit')
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
        error: error instanceof Error ? error.message : 'Unknown error',
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
      // Use correct DB column name 'status' (not 'estado')
      const { error } = await (supabase!
        .from('qa_audit') as any)
        .update({ status: estado })
        .in('id', ids);

      if (error) throw error;

      // Update both 'status' (DB) and 'estado' (alias) in local state
      set(state => ({
        questions: state.questions.map(q =>
          ids.includes(q.id) ? { ...q, status: estado, estado } : q
        ),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error bulk updating questions:', error);
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
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
      if (filters.proveedor && (q.proveedor || q.provider_name) !== filters.proveedor) return false;
      if (filters.disciplina && (q.disciplina || q.discipline) !== filters.disciplina) return false;
      if (filters.estado && (q.estado || q.status) !== filters.estado) return false;
      if (filters.importancia && (q.importancia || q.importance) !== filters.importancia) return false;
      return true;
    });
  },

  // Agrupar por disciplina
  getGroupedByDisciplina: () => {
    const filteredQuestions = get().getFilteredQuestions();
    const disciplinas: Disciplina[] = ['Electrical', 'Mechanical', 'Civil', 'Process', 'General', 'Cost'];

    return disciplinas.map(disciplina => {
      const preguntas = filteredQuestions.filter(q => (q.disciplina || q.discipline) === disciplina);

      return {
        disciplina,
        preguntas,
        stats: {
          total: preguntas.length,
          borradores: preguntas.filter(q => (q.estado || q.status) === 'Draft').length,
          aprobadas: preguntas.filter(q => (q.estado || q.status) === 'Approved').length,
          pendientes: preguntas.filter(q => (q.estado || q.status) === 'Pending').length,
          alta: preguntas.filter(q => (q.importancia || q.importance) === 'High').length,
          media: preguntas.filter(q => (q.importancia || q.importance) === 'Medium').length,
          baja: preguntas.filter(q => (q.importancia || q.importance) === 'Low').length,
        }
      };
    });
  },

  // Obtener estadísticas generales
  getStats: () => {
    const questions = get().getFilteredQuestions();

    const estados: EstadoPregunta[] = ['Draft', 'Pending', 'Approved', 'Sent', 'Answered', 'Discarded'];
    const disciplinas: Disciplina[] = ['Electrical', 'Mechanical', 'Civil', 'Process', 'General', 'Cost'];
    const importancias: Importancia[] = ['High', 'Medium', 'Low'];

    return {
      total: questions.length,
      porEstado: estados.reduce((acc, estado) => ({
        ...acc,
        [estado]: questions.filter(q => (q.estado || q.status) === estado).length
      }), {} as Record<EstadoPregunta, number>),
      porDisciplina: disciplinas.reduce((acc, disciplina) => ({
        ...acc,
        [disciplina]: questions.filter(q => (q.disciplina || q.discipline) === disciplina).length
      }), {} as Record<Disciplina, number>),
      porImportancia: importancias.reduce((acc, importancia) => ({
        ...acc,
        [importancia]: questions.filter(q => (q.importancia || q.importance) === importancia).length
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
            table: 'qa_audit',
            filter: `project_name=eq.${projectId}`
          },
          (payload) => {
            console.log('Q&A change received:', payload);

            // Reload questions when there are changes
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
