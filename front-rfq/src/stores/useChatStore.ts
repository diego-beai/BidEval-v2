import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { ChatMessage, ChatRole, ChatStatus } from '../types/chat.types';
import { sendChatMessage, getChatHistory, getLastActiveSession } from '../services/chat.service';
import { useSessionViewStore } from './useSessionViewStore';
import { useActivityStore, ActivityType, ActivityStatus } from './useActivityStore';
import { useProjectStore } from './useProjectStore';

/**
 * Conversación almacenada por proyecto
 */
interface ProjectConversation {
  messages: ChatMessage[];
  sessionId: string | null;
  lastUpdated: number; // timestamp para ordenar
}

/**
 * Estado del chat
 */
interface ChatState {
  // Estado
  isOpen: boolean;
  messages: ChatMessage[];
  unreadCount: number;
  status: ChatStatus;
  sessionId: string | null;
  error: string | null;
  historyLoaded: boolean;
  currentProjectId: string | null;

  // Document context for multi-doc querying
  selectedDocumentIds: string[];

  // Mapa de conversaciones por proyecto (projectId -> conversación)
  projectConversations: Record<string, ProjectConversation>;

  // Acciones
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  setError: (error: string | null) => void;
  markAsRead: () => void;
  loadHistory: (sessionId?: string) => Promise<void>;
  setSessionId: (sessionId: string) => void;
  handleProjectChange: (newProjectId: string | null) => void;
  saveCurrentConversation: () => void;
  loadProjectConversation: (projectId: string | null) => void;
  setSelectedDocumentIds: (ids: string[]) => void;
  toggleDocumentId: (id: string) => void;
}

/**
 * Crea un mensaje de chat
 */
function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role,
    content,
    timestamp: new Date()
  };
}

/**
 * Store de Zustand para el chat
 */
export const useChatStore = create<ChatState>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
        isOpen: false,
        messages: [],
        unreadCount: 0,
        status: ChatStatus.IDLE,
        sessionId: null,
        error: null,
        historyLoaded: false,
        currentProjectId: null,
        selectedDocumentIds: [],
        projectConversations: {},

        toggleChat: () => {
          const currentState = get();
          const newIsOpen = !currentState.isOpen;
          set({ isOpen: newIsOpen });
          if (newIsOpen) {
            set({ unreadCount: 0 });
          }
        },

        openChat: () => {
          set({ isOpen: true, unreadCount: 0 });
        },

        closeChat: () => set({ isOpen: false }),

        markAsRead: () => set({ unreadCount: 0 }),

        sendMessage: async (content: string) => {
          const trimmedContent = content.trim();
          if (!trimmedContent) return;

          // Agregar mensaje del usuario
          const userMessage = createMessage(ChatRole.USER, trimmedContent);
          set((state) => ({
            messages: [...state.messages, userMessage],
            status: ChatStatus.SENDING,
            error: null
          }));

          try {
            // Obtener el proyecto activo para filtrar las respuestas del chat
            const activeProjectId = useProjectStore.getState().activeProjectId;

            // Enviar mensaje a n8n con el project_id y document_ids
            const selectedDocs = get().selectedDocumentIds;
            const { response, sessionId } = await sendChatMessage(
              trimmedContent,
              get().sessionId || undefined,
              activeProjectId,
              selectedDocs.length > 0 ? selectedDocs : undefined
            );

            // Agregar respuesta del asistente
            const assistantMessage = createMessage(ChatRole.ASSISTANT, response);
            const currentState = get();

            const newMessages = [...currentState.messages, assistantMessage];

            set((state) => ({
              messages: newMessages,
              status: ChatStatus.IDLE,
              sessionId,
              // Incrementar unread si el chat está cerrado
              unreadCount: currentState.isOpen ? state.unreadCount : state.unreadCount + 1
            }));

            // Guardar la conversación actualizada para el proyecto actual
            const projectId = currentState.currentProjectId;
            if (projectId) {
              set((state) => ({
                projectConversations: {
                  ...state.projectConversations,
                  [projectId]: {
                    messages: newMessages,
                    sessionId,
                    lastUpdated: Date.now()
                  }
                }
              }));
            }

            // Notificar que hay contenido nuevo en el chat
            useSessionViewStore.getState().updateContent('chat');

            // Registrar actividad de chat
            useActivityStore.getState().addActivity({
              type: ActivityType.CHAT,
              status: ActivityStatus.COMPLETED,
              title: 'Conversación de chat',
              description: trimmedContent.substring(0, 50) + (trimmedContent.length > 50 ? '...' : ''),
              relatedId: sessionId,
              relatedType: 'chat_session',
              metadata: {
                userMessage: trimmedContent.substring(0, 100),
                responsePreview: response.substring(0, 100)
              }
            });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            set({
              status: ChatStatus.ERROR,
              error: errorMessage
            });

            // Agregar mensaje de error
            const errorChatMessage = createMessage(
              ChatRole.SYSTEM,
              `Error: ${errorMessage}`
            );
            set((state) => ({
              messages: [...state.messages, errorChatMessage]
            }));
          }
        },

        clearMessages: () => {
          const state = get();
          const projectId = state.currentProjectId;

          // Limpiar también del mapa de conversaciones
          if (projectId) {
            const { [projectId]: _, ...remainingConversations } = state.projectConversations;
            set({
              messages: [],
              sessionId: null,
              status: ChatStatus.IDLE,
              error: null,
              historyLoaded: true,
              projectConversations: remainingConversations
            });
          } else {
            set({
              messages: [],
              sessionId: null,
              status: ChatStatus.IDLE,
              error: null,
              historyLoaded: true
            });
          }
        },

        setError: (error) => set({ error }),

        setSessionId: (sessionId) => set({ sessionId }),

        loadHistory: async (sessionIdParam?: string) => {
          const state = get();

          // Si ya se cargó el historial, no volver a cargar
          if (state.historyLoaded && state.messages.length > 0) {
            return;
          }

          set({ status: ChatStatus.CONNECTING });

          try {
            // Usar sessionId proporcionado o buscar la última sesión activa
            let targetSessionId = sessionIdParam || state.sessionId;

            if (!targetSessionId) {
              // Buscar la última sesión activa en Supabase
              targetSessionId = await getLastActiveSession();
            }

            if (!targetSessionId) {
              // No hay sesión previa, iniciar una nueva
              set({
                status: ChatStatus.IDLE,
                historyLoaded: true
              });
              return;
            }

            // Cargar historial de la sesión
            const history = await getChatHistory(targetSessionId);

            if (history.length > 0) {
              set({
                messages: history,
                sessionId: targetSessionId,
                status: ChatStatus.IDLE,
                historyLoaded: true
              });
            } else {
              set({
                status: ChatStatus.IDLE,
                historyLoaded: true,
                sessionId: targetSessionId
              });
            }
          } catch (error) {
            console.error('[ChatStore] Error cargando historial:', error);
            set({
              status: ChatStatus.ERROR,
              error: 'Error al cargar historial',
              historyLoaded: true
            });
          }
        },

        // Guarda la conversación actual en el mapa de proyectos
        saveCurrentConversation: () => {
          const state = get();
          const projectId = state.currentProjectId;

          if (projectId && state.messages.length > 0) {
            console.log('[ChatStore] Guardando conversación para proyecto:', projectId, '- Mensajes:', state.messages.length);
            set({
              projectConversations: {
                ...state.projectConversations,
                [projectId]: {
                  messages: state.messages,
                  sessionId: state.sessionId,
                  lastUpdated: Date.now()
                }
              }
            });
          }
        },

        // Carga la conversación de un proyecto específico
        loadProjectConversation: (projectId: string | null) => {
          const state = get();

          if (!projectId) {
            console.log('[ChatStore] No hay proyecto, limpiando chat');
            set({
              messages: [],
              sessionId: null,
              currentProjectId: null,
              selectedDocumentIds: [],
              status: ChatStatus.IDLE,
              error: null,
              historyLoaded: true,
              unreadCount: 0
            });
            return;
          }

          const savedConversation = state.projectConversations[projectId];

          if (savedConversation && savedConversation.messages.length > 0) {
            console.log('[ChatStore] Cargando conversación guardada para proyecto:', projectId, '- Mensajes:', savedConversation.messages.length);
            set({
              messages: savedConversation.messages,
              sessionId: savedConversation.sessionId,
              currentProjectId: projectId,
              status: ChatStatus.IDLE,
              error: null,
              historyLoaded: true,
              unreadCount: 0
            });
          } else {
            console.log('[ChatStore] No hay conversación guardada para proyecto:', projectId, '- Iniciando nueva');
            set({
              messages: [],
              sessionId: null,
              currentProjectId: projectId,
              status: ChatStatus.IDLE,
              error: null,
              historyLoaded: true,
              unreadCount: 0
            });
          }
        },

        setSelectedDocumentIds: (ids: string[]) => {
          set({ selectedDocumentIds: ids });
        },

        toggleDocumentId: (id: string) => {
          const current = get().selectedDocumentIds;
          if (current.includes(id)) {
            set({ selectedDocumentIds: current.filter(d => d !== id) });
          } else {
            set({ selectedDocumentIds: [...current, id] });
          }
        },

        handleProjectChange: (newProjectId: string | null) => {
          const state = get();

          // Solo actuar si el proyecto cambió
          if (state.currentProjectId !== newProjectId) {
            console.log('[ChatStore] Proyecto cambió de', state.currentProjectId, 'a', newProjectId);

            // 1. Guardar la conversación actual antes de cambiar
            if (state.currentProjectId && state.messages.length > 0) {
              state.saveCurrentConversation();
            }

            // 2. Cargar la conversación del nuevo proyecto (o limpiar si no hay)
            state.loadProjectConversation(newProjectId);
          }
        }
      }),
      {
        name: 'chat-store',
        // Persistir mensajes, sessionId, proyecto actual y mapa de conversaciones
        partialize: (state) => ({
          messages: state.messages,
          sessionId: state.sessionId,
          currentProjectId: state.currentProjectId,
          projectConversations: state.projectConversations
        }),
        // Sanitizar mensajes y verificar proyecto al rehidratar desde localStorage
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Verificar si el proyecto del chat coincide con el proyecto activo
            const activeProjectId = useProjectStore.getState().activeProjectId;

            console.log('[ChatStore] Rehidratando - Proyecto del chat:', state.currentProjectId);
            console.log('[ChatStore] Rehidratando - Proyecto activo:', activeProjectId);
            console.log('[ChatStore] Rehidratando - Conversaciones guardadas:', Object.keys(state.projectConversations || {}));

            // Si el proyecto cambió, cargar la conversación correcta
            if (state.currentProjectId !== activeProjectId) {
              console.log('[ChatStore] Proyecto no coincide, cargando conversación del proyecto activo');

              // Buscar si hay conversación guardada para el proyecto activo
              if (activeProjectId && state.projectConversations?.[activeProjectId]) {
                const savedConv = state.projectConversations[activeProjectId];
                state.messages = savedConv.messages;
                state.sessionId = savedConv.sessionId;
                state.currentProjectId = activeProjectId;
              } else {
                // No hay conversación guardada, limpiar
                state.messages = [];
                state.sessionId = null;
                state.currentProjectId = activeProjectId;
              }
              state.historyLoaded = true;
              return;
            }

            // Filtrar mensajes con contenido inválido
            if (state.messages) {
              const validMessages = state.messages.filter(msg => {
                try {
                  return typeof msg.content === 'string' && msg.content.length > 0;
                } catch {
                  return false;
                }
              });
              if (validMessages.length !== state.messages.length) {
                console.warn('Se limpiaron mensajes de chat inválidos');
                state.messages = validMessages;
              }
            }

            // Limpiar conversaciones con mensajes inválidos en el mapa
            if (state.projectConversations) {
              for (const projectId of Object.keys(state.projectConversations)) {
                const conv = state.projectConversations[projectId];
                if (conv.messages) {
                  const validMessages = conv.messages.filter(msg => {
                    try {
                      return typeof msg.content === 'string' && msg.content.length > 0;
                    } catch {
                      return false;
                    }
                  });
                  conv.messages = validMessages;
                }
              }
            }
          }
        }
      }
      )
    ),
    { name: 'ChatStore' }
  )
);

// Suscribirse a cambios del proyecto activo
// Cuando el proyecto cambie, guardar la conversación actual y cargar la del nuevo proyecto
let _chatProjectChangeTimeout: ReturnType<typeof setTimeout> | null = null;
useProjectStore.subscribe(
  (state) => state.activeProjectId,
  (newProjectId) => {
    if (_chatProjectChangeTimeout) clearTimeout(_chatProjectChangeTimeout);
    _chatProjectChangeTimeout = setTimeout(() => {
      useChatStore.getState().handleProjectChange(newProjectId);
      _chatProjectChangeTimeout = null;
    }, 50);
  }
);

// Verificación inicial al cargar la app
// Esperar un momento para que ambos stores estén hidratados
setTimeout(() => {
  const chatState = useChatStore.getState();
  const activeProjectId = useProjectStore.getState().activeProjectId;

  if (chatState.currentProjectId !== activeProjectId) {
    console.log('[ChatStore] Verificación inicial: proyecto no coincide, cargando conversación correcta');
    useChatStore.getState().handleProjectChange(activeProjectId);
  }
}, 100);
