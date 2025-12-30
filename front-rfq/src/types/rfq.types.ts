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
 */
export interface RfqItem {
  id: number;
  Evaluation: string;
  fase: string;
  descripcion_item: string;
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
  item: string;
  fase: string;
  evaluation: string;
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
