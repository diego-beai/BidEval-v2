import React, { useEffect, useState } from 'react';
import { DonutChart, DonutChartData } from './DonutChart';
import { useRfqStore } from '../../stores/useRfqStore';
import { Provider, PROVIDER_DISPLAY_NAMES } from '../../types/provider.types';

interface ProviderSummaryChartProps {
  className?: string;
}

export const ProviderSummaryChart: React.FC<ProviderSummaryChartProps> = ({ className }) => {
  const { providerRanking, fetchProviderRanking, isProcessing, error } = useRfqStore();
  const [chartData, setChartData] = useState<DonutChartData[]>([]);

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

      const colors = [
        'rgba(18, 181, 176, 0.8)',  // TR - cyan
        'rgba(65, 209, 122, 0.8)',  // IDOM - green
        'rgba(167, 139, 250, 0.8)', // SACYR - purple
        'rgba(251, 146, 60, 0.8)',  // EA - orange
        'rgba(236, 72, 153, 0.8)',  // SENER - pink
        'rgba(34, 211, 238, 0.8)',  // TRESCA - cyan light
        'rgba(251, 191, 36, 0.8)',  // WORLEY - yellow
      ];

      const data: DonutChartData[] = Object.entries(providerCounts).map(([label, value], index) => ({
        label: PROVIDER_DISPLAY_NAMES[label as Provider] || label,
        value,
        color: colors[index % colors.length],
        isEmpty: value === 0
      }));

      setChartData(data);
    } else {
      // Datos vacíos o de ejemplo con todos los proveedores
      const allProviders = Object.values(Provider);
      const colors = [
        'rgba(18, 181, 176, 0.8)',  // TR - cyan
        'rgba(65, 209, 122, 0.8)',  // IDOM - green
        'rgba(167, 139, 250, 0.8)', // SACYR - purple
        'rgba(251, 146, 60, 0.8)',  // EA - orange
        'rgba(236, 72, 153, 0.8)',  // SENER - pink
        'rgba(34, 211, 238, 0.8)',  // TRESCA - cyan light
        'rgba(251, 191, 36, 0.8)',  // WORLEY - yellow
      ];

      const data: DonutChartData[] = allProviders.map((provider, index) => ({
        label: PROVIDER_DISPLAY_NAMES[provider],
        value: 0,
        color: colors[index % colors.length],
        isEmpty: true
      }));

      setChartData(data);
    }
  }, [providerRanking]);

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
            <div style={{ fontSize: '0.8rem' }}>Cargando proveedores...</div>
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

  const totalProviders = chartData.reduce((sum, item) => sum + item.value, 0);
  const activeProviders = chartData.filter(item => item.value > 0).length;

  return (
    <div className={`donut-chart-container ${className || ''}`}>
      <div style={{ marginBottom: '16px', textAlign: 'center' }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Proveedores Activos
        </h4>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {totalProviders > 0 
            ? `${activeProviders} proveedores con datos` 
            : 'Sin datos - Configura Supabase'
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
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>🔍 Solución:</div>
          <div>Verifica la configuración de Supabase y que la tabla ranking_proveedores contenga datos.</div>
        </div>
      )}
    </div>
  );
};
