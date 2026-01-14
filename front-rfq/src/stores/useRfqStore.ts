import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { ProcessingStatus, ProcessingStage, RfqResult, RfqItem } from '../types/rfq.types';
import { Provider } from '../types/provider.types';
import { RfqMetadata } from '../components/upload/RfqMetadataForm';
import { API_CONFIG } from '../config/constants';
import { supabase } from '../lib/supabase';
import { useToastStore } from './useToastStore';
import { useSessionViewStore } from './useSessionViewStore';

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
  evaluation_type: string[];
  phase: string[];
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
  isLoadingData: boolean;  // For data fetching (doesn't block UI)
  processingFileCount: number;
  status: ProcessingStatus;

  // Results state
  rawResults: RfqItem[] | null;
  results: RfqResult[] | null;
  // Table data from webhook
  tableData: any[];
  proposalEvaluations: any[];
  pivotTableData: any[];
  providerRanking: any[];
  projects: string[];

  // Error state
  error: string | null;

  // Actions
  startProcessing: (simulate?: boolean) => void;
  updateStatus: (status: Partial<ProcessingStatus>) => void;
  setResults: (results: RfqItem[], message?: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Dashboard Actions
  fetchProjects: () => Promise<void>;
  fetchAllData: () => Promise<void>;
  fetchAllTableData: () => Promise<void>;
  fetchDataByProject: (projectName: string) => Promise<void>;
  fetchProposalEvaluations: () => Promise<void>;
  refreshProposalEvaluations: () => Promise<void>;
  fetchPivotTableData: () => Promise<void>;
  fetchProviderRanking: () => Promise<void>;

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
    subscribeWithSelector(
      persist(
        (set, get) => ({
      selectedFiles: [],
      isProcessing: false,
      isLoadingData: false,
      processingFileCount: 0,
      status: initialStatus,
      rawResults: null,
      results: null,
      tableData: [],
      proposalEvaluations: [],
      pivotTableData: [],
      providerRanking: [],
      projects: [],
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
        evaluation_type: [],
        phase: [],
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
      setRfqBase: (rfqBase, message?: string) => {
        // Agregar notificación toast de éxito para RFQ base
        const { addToast } = useToastStore.getState();
        const toastMessage = `Base RFQ loaded: ${rfqBase.fileName}`;
        addToast(toastMessage, 'success');

        set({
          rfqBase,
          isProcessingRfqBase: false,
          rfqBaseError: null,
          selectedRfqBaseFiles: [],
          rfqBaseStatus: {
            stage: ProcessingStage.COMPLETED,
            progress: 100,
            message: message || 'Base RFQ processed successfully!'
          }
        });
      },

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

      setRfqBaseError: (error) => {
        // Agregar notificación toast de error para RFQ base
        const { addToast } = useToastStore.getState();
        addToast(`RFQ Base processing failed: ${error}`, 'error');

        set({
          rfqBaseError: error,
          isProcessingRfqBase: false,
          rfqBaseStatus: error ? {
            stage: ProcessingStage.ERROR,
            progress: 0,
            message: error
          } : initialStatus
        });
      },

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
        const providerName = get().rfqMetadata.proveedor;

        get().stopSimulation();

        // Add success toast notification
        const { addToast } = useToastStore.getState();
        const toastMessage = providerName
          ? `${fileCount} ${fileCount === 1 ? 'proposal' : 'proposals'} from ${providerName} processed successfully!`
          : `${fileCount} ${fileCount === 1 ? 'proposal' : 'proposals'} processed successfully!`;

        addToast(toastMessage, 'success');

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

        // Notificar que hay contenido nuevo en rfq (upload/processing view)
        useSessionViewStore.getState().updateContent('upload');

        // Automatically refresh proposal evaluations to update progress charts
        get().refreshProposalEvaluations();
      },

      setError: (error) => {
        get().stopSimulation();
        
        // Agregar notificación toast de error
        const { addToast } = useToastStore.getState();
        addToast(`Processing failed: ${error}`, 'error');

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

      fetchAllTableData: async () => {
        set({ isLoadingData: true, error: null });
        try {
          // El webhook de n8n simplemente devuelve todos los datos de rfq_items_master
          // No procesa parámetros, solo hace getAll de Supabase
          const response = await fetch(API_CONFIG.N8N_TABLA_URL, {
            method: 'GET', // Cambiar a GET ya que el webhook no procesa body
            headers: { 'Content-Type': 'application/json' }
          });

          if (response.ok) {
            const data = await response.json();

            // Procesar datos para extraer proyectos únicos
            const projectNames = data.map((item: any) => item.project_name).filter((name: any) => Boolean(name) && typeof name === 'string') as string[];
            const projectList = [...new Set(projectNames)];
            set({ projects: projectList });

            // Guardar todos los datos en tableData
            set({ tableData: data });
            console.log('Table data loaded from n8n:', data.length, 'items');
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (err: any) {
          console.error('Error fetching table data from n8n:', err);
          // Si falla n8n, intentar usar Supabase directamente
          if (supabase) {
            try {
              console.log('Attempting fallback to direct Supabase connection...');
              const { data: fallbackData, error: fallbackError } = await supabase
                .from('rfq_items_master')
                .select('*')
                .limit(1000);

              if (fallbackError) {
                throw new Error(`Supabase fallback failed: ${fallbackError.message}`);
              }

              const projectNames = fallbackData?.map((item: any) => item.project_name).filter((name: any) => Boolean(name) && typeof name === 'string') as string[] || [];
              const projectList = [...new Set(projectNames)];
              
              set({ 
                tableData: fallbackData || [], 
                projects: projectList,
                error: null 
              });
              console.log('Fallback successful: loaded', fallbackData?.length, 'items from Supabase');
            } catch (fallbackErr: any) {
              console.error('Supabase fallback also failed:', fallbackErr);
              get().setError(`Connection failed: Both n8n and Supabase unavailable. ${err.message}`);
            }
          } else {
            get().setError(`Connection failed: n8n unavailable and Supabase not configured. ${err.message}`);
          }
        } finally {
          set({ isLoadingData: false });
        }
      },

        fetchProposalEvaluations: async () => {
        set({ isLoadingData: true, error: null });
        try {
          // Intentar obtener datos de provider_responses desde Supabase
          if (supabase) {
            try {
              // Obtener todas las evaluaciones de proveedores
              const { data: responsesData, error: responsesError } = await supabase
                .from('provider_responses')
                .select(`
                  id,
                  requirement_id,
                  provider_name,
                  evaluation_value,
                  comment,
                  score,
                  file_id,
                  updated_at
                `)
                .order('updated_at', { ascending: false });

              if (responsesError) {
                throw new Error(`Supabase error fetching responses: ${responsesError.message}`);
              }

              // Usar los datos ya cargados en tableData si están disponibles
              const rfqData = get().tableData || [];
              const rfqMap = new Map();
              rfqData.forEach((rfq: any) => {
                rfqMap.set(rfq.id, rfq);
              });

              // Transformar los datos para que tengan la estructura esperada
              const transformedData = (responsesData as any)?.map((item: any) => {
                const rfqInfo = rfqMap.get(item.requirement_id);

                return {
                  id: item.id,
                  requirement_id: item.requirement_id,
                  provider_name: item.provider_name,
                  evaluation_value: item.evaluation_value,
                  comment: item.comment,
                  score: item.score,
                  file_id: item.file_id,
                  updated_at: item.updated_at,
                  project_name: rfqInfo?.project_name || '',
                  evaluation_type: rfqInfo?.evaluation_type,
                  phase: rfqInfo?.phase,
                  requirement_text: rfqInfo?.requirement_text,
                  file_title: '',
                  document_type: 'PROPOSAL'
                };
              }) || [];

              set({ proposalEvaluations: transformedData });
              console.log('Proposal evaluations loaded from Supabase:', transformedData.length, 'items');
              return;
            } catch (supabaseError: any) {
              console.warn('Supabase connection failed, using fallback:', supabaseError.message);
            }
          }

          // Fallback: usar datos mock si no hay conexión a Supabase
          console.log('Using mock data for proposal evaluations (no Supabase connection)');
          const mockData = [
            {
              id: 'mock-1',
              requirement_id: 'mock-req-1',
              provider_name: 'TECNICASREUNIDAS',
              evaluation_value: '8.5/10',
              comment: 'Good technical solution',
              score: 8.5,
              file_id: 'mock-file-1',
              updated_at: new Date().toISOString(),
              project_name: 'Hydrogen Production Plant – La Zaida, Spain',
              evaluation_type: 'Technical',
              phase: 'FEED',
              requirement_text: 'System Efficiency (BOP)',
              file_title: 'TR_Proposal.pdf',
              document_type: 'PROPOSAL'
            },
            {
              id: 'mock-2',
              requirement_id: 'mock-req-2',
              provider_name: 'IDOM',
              evaluation_value: '9.0/10',
              comment: 'Excellent efficiency',
              score: 9.0,
              file_id: 'mock-file-2',
              updated_at: new Date().toISOString(),
              project_name: 'Hydrogen Production Plant – La Zaida, Spain',
              evaluation_type: 'Technical',
              phase: 'FEED',
              requirement_text: 'System Efficiency (BOP)',
              file_title: 'IDOM_Proposal.pdf',
              document_type: 'PROPOSAL'
            }
          ];

          set({ proposalEvaluations: mockData });
          console.log('Proposal evaluations loaded from mock data:', mockData.length, 'items');
        } catch (err: any) {
          console.error('Error fetching proposal evaluations:', err);
          get().setError(err.message || 'Error loading proposal evaluations');
        } finally {
          set({ isLoadingData: false });
        }
      },

      refreshProposalEvaluations: async () => {
        if (!supabase) {
          console.error('Supabase not configured');
          return;
        }

        try {
          // Obtener todas las evaluaciones de proveedores
          const { data: responsesData, error: responsesError } = await supabase
            .from('provider_responses')
            .select(`
              id,
              requirement_id,
              provider_name,
              evaluation_value,
              comment,
              score,
              file_id,
              updated_at
            `)
            .order('updated_at', { ascending: false });

          if (responsesError) {
            throw new Error(`Supabase error refreshing responses: ${responsesError.message}`);
          }

          // Obtener información de rfq_items_master para todos los requisitos
          const requirementIds = [...new Set((responsesData as any)?.map((item: any) => item.requirement_id).filter(Boolean) || [])];
          const { data: rfqData, error: rfqError } = await supabase
            .from('rfq_items_master')
            .select('id, evaluation_type, phase, requirement_text')
            .in('id', requirementIds);

          if (rfqError) {
            throw new Error(`Supabase error refreshing RFQ data: ${rfqError.message}`);
          }

          // Crear mapa de RFQ items
          const rfqMap = new Map();
          (rfqData as any)?.forEach((rfq: any) => {
            rfqMap.set(rfq.id, rfq);
          });

          // Transformar los datos para que tengan la estructura esperada
          const transformedData = (responsesData as any)?.map((item: any) => {
            const rfqInfo = rfqMap.get(item.requirement_id);

            return {
              id: item.id,
              requirement_id: item.requirement_id,
              provider_name: item.provider_name,
              evaluation_value: item.evaluation_value,
              comment: item.comment,
              score: item.score,
              file_id: item.file_id,
              updated_at: item.updated_at,
              project_name: '', // No tenemos esta información sin hacer queries adicionales
              evaluation_type: rfqInfo?.evaluation_type,
              phase: rfqInfo?.phase,
              requirement_text: rfqInfo?.requirement_text,
              file_title: '', // No tenemos esta información
              document_type: 'PROPOSAL' // Asumimos que son propuestas
            };
          }) || [];

          set({ proposalEvaluations: transformedData });
          console.log('Proposal evaluations refreshed:', transformedData.length, 'items');
        } catch (err: any) {
          console.error('Error refreshing proposal evaluations:', err);
        }
      },

      fetchPivotTableData: async () => {
        if (!supabase) {
          console.error('Supabase not configured');
          return;
        }

        set({ isLoadingData: true, error: null });

        // Lista de posibles columnas de proveedores en rfq_items_master
        const PROVIDER_COLUMNS = ['TR', 'IDOM', 'SACYR', 'EA', 'SENER', 'TRESCA', 'WORLEY', 'TECNICASREUNIDAS'];

        try {
          // Primero: Obtener todos los datos de rfq_items_master (incluyendo columnas de proveedores)
          const { data: rfqItemsData, error: rfqItemsError } = await supabase
            .from('rfq_items_master')
            .select('*')
            .order('created_at', { ascending: false });

          if (rfqItemsError) {
            throw new Error(`Supabase error fetching rfq_items: ${rfqItemsError.message}`);
          }

          // Crear mapa de requisitos con datos base y columnas de proveedores directas
          const requirementsMap = new Map();

          (rfqItemsData || []).forEach((item: any) => {
            const reqId = item.id;
            const evaluations: Record<string, string> = {};

            // Extraer columnas de proveedores directamente de rfq_items_master
            Object.keys(item).forEach(key => {
              const upperKey = key.toUpperCase();
              if (PROVIDER_COLUMNS.includes(upperKey) || PROVIDER_COLUMNS.includes(key)) {
                const value = item[key];
                if (value && typeof value === 'string' && value.trim() !== '' && value !== 'NOT QUOTED' && value !== 'NO INFORMATION') {
                  // Normalizar el nombre del proveedor
                  const normalizedKey = upperKey === 'TECNICASREUNIDAS' ? 'TR' : upperKey;
                  evaluations[normalizedKey] = value;
                }
              }
            });

            requirementsMap.set(reqId, {
              id: reqId,
              project_name: item.project_name,
              evaluation_type: item.evaluation_type,
              phase: item.phase,
              requirement_text: item.requirement_text,
              created_at: item.created_at,
              evaluations
            });
          });

          // Segundo: Obtener evaluaciones adicionales de provider_responses
          const { data: responsesData, error: responsesError } = await supabase
            .from('provider_responses')
            .select(`
              requirement_id,
              provider_name,
              evaluation_value,
              comment
            `)
            .order('updated_at', { ascending: false });

          if (!responsesError && responsesData) {
            // Agregar/sobrescribir con datos de provider_responses
            responsesData.forEach((response: any) => {
              const reqId = response.requirement_id;

              if (requirementsMap.has(reqId)) {
                const providerKey = (response.provider_name || '').toUpperCase();
                const normalizedKey = providerKey === 'TECNICASREUNIDAS' ? 'TR' : providerKey;
                const evaluationText = response.evaluation_value && response.comment
                  ? `${response.evaluation_value} - ${response.comment}`
                  : response.evaluation_value || response.comment || '';

                if (evaluationText.trim() !== '') {
                  requirementsMap.get(reqId).evaluations[normalizedKey] = evaluationText;
                }
              }
            });
          }

          // Convertir a array con todas las columnas de proveedores encontradas
          const allProviderKeys = new Set<string>();
          requirementsMap.forEach((req: any) => {
            Object.keys(req.evaluations).forEach(key => allProviderKeys.add(key));
          });

          const pivotData = Array.from(requirementsMap.values()).map((req: any) => {
            const row: any = {
              id: req.id,
              project_name: req.project_name,
              evaluation_type: req.evaluation_type,
              phase: req.phase,
              requirement_text: req.requirement_text,
              created_at: req.created_at
            };

            // Agregar todas las columnas de proveedores encontradas
            allProviderKeys.forEach(providerKey => {
              row[providerKey] = req.evaluations[providerKey] || '';
            });

            return row;
          });

          const projectNames = pivotData
            .map((item: any) => item.project_name)
            .filter((name: any) => Boolean(name) && typeof name === 'string') as string[];
          const projectList = [...new Set(projectNames)];

          set({ pivotTableData: pivotData, projects: projectList });
          console.log('Pivot table data loaded:', pivotData.length, 'requirements with providers:', Array.from(allProviderKeys));

        } catch (err: any) {
          console.error('Error fetching pivot table data:', err);
          get().setError(err.message || 'Error loading pivot table data');
        } finally {
          set({ isLoadingData: false });
        }
      },

      // Método obsoleto - mantener por compatibilidad pero usar fetchAllTableData
      fetchProjects: async () => {
        await get().fetchAllTableData();
      },

      // Método obsoleto - mantener por compatibilidad pero usar fetchAllTableData con filtrado cliente
      fetchDataByProject: async (_projectName: string) => {
        // Primero obtener todos los datos
        await get().fetchAllTableData();
        // El filtrado se hará del lado del cliente en el componente
      },

      // Método obsoleto - mantener por compatibilidad
      fetchAllData: async () => {
        await get().fetchAllTableData();
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

      fetchProviderRanking: async () => {
        if (!supabase) {
          console.error('Supabase not configured');
          return;
        }

        try {
          // Read directly from ranking_proveedores table (has all 12 criterion scores)
          const { data, error } = await supabase
            .from('ranking_proveedores')
            .select('*')
            .order('overall_score', { ascending: false, nullsFirst: false });

          if (error) {
            throw new Error(`Supabase error: ${error.message}`);
          }

          // Map new column names to match expected format in components
          const mapped = (data || []).map((row: any) => ({
            ...row,
            // Map to expected column names for backward compatibility
            economical_score: row.economic_score || 0,
            pre_feed_score: row.execution_score || 0,
            feed_score: row.hse_esg_score || 0,
            cumplimiento_porcentual: row.compliance_percentage || 0
          }));

          set({ providerRanking: mapped });
          console.log('[useRfqStore] Provider ranking loaded from ranking_proveedores:', mapped.length, 'records');
          if (mapped.length === 0) {
            console.warn('[useRfqStore] Provider ranking is empty. Run the scoring workflow to populate data.');
          } else {
            console.log('[useRfqStore] Provider ranking sample:', mapped[0]);
          }
        } catch (err: any) {
          console.error('[useRfqStore] Error fetching provider ranking:', err);
        }
      },

      reset: () => set({
        selectedFiles: [],
        isProcessing: false,
        processingFileCount: 0,
        status: initialStatus,
        rawResults: null,
        results: null,
        tableData: [],
        proposalEvaluations: [],
        pivotTableData: [],
        providerRanking: [],
        error: null,
        rfqMetadata: {
          proyecto: '',
          proveedor: '',
          tipoEvaluacion: []
        }
      })
    }),
      {
        name: 'rfq-storage',
        partialize: (state) => ({
          rfqMetadata: state.rfqMetadata,
          tableFilters: state.tableFilters
        })
      }
      )
    ),
    { name: 'RfqStore' }
  )
);
