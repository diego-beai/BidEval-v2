import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Background Process Types
 */
export enum ProcessType {
  EMAIL = 'email',
  CHAT = 'chat',
  UPLOAD = 'upload',
  ANALYSIS = 'analysis',
  EXPORT = 'export'
}

export enum ProcessStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error'
}

/**
 * Background Process Interface
 */
export interface BackgroundProcess {
  id: string;
  type: ProcessType;
  status: ProcessStatus;
  progress: number; // 0-100
  title: string;
  description?: string;
  startedAt: number;
  lastUpdated: number;
  completedAt?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Chat Conversation Interface
 */
export interface ChatConversation {
  id: string;
  title: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
  }>;
  createdAt: number;
  lastUpdated: number;
  metadata?: Record<string, any>;
}

/**
 * Email Process Interface
 */
export interface EmailProcess {
  id: string;
  subject: string;
  from?: string;
  to?: string;
  status: ProcessStatus;
  processedAt?: number;
  result?: any;
  metadata?: Record<string, any>;
}

/**
 * Active View State Interface
 */
export interface ViewState {
  currentView: string;
  previousView?: string;
  viewData?: Record<string, any>;
  scrollPosition?: number;
}

/**
 * Session Store State Interface
 */
interface SessionState {
  // Background Processes
  backgroundProcesses: BackgroundProcess[];
  addBackgroundProcess: (process: Omit<BackgroundProcess, 'id' | 'startedAt' | 'lastUpdated'>) => string;
  updateBackgroundProcess: (id: string, updates: Partial<BackgroundProcess>) => void;
  removeBackgroundProcess: (id: string) => void;
  getBackgroundProcess: (id: string) => BackgroundProcess | undefined;
  clearCompletedProcesses: () => void;

  // Chat Conversations
  chatConversations: Record<string, ChatConversation>;
  activeConversationId: string | null;
  createConversation: (title?: string) => string;
  addMessageToConversation: (conversationId: string, role: 'user' | 'assistant' | 'system', content: string) => void;
  updateConversation: (conversationId: string, updates: Partial<ChatConversation>) => void;
  deleteConversation: (conversationId: string) => void;
  setActiveConversation: (conversationId: string | null) => void;
  getConversation: (conversationId: string) => ChatConversation | undefined;

  // Email Processes
  emailProcesses: Record<string, EmailProcess>;
  addEmailProcess: (email: Omit<EmailProcess, 'id'>) => string;
  updateEmailProcess: (id: string, updates: Partial<EmailProcess>) => void;
  deleteEmailProcess: (id: string) => void;
  getEmailProcess: (id: string) => EmailProcess | undefined;

  // View State Management
  viewState: ViewState;
  setCurrentView: (view: string, data?: Record<string, any>) => void;
  setPreviousView: (view: string) => void;
  setScrollPosition: (position: number) => void;

  // Session Management
  sessionId: string;
  sessionStartTime: number;
  lastActivityTime: number;
  updateActivity: () => void;
  clearSession: () => void;
}

/**
 * Generate unique ID
 */
const generateId = () => `${Date.now()}-${crypto.randomUUID()}`;

/**
 * Session Store with Persistence
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial State
      backgroundProcesses: [],
      chatConversations: {},
      activeConversationId: null,
      emailProcesses: {},
      viewState: {
        currentView: 'home',
        previousView: undefined,
        viewData: undefined,
        scrollPosition: 0
      },
      sessionId: generateId(),
      sessionStartTime: Date.now(),
      lastActivityTime: Date.now(),

      // Background Process Actions
      addBackgroundProcess: (process) => {
        const id = generateId();
        const newProcess: BackgroundProcess = {
          ...process,
          id,
          startedAt: Date.now(),
          lastUpdated: Date.now()
        };

        set((state) => ({
          backgroundProcesses: [...state.backgroundProcesses, newProcess]
        }));

        return id;
      },

      updateBackgroundProcess: (id, updates) => {
        set((state) => ({
          backgroundProcesses: state.backgroundProcesses.map((p) =>
            p.id === id
              ? { ...p, ...updates, lastUpdated: Date.now() }
              : p
          )
        }));
      },

      removeBackgroundProcess: (id) => {
        set((state) => ({
          backgroundProcesses: state.backgroundProcesses.filter((p) => p.id !== id)
        }));
      },

      getBackgroundProcess: (id) => {
        return get().backgroundProcesses.find((p) => p.id === id);
      },

      clearCompletedProcesses: () => {
        set((state) => ({
          backgroundProcesses: state.backgroundProcesses.filter(
            (p) => p.status !== ProcessStatus.COMPLETED && p.status !== ProcessStatus.ERROR
          )
        }));
      },

      // Chat Conversation Actions
      createConversation: (title) => {
        const id = generateId();
        const conversation: ChatConversation = {
          id,
          title: title || `Conversation ${Object.keys(get().chatConversations).length + 1}`,
          messages: [],
          createdAt: Date.now(),
          lastUpdated: Date.now()
        };

        set((state) => ({
          chatConversations: {
            ...state.chatConversations,
            [id]: conversation
          },
          activeConversationId: id
        }));

        return id;
      },

      addMessageToConversation: (conversationId, role, content) => {
        const conversation = get().chatConversations[conversationId];
        if (!conversation) {
          return;
        }

        const messageId = generateId();
        const message = {
          id: messageId,
          role,
          content,
          timestamp: Date.now()
        };

        set((state) => ({
          chatConversations: {
            ...state.chatConversations,
            [conversationId]: {
              ...conversation,
              messages: [...conversation.messages, message],
              lastUpdated: Date.now()
            }
          }
        }));

      },

      updateConversation: (conversationId, updates) => {
        const conversation = get().chatConversations[conversationId];
        if (!conversation) {
          return;
        }

        set((state) => ({
          chatConversations: {
            ...state.chatConversations,
            [conversationId]: {
              ...conversation,
              ...updates,
              lastUpdated: Date.now()
            }
          }
        }));

      },

      deleteConversation: (conversationId) => {
        const { [conversationId]: deleted, ...rest } = get().chatConversations;

        set((state) => ({
          chatConversations: rest,
          activeConversationId:
            state.activeConversationId === conversationId ? null : state.activeConversationId
        }));

      },

      setActiveConversation: (conversationId) => {
        set({ activeConversationId: conversationId });
      },

      getConversation: (conversationId) => {
        return get().chatConversations[conversationId];
      },

      // Email Process Actions
      addEmailProcess: (email) => {
        const id = generateId();
        const emailProcess: EmailProcess = {
          ...email,
          id
        };

        set((state) => ({
          emailProcesses: {
            ...state.emailProcesses,
            [id]: emailProcess
          }
        }));

        return id;
      },

      updateEmailProcess: (id, updates) => {
        const emailProcess = get().emailProcesses[id];
        if (!emailProcess) {
          return;
        }

        set((state) => ({
          emailProcesses: {
            ...state.emailProcesses,
            [id]: {
              ...emailProcess,
              ...updates
            }
          }
        }));

      },

      deleteEmailProcess: (id) => {
        const { [id]: deleted, ...rest } = get().emailProcesses;

        set({ emailProcesses: rest });
      },

      getEmailProcess: (id) => {
        return get().emailProcesses[id];
      },

      // View State Actions
      setCurrentView: (view, data) => {
        const currentView = get().viewState.currentView;

        set((state) => ({
          viewState: {
            ...state.viewState,
            previousView: currentView,
            currentView: view,
            viewData: data,
            scrollPosition: 0
          }
        }));

      },

      setPreviousView: (view) => {
        set((state) => ({
          viewState: {
            ...state.viewState,
            previousView: view
          }
        }));
      },

      setScrollPosition: (position) => {
        set((state) => ({
          viewState: {
            ...state.viewState,
            scrollPosition: position
          }
        }));
      },

      // Session Management Actions
      updateActivity: () => {
        set({ lastActivityTime: Date.now() });
      },

      clearSession: () => {
        set({
          backgroundProcesses: [],
          chatConversations: {},
          activeConversationId: null,
          emailProcesses: {},
          viewState: {
            currentView: 'home',
            previousView: undefined,
            viewData: undefined,
            scrollPosition: 0
          },
          sessionId: generateId(),
          sessionStartTime: Date.now(),
          lastActivityTime: Date.now()
        });
      }
    }),
    {
      name: 'rfq-session-storage', // Storage key
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for tab-specific persistence
      partialize: (state) => ({
        // Persist everything except session timing
        backgroundProcesses: state.backgroundProcesses,
        chatConversations: state.chatConversations,
        activeConversationId: state.activeConversationId,
        emailProcesses: state.emailProcesses,
        viewState: state.viewState
      })
    }
  )
);

// Auto-update activity on store changes
useSessionStore.subscribe(() => {
  useSessionStore.getState().updateActivity();
});
