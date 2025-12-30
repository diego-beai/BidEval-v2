import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ProcessingStatus, ProcessingStage, RfqResult, RfqItem } from '../types/rfq.types';
import { Provider } from '../types/provider.types';

/**
 * Información de la RFQ base del cliente
 */
interface RfqBaseInfo {
  fileId: string;
  fileName: string;
  tiposProcesados: string[];
  uploadedAt: Date;
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

  // RFQ Base state
  rfqBase: RfqBaseInfo | null;
  isProcessingRfqBase: boolean;
  rfqBaseError: string | null;
  rfqBaseStatus: ProcessingStatus;
  setRfqBase: (rfqBase: RfqBaseInfo) => void;
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
  startProcessing: () => void;
  updateStatus: (status: Partial<ProcessingStatus>) => void;
  setResults: (results: RfqItem[]) => void;
  setError: (error: string) => void;
  reset: () => void;
}

const initialStatus: ProcessingStatus = {
  stage: ProcessingStage.IDLE,
  progress: 0,
  message: 'Esperando archivos...'
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
          hasValue: evaluation !== 'NO COTIZADO' && evaluation !== 'SIN INFORMACIÓN'
        };
      }
    });

    const result: RfqResult = {
      id: item.id,
      item: String(item.descripcion_item || item.item || ''),
      fase: String(item.fase || ''),
      evaluation: String(item.Evaluation || ''),
      rfq_requisito: item.rfq_requisito,
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

      setSelectedFiles: (files) => set({ selectedFiles: files, error: null }),

      addFiles: (files) => {
        const current = get().selectedFiles;
        const newFiles = [...current, ...files].slice(0, 7); // Máximo 7 archivos
        set({ selectedFiles: newFiles, error: null });
      },

      removeFile: (index) => {
        const current = get().selectedFiles;
        set({ selectedFiles: current.filter((_, i) => i !== index) });
      },

      // RFQ Base actions
      setRfqBase: (rfqBase) => set({
        rfqBase,
        isProcessingRfqBase: false,
        rfqBaseError: null,
        rfqBaseStatus: {
          stage: ProcessingStage.COMPLETED,
          progress: 100,
          message: '¡RFQ procesada con éxito!'
        }
      }),

      clearRfqBase: () => set({
        rfqBase: null,
        rfqBaseError: null,
        isProcessingRfqBase: false,
        rfqBaseStatus: initialStatus
      }),

      startProcessingRfqBase: (fileCount) => set({
        isProcessingRfqBase: true,
        rfqBaseError: null,
        rfqBaseStatus: {
          stage: ProcessingStage.UPLOADING,
          progress: 5,
          message: `Subiendo ${fileCount} RFQ${fileCount > 1 ? 's' : ''} a n8n...`
        }
      }),

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

      startProcessing: () => {
        const fileCount = get().selectedFiles.length;
        set({
          isProcessing: true,
          processingFileCount: fileCount,
          error: null,
          status: {
            stage: ProcessingStage.UPLOADING,
            progress: 5,
            message: `Subiendo ${fileCount} archivo${fileCount > 1 ? 's' : ''} a n8n...`
          }
        });
      },

      updateStatus: (statusUpdate) => {
        const currentStatus = get().status;
        set({
          status: { ...currentStatus, ...statusUpdate }
        });
      },

      setResults: (rawResults) => {
        const transformedResults = transformResults(rawResults);
        const fileCount = get().processingFileCount;

        set({
          rawResults,
          results: transformedResults,
          isProcessing: false,
          processingFileCount: 0,
          status: {
            stage: ProcessingStage.COMPLETED,
            progress: 100,
            message: `¡Propuesta procesada! ${fileCount} ${fileCount === 1 ? 'propuesta procesada' : 'propuestas procesadas'}.`
          }
        });
      },

      setError: (error) => set({
        error,
        isProcessing: false,
        processingFileCount: 0,
        status: {
          stage: ProcessingStage.ERROR,
          progress: 0,
          message: error
        }
      }),

      reset: () => set({
        selectedFiles: [],
        isProcessing: false,
        processingFileCount: 0,
        status: initialStatus,
        rawResults: null,
        results: null,
        error: null
      })
    }),
    { name: 'RfqStore' }
  )
);
