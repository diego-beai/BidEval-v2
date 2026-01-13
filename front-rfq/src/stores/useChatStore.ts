import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ChatMessage, ChatRole, ChatStatus } from '../types/chat.types';
import { sendChatMessage, getChatHistory, getLastActiveSession } from '../services/chat.service';
import { useSessionViewStore } from './useSessionViewStore';
import { useActivityStore, ActivityType, ActivityStatus } from './useActivityStore';

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
    persist(
      (set, get) => ({
        isOpen: false,
        messages: [],
        unreadCount: 0,
        status: ChatStatus.IDLE,
        sessionId: null,
        error: null,
        historyLoaded: false,

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
            // Enviar mensaje a n8n
            const { response, sessionId } = await sendChatMessage(
              trimmedContent,
              get().sessionId || undefined
            );

            // Agregar respuesta del asistente
            const assistantMessage = createMessage(ChatRole.ASSISTANT, response);
            const currentState = get();
            set((state) => ({
              messages: [...state.messages, assistantMessage],
              status: ChatStatus.IDLE,
              sessionId,
              // Incrementar unread si el chat está cerrado
              unreadCount: currentState.isOpen ? state.unreadCount : state.unreadCount + 1
            }));

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

        clearMessages: () => set({
          messages: [],
          sessionId: null,
          status: ChatStatus.IDLE,
          error: null,
          historyLoaded: true // Mantener en true para no recargar historial anterior
        }),

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
        }
      }),
      {
        name: 'chat-store',
        // Solo persistir mensajes y sessionId
        partialize: (state) => ({
          messages: state.messages,
          sessionId: state.sessionId
        }),
        // Sanitizar mensajes al rehidratar desde localStorage
        onRehydrateStorage: () => (state) => {
          if (state?.messages) {
            // Filtrar mensajes con contenido inválido
            const validMessages = state.messages.filter(msg => {
              try {
                // Verificar que el contenido sea un string válido
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
        }
      }
    ),
    { name: 'ChatStore' }
  )
);
