import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Verificar si las credenciales están configuradas
const hasCredentials = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your-supabase-url';

if (!hasCredentials) {
  // Supabase not configured - QA module will work with mock data
}

// Schema: 'desarrollo' para local, 'public' (default) para produccion
const dbSchema = import.meta.env.VITE_SUPABASE_SCHEMA;

// Solo crear cliente si hay credenciales válidas
// Nota: Solo pasar db.schema cuando NO es 'public' para evitar el header
// Accept-Profile que causa 406 en Supabase self-hosted
const clientOptions: Parameters<typeof createClient>[2] = {
  auth: {
    persistSession: false
  },
};

if (dbSchema && dbSchema !== 'public') {
  clientOptions.db = { schema: dbSchema as any };
}

export const supabase: SupabaseClient<Database> | null = hasCredentials
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, clientOptions)
  : null;

// Helper para verificar si Supabase está disponible
export const isSupabaseConfigured = () => supabase !== null;
