import React from 'react';
import { getProviderDisplayName } from '../../types/provider.types';
import { DonutChart, DonutChartData } from './DonutChart';

export interface ProviderDonutData {
  provider: string;
  evaluations: string[];
  selected?: boolean;
}

export interface ProviderDonutGridProps {
  providers: ProviderDonutData[];
  onProviderClick: (provider: string) => void;
}

// Colores de evaluación consistentes
const EVALUATION_COLORS: Record<string, string> = {
  'Technical Evaluation': 'rgba(18, 181, 176, 0.8)',
  'Economical Evaluation': 'rgba(245, 158, 11, 0.8)',
  'Others': 'rgba(139, 92, 246, 0.8)'
};

const ALL_EVALUATION_TYPES = [
  'Technical Evaluation',
  'Economical Evaluation',
  'Others'
];

export const ProviderDonutGrid: React.FC<ProviderDonutGridProps> = ({
  providers,
  onProviderClick
}) => {
  // Convertir evaluaciones de proveedor a formato de donut
  const transformToDonutData = (evaluations: string[]): DonutChartData[] => {
    return ALL_EVALUATION_TYPES.map((evalType) => {
      const hasEval = evaluations.includes(evalType);
      return {
        label: evalType.split(' ')[0], // "Technical", "Economical", etc.
        value: hasEval ? 33 : 0, // ~33% por cada evaluación
        color: EVALUATION_COLORS[evalType],
        isEmpty: !hasEval
      };
    });
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
        gap: '16px',
        width: '100%'
      }}
    >
      {providers.map((providerData) => {
        const donutData = transformToDonutData(providerData.evaluations);
        const evalCount = providerData.evaluations.length;

        return (
          <div
            key={providerData.provider}
            className={`provider-donut-card ${providerData.selected ? 'selected' : ''}`}
            onClick={() => onProviderClick(providerData.provider)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              background: providerData.selected ? 'var(--bg-surface-alt)' : 'var(--bg-surface)',
              border: providerData.selected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
          >
            {/* Selected indicator */}
            {providerData.selected && (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            )}

            {/* Mini Donut Chart */}
            <DonutChart
              data={donutData}
              size="small"
              centerText={evalCount.toString()}
              interactive={false}
            />

            {/* Provider Name */}
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: providerData.selected ? 'var(--color-primary)' : 'var(--text-secondary)',
                textAlign: 'center',
                lineHeight: '1.2',
                transition: 'color 0.2s ease'
              }}
            >
              {getProviderDisplayName(providerData.provider)}
            </div>
          </div>
        );
      })}

      <style>{`
        .provider-donut-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
          border-color: var(--color-primary);
        }

        .provider-donut-card.selected:hover {
          border-color: var(--color-primary);
          box-shadow: 0 8px 20px rgba(18, 181, 176, 0.2);
        }

        @media (max-width: 768px) {
          .provider-donut-card {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default ProviderDonutGrid;
