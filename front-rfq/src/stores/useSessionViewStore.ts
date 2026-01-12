import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store para trackear cuándo el usuario vio por última vez cada módulo
 * Esto permite mostrar indicadores solo cuando hay contenido nuevo no visto
 */

interface SessionView {
  lastViewedAt: number; // timestamp
  lastContentUpdate: number; // timestamp del último cambio de contenido
}

interface SessionViewState {
  sessions: Record<string, SessionView>;

  // Marcar un módulo como visto (el usuario acaba de entrar)
  markAsViewed: (module: string) => void;

  // Actualizar el timestamp de contenido (hubo cambios en el módulo)
  updateContent: (module: string) => void;

  // Verificar si hay contenido no visto
  hasUnreadContent: (module: string) => boolean;

  // Reset para debugging
  reset: () => void;
}

export const useSessionViewStore = create<SessionViewState>()(
  persist(
    (set, get) => ({
      sessions: {},

      markAsViewed: (module: string) => {
        const now = Date.now();
        set((state) => ({
          sessions: {
            ...state.sessions,
            [module]: {
              ...state.sessions[module],
              lastViewedAt: now,
              lastContentUpdate: state.sessions[module]?.lastContentUpdate || now
            }
          }
        }));
      },

      updateContent: (module: string) => {
        const now = Date.now();
        set((state) => ({
          sessions: {
            ...state.sessions,
            [module]: {
              lastViewedAt: state.sessions[module]?.lastViewedAt || 0,
              lastContentUpdate: now
            }
          }
        }));
      },

      hasUnreadContent: (module: string) => {
        const session = get().sessions[module];
        if (!session) return true; // Si nunca se vio, es "no visto"

        // Hay contenido no visto si la última actualización es posterior a la última vista
        return session.lastContentUpdate > session.lastViewedAt;
      },

      reset: () => set({ sessions: {} })
    }),
    {
      name: 'session-view-storage'
    }
  )
);
