import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import '../styles.css';
import { initPerformanceMonitoring } from './utils/performance';

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
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
