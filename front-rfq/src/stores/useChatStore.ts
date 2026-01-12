import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ChatMessage, ChatRole, ChatStatus } from '../types/chat.types';
import { sendChatMessage } from '../services/chat.service';
import { useSessionViewStore } from './useSessionViewStore';

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

  // Acciones
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  setError: (error: string | null) => void;
  markAsRead: () => void;
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
          error: null
        }),

        setError: (error) => set({ error })
      }),
      {
        name: 'chat-store',
        // Solo persistir mensajes y sessionId
        partialize: (state) => ({
          messages: state.messages,
          sessionId: state.sessionId
        })
      }
    ),
    { name: 'ChatStore' }
  )
);
