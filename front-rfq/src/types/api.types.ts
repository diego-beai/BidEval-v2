import { RfqItem } from './rfq.types';

/**
 * Respuesta del webhook n8n al subir un archivo
 * El workflow n8n devuelve directamente los resultados procesados
 */
export interface N8nWebhookResponse {
  success: boolean;
  results?: RfqItem[];
  error?: string;
  message?: string;
}

/**
 * Payload para el webhook de n8n
 */
export interface N8nWebhookPayload {
  file: File;
  metadata?: {
    uploadedAt: string;
    fileName: string;
    fileSize: number;
  };
}

/**
 * Error personalizado de API
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
