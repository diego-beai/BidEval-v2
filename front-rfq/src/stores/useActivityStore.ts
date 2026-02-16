import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Activity Types
 */
export enum ActivityType {
  CHAT = 'chat',
  EMAIL = 'email',
  RFQ_CREATED = 'rfq_created',
  RFQ_UPDATED = 'rfq_updated',
  PROPOSAL_RECEIVED = 'proposal_received',
  PROPOSAL_EVALUATED = 'proposal_evaluated',
  EXPORT = 'export',
  UPLOAD = 'upload',
  ANALYSIS = 'analysis',
  SYSTEM = 'system'
}

/**
 * Activity Status
 */
export enum ActivityStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Activity Interface
 */
export interface Activity {
  id: string;
  type: ActivityType;
  status: ActivityStatus;
  title: string;
  description?: string;
  timestamp: number;
  completedAt?: number;
  metadata?: Record<string, unknown>;
  // Para actividades relacionadas (ej: chat -> conversación específica)
  relatedId?: string;
  relatedType?: string;
}

/**
 * Running Process Interface (procesos en segundo plano activos)
 */
export interface RunningProcess {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  progress: number; // 0-100
  status: 'running' | 'paused' | 'completed' | 'error';
  startedAt: number;
  estimatedCompletion?: number;
  canCancel?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Activity Store State
 */
interface ActivityState {
  // Historial de actividades (últimas 100)
  activities: Activity[];

  // Procesos activos en segundo plano
  runningProcesses: RunningProcess[];

  // Contadores para badges
  unreadCount: number;

  // Acciones de actividades
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => string;
  updateActivity: (id: string, updates: Partial<Activity>) => void;
  markActivityCompleted: (id: string) => void;
  markActivityFailed: (id: string, error?: string) => void;
  clearActivities: () => void;
  getRecentActivities: (limit?: number) => Activity[];
  getActivitiesByType: (type: ActivityType) => Activity[];

  // Acciones de procesos
  startProcess: (process: Omit<RunningProcess, 'id' | 'startedAt'>) => string;
  updateProcess: (id: string, updates: Partial<RunningProcess>) => void;
  completeProcess: (id: string) => void;
  failProcess: (id: string, error?: string) => void;
  cancelProcess: (id: string) => void;
  getRunningProcesses: () => RunningProcess[];

  // Utilidades
  markAllAsRead: () => void;
  getUnreadCount: () => number;
}

/**
 * Genera ID único
 */
const generateId = () => `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Límite de actividades en historial
 */
const MAX_ACTIVITIES = 100;

/**
 * Activity Store con persistencia en localStorage
 */
export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      activities: [],
      runningProcesses: [],
      unreadCount: 0,

      // ========== ACTIVITY ACTIONS ==========

      addActivity: (activity) => {
        const id = generateId();
        const newActivity: Activity = {
          ...activity,
          id,
          timestamp: Date.now(),
          status: activity.status || ActivityStatus.COMPLETED
        };

        set((state) => {
          // Mantener solo las últimas MAX_ACTIVITIES
          const updatedActivities = [newActivity, ...state.activities].slice(0, MAX_ACTIVITIES);
          return {
            activities: updatedActivities,
            unreadCount: state.unreadCount + 1
          };
        });

        return id;
      },

      updateActivity: (id, updates) => {
        set((state) => ({
          activities: state.activities.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          )
        }));
      },

      markActivityCompleted: (id) => {
        set((state) => ({
          activities: state.activities.map((a) =>
            a.id === id
              ? { ...a, status: ActivityStatus.COMPLETED, completedAt: Date.now() }
              : a
          )
        }));
      },

      markActivityFailed: (id, error) => {
        set((state) => ({
          activities: state.activities.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: ActivityStatus.FAILED,
                  completedAt: Date.now(),
                  metadata: { ...a.metadata, error }
                }
              : a
          )
        }));
      },

      clearActivities: () => {
        set({ activities: [], unreadCount: 0 });
      },

      getRecentActivities: (limit = 10) => {
        return get().activities.slice(0, limit);
      },

      getActivitiesByType: (type) => {
        return get().activities.filter((a) => a.type === type);
      },

      // ========== PROCESS ACTIONS ==========

      startProcess: (process) => {
        const id = generateId();
        const newProcess: RunningProcess = {
          ...process,
          id,
          startedAt: Date.now(),
          status: 'running',
          progress: process.progress || 0
        };

        set((state) => ({
          runningProcesses: [...state.runningProcesses, newProcess]
        }));

        // También agregar al historial de actividades
        get().addActivity({
          type: process.type,
          status: ActivityStatus.IN_PROGRESS,
          title: process.title,
          description: process.description,
          relatedId: id,
          relatedType: 'process',
          metadata: process.metadata
        });

        return id;
      },

      updateProcess: (id, updates) => {
        set((state) => ({
          runningProcesses: state.runningProcesses.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          )
        }));
      },

      completeProcess: (id) => {
        const process = get().runningProcesses.find((p) => p.id === id);
        if (!process) return;

        // Actualizar el proceso
        set((state) => ({
          runningProcesses: state.runningProcesses.map((p) =>
            p.id === id ? { ...p, status: 'completed' as const, progress: 100 } : p
          )
        }));

        // Agregar actividad de completado
        get().addActivity({
          type: process.type,
          status: ActivityStatus.COMPLETED,
          title: `${process.title} completado`,
          description: process.description,
          relatedId: id,
          relatedType: 'process',
          metadata: process.metadata
        });

        // Remover proceso después de 3 segundos
        setTimeout(() => {
          set((state) => ({
            runningProcesses: state.runningProcesses.filter((p) => p.id !== id)
          }));
        }, 3000);

      },

      failProcess: (id, error) => {
        const process = get().runningProcesses.find((p) => p.id === id);
        if (!process) return;

        set((state) => ({
          runningProcesses: state.runningProcesses.map((p) =>
            p.id === id ? { ...p, status: 'error' as const } : p
          )
        }));

        // Agregar actividad de error
        get().addActivity({
          type: process.type,
          status: ActivityStatus.FAILED,
          title: `${process.title} falló`,
          description: error || 'Error desconocido',
          relatedId: id,
          relatedType: 'process',
          metadata: { ...process.metadata, error }
        });

        // Remover proceso después de 5 segundos
        setTimeout(() => {
          set((state) => ({
            runningProcesses: state.runningProcesses.filter((p) => p.id !== id)
          }));
        }, 5000);

      },

      cancelProcess: (id) => {
        const process = get().runningProcesses.find((p) => p.id === id);
        if (!process || !process.canCancel) return;

        set((state) => ({
          runningProcesses: state.runningProcesses.filter((p) => p.id !== id)
        }));

        // Agregar actividad de cancelación
        get().addActivity({
          type: process.type,
          status: ActivityStatus.FAILED,
          title: `${process.title} cancelado`,
          description: 'Proceso cancelado por el usuario',
          relatedId: id,
          relatedType: 'process',
          metadata: process.metadata
        });

      },

      getRunningProcesses: () => {
        return get().runningProcesses.filter((p) => p.status === 'running');
      },

      // ========== UTILITIES ==========

      markAllAsRead: () => {
        set({ unreadCount: 0 });
      },

      getUnreadCount: () => {
        return get().unreadCount;
      }
    }),
    {
      name: 'rfq-activity-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activities: state.activities,
        runningProcesses: state.runningProcesses.filter(p => p.status === 'running'),
        unreadCount: state.unreadCount
      })
    }
  )
);

// ========== HELPER FUNCTIONS ==========

/**
 * Formatea tiempo relativo
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Ahora mismo';
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;

  return new Date(timestamp).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Obtiene el ícono para cada tipo de actividad
 */
export function getActivityIcon(type: ActivityType): string {
  const icons: Record<ActivityType, string> = {
    [ActivityType.CHAT]: '💬',
    [ActivityType.EMAIL]: '📧',
    [ActivityType.RFQ_CREATED]: '📋',
    [ActivityType.RFQ_UPDATED]: '✏️',
    [ActivityType.PROPOSAL_RECEIVED]: '📥',
    [ActivityType.PROPOSAL_EVALUATED]: '✅',
    [ActivityType.EXPORT]: '📤',
    [ActivityType.UPLOAD]: '📁',
    [ActivityType.ANALYSIS]: '🔍',
    [ActivityType.SYSTEM]: '⚙️'
  };
  return icons[type] || '📌';
}

/**
 * Obtiene el color para cada estado
 */
export function getStatusColor(status: ActivityStatus): string {
  const colors: Record<ActivityStatus, string> = {
    [ActivityStatus.PENDING]: 'var(--color-warning)',
    [ActivityStatus.IN_PROGRESS]: 'var(--color-info)',
    [ActivityStatus.COMPLETED]: 'var(--color-success)',
    [ActivityStatus.FAILED]: 'var(--color-error)'
  };
  return colors[status] || 'var(--text-secondary)';
}
