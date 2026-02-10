import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { useChatStore } from './useChatStore';
import { useMailStore } from './useMailStore';
import { useRfqStore } from './useRfqStore';
import { useScoringStore } from './useScoringStore';
import { ChatStatus } from '../types/chat.types';

/**
 * Tipos de operaciones que pueden estar en progreso
 */
export type OperationType = 'chat' | 'mail' | 'upload' | 'scoring';

/**
 * Información de una operación activa
 */
export interface ActiveOperation {
    type: OperationType;
    label: string;
    progress?: number;
    startedAt: number;
}

/**
 * Estado del store de operaciones
 */
interface OperationsState {
    // Operaciones activas derivadas de otros stores
    activeOperations: ActiveOperation[];

    // Contadores de badges por módulo
    badges: Record<string, number>;

    // Acciones
    refreshOperations: () => void;
    incrementBadge: (module: string) => void;
    clearBadge: (module: string) => void;
    clearAllBadges: () => void;

    // Getters
    hasActiveOperations: () => boolean;
    getOperationsByType: (type: OperationType) => ActiveOperation[];
    getTotalActiveCount: () => number;
}

/**
 * Store centralizado para operaciones en progreso
 */
export const useOperationsStore = create<OperationsState>()(
    devtools(
        subscribeWithSelector((set, get) => ({
            activeOperations: [],
            badges: {},

            refreshOperations: () => {
                const operations: ActiveOperation[] = [];
                const now = Date.now();

                // Check Chat status
                const chatState = useChatStore.getState();
                if (chatState.status === ChatStatus.SENDING) {
                    operations.push({
                        type: 'chat',
                        label: 'Sending message...',
                        startedAt: now
                    });
                }

                // Check Mail generation
                const mailState = useMailStore.getState();
                if (mailState.isGenerating) {
                    operations.push({
                        type: 'mail',
                        label: 'Generating email...',
                        startedAt: now
                    });
                }

                // Check RFQ processing
                const rfqState = useRfqStore.getState();
                if (rfqState.isProcessing) {
                    operations.push({
                        type: 'upload',
                        label: 'Processing proposal...',
                        progress: rfqState.status?.progress || 0,
                        startedAt: now
                    });
                }

                // Check Scoring calculation
                const scoringState = useScoringStore.getState();
                if (scoringState.isCalculating) {
                    operations.push({
                        type: 'scoring',
                        label: 'Calculating scores...',
                        startedAt: now
                    });
                }

                set({ activeOperations: operations });
            },

            incrementBadge: (module: string) => {
                set((state) => ({
                    badges: {
                        ...state.badges,
                        [module]: (state.badges[module] || 0) + 1
                    }
                }));
            },

            clearBadge: (module: string) => {
                set((state) => {
                    const newBadges = { ...state.badges };
                    delete newBadges[module];
                    return { badges: newBadges };
                });
            },

            clearAllBadges: () => {
                set({ badges: {} });
            },

            hasActiveOperations: () => {
                return get().activeOperations.length > 0;
            },

            getOperationsByType: (type: OperationType) => {
                return get().activeOperations.filter(op => op.type === type);
            },

            getTotalActiveCount: () => {
                return get().activeOperations.length;
            }
        })),
        { name: 'OperationsStore' }
    )
);

// Suscribirse a cambios en los stores relevantes para actualizar automáticamente
let unsubscribers: (() => void)[] = [];

export function initializeOperationsSubscriptions() {
    // Limpiar suscripciones anteriores
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];

    // FIX: rerender-defer-reads — debounce refresh so simultaneous store changes
    // trigger only one re-render instead of up to 4
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
            useOperationsStore.getState().refreshOperations();
            refreshTimer = null;
        }, 16); // ~1 frame
    };

    // Suscribirse a cambios de estado en cada store
    unsubscribers.push(
        useChatStore.subscribe(
            (state) => state.status,
            () => debouncedRefresh()
        )
    );

    unsubscribers.push(
        useMailStore.subscribe(
            (state) => state.isGenerating,
            () => debouncedRefresh()
        )
    );

    unsubscribers.push(
        useRfqStore.subscribe(
            (state) => state.isProcessing,
            () => debouncedRefresh()
        )
    );

    unsubscribers.push(
        useScoringStore.subscribe(
            (state) => state.isCalculating,
            () => debouncedRefresh()
        )
    );

    // Refresh inicial
    debouncedRefresh();

    // También hacer refresh periódico para capturar cambios de progreso
    const intervalId = setInterval(debouncedRefresh, 1000);
    unsubscribers.push(() => {
        clearInterval(intervalId);
        if (refreshTimer) clearTimeout(refreshTimer);
    });
}

export function cleanupOperationsSubscriptions() {
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
}

/**
 * Hook para obtener el estado de operaciones con auto-refresh
 */
export function useActiveOperations() {
    const activeOperations = useOperationsStore(state => state.activeOperations);
    const hasActive = useOperationsStore(state => state.hasActiveOperations());
    const totalCount = useOperationsStore(state => state.getTotalActiveCount());

    return {
        operations: activeOperations,
        hasActive,
        totalCount
    };
}

/**
 * Mapeo de tipos de operación a módulos de navegación
 */
export const operationToModule: Record<OperationType, string> = {
    chat: 'chat',
    mail: 'mail',
    upload: 'upload',
    scoring: 'decision'
};

/**
 * Iconos para cada tipo de operación
 */
export const operationIcons: Record<OperationType, string> = {
    chat: '💬',
    mail: '📧',
    upload: '📤',
    scoring: '📊'
};
