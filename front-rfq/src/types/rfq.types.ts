import { Provider } from './provider.types';

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
 * Nueva estructura: id, rfq_project_id, project_name, evaluation, fase, requisito_rfq, IDOM, SACYR, EA, SENER, TRESCA, WORLEY, TECNICASREUNIDAS
 */
export interface RfqItem {
  id: number;
  rfq_project_id?: string;
  project_name?: string;
  evaluation: string;
  fase: string;
  requisito_rfq?: string; // Requisitos extraídos de la RFQ base
  // Columnas dinámicas por proveedor
  IDOM?: string;
  TECNICASREUNIDAS?: string;
  SACYR?: string;
  EA?: string;
  SENER?: string;
  TRESCA?: string;
  WORLEY?: string;
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * Resultado de evaluación para un proveedor específico
 */
export interface ProviderEvaluation {
  provider: Provider;
  evaluation: string;
  hasValue: boolean; // true si tiene información relevante
}

/**
 * Resultado completo de un ítem de Propuesta con evaluaciones de todos los proveedores
 */
export interface RfqResult {
  id: number;
  projectName: string;
  fase: string;
  evaluation: string;
  rfq_requisito?: string; // Requisitos extraídos de la RFQ base
  evaluations: Partial<Record<Provider, ProviderEvaluation>>;
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
  provider?: Provider;
  evaluationType?: string[];
}
