/**
 * Utilidades para monitoreo de rendimiento
 */

// Medir tiempo de carga inicial
export function measureInitialLoad() {
  if ('performance' in window) {
    // Usar PerformanceObserver para medir carga de manera más confiable
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const navigation = entries.find(entry => entry.entryType === 'navigation') as PerformanceNavigationTiming;

      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;

        // Solo loguear si el tiempo es positivo y razonable
        if (loadTime > 0 && loadTime < 30000) { // Menos de 30 segundos

          // Enviar a analytics si está disponible
          if (typeof (window as any).gtag !== 'undefined') {
            (window as any).gtag('event', 'page_load_time', {
              value: Math.round(loadTime),
              custom_map: { metric1: 'page_load_time' }
            });
          }
        }
      }
    });

    observer.observe({ entryTypes: ['navigation'] });

    // Fallback para navegadores más antiguos
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation && navigation.loadEventEnd > 0) {
          const loadTime = navigation.loadEventEnd - navigation.loadEventStart;

          if (loadTime > 0 && loadTime < 30000) {
          }
        }
      }, 0);
    });
  }
}

// Medir rendimiento de componentes críticos
export function measureComponentRender(_componentName: string, startTime: number) {
  if ('performance' in window) {
    const endTime = performance.now();
    const renderTime = endTime - startTime;


    // Umbral para reportar renders lentos
    if (renderTime > 16.67) { // Más de un frame a 60fps
    }
  }
}

// Monitorear uso de memoria (si está disponible)
export function logMemoryUsage() {
  if ('memory' in performance) {
    void (performance as any).memory;
  }
}

// Medir tiempo de respuesta de API
export function measureApiCall(_apiName: string, startTime: number, _success: boolean = true) {
  const endTime = performance.now();
  const responseTime = endTime - startTime;


  // Reportar llamadas lentas (>1s)
  if (responseTime > 1000) {
  }
}

// Inicializar monitoreo
export function initPerformanceMonitoring() {
  measureInitialLoad();

  // Log de memoria cada 5 minutos (solo en desarrollo)
  if (import.meta.env.DEV) {
    setInterval(logMemoryUsage, 300000); // 5 minutos
  }
}
