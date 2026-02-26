import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Sentry } from './lib/sentry';
import { initSentry } from './lib/sentry';
import App from './App';
import { SupplierResponsePage } from './pages/SupplierResponsePage';
import { SupplierUploadPage } from './pages/SupplierUploadPage';
import { StatusPage } from './pages/StatusPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { ErrorFallbackPage } from './pages/ErrorFallbackPage';
import { AuthGuard } from './components/auth/AuthGuard';
import { ThemeProvider } from './context/ThemeContext';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './stores/useAuthStore';
import '../styles.css';
import { initPerformanceMonitoring } from './utils/performance';

// Initialize Sentry before anything else
initSentry();

// Initialize auth (non-blocking — sets isLoading while resolving)
useAuthStore.getState().initialize();

// Registrar Service Worker para cache offline
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => {
        // Service Worker registrado exitosamente
      })
      .catch(() => {
        // Error al registrar Service Worker
      });
  });
}

// Inicializar monitoreo de rendimiento
initPerformanceMonitoring();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, eventId, resetError }) => (
        <ErrorFallbackPage error={error instanceof Error ? error : undefined} eventId={eventId} resetError={resetError} />
      )}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/respond/:token" element={<SupplierResponsePage />} />
              <Route path="/upload/:token" element={<SupplierUploadPage />} />
              <Route path="/status" element={<StatusPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/invite/:token" element={<AcceptInvitePage />} />
              {/* Main application — protected */}
              <Route path="/*" element={<AuthGuard><App /></AuthGuard>} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
