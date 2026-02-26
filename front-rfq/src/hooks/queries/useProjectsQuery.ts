import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export interface ProjectRow {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  project_type: string;
  currency: string;
  reference_code: string | null;
  owner_name: string | null;
  ai_context: string | null;
}

interface UseProjectsQueryOptions {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useProjectsQuery({ page = 1, pageSize = 20, enabled = true }: UseProjectsQueryOptions = {}) {
  return useQuery({
    queryKey: ['projects', 'list', page, pageSize],
    queryFn: async () => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase!
        .from('projects')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        projects: (data || []) as ProjectRow[],
        totalCount: count || 0,
        page,
        pageSize,
      };
    },
    enabled: enabled && isSupabaseConfigured(),
  });
}
