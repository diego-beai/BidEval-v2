import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface UseRfqItemsQueryOptions {
  projectId: string | null;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useRfqItemsQuery({ projectId, page = 1, pageSize = 50, enabled = true }: UseRfqItemsQueryOptions) {
  return useQuery({
    queryKey: ['rfqItems', projectId, page, pageSize],
    queryFn: async () => {
      if (!projectId) return { items: [], totalCount: 0, page, pageSize };

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase!
        .from('rfq_items_master')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        items: data || [],
        totalCount: count || 0,
        page,
        pageSize,
      };
    },
    enabled: enabled && !!projectId && isSupabaseConfigured(),
  });
}
