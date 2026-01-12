// Script simple para verificar variables de entorno
console.log('=== DIAGNÓSTICO DE VARIABLES DE ENTORNO ===');

// Cargar variables de entorno desde .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ Configurada' : '❌ No configurada');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ No configurada');
console.log('VITE_N8N_WEBHOOK_URL:', process.env.VITE_N8N_WEBHOOK_URL || 'No configurada (usa default)');

if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
  console.log('\n✅ Supabase parece estar configurado correctamente');
  
  // Verificar que no sean valores por defecto
  if (process.env.VITE_SUPABASE_URL.includes('tu-proyecto') || process.env.VITE_SUPABASE_ANON_KEY.includes('tu_clave')) {
    console.log('❌ ADVERTENCIA: Parece que estás usando valores por defecto del ejemplo');
  }
} else {
  console.log('\n❌ Supabase no está configurado correctamente');
  console.log('Por favor, configura las siguientes variables en tu archivo .env.local:');
  console.log('- VITE_SUPABASE_URL=https://tu-proyecto.supabase.co');
  console.log('- VITE_SUPABASE_ANON_KEY=tu_clave_anonima_aqui');
}
