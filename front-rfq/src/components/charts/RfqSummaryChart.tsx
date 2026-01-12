import React, { useEffect, useState } from 'react';
import { DonutChart, DonutChartData } from '../charts/DonutChart';
import { useRfqStore } from '../../stores/useRfqStore';

interface RfqSummaryChartProps {
  className?: string;
}

export const RfqSummaryChart: React.FC<RfqSummaryChartProps> = ({ className }) => {
  const { pivotTableData, fetchPivotTableData, isProcessing, error } = useRfqStore();
  const [chartData, setChartData] = useState<DonutChartData[]>([]);

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
        const evalType = item.evaluation_type || 'Sin categorizar';
        acc[evalType] = (acc[evalType] || 0) + 1;
        return acc;
      }, {});

      const colors = [
        'rgba(18, 181, 176, 0.8)',  // Technical - cyan
        'rgba(245, 158, 11, 0.8)',  // Economic - amber
        'rgba(59, 130, 246, 0.8)',   // Pre-FEED - blue
        'rgba(139, 92, 246, 0.8)',   // FEED - purple
        'rgba(236, 72, 153, 0.8)',   // Other - pink
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
        { label: 'Pre-FEED', value: 0, color: 'rgba(59, 130, 246, 0.8)', isEmpty: true },
        { label: 'FEED', value: 0, color: 'rgba(139, 92, 246, 0.8)', isEmpty: true },
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
            <div style={{ fontSize: '0.8rem' }}>Cargando datos...</div>
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
            <div style={{ marginBottom: '8px' }}>⚠️ Error de conexión</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>No se pudieron cargar los datos</div>
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
          Distribución de RFQs
        </h4>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {totalRequirements > 0 
            ? `${totalRequirements} requisitos totales` 
            : 'Sin datos - Configura Supabase'
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
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>🔍 Solución:</div>
          <div>Verifica la configuración de Supabase y que las tablas rfq_items_master y provider_responses contengan datos.</div>
        </div>
      )}
    </div>
  );
};
