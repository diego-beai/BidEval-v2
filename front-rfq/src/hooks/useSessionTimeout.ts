import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useToastStore } from '../stores/useToastStore';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

const WARNING_MS = 30 * 60 * 1000; // 30 minutes
const LOGOUT_MS = 60 * 60 * 1000;  // 60 minutes

/**
 * Session timeout hook for SOC2 compliance.
 * Shows a warning toast at 30 min inactivity, logs out at 60 min.
 * Resets on mousedown, keydown, scroll, touchstart.
 * Skipped entirely in demo mode.
 */
export function useSessionTimeout() {
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasWarnedRef = useRef(false);

  const resetTimers = useCallback(() => {
    if (isDemoMode) return;

    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    hasWarnedRef.current = false;

    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

    warningTimerRef.current = setTimeout(() => {
      hasWarnedRef.current = true;
      const { addToast } = useToastStore.getState();
      addToast(
        'Your session will expire in 30 minutes due to inactivity.',
        'warning'
      );
    }, WARNING_MS);

    logoutTimerRef.current = setTimeout(() => {
      const { signOut, isAuthenticated: stillAuth } = useAuthStore.getState();
      if (stillAuth) {
        signOut();
        const { addToast } = useToastStore.getState();
        addToast('Session expired due to inactivity.', 'info');
      }
    }, LOGOUT_MS);
  }, []);

  useEffect(() => {
    if (isDemoMode) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((ev) => document.addEventListener(ev, resetTimers, { passive: true }));

    // Start timers initially
    resetTimers();

    return () => {
      events.forEach((ev) => document.removeEventListener(ev, resetTimers));
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [resetTimers]);
}
