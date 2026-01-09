import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ProcessingStatus, ProcessingStage, RfqResult, RfqItem } from '../types/rfq.types';
import { Provider } from '../types/provider.types';
import { RfqMetadata } from '../components/upload/RfqMetadataForm';

/**
 * Información de la RFQ base del cliente
 */
interface RfqBaseInfo {
  fileId: string;
  fileName: string;
  tiposProcesados: string[];
  uploadedAt: Date;
}

export interface TableFilters {
  project_name: string;
  evaluation: string[];
  requisito_rfq: string[];
  provider: string[];
  rfqSearch: string;
}

/**
 * Estado global de la aplicación usando Zustand
 */
interface RfqState {
  // File upload state
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;

  // RFQ Metadata state
  rfqMetadata: RfqMetadata;
  setRfqMetadata: (metadata: RfqMetadata) => void;

  // RFQ Base state
  rfqBase: RfqBaseInfo | null;
  isProcessingRfqBase: boolean;
  rfqBaseError: string | null;
  rfqBaseStatus: ProcessingStatus;
  selectedRfqBaseFiles: File[];
  setSelectedRfqBaseFiles: (files: File[]) => void;
  clearSelectedRfqBaseFiles: () => void;
  setRfqBase: (rfqBase: RfqBaseInfo, message?: string) => void;
  clearRfqBase: () => void;
  startProcessingRfqBase: (fileCount: number) => void;
  updateRfqBaseStatus: (status: Partial<ProcessingStatus>) => void;
  setRfqBaseError: (error: string | null) => void;

  // Processing state
  isProcessing: boolean;
  processingFileCount: number;
  status: ProcessingStatus;

  // Results state
  rawResults: RfqItem[] | null;
  results: RfqResult[] | null;

  // Error state
  error: string | null;

  // Actions
  startProcessing: (simulate?: boolean) => void;
  updateStatus: (status: Partial<ProcessingStatus>) => void;
  setResults: (results: RfqItem[], message?: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Table Action State
  applyTableFilters: boolean;
  setApplyTableFilters: (val: boolean) => void;
  tableFilters: TableFilters;
  setTableFilters: (filters: Partial<TableFilters> | ((prev: TableFilters) => TableFilters)) => void;

  // Chat state
  chatMessages: any[];
  setChatMessages: (messages: any[] | ((prev: any[]) => any[])) => void;

  // Simulation internal
  simulationInterval: number | null;
  startSimulation: (stages: any[]) => void;
  stopSimulation: () => void;
}

const initialStatus: ProcessingStatus = {
  stage: ProcessingStage.IDLE,
  progress: 0,
  message: 'Waiting for files...'
};

/**
 * Transforma los resultados de n8n a RfqResult[]
 */
function transformResults(items: RfqItem[]): RfqResult[] {
  // Mapeo de nombres de proveedores en la DB a enum Provider
  const providerMapping: Record<string, Provider> = {
    'TECNICASREUNIDAS': Provider.TR,
    'IDOM': Provider.IDOM,
    'SACYR': Provider.SACYR,
    'EA': Provider.EA,
    'SENER': Provider.SENER,
    'TRESCA': Provider.TRESCA,
    'WORLEY': Provider.WORLEY
  };

  return items.map((item) => {
    const evaluations: Partial<Record<Provider, any>> = {};

    // Extraer evaluaciones de cada proveedor usando el mapeo
    Object.entries(providerMapping).forEach(([dbName, enumValue]) => {
      const evaluation = item[dbName as keyof RfqItem];

      if (evaluation && typeof evaluation === 'string') {
        evaluations[enumValue] = {
          provider: enumValue,
          evaluation,
          hasValue: evaluation !== 'NOT QUOTED' && evaluation !== 'NO INFORMATION'
        };
      }
    });

    const result: RfqResult = {
      id: item.id,
      projectName: String(item.project_name || ''),
      fase: String(item.fase || ''),
      evaluation: String(item.evaluation || ''),
      rfq_requisito: item.requisito_rfq,
      evaluations,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };

    return result;
  });
}

export const useRfqStore = create<RfqState>()(
  devtools(
    (set, get) => ({
      selectedFiles: [],
      isProcessing: false,
      processingFileCount: 0,
      status: initialStatus,
      rawResults: null,
      results: null,
      error: null,
      rfqBase: null,
      isProcessingRfqBase: false,
      rfqBaseError: null,
      rfqBaseStatus: initialStatus,
      selectedRfqBaseFiles: [],

      applyTableFilters: false,
      setApplyTableFilters: (val) => set({ applyTableFilters: val }),
      tableFilters: {
        project_name: '',
        evaluation: [],
        requisito_rfq: [],
        provider: [],
        rfqSearch: ''
      },
      setTableFilters: (filtersUpdate) => {
        if (typeof filtersUpdate === 'function') {
          set({ tableFilters: filtersUpdate(get().tableFilters) });
        } else {
          set({ tableFilters: { ...get().tableFilters, ...filtersUpdate } });
        }
      },

      chatMessages: [],
      setChatMessages: (messagesUpdater) => {
        if (typeof messagesUpdater === 'function') {
          set({ chatMessages: messagesUpdater(get().chatMessages) });
        } else {
          set({ chatMessages: messagesUpdater });
        }
      },
      rfqMetadata: {
        proyecto: '',
        proveedor: '',
        tipoEvaluacion: []
      },

      setSelectedFiles: (files) => set({ selectedFiles: files, error: null }),

      setRfqMetadata: (metadata) => set({ rfqMetadata: metadata }),

      addFiles: (files) => {
        const current = get().selectedFiles;
        const newFiles = [...current, ...files].slice(0, 7); // Max 7 files
        set({ selectedFiles: newFiles, error: null });
      },

      removeFile: (index) => {
        const current = get().selectedFiles;
        set({ selectedFiles: current.filter((_, i) => i !== index) });
      },

      // RFQ Base file management
      setSelectedRfqBaseFiles: (files) => set({ selectedRfqBaseFiles: files, rfqBaseError: null }),

      clearSelectedRfqBaseFiles: () => set({ selectedRfqBaseFiles: [] }),

      // RFQ Base actions
      setRfqBase: (rfqBase, message?: string) => set({
        rfqBase,
        isProcessingRfqBase: false,
        rfqBaseError: null,
        selectedRfqBaseFiles: [],
        rfqBaseStatus: {
          stage: ProcessingStage.COMPLETED,
          progress: 100,
          message: message || 'Base RFQ processed successfully!'
        }
      }),

      clearRfqBase: () => set({
        rfqBase: null,
        rfqBaseError: null,
        isProcessingRfqBase: false,
        selectedRfqBaseFiles: [],
        rfqBaseStatus: initialStatus
      }),

      startProcessingRfqBase: (fileCount) => {
        set({
          isProcessingRfqBase: true,
          rfqBaseError: null,
          rfqBaseStatus: {
            stage: ProcessingStage.UPLOADING,
            progress: 5,
            message: `Uploading ${fileCount} RFQ${fileCount > 1 ? 's' : ''} to n8n...`
          }
        });

        get().startSimulation([
          { threshold: 0.15, stage: ProcessingStage.OCR_PROCESSING, message: 'Extracting text from RFQ...' },
          { threshold: 0.40, stage: ProcessingStage.CLASSIFYING, message: 'Analyzing RFQ structure...' },
          { threshold: 0.70, stage: ProcessingStage.EMBEDDING, message: 'Indexing requirements...' },
          { threshold: 0.90, stage: ProcessingStage.COMPLETED, message: 'Finalizing processing...' }
        ]);
      },

      updateRfqBaseStatus: (statusUpdate) => {
        const currentStatus = get().rfqBaseStatus;
        set({
          rfqBaseStatus: { ...currentStatus, ...statusUpdate }
        });
      },

      setRfqBaseError: (error) => set({
        rfqBaseError: error,
        isProcessingRfqBase: false,
        rfqBaseStatus: error ? {
          stage: ProcessingStage.ERROR,
          progress: 0,
          message: error
        } : initialStatus
      }),

      startProcessing: (simulate = true) => {
        const fileCount = get().selectedFiles.length;
        set({
          isProcessing: true,
          processingFileCount: fileCount,
          error: null,
          status: {
            stage: ProcessingStage.UPLOADING,
            progress: 5,
            message: `Uploading ${fileCount} file${fileCount > 1 ? 's' : ''} to n8n...`
          }
        });

        if (simulate) {
          get().startSimulation([
            { threshold: 0.15, stage: ProcessingStage.OCR_PROCESSING, message: 'Extracting text from PDF...' },
            { threshold: 0.30, stage: ProcessingStage.CLASSIFYING, message: 'Classifying provider and type...' },
            { threshold: 0.50, stage: ProcessingStage.EMBEDDING, message: 'Generating vector embeddings...' },
            { threshold: 0.70, stage: ProcessingStage.EVALUATING, message: 'Evaluating items with AI...' },
            { threshold: 0.90, stage: ProcessingStage.EVALUATING, message: 'Finalizing evaluation...' }
          ]);
        }
      },

      updateStatus: (statusUpdate) => {
        const currentStatus = get().status;
        set({
          status: { ...currentStatus, ...statusUpdate }
        });
      },

      setResults: (rawResults: RfqItem[], message?: string) => {
        const transformedResults = transformResults(rawResults);
        const fileCount = get().processingFileCount;

        get().stopSimulation();

        set({
          rawResults,
          results: transformedResults,
          isProcessing: false,
          processingFileCount: 0,
          status: {
            stage: ProcessingStage.COMPLETED,
            progress: 100,
            message: message || `Proposal processed! ${fileCount} ${fileCount === 1 ? 'proposal' : 'proposals'} completed.`
          }
        });
      },

      setError: (error) => {
        get().stopSimulation();
        set({
          error,
          isProcessing: false,
          processingFileCount: 0,
          status: error ? {
            stage: ProcessingStage.ERROR,
            progress: 0,
            message: error
          } : initialStatus
        });
      },

      simulationInterval: null,

      startSimulation: (stages) => {
        get().stopSimulation(); // Clear any existing

        const startTime = Date.now();
        const estimatedTotalTime = 120000; // 2 minutes
        let currentStageIndex = 0;

        const interval = window.setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progressRatio = Math.min(elapsed / estimatedTotalTime, 0.95);
          const progress = Math.floor(progressRatio * 100);

          while (
            currentStageIndex < stages.length - 1 &&
            progressRatio > stages[currentStageIndex + 1].threshold
          ) {
            currentStageIndex++;
          }

          const currentStage = stages[currentStageIndex];

          if (get().isProcessing) {
            set((state) => ({
              status: {
                ...state.status,
                progress,
                stage: currentStage.stage,
                message: currentStage.message
              }
            }));
          }

          if (get().isProcessingRfqBase) {
            set((state) => ({
              rfqBaseStatus: {
                ...state.rfqBaseStatus,
                progress,
                stage: currentStage.stage,
                message: currentStage.message
              }
            }));
          }
        }, 1000);

        set({ simulationInterval: interval });
      },

      stopSimulation: () => {
        const interval = get().simulationInterval;
        if (interval) {
          clearInterval(interval);
          set({ simulationInterval: null });
        }
      },

      reset: () => set({
        selectedFiles: [],
        isProcessing: false,
        processingFileCount: 0,
        status: initialStatus,
        rawResults: null,
        results: null,
        error: null,
        rfqMetadata: {
          proyecto: '',
          proveedor: '',
          tipoEvaluacion: []
        }
      })
    }),
    { name: 'RfqStore' }
  )
);
