import React, { useEffect, useState } from 'react';
import { DonutChart, DonutChartData } from './DonutChart';
import { useRfqStore } from '../../stores/useRfqStore';
import { useLanguageStore } from '../../stores/useLanguageStore';

interface RfqSummaryChartProps {
  className?: string;
}

export const RfqSummaryChart: React.FC<RfqSummaryChartProps> = ({ className }) => {
  const { pivotTableData, fetchPivotTableData, isProcessing, error } = useRfqStore();
  const [chartData, setChartData] = useState<DonutChartData[]>([]);
  const { t } = useLanguageStore();

  useEffect(() => {
    // Cargar datos si no existen
    if (!pivotTableData || pivotTableData.length === 0) {
      fetchPivotTableData();
    }
  }, [pivotTableData, fetchPivotTableData]);

  useEffect(() => {
    // Procesar datos para el gráfico
    if (pivotTableData && pivotTableData.length > 0) {
      // Contar RFQs por tipo de evaluación
      const evaluationCounts = pivotTableData.reduce((acc: Record<string, number>, item) => {
        const evalType = item.evaluation_type || t('chart.uncategorized');
        acc[evalType] = (acc[evalType] || 0) + 1;
        return acc;
      }, {});

      const colors = [
        'rgba(18, 181, 176, 0.8)',  // Technical - cyan
        'rgba(245, 158, 11, 0.8)',  // Economic - amber
        'rgba(139, 92, 246, 0.8)',  // Others - purple
        'rgba(236, 72, 153, 0.8)',  // Extra - pink
      ];

      const data: DonutChartData[] = Object.entries(evaluationCounts).map(([label, value], index) => ({
        label,
        value,
        color: colors[index % colors.length],
        isEmpty: value === 0
      }));

      setChartData(data);
    } else {
      // Datos vacíos o de ejemplo
      setChartData([
        { label: 'Technical', value: 0, color: 'rgba(18, 181, 176, 0.8)', isEmpty: true },
        { label: 'Economic', value: 0, color: 'rgba(245, 158, 11, 0.8)', isEmpty: true },
        { label: 'Others', value: 0, color: 'rgba(139, 92, 246, 0.8)', isEmpty: true },
      ]);
    }
  }, [pivotTableData]);

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
            <div style={{ fontSize: '0.8rem' }}>{t('chart.loading_data')}</div>
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

  const totalRequirements = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={`donut-chart-container ${className || ''}`}>
      <div style={{ marginBottom: '16px', textAlign: 'center' }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {t('chart.rfq_distribution')}
        </h4>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {totalRequirements > 0
            ? `${totalRequirements} ${t('chart.total_requirements')}`
            : t('chart.no_data_configure')
          }
        </p>
      </div>

      <DonutChart
        data={chartData}
        size="medium"
        centerText={totalRequirements.toString()}
        showLegend={true}
        interactive={true}
      />

      {totalRequirements === 0 && (
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
          <div>{t('chart.verify_supabase_rfq')}</div>
        </div>
      )}
    </div>
  );
};
