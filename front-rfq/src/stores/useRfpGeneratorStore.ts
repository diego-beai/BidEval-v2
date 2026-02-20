import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateRfpDocument, GenerateRfpResponse, GenerateRfpPayload } from '../services/n8n.service';
import type { RfpSection, RfpAgentType } from '../components/rfp/RfpSectionEditor';

const DEFAULT_SECTIONS = [
  'scope',
  'technical_requirements',
  'evaluation_criteria',
  'commercial_terms',
  'deadlines',
  'deliverables',
  'legal_terms',
  'submission_instructions',
];

// Default section presets for initDefaultSections
const DEFAULT_SECTION_PRESETS: Array<{ agentType: RfpAgentType; titleEs: string; titleEn: string }> = [
  { agentType: 'context', titleEs: 'Contexto y Antecedentes', titleEn: 'Context & Background' },
  { agentType: 'technical_scope', titleEs: 'Alcance Tecnico', titleEn: 'Technical Scope' },
  { agentType: 'functional_requirements', titleEs: 'Requisitos Funcionales', titleEn: 'Functional Requirements' },
  { agentType: 'economic_conditions', titleEs: 'Condiciones Economicas', titleEn: 'Economic Conditions' },
  { agentType: 'general_clauses', titleEs: 'Clausulas Generales', titleEn: 'General Clauses' },
  { agentType: 'consolidator', titleEs: 'Consolidador Final', titleEn: 'Final Consolidator' },
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface RfpGeneratorState {
  // Inputs -- persisten entre navegaciones
  projectId: string | null;
  requirements: string;
  selectedSections: string[];

  // Resultado -- persiste entre navegaciones
  result: GenerateRfpResponse | null;

  // Estado de generacion -- persiste en memoria (no en localStorage)
  isGenerating: boolean;
  error: string | null;

  // Section-based editor state
  sections: RfpSection[];
  activeTab: 'sections' | 'document';

  // Actions (existing)
  setRequirements: (req: string) => void;
  setSelectedSections: (sections: string[]) => void;
  toggleSection: (section: string) => void;
  selectAllSections: () => void;
  deselectAllSections: () => void;
  clearResult: () => void;
  generate: (payload: GenerateRfpPayload, projectId: string) => Promise<void>;

  // Actions (new: section management)
  addSection: (agentType: string, title: string) => void;
  updateSection: (id: string, content: string) => void;
  deleteSection: (id: string) => void;
  reorderSections: (fromIdx: number, toIdx: number) => void;
  lockSection: (id: string, locked: boolean) => void;
  generateSection: (id: string) => Promise<void>;
  generateAllSections: () => Promise<void>;
  setActiveTab: (tab: 'sections' | 'document') => void;
  initDefaultSections: () => void;
}

export const useRfpGeneratorStore = create<RfpGeneratorState>()(
  persist(
    (set, get) => ({
      projectId: null,
      requirements: '',
      selectedSections: [...DEFAULT_SECTIONS],
      result: null,
      isGenerating: false,
      error: null,
      sections: [],
      activeTab: 'sections' as const,

      setRequirements: (req) => set({ requirements: req }),

      setSelectedSections: (sections) => set({ selectedSections: sections }),

      toggleSection: (section) => set((state) => ({
        selectedSections: state.selectedSections.includes(section)
          ? state.selectedSections.filter(s => s !== section)
          : [...state.selectedSections, section],
      })),

      selectAllSections: () => set({ selectedSections: [...DEFAULT_SECTIONS] }),

      deselectAllSections: () => set({ selectedSections: [] }),

      clearResult: () => set({ result: null, error: null }),

      generate: async (payload, projectId) => {
        if (get().isGenerating) return;
        set({ isGenerating: true, result: null, error: null, projectId });
        try {
          const response = await generateRfpDocument(payload);
          set({ result: response, isGenerating: false });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error generating RFP';
          set({ error: msg, isGenerating: false });
        }
      },

      // ========================================
      // SECTION MANAGEMENT
      // ========================================

      addSection: (agentType: string, title: string) => {
        const { sections } = get();
        const newSection: RfpSection = {
          id: generateId(),
          title,
          content: '',
          agentType: agentType as RfpAgentType,
          sortOrder: sections.length + 1,
          isLocked: false,
        };
        set({ sections: [...sections, newSection] });
      },

      updateSection: (id: string, content: string) => {
        const { sections } = get();
        set({
          sections: sections.map((s) =>
            s.id === id ? { ...s, content } : s
          ),
        });
      },

      deleteSection: (id: string) => {
        const { sections } = get();
        const filtered = sections.filter((s) => s.id !== id);
        // Re-index sort order
        const reindexed = filtered.map((s, i) => ({ ...s, sortOrder: i + 1 }));
        set({ sections: reindexed });
      },

      reorderSections: (fromIdx: number, toIdx: number) => {
        const { sections } = get();
        const updated = [...sections];
        const [moved] = updated.splice(fromIdx, 1);
        updated.splice(toIdx, 0, moved);
        // Re-index sort order
        const reindexed = updated.map((s, i) => ({ ...s, sortOrder: i + 1 }));
        set({ sections: reindexed });
      },

      lockSection: (id: string, locked: boolean) => {
        const { sections } = get();
        set({
          sections: sections.map((s) =>
            s.id === id ? { ...s, isLocked: locked } : s
          ),
        });
      },

      generateSection: async (id: string) => {
        const { sections, requirements, projectId } = get();
        const section = sections.find((s) => s.id === id);
        if (!section || section.isLocked) return;

        set({ isGenerating: true, error: null });

        try {
          // Use the main generate endpoint but request only the specific section
          const payload: GenerateRfpPayload = {
            project_id: projectId || '',
            project_name: '',
            project_type: 'RFP',
            description: '',
            requirements: requirements.trim(),
            sections: [section.agentType],
          };

          const response = await generateRfpDocument(payload);

          // Extract content from response
          let newContent = '';
          if (response.sections && response.sections.length > 0) {
            newContent = response.sections.map((s) => `## ${s.title}\n\n${s.content}`).join('\n\n');
          } else if (response.document) {
            newContent = response.document;
          }

          set({
            sections: get().sections.map((s) =>
              s.id === id ? { ...s, content: newContent || s.content } : s
            ),
            isGenerating: false,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error generating section';
          set({ error: msg, isGenerating: false });
        }
      },

      generateAllSections: async () => {
        const { sections } = get();
        const unlockedSections = sections.filter((s) => !s.isLocked);

        if (unlockedSections.length === 0) return;

        set({ isGenerating: true, error: null });

        // Generate each unlocked section sequentially
        for (const section of unlockedSections) {
          try {
            const { requirements, projectId } = get();
            const payload: GenerateRfpPayload = {
              project_id: projectId || '',
              project_name: '',
              project_type: 'RFP',
              description: '',
              requirements: requirements.trim(),
              sections: [section.agentType],
            };

            const response = await generateRfpDocument(payload);

            let newContent = '';
            if (response.sections && response.sections.length > 0) {
              newContent = response.sections.map((s) => `## ${s.title}\n\n${s.content}`).join('\n\n');
            } else if (response.document) {
              newContent = response.document;
            }

            set({
              sections: get().sections.map((s) =>
                s.id === section.id ? { ...s, content: newContent || s.content } : s
              ),
            });
          } catch (err) {
            // Continue with next section on error
            const msg = err instanceof Error ? err.message : 'Error generating section';
            set({ error: msg });
          }
        }

        set({ isGenerating: false });
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      initDefaultSections: () => {
        // Detect language from localStorage or default to 'es'
        let lang: 'es' | 'en' = 'es';
        try {
          const stored = localStorage.getItem('bideval-language');
          if (stored) {
            const parsed = JSON.parse(stored);
            lang = parsed?.state?.language || 'es';
          }
        } catch {
          // ignore
        }

        const newSections: RfpSection[] = DEFAULT_SECTION_PRESETS.map((preset, i) => ({
          id: generateId() + i,
          title: lang === 'es' ? preset.titleEs : preset.titleEn,
          content: '',
          agentType: preset.agentType,
          sortOrder: i + 1,
          isLocked: false,
        }));

        set({ sections: newSections });
      },
    }),
    {
      name: 'bideval-rfp-generator',
      // isGenerating y error NO se persisten en localStorage
      // Si el usuario recarga, no queremos un estado de "generando" permanente
      partialize: (state) => ({
        projectId: state.projectId,
        requirements: state.requirements,
        selectedSections: state.selectedSections,
        result: state.result,
        sections: state.sections,
        activeTab: state.activeTab,
      }),
    }
  )
);
