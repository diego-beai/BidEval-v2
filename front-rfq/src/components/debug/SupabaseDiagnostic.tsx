import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface DiagnosticStatus {
  supabaseConfigured: boolean;
  tablesAccessible: {
    provider_responses: boolean;
    rfq_items_master: boolean;
    ranking_proveedores: boolean;
  };
  recordCounts: {
    provider_responses: number;
    rfq_items_master: number;
    ranking_proveedores: number;
  };
  errors: string[];
}

export const SupabaseDiagnostic: React.FC = () => {
  const [status, setStatus] = useState<DiagnosticStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const runDiagnostic = async () => {
      const diagnostic: DiagnosticStatus = {
        supabaseConfigured: supabase !== null,
        tablesAccessible: {
          provider_responses: false,
          rfq_items_master: false,
          ranking_proveedores: false
        },
        recordCounts: {
          provider_responses: 0,
          rfq_items_master: 0,
          ranking_proveedores: 0
        },
        errors: []
      };

      if (!supabase) {
        diagnostic.errors.push('Supabase no está configurado - revisa variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
        setStatus(diagnostic);
        setIsLoading(false);
        return;
      }

      try {
        // Test provider_responses
        try {
          const { count, error } = await supabase
            .from('provider_responses')
            .select('*', { count: 'exact', head: true });
          
          if (error) {
            diagnostic.errors.push(`provider_responses: ${error.message}`);
          } else {
            diagnostic.tablesAccessible.provider_responses = true;
            diagnostic.recordCounts.provider_responses = count || 0;
          }
        } catch (err: any) {
          diagnostic.errors.push(`provider_responses: ${err.message}`);
        }

        // Test rfq_items_master
        try {
          const { count, error } = await supabase
            .from('rfq_items_master')
            .select('*', { count: 'exact', head: true });
          
          if (error) {
            diagnostic.errors.push(`rfq_items_master: ${error.message}`);
          } else {
            diagnostic.tablesAccessible.rfq_items_master = true;
            diagnostic.recordCounts.rfq_items_master = count || 0;
          }
        } catch (err: any) {
          diagnostic.errors.push(`rfq_items_master: ${err.message}`);
        }

        // Test ranking_proveedores
        try {
          const { count, error } = await supabase
            .from('ranking_proveedores')
            .select('*', { count: 'exact', head: true });
          
          if (error) {
            diagnostic.errors.push(`ranking_proveedores: ${error.message}`);
          } else {
            diagnostic.tablesAccessible.ranking_proveedores = true;
            diagnostic.recordCounts.ranking_proveedores = count || 0;
          }
        } catch (err: any) {
          diagnostic.errors.push(`ranking_proveedores: ${err.message}`);
        }

      } catch (err: any) {
        diagnostic.errors.push(`Error general: ${err.message}`);
      }

      setStatus(diagnostic);
      setIsLoading(false);
    };

    runDiagnostic();
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Ejecutando diagnóstico de Supabase...</div>
      </div>
    );
  }

  if (!status) {
    return <div>Error cargando diagnóstico</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '14px' }}>
      <h3>🔍 Diagnóstico de Supabase</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Estado de Configuración:</strong> 
        <span style={{ color: status.supabaseConfigured ? 'green' : 'red' }}>
          {status.supabaseConfigured ? '✅ Configurado' : '❌ No configurado'}
        </span>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <strong>Acceso a Tablas:</strong>
        <ul>
          <li style={{ color: status.tablesAccessible.provider_responses ? 'green' : 'red' }}>
            provider_responses: {status.tablesAccessible.provider_responses ? '✅' : '❌'} 
            ({status.recordCounts.provider_responses} registros)
          </li>
          <li style={{ color: status.tablesAccessible.rfq_items_master ? 'green' : 'red' }}>
            rfq_items_master: {status.tablesAccessible.rfq_items_master ? '✅' : '❌'} 
            ({status.recordCounts.rfq_items_master} registros)
          </li>
          <li style={{ color: status.tablesAccessible.ranking_proveedores ? 'green' : 'red' }}>
            ranking_proveedores: {status.tablesAccessible.ranking_proveedores ? '✅' : '❌'} 
            ({status.recordCounts.ranking_proveedores} registros)
          </li>
        </ul>
      </div>

      {status.errors.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <strong>Errores:</strong>
          <ul style={{ color: 'red' }}>
            {status.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ 
        padding: '10px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '5px',
        fontSize: '12px'
      }}>
        <strong>Recomendaciones:</strong>
        <ul>
          {!status.supabaseConfigured && <li>Configura las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY</li>}
          {!status.tablesAccessible.provider_responses && <li>Verifica que la tabla provider_responses exista y tengas permisos RLS</li>}
          {!status.tablesAccessible.rfq_items_master && <li>Verifica que la tabla rfq_items_master exista y tengas permisos RLS</li>}
          {!status.tablesAccessible.ranking_proveedores && <li>Verifica que la tabla ranking_proveedores exista y tengas permisos RLS</li>}
          {status.recordCounts.provider_responses === 0 && <li>No hay datos en provider_responses - los gráficos de proveedores estarán vacíos</li>}
          {status.recordCounts.rfq_items_master === 0 && <li>No hay datos en rfq_items_master - los gráficos de RFQ estarán vacíos</li>}
          {status.recordCounts.ranking_proveedores === 0 && <li>No hay datos en ranking_proveedores - el ranking de proveedores estará vacío</li>}
        </ul>
      </div>
    </div>
  );
};
