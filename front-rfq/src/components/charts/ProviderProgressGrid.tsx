import React, { useMemo } from 'react';
import { Provider, PROVIDER_DISPLAY_NAMES } from '../../types/provider.types';
import { ProgressRing } from './ProgressRing';
import { useRfqStore } from '../../stores/useRfqStore';

export interface ProviderProgressGridProps {
  selectedProvider?: Provider | '';
  onProviderClick: (provider: Provider) => void;
}

// Colores modernos por proveedor
const PROVIDER_COLORS: Record<Provider, string> = {
  [Provider.TR]: '#12b5b0',
  [Provider.IDOM]: '#6366f1',
  [Provider.SACYR]: '#8b5cf6',
  [Provider.EA]: '#ec4899',
  [Provider.SENER]: '#f59e0b',
  [Provider.TRESCA]: '#10b981',
  [Provider.WORLEY]: '#3b82f6'
};

export const ProviderProgressGrid: React.FC<ProviderProgressGridProps> = ({
  selectedProvider,
  onProviderClick
}) => {
  const { results } = useRfqStore();

  // Calcular el progreso real de cada proveedor basado en los resultados procesados
  const providerProgress = useMemo(() => {
    if (!results || results.length === 0) {
      // Si no hay resultados, todos los proveedores están en 0%
      return Object.values(Provider).reduce((acc, provider) => {
        acc[provider] = { count: 0, progress: 0 };
        return acc;
      }, {} as Record<Provider, { count: number; progress: number }>);
    }

    const progress: Record<Provider, { count: number; progress: number }> = {} as any;

    Object.values(Provider).forEach(provider => {
      // Contar cuántas evaluaciones únicas tiene este proveedor procesadas
      const uniqueEvaluations = new Set<string>();

      results.forEach(result => {
        const providerEval = result.evaluations[provider];
        if (providerEval && providerEval.hasValue) {
          uniqueEvaluations.add(result.evaluation);
        }
      });

      const count = uniqueEvaluations.size;
      // Progreso: 0-4 evaluaciones = 0-100%
      const progressValue = (count / 4) * 100;

      progress[provider] = {
        count,
        progress: Math.min(progressValue, 100)
      };
    });

    return progress;
  }, [results]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '20px',
        width: '100%'
      }}
    >
      {Object.values(Provider).map((provider) => {
        const { count, progress } = providerProgress[provider];
        const isSelected = selectedProvider === provider;

        return (
          <div
            key={provider}
            onClick={() => onProviderClick(provider)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '20px 16px',
              background: isSelected ? 'var(--bg-surface-alt)' : 'var(--bg-surface)',
              border: isSelected ? `2px solid ${PROVIDER_COLORS[provider]}` : '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.12)';
                e.currentTarget.style.borderColor = PROVIDER_COLORS[provider];
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }
            }}
          >
            {/* Selected indicator */}
            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: `linear-gradient(90deg, ${PROVIDER_COLORS[provider]}, ${PROVIDER_COLORS[provider]}80)`,
                  animation: 'shimmer 2s infinite'
                }}
              />
            )}

            <ProgressRing
              progress={progress}
              size="medium"
              color={PROVIDER_COLORS[provider]}
              showPercentage={true}
            />

            <div style={{ textAlign: 'center', width: '100%' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: isSelected ? PROVIDER_COLORS[provider] : 'var(--text-primary)',
                  marginBottom: '4px',
                  transition: 'color 0.2s ease'
                }}
              >
                {PROVIDER_DISPLAY_NAMES[provider]}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)'
                }}
              >
                {count}/4 evaluaciones
              </div>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -100% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ProviderProgressGrid;
