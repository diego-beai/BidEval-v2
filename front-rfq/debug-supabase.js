// Script de diagnóstico para verificar configuración de Supabase
import { supabase } from './src/lib/supabase.js';

console.log('=== DIAGNÓSTICO DE SUPABASE ===');
console.log('Supabase client:', supabase);
console.log('¿Supabase está configurado?', supabase !== null);

if (supabase) {
  console.log('URL de Supabase:', supabase.supabaseUrl);
  
  // Test de conexión a la base de datos
  const testConnection = async () => {
    try {
      console.log('\n=== TEST DE CONEXIÓN ===');
      
      // Test 1: Verificar tabla provider_responses
      console.log('Verificando tabla provider_responses...');
      const { data: providerData, error: providerError } = await supabase
        .from('provider_responses')
        .select('count')
        .limit(1);
      
      if (providerError) {
        console.error('❌ Error en provider_responses:', providerError.message);
      } else {
        console.log('✅ provider_responses accesible');
      }
      
      // Test 2: Verificar tabla rfq_items_master
      console.log('Verificando tabla rfq_items_master...');
      const { data: rfqData, error: rfqError } = await supabase
        .from('rfq_items_master')
        .select('count')
        .limit(1);
      
      if (rfqError) {
        console.error('❌ Error en rfq_items_master:', rfqError.message);
      } else {
        console.log('✅ rfq_items_master accesible');
      }
      
      // Test 3: Verificar tabla ranking_proveedores
      console.log('Verificando tabla ranking_proveedores...');
      const { data: rankingData, error: rankingError } = await supabase
        .from('ranking_proveedores')
        .select('count')
        .limit(1);
      
      if (rankingError) {
        console.error('❌ Error en ranking_proveedores:', rankingError.message);
      } else {
        console.log('✅ ranking_proveedores accesible');
      }
      
      // Test 4: Contar registros en cada tabla
      console.log('\n=== CONTADOR DE REGISTROS ===');
      
      const { count: providerCount } = await supabase
        .from('provider_responses')
        .select('*', { count: 'exact', head: true });
      console.log('Registros en provider_responses:', providerCount || 0);
      
      const { count: rfqCount } = await supabase
        .from('rfq_items_master')
        .select('*', { count: 'exact', head: true });
      console.log('Registros en rfq_items_master:', rfqCount || 0);
      
      const { count: rankingCount } = await supabase
        .from('ranking_proveedores')
        .select('*', { count: 'exact', head: true });
      console.log('Registros en ranking_proveedores:', rankingCount || 0);
      
    } catch (error) {
      console.error('❌ Error general en la conexión:', error.message);
    }
  };
  
  testConnection();
} else {
  console.log('❌ Supabase no está configurado. Las variables de entorno no están definidas correctamente.');
  console.log('Por favor, configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env.local');
}
