import { useEffect } from 'react';

/**
 * Componente que precarga recursos críticos para mejorar el rendimiento inicial
 */
export function Preloader() {
  useEffect(() => {
    // Precargar componentes críticos
    const preloadCriticalComponents = async () => {
      try {
        // Precargar componentes principales
        await import('../upload/FileUploadZone');
        await import('../upload/SelectedFileCard');
        await import('../processing/ProcessingStatus');

        // Precargar utilidades críticas
        await import('../../utils/validators');
        await import('../../utils/formatters');
      } catch (error) {
      }
    };

    preloadCriticalComponents();
  }, []);

  // Este componente no renderiza nada, solo maneja preloading
  return null;
}
