import { useRfqStore } from '../../stores/useRfqStore';

/**
 * Componente de debug para mostrar información del estado (solo en desarrollo)
 */
export function DebugInfo() {
  const { results, isProcessing, error, status } = useRfqStore();

  // Solo mostrar en desarrollo
  if (!import.meta.env.DEV) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div><strong>Debug Info:</strong></div>
      <div>Processing: {isProcessing ? '✅' : '❌'}</div>
      <div>Results: {results ? `${results.length} items` : 'null'}</div>
      <div>Status: {status.stage} ({status.progress}%)</div>
      <div>Error: {error ? '❌' : '✅'}</div>
    </div>
  );
}
