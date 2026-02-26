import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface UseSupplierDirectoryQueryOptions {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useSupplierDirectoryQuery({ page = 1, pageSize = 30, enabled = true }: UseSupplierDirectoryQueryOptions = {}) {
  return useQuery({
    queryKey: ['suppliers', 'directory', page, pageSize],
    queryFn: async () => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await (supabase!
        .from('v_supplier_history' as any)
        .select('*', { count: 'exact' })
        .order('project_count', { ascending: false })
        .range(from, to)) as { data: any[] | null; error: any; count: number | null };

      if (error) throw error;

      return {
        suppliers: data || [],
        totalCount: count || 0,
        page,
        pageSize,
      };
    },
    enabled: enabled && isSupabaseConfigured(),
  });
}
