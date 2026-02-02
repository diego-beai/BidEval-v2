/**
 * Estado del procesamiento de Propuesta
 */
export enum ProcessingStage {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  OCR_PROCESSING = 'ocr_processing',
  CLASSIFYING = 'classifying',
  EMBEDDING = 'embedding',
  EVALUATING = 'evaluating',
  COMPLETED = 'completed',
  ERROR = 'error'
}

/**
 * Información de estado durante el procesamiento
 */
export interface ProcessingStatus {
  stage: ProcessingStage;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // segundos
}

/**
 * Ítem individual de Propuesta desde n8n DataTable
 * Provider columns are dynamic — accessed via [key: string]
 */
export interface RfqItem {
  id: number;
  rfq_project_id?: string;
  project_name?: string;
  evaluation: string;
  fase: string;
  requisito_rfq?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * Resultado de evaluación para un proveedor específico
 */
export interface ProviderEvaluation {
  provider: string;
  evaluation: string;
  hasValue: boolean;
}

/**
 * Resultado completo de un ítem de Propuesta con evaluaciones de todos los proveedores
 */
export interface RfqResult {
  id: number;
  projectName: string;
  fase: string;
  evaluation: string;
  rfq_requisito?: string;
  evaluations: Record<string, ProviderEvaluation>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Metadata del archivo procesado
 */
export interface FileMetadata {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  provider?: string;
  evaluationType?: string[];
}

/**
 * Metadata individual para un archivo en upload múltiple
 */
export interface FileUploadMetadata {
  proyecto: string;
  proveedor: string;
  tipoEvaluacion: string[];
}

/**
 * Archivo con metadata individual para upload múltiple
 */
export interface FileWithMetadata {
  file: File;
  metadata: FileUploadMetadata;
}

/**
 * Verifica si un archivo tiene metadata completa
 */
export function isFileMetadataComplete(fileWithMeta: FileWithMetadata): boolean {
  const { metadata } = fileWithMeta;
  return Boolean(
    metadata.proyecto &&
    metadata.proveedor &&
    metadata.tipoEvaluacion.length > 0
  );
}
