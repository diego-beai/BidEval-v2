import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Verificar si las credenciales están configuradas
const hasCredentials = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your-supabase-url';

if (!hasCredentials) {
  console.warn('⚠️ Supabase not configured. The QA module will work with mock data until you configure Supabase credentials in .env.local');
}

// Schema: 'desarrollo' para local, 'public' para produccion
const dbSchema = import.meta.env.VITE_SUPABASE_SCHEMA || 'public';

// Solo crear cliente si hay credenciales válidas
export const supabase: SupabaseClient<Database> | null = hasCredentials
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      },
      db: {
        schema: dbSchema as any
      }
    })
  : null;

// Helper para verificar si Supabase está disponible
export const isSupabaseConfigured = () => supabase !== null;
