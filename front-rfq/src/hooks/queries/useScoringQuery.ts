import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface UseScoringQueryOptions {
  projectId: string | null;
  enabled?: boolean;
}

export function useScoringQuery({ projectId, enabled = true }: UseScoringQueryOptions) {
  return useQuery({
    queryKey: ['scoring', 'ranking', projectId],
    queryFn: async () => {
      if (!projectId) return { rankings: [] };

      const { data, error } = await supabase!
        .from('ranking_proveedores')
        .select('*')
        .eq('project_id', projectId)
        .order('overall_score', { ascending: false, nullsFirst: false });

      if (error) throw error;

      return { rankings: data || [] };
    },
    enabled: enabled && !!projectId && isSupabaseConfigured(),
  });
}
