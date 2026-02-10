import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { SupplierResponsePage } from './pages/SupplierResponsePage';
import { SupplierUploadPage } from './pages/SupplierUploadPage';
import { ThemeProvider } from './context/ThemeContext';
import '../styles.css';
import { initPerformanceMonitoring } from './utils/performance';

// Limpiar chat corrupto
localStorage.removeItem('chat-store');

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
      <BrowserRouter>
        <Routes>
          {/* Public route for supplier responses */}
          <Route path="/respond/:token" element={<SupplierResponsePage />} />
          {/* Public route for supplier proposal uploads */}
          <Route path="/upload/:token" element={<SupplierUploadPage />} />
          {/* Main application */}
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);
