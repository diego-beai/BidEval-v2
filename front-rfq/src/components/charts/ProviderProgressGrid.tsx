import React, { useMemo } from 'react';
import { getProviderColor, getProviderDisplayName } from '../../types/provider.types';
import { ProgressRing } from './ProgressRing';
import { useRfqStore } from '../../stores/useRfqStore';
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

export const ProviderProgressGrid: React.FC<ProviderProgressGridProps> = React.memo(({
  selectedProvider,
  onProviderClick,
  onProviderDataChange
}) => {
  const { results, pivotTableData, proposalEvaluations } = useRfqStore();
  const { projectProviders } = useProviderStore();
  const { t } = useLanguageStore();


  // Calculate progress for each dynamic provider
  const providerProgress = useMemo(() => {
    const progress: Record<string, { count: number; progress: number; evaluations: Record<string, boolean> }> = {};

    projectProviders.forEach(provider => {
      const normalized = normalizeProvider(provider);
      const evaluations: Record<string, boolean> = {
        'Technical Evaluation': false,
        'Economical Evaluation': false,
        'Others': false
      };

      const evaluationTypes = new Set<string>();

      // Normalize legacy eval types to the 3 canonical types
      const normalizeEvalType = (et: string): string => {
        const v = et.trim().toLowerCase();
        if (v.includes('pre-feed') || v.includes('pre feed')) return 'Others';
        if (v === 'feed deliverables' || v === 'feed') return 'Others';
        if (v === 'others' || v === 'other') return 'Others';
        return et.trim();
      };

      // Count from pivot table data (rfq_items_master + provider_responses combined)
      if (pivotTableData && pivotTableData.length > 0) {
        const knownCols = new Set([
          'id', 'rfq_project_id', 'project_name', 'evaluation', 'fase',
          'requisito_rfq', 'createdAt', 'updatedAt', 'created_at', 'updated_at',
          'evaluation_type', 'phase', 'requirement_text', 'Provider', 'provider',
          'project_id', 'file_id'
        ]);
        pivotTableData.forEach((item: any) => {
          // Check if this provider has a dynamic column in this row
          const hasData = Object.keys(item).some(key => {
            if (knownCols.has(key)) return false;
            const keyNorm = normalizeProvider(key);
            return keyNorm === normalized && item[key] && typeof item[key] === 'string' && item[key].trim() !== '';
          });
          if (!hasData) return;

          const evalType = item.evaluation_type || item.evaluation;
          if (evalType) {
            const normalizedEvalType = normalizeEvalType(evalType);
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
            const normalizedEvalType = normalizeEvalType(evalType);
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
            const normalizedEvalType = normalizeEvalType(result.evaluation);
            evaluationTypes.add(normalizedEvalType);
            if (evaluations.hasOwnProperty(normalizedEvalType)) {
              evaluations[normalizedEvalType as keyof typeof evaluations] = true;
            }
          }
        });
      }

      // Count required types covered (Technical + Economical = 2 required)
      const requiredCovered = (evaluations['Technical Evaluation'] ? 1 : 0) + (evaluations['Economical Evaluation'] ? 1 : 0);
      const count = evaluationTypes.size;
      progress[provider] = {
        count,
        progress: Math.min((requiredCovered / 2) * 100, 100),
        evaluations
      };
    });

    return progress;
  }, [results, pivotTableData, proposalEvaluations, projectProviders]);

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
                {data.count}/3 {t('chart.types')}
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
});

ProviderProgressGrid.displayName = 'ProviderProgressGrid';

export default ProviderProgressGrid;
