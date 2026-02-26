import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface UseEconomicQueryOptions {
  projectId: string | null;
  enabled?: boolean;
}

export function useEconomicQuery({ projectId, enabled = true }: UseEconomicQueryOptions) {
  return useQuery({
    queryKey: ['economic', 'offers', projectId],
    queryFn: async () => {
      if (!projectId) return { offers: [] };

      const { data, error } = await supabase!
        .from('economic_offers')
        .select('*')
        .eq('project_id', projectId)
        .order('total_price', { ascending: true, nullsFirst: false });

      if (error) throw error;

      return { offers: data || [] };
    },
    enabled: enabled && !!projectId && isSupabaseConfigured(),
  });
}
