import React, { useEffect, useState } from 'react';
import { DonutChart, DonutChartData } from './DonutChart';
import { useRfqStore } from '../../stores/useRfqStore';
import { getProviderColor, getProviderDisplayName } from '../../types/provider.types';
import { useProviderStore } from '../../stores/useProviderStore';
import { useLanguageStore } from '../../stores/useLanguageStore';

interface ProviderSummaryChartProps {
  className?: string;
}

export const ProviderSummaryChart: React.FC<ProviderSummaryChartProps> = ({ className }) => {
  const { providerRanking, fetchProviderRanking, isProcessing, error } = useRfqStore();
  const { projectProviders } = useProviderStore();
  const [chartData, setChartData] = useState<DonutChartData[]>([]);
  const { t } = useLanguageStore();

  useEffect(() => {
    // Cargar datos si no existen
    if (!providerRanking || providerRanking.length === 0) {
      fetchProviderRanking();
    }
  }, [providerRanking, fetchProviderRanking]);

  useEffect(() => {
    // Procesar datos para el gráfico
    if (providerRanking && providerRanking.length > 0) {
      // Agrupar por proveedor y contar evaluaciones
      const providerCounts = providerRanking.reduce((acc: Record<string, number>, item) => {
        const providerName = item.provider_name || 'Desconocido';
        acc[providerName] = (acc[providerName] || 0) + 1;
        return acc;
      }, {});

      const data: DonutChartData[] = Object.entries(providerCounts).map(([label, value]) => ({
        label: getProviderDisplayName(label),
        value,
        color: getProviderColor(label, projectProviders),
        isEmpty: value === 0
      }));

      setChartData(data);
    } else {
      // Datos vacíos con dynamic providers
      const data: DonutChartData[] = projectProviders.map((provider) => ({
        label: getProviderDisplayName(provider),
        value: 0,
        color: getProviderColor(provider, projectProviders),
        isEmpty: true
      }));

      setChartData(data);
    }
  }, [providerRanking, projectProviders]);

  if (isProcessing) {
    return (
      <div className={`donut-chart-container ${className || ''}`}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '160px',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ 
              margin: '0 auto 8px', 
              border: '2px solid rgba(0,0,0,0.1)', 
              borderTopColor: 'var(--color-primary)', 
              borderRadius: '50%', 
              width: 20, 
              height: 20, 
              animation: 'spin 1s linear infinite' 
            }}></div>
            <div style={{ fontSize: '0.8rem' }}>{t('chart.loading_providers')}</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`donut-chart-container ${className || ''}`}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '160px',
          color: 'var(--color-danger)',
          fontSize: '0.8rem',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ marginBottom: '8px' }}>⚠️ {t('chart.connection_error')}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{t('chart.could_not_load')}</div>
          </div>
        </div>
      </div>
    );
  }

  const totalProviders = chartData.reduce((sum, item) => sum + item.value, 0);
  const activeProviders = chartData.filter(item => item.value > 0).length;

  return (
    <div className={`donut-chart-container ${className || ''}`}>
      <div style={{ marginBottom: '16px', textAlign: 'center' }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {t('chart.active_providers')}
        </h4>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {totalProviders > 0
            ? `${activeProviders} ${t('chart.providers_with_data')}`
            : t('chart.no_data_configure')
          }
        </p>
      </div>
      
      <DonutChart
        data={chartData}
        size="medium"
        centerText={activeProviders.toString()}
        showLegend={true}
        interactive={true}
      />

      {totalProviders === 0 && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: 'var(--bg-hover)',
          borderRadius: '8px',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>🔍 {t('chart.solution')}</div>
          <div>{t('chart.verify_supabase')}</div>
        </div>
      )}
    </div>
  );
};
