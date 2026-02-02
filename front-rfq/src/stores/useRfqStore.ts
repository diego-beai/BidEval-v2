import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { ProcessingStatus, ProcessingStage, RfqResult, RfqItem, FileWithMetadata, FileUploadMetadata, isFileMetadataComplete } from '../types/rfq.types';
import { RfqMetadata } from '../components/upload/RfqMetadataForm';
import { API_CONFIG } from '../config/constants';
import { supabase } from '../lib/supabase';
import { useToastStore } from './useToastStore';
import { useSessionViewStore } from './useSessionViewStore';
import { useProjectStore } from './useProjectStore';
import { useProviderStore } from './useProviderStore';

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
  // File upload state - now with individual metadata per file
  selectedFiles: FileWithMetadata[];
  setSelectedFiles: (files: FileWithMetadata[]) => void;
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  updateFileMetadata: (index: number, metadata: Partial<FileUploadMetadata>) => void;
  allFilesHaveMetadata: () => boolean;
  copyMetadataFromPrevious: (targetIndex: number) => void;

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
  processingStartTime: number | null; // Timestamp when processing started
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
 * Known non-provider columns in RfqItem
 */
const KNOWN_COLUMNS = new Set([
  'id', 'rfq_project_id', 'project_name', 'evaluation', 'fase',
  'requisito_rfq', 'createdAt', 'updatedAt', 'created_at', 'updated_at',
  'evaluation_type', 'phase', 'requirement_text', 'Provider', 'provider',
  'project_id'
]);

/**
 * Transforma los resultados de n8n a RfqResult[]
 * Dynamically detects provider columns from item keys
 */
function transformResults(items: RfqItem[]): RfqResult[] {
  return items.map((item) => {
    const evaluations: Record<string, any> = {};

    // Detect provider columns dynamically
    Object.keys(item).forEach(key => {
      if (KNOWN_COLUMNS.has(key)) return;
      const value = item[key];
      if (value && typeof value === 'string') {
        evaluations[key] = {
          provider: key,
          evaluation: value,
          hasValue: value !== 'NOT QUOTED' && value !== 'NO INFORMATION' && value !== 'NO COTIZADO' && value !== 'SIN INFORMACIÓN'
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
      processingStartTime: null,
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
        const activeProject = useProjectStore.getState().getActiveProject();

        // Create FileWithMetadata for each new file with default empty metadata
        const newFilesWithMeta: FileWithMetadata[] = files.map(file => ({
          file,
          metadata: {
            proyecto: activeProject?.display_name || '',
            proveedor: '' as const,
            tipoEvaluacion: []
          }
        }));

        const combined = [...current, ...newFilesWithMeta].slice(0, 7); // Max 7 files
        set({ selectedFiles: combined, error: null });
      },

      removeFile: (index) => {
        const current = get().selectedFiles;
        set({ selectedFiles: current.filter((_, i) => i !== index) });
      },

      updateFileMetadata: (index, metadata) => {
        const current = get().selectedFiles;
        if (index < 0 || index >= current.length) return;

        const updated = [...current];
        updated[index] = {
          ...updated[index],
          metadata: { ...updated[index].metadata, ...metadata }
        };
        set({ selectedFiles: updated });
      },

      allFilesHaveMetadata: () => {
        const files = get().selectedFiles;
        return files.length > 0 && files.every(isFileMetadataComplete);
      },

      copyMetadataFromPrevious: (targetIndex) => {
        const current = get().selectedFiles;
        if (targetIndex <= 0 || targetIndex >= current.length) return;

        const previousMeta = current[targetIndex - 1].metadata;
        const updated = [...current];
        updated[targetIndex] = {
          ...updated[targetIndex],
          metadata: { ...previousMeta }
        };
        set({ selectedFiles: updated });
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
        // No mostrar toast - el archivo se procesa correctamente aunque haya error de formato
        // Solo actualizar el estado interno
        set({
          rfqBaseError: error,
          isProcessingRfqBase: false,
          rfqBaseStatus: {
            stage: ProcessingStage.COMPLETED,
            progress: 100,
            message: 'Archivo cargado'
          }
        });
      },

      startProcessing: (_simulate = true) => {
        const fileCount = get().selectedFiles.length;
        set({
          isProcessing: true,
          processingFileCount: fileCount,
          processingStartTime: Date.now(), // Track when processing started
          error: null,
          status: {
            stage: ProcessingStage.UPLOADING,
            progress: 0, // No fake progress - we don't know the real progress
            message: `Processing ${fileCount} file${fileCount > 1 ? 's' : ''}... This may take several minutes.`
          }
        });
        // NOTE: No simulation - we show honest "processing" state until webhook responds
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
        const selectedFiles = get().selectedFiles;

        // Get unique providers from the files metadata
        const uniqueProviders = [...new Set(
          selectedFiles
            .map(f => f.metadata.proveedor)
            .filter(Boolean)
        )];

        get().stopSimulation();

        // Add success toast notification
        const { addToast } = useToastStore.getState();
        const toastMessage = uniqueProviders.length === 1
          ? `${fileCount} ${fileCount === 1 ? 'proposal' : 'proposals'} from ${uniqueProviders[0]} processed successfully!`
          : uniqueProviders.length > 1
            ? `${fileCount} ${fileCount === 1 ? 'proposal' : 'proposals'} from ${uniqueProviders.length} providers processed successfully!`
            : `${fileCount} ${fileCount === 1 ? 'proposal' : 'proposals'} processed successfully!`;

        addToast(toastMessage, 'success');

        set({
          rawResults,
          results: transformedResults,
          isProcessing: false,
          processingFileCount: 0,
          processingStartTime: null,
          selectedFiles: [],
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

        // Refresh providers list so new providers appear in dropdowns
        const activeProjectId = useProjectStore.getState().activeProjectId;
        if (activeProjectId) {
          useProviderStore.getState().fetchProjectProviders(activeProjectId);
        }
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
          processingStartTime: null,
          status: error ? {
            stage: ProcessingStage.ERROR,
            progress: 0,
            message: error
          } : initialStatus
        });
      },

      fetchAllTableData: async () => {
        set({ isLoadingData: true, error: null });

        // Get active project ID for filtering
        const activeProjectId = useProjectStore.getState().activeProjectId;

        // If no project selected, clear data
        if (!activeProjectId) {
          set({ tableData: [], projects: [], isLoadingData: false });
          console.log('[fetchAllTableData] No active project, clearing table data');
          return;
        }

        try {
          // Use Supabase directly with project filter (more efficient than n8n for filtered data)
          if (supabase) {
            console.log('[fetchAllTableData] Fetching data for project:', activeProjectId);
            const { data, error } = await supabase
              .from('rfq_items_master')
              .select('*')
              .eq('project_id', activeProjectId)
              .limit(1000);

            if (error) {
              throw new Error(`Supabase error: ${error.message}`);
            }

            // Procesar datos para extraer proyectos únicos
            const projectNames = (data || []).map((item: any) => item.project_name).filter((name: any) => Boolean(name) && typeof name === 'string') as string[];
            const projectList = [...new Set(projectNames)];

            set({
              tableData: data || [],
              projects: projectList,
              error: null
            });
            console.log('[fetchAllTableData] Loaded', data?.length, 'items for project', activeProjectId);
          } else {
            // Fallback to n8n if Supabase not configured
            const response = await fetch(API_CONFIG.N8N_TABLA_URL, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
              const allData = await response.json();
              // Filter client-side by project_id
              const data = allData.filter((item: any) => item.project_id === activeProjectId);

              const projectNames = data.map((item: any) => item.project_name).filter((name: any) => Boolean(name) && typeof name === 'string') as string[];
              const projectList = [...new Set(projectNames)];
              set({ projects: projectList, tableData: data });
              console.log('[fetchAllTableData] n8n: loaded', data.length, 'items for project (filtered from', allData.length, ')');
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          }
        } catch (err: any) {
          console.error('[fetchAllTableData] Error:', err);
          get().setError(`Error loading table data: ${err.message}`);
          set({ tableData: [], projects: [] });
        } finally {
          set({ isLoadingData: false });
        }
      },

        fetchProposalEvaluations: async () => {
        set({ isLoadingData: true, error: null });

        // Get active project ID for filtering
        const activeProjectId = useProjectStore.getState().activeProjectId;

        // If no project selected, clear data
        if (!activeProjectId) {
          set({ proposalEvaluations: [], isLoadingData: false });
          console.log('[fetchProposalEvaluations] No active project, clearing proposal evaluations');
          return;
        }

        try {
          if (supabase) {
            try {
              // Fetch from document_metadata table where proposals are stored
              const { data: documentsData, error: documentsError } = await supabase
                .from('document_metadata')
                .select('*')
                .eq('project_id', activeProjectId)
                .eq('document_type', 'PROPOSAL')
                .order('created_at', { ascending: false });

              if (documentsError) {
                throw new Error(`Supabase error fetching documents: ${documentsError.message}`);
              }

              // Transform document_metadata into proposal evaluations format
              // Each document can have multiple evaluation_types, so we expand them
              const transformedData: any[] = [];

              (documentsData || []).forEach((doc: any) => {
                const evaluationTypes = doc.evaluation_types || [];

                // Create one entry per evaluation type for this provider
                evaluationTypes.forEach((evalType: string) => {
                  transformedData.push({
                    id: `${doc.id}-${evalType}`,
                    file_id: doc.id,
                    provider_name: doc.provider,
                    evaluation_type: evalType,
                    project_id: doc.project_id,
                    project_name: doc.project_name,
                    file_title: doc.title,
                    document_type: doc.document_type,
                    created_at: doc.created_at
                  });
                });
              });

              set({ proposalEvaluations: transformedData });
              console.log('[fetchProposalEvaluations] Loaded', transformedData.length, 'evaluation items from', documentsData?.length || 0, 'documents for project', activeProjectId);
              return;
            } catch (supabaseError: any) {
              console.warn('[fetchProposalEvaluations] Supabase error:', supabaseError.message);
            }
          }

          // Fallback: clear data if no connection
          set({ proposalEvaluations: [] });
          console.log('[fetchProposalEvaluations] No Supabase connection, clearing proposal evaluations');
        } catch (err: any) {
          console.error('[fetchProposalEvaluations] Error:', err);
          get().setError(err.message || 'Error loading proposal evaluations');
          set({ proposalEvaluations: [] });
        } finally {
          set({ isLoadingData: false });
        }
      },

      refreshProposalEvaluations: async () => {
        if (!supabase) {
          console.error('[refreshProposalEvaluations] Supabase not configured');
          return;
        }

        // Get active project ID for filtering
        const activeProjectId = useProjectStore.getState().activeProjectId;

        // If no project selected, clear data
        if (!activeProjectId) {
          set({ proposalEvaluations: [] });
          console.log('[refreshProposalEvaluations] No active project, clearing');
          return;
        }

        try {
          // Fetch from document_metadata table where proposals are stored
          const { data: documentsData, error: documentsError } = await supabase
            .from('document_metadata')
            .select('*')
            .eq('project_id', activeProjectId)
            .eq('document_type', 'PROPOSAL')
            .order('created_at', { ascending: false });

          if (documentsError) {
            throw new Error(`Supabase error fetching documents: ${documentsError.message}`);
          }

          // Transform document_metadata into proposal evaluations format
          const transformedData: any[] = [];

          (documentsData || []).forEach((doc: any) => {
            const evaluationTypes = doc.evaluation_types || [];

            evaluationTypes.forEach((evalType: string) => {
              transformedData.push({
                id: `${doc.id}-${evalType}`,
                file_id: doc.id,
                provider_name: doc.provider,
                evaluation_type: evalType,
                project_id: doc.project_id,
                project_name: doc.project_name,
                file_title: doc.title,
                document_type: doc.document_type,
                created_at: doc.created_at
              });
            });
          });

          set({ proposalEvaluations: transformedData });
          console.log('[refreshProposalEvaluations] Refreshed', transformedData.length, 'evaluation items from', documentsData?.length || 0, 'documents');
        } catch (err: any) {
          console.error('[refreshProposalEvaluations] Error:', err);
        }
      },

      fetchPivotTableData: async () => {
        if (!supabase) {
          console.error('[fetchPivotTableData] Supabase not configured');
          return;
        }

        set({ isLoadingData: true, error: null });

        // Get active project ID for filtering
        const activeProjectId = useProjectStore.getState().activeProjectId;

        // If no project selected, clear data
        if (!activeProjectId) {
          set({ pivotTableData: [], projects: [], isLoadingData: false });
          console.log('[fetchPivotTableData] No active project, clearing pivot table data');
          return;
        }

        // Detect provider columns dynamically (reuse KNOWN_COLUMNS set)

        try {
          // Obtener datos de rfq_items_master filtrado por proyecto
          const { data: rfqItemsData, error: rfqItemsError } = await supabase
            .from('rfq_items_master')
            .select('*')
            .eq('project_id', activeProjectId)
            .order('created_at', { ascending: false });

          if (rfqItemsError) {
            throw new Error(`Supabase error fetching rfq_items: ${rfqItemsError.message}`);
          }

          // Crear mapa de requisitos con datos base y columnas de proveedores directas
          const requirementsMap = new Map();

          const pivotKnownCols = new Set([
            'id', 'project_name', 'project_id', 'evaluation_type', 'phase',
            'requirement_text', 'created_at', 'updated_at', 'rfq_project_id',
            'evaluation', 'fase', 'requisito_rfq', 'Provider', 'provider'
          ]);

          (rfqItemsData || []).forEach((item: any) => {
            const reqId = item.id;
            const evaluations: Record<string, string> = {};

            // Detect provider columns dynamically (any non-known column with string value)
            Object.keys(item).forEach(key => {
              if (pivotKnownCols.has(key)) return;
              const value = item[key];
              if (value && typeof value === 'string' && value.trim() !== '' && value !== 'NOT QUOTED' && value !== 'NO INFORMATION' && value !== 'NO COTIZADO' && value !== 'SIN INFORMACIÓN') {
                const upperKey = key.toUpperCase();
                evaluations[upperKey] = value;
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
          console.error('[fetchProviderRanking] Supabase not configured');
          return;
        }

        // Get active project ID for filtering
        const activeProjectId = useProjectStore.getState().activeProjectId;

        // If no project selected, clear data
        if (!activeProjectId) {
          set({ providerRanking: [] });
          console.log('[fetchProviderRanking] No active project, clearing provider ranking');
          return;
        }

        try {
          // Read from ranking_proveedores table filtered by project
          const { data, error } = await supabase
            .from('ranking_proveedores')
            .select('*')
            .eq('project_id', activeProjectId)
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
          console.log('[fetchProviderRanking] Loaded', mapped.length, 'records for project', activeProjectId);
          if (mapped.length === 0) {
            console.warn('[fetchProviderRanking] Provider ranking is empty for this project. Run the scoring workflow to populate data.');
          }
        } catch (err: any) {
          console.error('[fetchProviderRanking] Error:', err);
          set({ providerRanking: [] });
        }
      },

      reset: () => set({
        selectedFiles: [],
        isProcessing: false,
        processingFileCount: 0,
        processingStartTime: null,
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
