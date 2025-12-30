import { API_CONFIG } from '../config/constants';
import { fetchWithTimeout } from './api.service';
import { ApiError, N8nWebhookResponse } from '../types/api.types';
import { RfqItem } from '../types/rfq.types';

/**
 * Genera un ID único para el archivo
 */
function generateFileId(): string {
  return `rfq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convierte un archivo a base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remover el prefijo "data:application/pdf;base64,"
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Sube un archivo PDF al webhook de n8n y espera los resultados procesados
 *
 * El workflow n8n procesa el archivo y devuelve directamente los resultados,
 * por lo que esta función puede tardar varios minutos en completarse.
 */
export async function uploadRfqFile(file: File): Promise<RfqItem[]> {
  const fileId = generateFileId();
  const fileTitle = file.name;

  try {

    // Convertir archivo a base64
    const fileBase64 = await fileToBase64(file);

    // Crear payload JSON
    const payload = {
      file_id: fileId,
      file_title: fileTitle,
      file_url: "",
      file_binary: fileBase64,
      metadata: {
        uploadedAt: new Date().toISOString(),
        fileName: file.name,
        fileSize: file.size,
        fileId: fileId
      }
    };


    const response = await fetchWithTimeout(
      API_CONFIG.N8N_WEBHOOK_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      },
      API_CONFIG.REQUEST_TIMEOUT
    );

    // n8n devuelve directamente un array de resultados
    const data = await response.json();

    // Si n8n devuelve un array directamente, úsalo
    if (Array.isArray(data)) {
      return data as RfqItem[];
    }

    // Si n8n devuelve un objeto con success y results
    const webhookResponse = data as N8nWebhookResponse;

    if (webhookResponse.success && webhookResponse.results) {
      return webhookResponse.results;
    }

    // Si hay un error explícito
    if (webhookResponse.error) {
      throw new ApiError(webhookResponse.error);
    }

    // Si no hay resultados, lanzar error
    throw new ApiError('No se recibieron resultados del servidor');

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Error desconocido al procesar el archivo'
    );
  }
}

/**
 * Procesa múltiples archivos en paralelo
 * Envía todas las peticiones simultáneamente y devuelve la última respuesta
 */
export async function uploadMultipleRfqFiles(files: File[]): Promise<RfqItem[]> {
  if (files.length === 0) {
    throw new ApiError('No hay archivos para procesar');
  }

  try {
    // Enviar todas las peticiones en paralelo
    const uploadPromises = files.map(file => uploadRfqFile(file));

    // Esperar a que todas terminen
    const allResults = await Promise.all(uploadPromises);

    // Devolver la última respuesta (contiene todos los datos actualizados)
    return allResults[allResults.length - 1];

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Error al procesar archivos múltiples'
    );
  }
}

/**
 * Respuesta del webhook de ingesta de RFQ
 */
export interface RfqIngestaResponse {
  success: boolean;
  message: string;
  file_id: string;
  tipos_procesados: string[];
}

/**
 * Sube el documento RFQ base del cliente al webhook de ingesta
 * Este documento se procesa para extraer requisitos que se compararán con las ofertas
 *
 * @param file - Archivo PDF de la RFQ base
 * @returns Información sobre la RFQ procesada
 */
export async function uploadRfqBase(file: File): Promise<RfqIngestaResponse> {
  const fileId = generateFileId();
  const fileTitle = file.name;

  try {
    // Convertir archivo a base64
    const fileBase64 = await fileToBase64(file);

    // Crear payload JSON
    const payload = {
      file_id: fileId,
      file_title: fileTitle,
      file_url: "",
      file_binary: fileBase64
    };

    console.log('📤 Enviando RFQ base a n8n:', {
      fileName: fileTitle,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      endpoint: API_CONFIG.N8N_RFQ_INGESTA_URL
    });

    const response = await fetchWithTimeout(
      API_CONFIG.N8N_RFQ_INGESTA_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      },
      API_CONFIG.REQUEST_TIMEOUT
    );

    const data = await response.json() as RfqIngestaResponse;

    if (!data.success) {
      throw new ApiError(data.message || 'Error al procesar la RFQ base');
    }

    console.log('✅ RFQ base procesada exitosamente:', {
      fileId: data.file_id,
      tiposProcesados: data.tipos_procesados
    });

    return data;

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Error desconocido al procesar la RFQ base'
    );
  }
}
