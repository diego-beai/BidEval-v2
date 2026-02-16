import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { sanitizeFields } from '../utils/sanitize';
import type {
  Communication,
  CommunicationType,
  QATimelineItem,
  TimelineItem,
  TimelineFilterType,
  ProviderStats,
} from '../types/communications.types';

interface CommunicationsState {
  communications: Communication[];
  qaItems: QATimelineItem[];
  selectedProvider: string | null;
  filterType: TimelineFilterType;
  isLoading: boolean;
  showNewForm: CommunicationType | null;
  showEmailComposer: boolean;

  // Actions
  loadCommunications: (projectId: string) => Promise<void>;
  loadQAForProvider: (projectId: string, providerName: string) => Promise<void>;
  createCommunication: (data: Partial<Communication>) => Promise<void>;
  updateCommunication: (id: string, data: Partial<Communication>) => Promise<void>;
  deleteCommunication: (id: string) => Promise<void>;
  setSelectedProvider: (name: string | null) => void;
  setFilterType: (type: TimelineFilterType) => void;
  setShowNewForm: (type: CommunicationType | null) => void;
  setShowEmailComposer: (show: boolean) => void;
  getTimeline: () => TimelineItem[];
  getProviderStats: () => ProviderStats[];
  subscribeRealtime: (projectId: string) => () => void;
}

export const useCommunicationsStore = create<CommunicationsState>()(
  devtools(
    (set, get) => ({
      communications: [],
      qaItems: [],
      selectedProvider: null,
      filterType: 'all',
      isLoading: false,
      showNewForm: null,
      showEmailComposer: false,

      loadCommunications: async (projectId: string) => {
        if (!supabase || !projectId) return;
        set({ isLoading: true });
        try {
          const { data, error } = await (supabase
            .from('project_communications' as any)
            .select('*')
            .eq('project_id', projectId)
            .order('sent_at', { ascending: false })) as { data: any[] | null; error: any };

          if (error) {
            set({ isLoading: false });
            return;
          }

          // Ensure comm_type defaults to 'email' for legacy rows
          const comms = (data || []).map((c: any) => ({
            ...c,
            comm_type: c.comm_type || 'email',
          })) as Communication[];

          set({ communications: comms, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      loadQAForProvider: async (projectId: string, providerName: string) => {
        if (!supabase || !projectId || !providerName) {
          set({ qaItems: [] });
          return;
        }
        try {
          const { data, error } = await (supabase
            .from('qa_audit' as any)
            .select('id, project_name, provider_name, discipline, question, status, importance, response, created_at')
            .eq('project_name', projectId)
            .eq('provider_name', providerName)
            .order('created_at', { ascending: false })) as { data: any[] | null; error: any };

          if (error) {
            set({ qaItems: [] });
            return;
          }

          set({ qaItems: (data || []) as QATimelineItem[] });
        } catch {
          set({ qaItems: [] });
        }
      },

      createCommunication: async (data: Partial<Communication>) => {
        if (!supabase) return;
        try {
          const sanitized = sanitizeFields(data as Record<string, unknown>, ['body', 'subject']);
          const { data: inserted, error } = await (supabase
            .from('project_communications' as any)
            .insert([sanitized] as any)
            .select()
            .single()) as { data: any; error: any };

          if (error) {
            return;
          }

          if (inserted) {
            set(state => ({
              communications: [{ ...inserted, comm_type: inserted.comm_type || 'email' } as Communication, ...state.communications],
              showNewForm: null,
              showEmailComposer: false,
            }));
          }
        } catch {
          // ignored
        }
      },

      updateCommunication: async (id: string, data: Partial<Communication>) => {
        if (!supabase) return;
        try {
          const sanitized = sanitizeFields(data as Record<string, unknown>, ['body', 'subject']);
          const query = supabase
            .from('project_communications' as any) as any;
          const { data: updated, error } = await query
            .update(sanitized)
            .eq('id', id)
            .select()
            .single() as { data: any; error: any };

          if (error) {
            return;
          }

          if (updated) {
            set(state => ({
              communications: state.communications.map(c =>
                c.id === id ? { ...c, ...updated, comm_type: updated.comm_type || 'email' } as Communication : c
              ),
            }));
          }
        } catch {
          // ignored
        }
      },

      deleteCommunication: async (id: string) => {
        if (!supabase) return;
        try {
          const { error } = await (supabase
            .from('project_communications' as any)
            .delete()
            .eq('id', id)) as { error: any };

          if (error) {
            return;
          }

          set(state => ({
            communications: state.communications.filter(c => c.id !== id),
          }));
        } catch {
          // ignored
        }
      },

      setSelectedProvider: (name) => {
        set({ selectedProvider: name, filterType: 'all' });
      },

      setFilterType: (type) => set({ filterType: type }),

      setShowNewForm: (type) => set({ showNewForm: type, showEmailComposer: false }),

      setShowEmailComposer: (show) => set({ showEmailComposer: show, showNewForm: null }),

      getTimeline: () => {
        const { communications, qaItems, selectedProvider, filterType } = get();

        // Filter communications by selected provider (normalize to handle case/spacing differences)
        const normalize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        let filteredComms = selectedProvider
          ? communications.filter(c => normalize(c.provider_name) === normalize(selectedProvider))
          : communications;

        // Apply type filter
        if (filterType !== 'all' && filterType !== 'qa') {
          filteredComms = filteredComms.filter(c => c.comm_type === filterType);
        }

        // Build timeline items from communications
        const commItems: TimelineItem[] = filterType === 'qa'
          ? []
          : filteredComms.map(c => ({
              id: c.id,
              type: c.comm_type,
              date: c.sent_at || c.created_at,
              data: c,
            }));

        // Build timeline items from QA
        const qaTimelineItems: TimelineItem[] =
          filterType !== 'all' && filterType !== 'qa'
            ? []
            : qaItems.map(q => ({
                id: `qa-${q.id}`,
                type: 'qa' as const,
                date: q.created_at,
                data: q,
              }));

        // Merge and sort by date descending
        const allItems = [...commItems, ...qaTimelineItems];
        allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return allItems;
      },

      getProviderStats: () => {
        const { communications } = get();
        const statsMap = new Map<string, ProviderStats>();

        communications.forEach(c => {
          const existing = statsMap.get(c.provider_name);
          if (existing) {
            existing.totalComms += 1;
            if (!existing.lastContact || new Date(c.sent_at) > new Date(existing.lastContact)) {
              existing.lastContact = c.sent_at;
            }
          } else {
            statsMap.set(c.provider_name, {
              name: c.provider_name,
              totalComms: 1,
              lastContact: c.sent_at,
            });
          }
        });

        return Array.from(statsMap.values()).sort((a, b) => {
          if (!a.lastContact) return 1;
          if (!b.lastContact) return -1;
          return new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime();
        });
      },

      subscribeRealtime: (projectId: string) => {
        if (!supabase || !projectId) return () => {};

        const channel = supabase
          .channel(`comms-${projectId}`)
          .on(
            'postgres_changes' as any,
            {
              event: '*',
              schema: 'public',
              table: 'project_communications',
              filter: `project_id=eq.${projectId}`,
            } as any,
            () => {
              // Reload on any change
              get().loadCommunications(projectId);
            }
          )
          .subscribe();

        return () => {
          supabase!.removeChannel(channel);
        };
      },
    }),
    { name: 'CommunicationsStore' }
  )
);
