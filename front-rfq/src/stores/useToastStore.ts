import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    count: number;
}

interface ToastState {
    toasts: Toast[];
    addToast: (message: string, type: ToastType) => void;
    removeToast: (id: string) => void;
    clearAllToasts: () => void;
}

const AUTO_DISMISS_MS: Record<ToastType, number> = {
    success: 8000,
    info: 10000,
    warning: 15000,
    error: 20000,
};

// Track active timers so we can reset them on dedup
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastState>((set, get) => ({
    toasts: [],
    addToast: (message, type) => {
        const existing = get().toasts.find(
            (t) => t.message === message && t.type === type
        );

        if (existing) {
            // Deduplicate: increment count and reset auto-dismiss timer
            set((state) => ({
                toasts: state.toasts.map((t) =>
                    t.id === existing.id ? { ...t, count: t.count + 1 } : t
                ),
            }));

            // Reset the auto-dismiss timer
            const prevTimer = toastTimers.get(existing.id);
            if (prevTimer) clearTimeout(prevTimer);
            const timer = setTimeout(() => {
                set((state) => ({
                    toasts: state.toasts.filter((t) => t.id !== existing.id),
                }));
                toastTimers.delete(existing.id);
            }, AUTO_DISMISS_MS[type]);
            toastTimers.set(existing.id, timer);
            return;
        }

        const id = Math.random().toString(36).substring(2, 9);
        set((state) => ({
            toasts: [...state.toasts, { id, message, type, count: 1 }],
        }));

        const timer = setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id),
            }));
            toastTimers.delete(id);
        }, AUTO_DISMISS_MS[type]);
        toastTimers.set(id, timer);
    },
    removeToast: (id) => {
        const timer = toastTimers.get(id);
        if (timer) {
            clearTimeout(timer);
            toastTimers.delete(id);
        }
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        }));
    },
    clearAllToasts: () => {
        toastTimers.forEach((timer) => clearTimeout(timer));
        toastTimers.clear();
        set({ toasts: [] });
    },
}));
