import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';
const IS_PRODUCTION = import.meta.env.PROD;

export function initSentry() {
  if (!SENTRY_DSN || !IS_PRODUCTION) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    release: `bideval@${APP_VERSION}`,
    environment: IS_PRODUCTION ? 'production' : 'development',
    enabled: IS_PRODUCTION,
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    ignoreErrors: [
      'ResizeObserver loop',
      'Non-Error promise rejection captured',
      'Failed to fetch',
      'Load failed',
      'NetworkError',
      'AbortError',
      'ChunkLoadError',
    ],

    beforeSend(event) {
      // Strip Authorization headers from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(bc => {
          if (bc.data?.headers) {
            const headers = { ...bc.data.headers };
            delete headers['Authorization'];
            delete headers['authorization'];
            bc.data.headers = headers;
          }
          return bc;
        });
      }
      return event;
    },
  });
}

export function setSentryUser(user: { id: string; email?: string; organizationId?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    organization_id: user.organizationId,
  } as any);
}

export function clearSentryUser() {
  Sentry.setUser(null);
}

export { Sentry };
