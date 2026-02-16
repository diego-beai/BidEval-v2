import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sanitizeText } from '../utils/sanitize';
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
  createFollowUpQuestion: (parentQuestionId: string, questionText: string) => Promise<void>;
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
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
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
    parent_question_id: dbItem.parent_question_id, // For thread/conversation support
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
      set({
        questions: [],
        isLoading: false,
        error: null
      });
      return;
    }

    // If no project selected, clear questions
    if (!projectId && !projectDisplayName) {
      set({
        questions: [],
        isLoading: false,
        error: null
      });
      return;
    }

    try {
      // Query by project_id (UUID)
      let data: any[] | null = null;
      let error: any = null;

      if (projectId) {
        const result = await supabase!
          .from('qa_audit')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        data = result.data;
        error = result.error;
      }

      if (error) {
        // Only log, never show query errors to user — empty state handles it
      }

      set({
        questions: (data || []).map((item: any) => mapQAAuditToQAQuestion(item)),
        isLoading: false,
        error: null
      });
    } catch (err: any) {
      set({
        error: null,
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
          question: sanitizeText(question.question || question.pregunta_texto),
          status: question.status || question.estado || 'Draft',
          importance: question.importance || question.importancia || 'Medium',
          requirement_id: question.requirement_id || null, // Link to source requirement
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
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      });
    }
  },

  // Crear pregunta de seguimiento (para hilos de conversación)
  createFollowUpQuestion: async (parentQuestionId: string, questionText: string) => {
    if (!isSupabaseConfigured()) {
      set({ error: null });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Get the parent question to copy its properties
      const parentQuestion = get().questions.find(q => q.id === parentQuestionId);
      if (!parentQuestion) {
        throw new Error('Parent question not found');
      }

      // Get the actual UUID from global store
      const activeProjectId = useProjectStore.getState().activeProjectId;
      const currentProjectId = get().selectedProjectId || activeProjectId;

      // Create follow-up question with same project, provider, discipline as parent
      const { data, error } = await (supabase!
        .from('qa_audit') as any)
        .insert([{
          project_id: parentQuestion.project_id || currentProjectId,
          provider_name: parentQuestion.provider_name || parentQuestion.proveedor,
          discipline: parentQuestion.discipline || parentQuestion.disciplina,
          question: sanitizeText(questionText),
          status: 'Draft', // Follow-up starts as Draft, needs approval before sending
          importance: parentQuestion.importance || parentQuestion.importancia || 'Medium',
          requirement_id: parentQuestion.requirement_id || null, // Inherit requirement from parent
          parent_question_id: parentQuestionId,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Also update the parent question status to NeedsMoreInfo
      await (supabase!
        .from('qa_audit') as any)
        .update({ status: 'NeedsMoreInfo' })
        .eq('id', parentQuestionId);

      // Map the returned data to include both English and Spanish field aliases
      const mappedData = mapQAAuditToQAQuestion(data);

      // Update state: change parent status and add new follow-up question
      const currentQuestions = get().questions;
      const updatedQuestions: QAQuestion[] = currentQuestions.map(q =>
        q.id === parentQuestionId
          ? { ...q, status: 'NeedsMoreInfo' as EstadoPregunta, estado: 'NeedsMoreInfo' as EstadoPregunta }
          : q
      );
      updatedQuestions.push(mappedData);

      set({
        questions: updatedQuestions,
        isLoading: false
      });
    } catch (error) {
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
        updateData.question = sanitizeText(updates.question || updates.pregunta_texto);
      }
      if (updates.status || updates.estado) {
        updateData.status = updates.status || updates.estado;
      }
      if (updates.importance !== undefined || updates.importancia !== undefined) {
        updateData.importance = updates.importance || updates.importancia;
      }
      if (updates.response || updates.respuesta_proveedor) {
        updateData.response = sanitizeText(updates.response || updates.respuesta_proveedor);
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

    if (!ids || ids.length === 0) {
      set({ isLoading: false, error: null });
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

    const clearLoading = () => {
      set(state => ({
        loadingRequirements: new Set([...state.loadingRequirements].filter(id => id !== requirementId))
      }));
    };

    try {
      const { data, error } = await (supabase! as any)
        .from('rfq_items_master')
        .select('id, requirement_text, evaluation_type, phase')
        .eq('id', requirementId)
        .single();

      if (error) {
        clearLoading();
        return null;
      }

      if (!data) {
        clearLoading();
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
      clearLoading();
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

    // Get unique disciplines from actual questions (don't show empty disciplines)
    const uniqueDisciplines = Array.from(
      new Set(filteredQuestions.map(q => q.disciplina || q.discipline))
    ).filter(Boolean) as Disciplina[];

    // If no questions, return empty array (no disciplines to show)
    if (uniqueDisciplines.length === 0) {
      return [];
    }

    return uniqueDisciplines.map(disciplina => {
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
  // FIX: js-combine-iterations — single pass instead of 3 separate filter() loops
  getStats: () => {
    const questions = get().getFilteredQuestions();

    const porEstado = {} as Record<EstadoPregunta, number>;
    const porDisciplina = {} as Record<Disciplina, number>;
    const porImportancia = {} as Record<Importancia, number>;

    // Initialize estado counts
    const estados: EstadoPregunta[] = ['Draft', 'Pending', 'Approved', 'Sent', 'Answered', 'Discarded'];
    for (const e of estados) porEstado[e] = 0;
    const importancias: Importancia[] = ['High', 'Medium', 'Low'];
    for (const i of importancias) porImportancia[i] = 0;

    // Single pass: count all dimensions at once
    for (const q of questions) {
      const estado = (q.estado || q.status) as EstadoPregunta;
      if (estado) porEstado[estado] = (porEstado[estado] || 0) + 1;

      const disc = (q.disciplina || q.discipline) as Disciplina;
      if (disc) porDisciplina[disc] = (porDisciplina[disc] || 0) + 1;

      const imp = (q.importancia || q.importance) as Importancia;
      if (imp) porImportancia[imp] = (porImportancia[imp] || 0) + 1;
    }

    return {
      total: questions.length,
      porEstado,
      porDisciplina,
      porImportancia,
    };
  },

  // Suscribirse a cambios en tiempo real
  subscribeToChanges: (projectIdParam?: string) => {
    if (!isSupabaseConfigured()) {
      return;
    }

    // Get project info from global store
    const activeProjectId = useProjectStore.getState().activeProjectId;
    const projectId = projectIdParam || activeProjectId;

    if (!projectId) {
      return;
    }

    // Unsubscribe from previous channel if exists
    const existingChannel = get().realtimeChannel;
    if (existingChannel) {
      supabase!.removeChannel(existingChannel);
    }

    // Subscribe to changes for project_id
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
        () => {
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
        return;
      }

      set(state => ({
        notifications: state.notifications.map(n =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        ),
        unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1)
      }));
    } catch (error) {
      // ignored
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
        return;
      }

      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })),
        unreadNotificationCount: 0
      }));
    } catch (error) {
      // ignored
    }
  },

  // Delete a single notification
  deleteNotification: async (notificationId: string) => {
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!
          .from('qa_notifications')
          .delete()
          .eq('id', notificationId);

        if (error) {
          return;
        }
      }

      set(state => {
        const notification = state.notifications.find(n => n.id === notificationId);
        const wasUnread = notification && !notification.is_read;
        return {
          notifications: state.notifications.filter(n => n.id !== notificationId),
          unreadNotificationCount: wasUnread
            ? Math.max(0, state.unreadNotificationCount - 1)
            : state.unreadNotificationCount
        };
      });
    } catch (error) {
      // ignored
    }
  },

  // Clear all notifications
  clearAllNotifications: async () => {
    try {
      const activeProjectId = useProjectStore.getState().activeProjectId;
      if (!activeProjectId) return;

      if (isSupabaseConfigured()) {
        const { error } = await supabase!
          .from('qa_notifications')
          .delete()
          .eq('project_id', activeProjectId);

        if (error) {
          return;
        }
      }

      set({
        notifications: [],
        unreadNotificationCount: 0
      });
    } catch (error) {
      // ignored
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
