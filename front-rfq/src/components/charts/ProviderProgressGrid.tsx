import React, { useMemo, useEffect } from 'react';
import { getProviderColor, getProviderDisplayName } from '../../types/provider.types';
import { ProgressRing } from './ProgressRing';
import { useRfqStore } from '../../stores/useRfqStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useProviderStore } from '../../stores/useProviderStore';
import { useLanguageStore } from '../../stores/useLanguageStore';

export interface ProviderProgressGridProps {
  selectedProvider?: string;
  onProviderClick: (provider: string) => void;
  onProviderDataChange?: (data: ProviderEvaluationData | null) => void;
}

export interface ProviderEvaluationData {
  count: number;
  progress: number;
  evaluations: Record<string, boolean>;
}

// Normalize provider name for matching
const normalizeProvider = (name: string) =>
  name.trim().toUpperCase().replace(/\s+/g, '');

export const ProviderProgressGrid: React.FC<ProviderProgressGridProps> = ({
  selectedProvider,
  onProviderClick,
  onProviderDataChange
}) => {
  const { results, tableData, proposalEvaluations, fetchAllTableData, fetchProposalEvaluations } = useRfqStore();
  const { activeProjectId } = useProjectStore();
  const { projectProviders } = useProviderStore();
  const { t } = useLanguageStore();

  // Reload data when project changes
  useEffect(() => {
    if (activeProjectId) {
      fetchAllTableData();
      fetchProposalEvaluations();
    }
  }, [activeProjectId, fetchAllTableData, fetchProposalEvaluations]);


  // Calculate progress for each dynamic provider
  const providerProgress = useMemo(() => {
    const progress: Record<string, { count: number; progress: number; evaluations: Record<string, boolean> }> = {};

    projectProviders.forEach(provider => {
      const normalized = normalizeProvider(provider);
      const evaluations: Record<string, boolean> = {
        'Technical Evaluation': false,
        'Economical Evaluation': false,
        'Pre-FEED Deliverables': false,
        'FEED Deliverables': false
      };

      const evaluationTypes = new Set<string>();

      // Count from RFQ data (tableData)
      if (tableData && tableData.length > 0) {
        tableData.forEach((item: any) => {
          const itemProvider = item.Provider || item.provider;
          if (!itemProvider) return;
          const itemNorm = normalizeProvider(String(itemProvider));
          if (!(itemNorm === normalized ||
                (itemNorm === 'TECNICASREUNIDAS' && normalized === 'TR') ||
                (itemNorm === 'TR' && normalized === 'TECNICASREUNIDAS'))) return;

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

      // Count from Proposal evaluations
      if (proposalEvaluations && proposalEvaluations.length > 0) {
        proposalEvaluations.forEach((item: any) => {
          const itemProvider = item.provider_name;
          if (!itemProvider) return;
          const itemNorm = normalizeProvider(String(itemProvider));
          const provNorm = normalized;
          if (!(itemNorm === provNorm ||
                (itemNorm === 'TECNICASREUNIDAS' && provNorm === 'TR') ||
                (itemNorm === 'TR' && provNorm === 'TECNICASREUNIDAS'))) return;

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

      // Fallback: use processed results
      if (evaluationTypes.size === 0 && results && results.length > 0) {
        results.forEach(result => {
          // Check evaluations by provider key
          const providerEval = result.evaluations[provider] || result.evaluations[normalized];
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
      progress[provider] = {
        count,
        progress: Math.min((count / 4) * 100, 100),
        evaluations
      };
    });

    return progress;
  }, [results, tableData, proposalEvaluations, projectProviders]);

  // Notify parent when selected provider data changes
  React.useEffect(() => {
    if (onProviderDataChange && selectedProvider) {
      const data = providerProgress[selectedProvider] || providerProgress[normalizeProvider(selectedProvider)];
      onProviderDataChange(data || null);
    } else if (onProviderDataChange) {
      onProviderDataChange(null);
    }
  }, [providerProgress, selectedProvider, onProviderDataChange]);

  if (projectProviders.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '32px',
        color: 'var(--text-tertiary)',
        fontSize: '0.9rem'
      }}>
        {t('proposal.no_providers')}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '20px',
        width: '100%'
      }}
    >
      {projectProviders.filter((provider) => {
        const d = providerProgress[provider];
        return d && d.count > 0;
      }).map((provider) => {
        const data = providerProgress[provider] || { count: 0, progress: 0 };
        const isSelected = selectedProvider === provider || normalizeProvider(selectedProvider || '') === normalizeProvider(provider);
        const color = getProviderColor(provider, projectProviders);

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
              border: isSelected ? `2px solid ${color}` : '1px solid var(--border-color)',
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
                e.currentTarget.style.borderColor = color;
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
            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: `linear-gradient(90deg, ${color}, ${color}80)`,
                  animation: 'shimmer 2s infinite'
                }}
              />
            )}

            <ProgressRing
              progress={data.progress}
              size="medium"
              color={color}
              showPercentage={true}
            />

            <div style={{ textAlign: 'center', width: '100%' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: isSelected ? color : 'var(--text-primary)',
                  marginBottom: '4px',
                  transition: 'color 0.2s ease'
                }}
              >
                {getProviderDisplayName(provider)}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)'
                }}
              >
                {data.count}/4 {t('chart.types')}
              </div>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default ProviderProgressGrid;
