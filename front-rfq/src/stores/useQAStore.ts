import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useProjectStore } from './useProjectStore';
import {
  type QAQuestion,
  type QAFilters,
  type DisciplinaGroup,
  type Disciplina,
  type EstadoPregunta,
  type Importancia
} from '../types/qa.types';
import type { QANotification } from '../types/database.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Requirement details for linking Q&A to source requirements
export interface RequirementDetails {
  id: string;
  requirement_text: string;
  evaluation_type: string;
  phase?: string;
}

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

  // Requirement cache for linked requirements
  requirementCache: Record<string, RequirementDetails>;
  loadingRequirements: Set<string>;

  // Notifications
  notifications: QANotification[];
  unreadNotificationCount: number;
  notificationsLoading: boolean;

  // Realtime
  realtimeChannel: RealtimeChannel | null;
  notificationsChannel: RealtimeChannel | null;

  // Acciones
  loadQuestions: (projectId?: string) => Promise<void>;
  createQuestion: (question: Partial<QAQuestion>) => Promise<void>;
  updateQuestion: (id: string, updates: Partial<QAQuestion>) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  bulkUpdateStatus: (ids: string[], estado: EstadoPregunta) => Promise<void>;

  // Requirement details
  loadRequirementDetails: (requirementId: string) => Promise<RequirementDetails | null>;
  getRequirementDetails: (requirementId: string) => RequirementDetails | null;

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
  subscribeToChanges: (projectId?: string) => void;
  unsubscribeFromChanges: () => void;

  // Notifications
  loadNotifications: (projectId?: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  subscribeToNotifications: (projectId?: string) => void;
  unsubscribeFromNotifications: () => void;

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
    project_id: dbItem.project_id,  // UUID del proyecto
    project_name: dbItem.project_id, // Alias para compatibilidad (usa UUID como fallback)
    provider_name: dbItem.provider_name || dbItem.proveedor,
    discipline: dbItem.discipline || dbItem.disciplina,
    question: dbItem.question || dbItem.pregunta_texto,
    status: dbItem.status || dbItem.estado,
    importance: dbItem.importance || dbItem.importancia,
    response: dbItem.response || dbItem.respuesta_proveedor,
    requirement_id: dbItem.requirement_id, // Link to source requirement
    // Alias for frontend compatibility
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
  notificationsChannel: null,
  requirementCache: {},
  loadingRequirements: new Set(),
  notifications: [],
  unreadNotificationCount: 0,
  notificationsLoading: false,

  // Cargar preguntas desde Supabase
  loadQuestions: async (projectIdParam?: string) => {
    // Get project info from global store
    const activeProjectId = useProjectStore.getState().activeProjectId;
    const activeProject = useProjectStore.getState().getActiveProject();

    // Use parameter or fall back to global store
    const projectId = projectIdParam || activeProjectId;
    const projectDisplayName = activeProject?.display_name;

    set({ isLoading: true, error: null, selectedProjectId: projectId || null });

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

    // If no project selected, clear questions
    if (!projectId && !projectDisplayName) {
      console.log('📋 No project selected, clearing Q&A questions');
      set({
        questions: [],
        isLoading: false,
        error: null
      });
      return;
    }

    try {
      console.log('📋 Loading Q&A questions from Supabase:', {
        projectId: projectId,
        projectDisplayName: projectDisplayName,
        table: 'qa_audit',
        hasCredentials: isSupabaseConfigured()
      });

      // Try to query by project_id first (UUID), then by project_name (display name)
      let data: any[] | null = null;
      let error: any = null;

      // First, try by project_id (UUID)
      if (projectId) {
        const result = await supabase!
          .from('qa_audit')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        data = result.data;
        error = result.error;

        console.log('📋 Q&A query by project_id result:', {
          projectId: projectId,
          dataCount: data?.length || 0,
          error: error
        });
      }

      // If no data found by UUID, try by project_name (display name)
      if ((!data || data.length === 0) && projectDisplayName) {
        const result = await supabase!
          .from('qa_audit')
          .select('*')
          .eq('project_name', projectDisplayName)
          .order('created_at', { ascending: false });

        data = result.data;
        error = result.error;

        console.log('📋 Q&A query by project_name result:', {
          projectDisplayName: projectDisplayName,
          dataCount: data?.length || 0,
          error: error
        });
      }

      console.log('📋 Q&A final query result:', {
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
          projectId: projectId
        });

        // PGRST116 means "no rows found" for .single() queries - not an error for our use case
        // Only show table config error if table truly doesn't exist (42P01) or permission denied
        if (error.code === '42P01' || error.message.includes('relation') && error.message.includes('does not exist')) {
          console.warn('⚠️ The qa_audit table does not exist in Supabase. Check the database structure.');
          set({
            questions: [],
            isLoading: false,
            error: 'The Q&A table is not configured. Contact the administrator.'
          });
          return;
        }

        // For other errors, throw to be handled by catch block
        throw error;
      }

      // No error - set questions (empty array is valid for projects with no Q&A data)
      set({
        questions: (data || []).map((item: any) => mapQAAuditToQAQuestion(item)),
        isLoading: false,
        error: null
      });

      console.log('📋 Q&A loaded successfully:', {
        projectId,
        questionCount: data?.length || 0
      });
    } catch (error) {
      console.error('Error loading Q&A questions:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error loading questions';

      // Check if it's truly a table-not-found error (PostgreSQL error code 42P01)
      const isTableNotFound = error instanceof Error && (
        errorMessage.includes('42P01') ||
        (errorMessage.includes('relation') && errorMessage.includes('does not exist'))
      );

      if (isTableNotFound) {
        console.warn('⚠️ qa_audit table not found. Verify it exists in Supabase.');
        set({
          error: 'The Q&A table is not configured. Contact the administrator.',
          isLoading: false,
          questions: []
        });
        return;
      }

      // For generic errors, show the message but don't treat empty data as an error
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
      // Get the actual UUID from global store
      const activeProjectId = useProjectStore.getState().activeProjectId;
      const currentProjectId = get().selectedProjectId || activeProjectId;

      // Use correct DB column names
      const { data, error } = await (supabase!
        .from('qa_audit') as any)
        .insert([{
          project_id: question.project_id || currentProjectId,  // UUID del proyecto
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

  // Load requirement details for a linked requirement
  loadRequirementDetails: async (requirementId: string): Promise<RequirementDetails | null> => {
    if (!isSupabaseConfigured() || !requirementId) {
      return null;
    }

    // Check cache first
    const cached = get().requirementCache[requirementId];
    if (cached) {
      return cached;
    }

    // Check if already loading
    const { loadingRequirements } = get();
    if (loadingRequirements.has(requirementId)) {
      return null;
    }

    // Mark as loading
    set(state => ({
      loadingRequirements: new Set([...state.loadingRequirements, requirementId])
    }));

    try {
      const { data, error } = await (supabase! as any)
        .from('rfq_items_master')
        .select('id, requirement_text, evaluation_type, phase')
        .eq('id', requirementId)
        .single();

      if (error) {
        console.error('Error loading requirement details:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      const requirement: RequirementDetails = {
        id: data.id,
        requirement_text: data.requirement_text,
        evaluation_type: data.evaluation_type,
        phase: data.phase
      };

      // Cache the result
      set(state => ({
        requirementCache: { ...state.requirementCache, [requirementId]: requirement },
        loadingRequirements: new Set([...state.loadingRequirements].filter(id => id !== requirementId))
      }));

      return requirement;
    } catch (error) {
      console.error('Error loading requirement details:', error);
      set(state => ({
        loadingRequirements: new Set([...state.loadingRequirements].filter(id => id !== requirementId))
      }));
      return null;
    }
  },

  // Get requirement details from cache (sync)
  getRequirementDetails: (requirementId: string): RequirementDetails | null => {
    return get().requirementCache[requirementId] || null;
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
  subscribeToChanges: (projectIdParam?: string) => {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase not configured. Realtime updates disabled.');
      return;
    }

    // Get project info from global store
    const activeProjectId = useProjectStore.getState().activeProjectId;
    const projectId = projectIdParam || activeProjectId;

    if (!projectId) {
      console.warn('⚠️ No project ID available for realtime subscription.');
      return;
    }

    // Unsubscribe from previous channel if exists
    const existingChannel = get().realtimeChannel;
    if (existingChannel) {
      supabase!.removeChannel(existingChannel);
    }

    // Subscribe to changes for both project_id and project_name columns
    const channel = supabase!
      .channel(`qa-changes-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'qa_audit',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('Q&A change received (project_id):', payload);
          get().loadQuestions();
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

  // Notifications - Load from database
  loadNotifications: async (projectIdParam?: string) => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const activeProjectId = useProjectStore.getState().activeProjectId;
    const projectId = projectIdParam || activeProjectId;

    if (!projectId) {
      set({ notifications: [], unreadNotificationCount: 0 });
      return;
    }

    set({ notificationsLoading: true });

    try {
      const { data, error } = await supabase!
        .from('qa_notifications')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        set({ notificationsLoading: false });
        return;
      }

      const notifications = (data || []) as QANotification[];
      const unreadCount = notifications.filter(n => !n.is_read).length;

      set({
        notifications,
        unreadNotificationCount: unreadCount,
        notificationsLoading: false
      });
    } catch (error) {
      console.error('Error loading notifications:', error);
      set({ notificationsLoading: false });
    }
  },

  // Mark a single notification as read
  markNotificationRead: async (notificationId: string) => {
    if (!isSupabaseConfigured()) return;

    try {
      const { error } = await supabase!
        .from('qa_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() } as unknown as never)
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      set(state => ({
        notifications: state.notifications.map(n =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        ),
        unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1)
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  // Mark all notifications as read
  markAllNotificationsRead: async () => {
    if (!isSupabaseConfigured()) return;

    const activeProjectId = useProjectStore.getState().activeProjectId;
    if (!activeProjectId) return;

    try {
      const { error } = await supabase!
        .from('qa_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() } as unknown as never)
        .eq('project_id', activeProjectId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })),
        unreadNotificationCount: 0
      }));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },

  // Subscribe to notification changes
  subscribeToNotifications: (projectIdParam?: string) => {
    if (!isSupabaseConfigured()) return;

    const activeProjectId = useProjectStore.getState().activeProjectId;
    const projectId = projectIdParam || activeProjectId;

    if (!projectId) return;

    // Unsubscribe from previous channel
    const existingChannel = get().notificationsChannel;
    if (existingChannel) {
      supabase!.removeChannel(existingChannel);
    }

    const channel = supabase!
      .channel(`qa-notifications-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'qa_notifications',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('🔔 New notification received:', payload);
          const newNotification = payload.new as QANotification;
          set(state => ({
            notifications: [newNotification, ...state.notifications],
            unreadNotificationCount: state.unreadNotificationCount + 1
          }));
        }
      )
      .subscribe();

    set({ notificationsChannel: channel });
  },

  // Unsubscribe from notification changes
  unsubscribeFromNotifications: () => {
    const { notificationsChannel } = get();
    if (notificationsChannel && isSupabaseConfigured()) {
      supabase!.removeChannel(notificationsChannel);
      set({ notificationsChannel: null });
    }
  },

  // Reset completo
  reset: () => {
    get().unsubscribeFromChanges();
    get().unsubscribeFromNotifications();
    set({
      questions: [],
      isLoading: false,
      error: null,
      filters: initialFilters,
      selectedProjectId: null,
      realtimeChannel: null,
      notificationsChannel: null,
      notifications: [],
      unreadNotificationCount: 0,
    });
  },
}));
