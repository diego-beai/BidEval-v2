import React, { useMemo, useEffect } from 'react';
import { Provider, PROVIDER_DISPLAY_NAMES } from '../../types/provider.types';
import { ProgressRing } from './ProgressRing';
import { useRfqStore } from '../../stores/useRfqStore';

export interface ProviderProgressGridProps {
  selectedProvider?: Provider | '';
  onProviderClick: (provider: Provider) => void;
  onProviderDataChange?: (data: ProviderEvaluationData | null) => void;
}

export interface ProviderEvaluationData {
  count: number;
  progress: number;
  evaluations: Record<string, boolean>;
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

// Map database provider names to Provider enum
const PROVIDER_NAME_MAP: Record<string, Provider> = {
  'TECNICASREUNIDAS': Provider.TR,
  'TR': Provider.TR,
  'Técnicas Reunidas': Provider.TR,
  'IDOM': Provider.IDOM,
  'SACYR': Provider.SACYR,
  'EA': Provider.EA,
  'SENER': Provider.SENER,
  'TRESCA': Provider.TRESCA,
  'WORLEY': Provider.WORLEY
};

export const ProviderProgressGrid: React.FC<ProviderProgressGridProps> = ({
  selectedProvider,
  onProviderClick,
  onProviderDataChange
}) => {
  const { results, tableData, proposalEvaluations, fetchAllTableData, fetchProposalEvaluations } = useRfqStore();

  // Load data on mount
  useEffect(() => {
    if (!tableData || tableData.length === 0) {
      fetchAllTableData();
    }
    if (!proposalEvaluations || proposalEvaluations.length === 0) {
      fetchProposalEvaluations();
    }
  }, [fetchAllTableData, fetchProposalEvaluations, tableData, proposalEvaluations]);

  // Calcular el progreso de cada proveedor basado en tableData (RFQ) y proposalEvaluations (propuestas)
  const providerProgress = useMemo(() => {
    const progress: Record<Provider, { count: number; progress: number; evaluations: Record<string, boolean> }> = {} as any;

    // Initialize all providers with 0
    Object.values(Provider).forEach(provider => {
      progress[provider] = {
        count: 0,
        progress: 0,
        evaluations: {
          'Technical Evaluation': false,
          'Economical Evaluation': false,
          'Pre-FEED Deliverables': false,
          'FEED Deliverables': false
        }
      };
    });

    // Count evaluation types from both tableData (RFQ) and proposalEvaluations (Proposals)
    Object.values(Provider).forEach(provider => {
      const evaluationTypes = new Set<string>();
      const evaluations = {
        'Technical Evaluation': false,
        'Economical Evaluation': false,
        'Pre-FEED Deliverables': false,
        'FEED Deliverables': false
      };

      // Count from RFQ data (tableData)
      if (tableData && tableData.length > 0) {
        tableData.forEach((item: any) => {
          const itemProvider = item.Provider || item.provider;
          if (!itemProvider) return;

          const normalizedProvider = PROVIDER_NAME_MAP[itemProvider];
          if (!normalizedProvider || normalizedProvider !== provider) return;

          const evalType = item.evaluation_type || item.evaluation;
          if (evalType) {
            const normalizedEvalType = evalType.trim();
            evaluationTypes.add(normalizedEvalType);
            if (evaluations.hasOwnProperty(normalizedEvalType)) {
              evaluations[normalizedEvalType as keyof typeof evaluations] = true;
            }
          }
        });
      }

      // Count from Proposal evaluations (proposalEvaluations)
      if (proposalEvaluations && proposalEvaluations.length > 0) {
        proposalEvaluations.forEach((item: any) => {
          const itemProvider = item.provider_name;
          if (!itemProvider) return;

          const normalizedProvider = PROVIDER_NAME_MAP[itemProvider];
          if (!normalizedProvider || normalizedProvider !== provider) return;

          const evalType = item.evaluation_type;
          if (evalType) {
            const normalizedEvalType = evalType.trim();
            evaluationTypes.add(normalizedEvalType);
            if (evaluations.hasOwnProperty(normalizedEvalType)) {
              evaluations[normalizedEvalType as keyof typeof evaluations] = true;
            }
          }
        });
      }

      // Fallback: if no database data but we have processed results, use them
      if (evaluationTypes.size === 0 && results && results.length > 0) {
        results.forEach(result => {
          const providerEval = result.evaluations[provider];
          if (providerEval && providerEval.hasValue) {
            const normalizedEvalType = result.evaluation;
            evaluationTypes.add(normalizedEvalType);
            if (evaluations.hasOwnProperty(normalizedEvalType)) {
              evaluations[normalizedEvalType as keyof typeof evaluations] = true;
            }
          }
        });
      }

      const count = evaluationTypes.size;
      // Progreso: 0-4 evaluaciones = 0-100%
      const progressValue = (count / 4) * 100;

      progress[provider] = {
        count,
        progress: Math.min(progressValue, 100),
        evaluations
      };
    });

    return progress;
  }, [results, tableData, proposalEvaluations]);

  // Notify parent component when selected provider data changes
  React.useEffect(() => {
    if (onProviderDataChange && selectedProvider) {
      const data = providerProgress[selectedProvider];
      onProviderDataChange(data || null);
    } else if (onProviderDataChange) {
      onProviderDataChange(null);
    }
  }, [providerProgress, selectedProvider, onProviderDataChange]);

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
