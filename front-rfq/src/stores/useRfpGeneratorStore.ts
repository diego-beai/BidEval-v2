import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateRfpDocument, GenerateRfpResponse, GenerateRfpPayload } from '../services/n8n.service';

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

interface RfpGeneratorState {
  // Inputs — persisten entre navegaciones
  projectId: string | null;
  requirements: string;
  selectedSections: string[];

  // Resultado — persiste entre navegaciones
  result: GenerateRfpResponse | null;

  // Estado de generación — persiste en memoria (no en localStorage)
  isGenerating: boolean;
  error: string | null;

  // Actions
  setRequirements: (req: string) => void;
  setSelectedSections: (sections: string[]) => void;
  toggleSection: (section: string) => void;
  selectAllSections: () => void;
  deselectAllSections: () => void;
  clearResult: () => void;
  generate: (payload: GenerateRfpPayload, projectId: string) => Promise<void>;
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
      }),
    }
  )
);
