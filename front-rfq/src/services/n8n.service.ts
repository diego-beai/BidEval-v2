import { API_CONFIG } from '../config/constants';
import { fetchWithTimeout } from './api.service';
import { ApiError, N8nWebhookResponse } from '../types/api.types';
import { RfqItem } from '../types/rfq.types';
import type { GenerateAuditPayload, GenerateAuditResponse } from '../types/qa.types';

/**
 * Multiple files processing result
 */
export interface RfqUploadResponse {
  results: RfqItem[];
  message?: string;
}

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
export async function uploadRfqFile(
  file: File,
  additionalMetadata?: {
    project_id?: string;
    proyecto?: string;
    proveedor?: string;
    tipoEvaluacion?: string[];
  }
): Promise<RfqUploadResponse> {
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
      // Project ID at root level for easy access in n8n
      project_id: additionalMetadata?.project_id || null,
      metadata: {
        uploadedAt: new Date().toISOString(),
        fileName: file.name,
        fileSize: file.size,
        fileId: fileId,
        ...(additionalMetadata?.project_id && { project_id: additionalMetadata.project_id }),
        ...(additionalMetadata?.proyecto && { proyecto: additionalMetadata.proyecto }),
        ...(additionalMetadata?.proveedor && { proveedor: additionalMetadata.proveedor }),
        ...(additionalMetadata?.tipoEvaluacion && { tipoEvaluacion: additionalMetadata.tipoEvaluacion })
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
      return { results: data as RfqItem[] };
    }

    // Si n8n devuelve un objeto con success y results
    const webhookResponse = data as N8nWebhookResponse;

    if (webhookResponse.success && webhookResponse.results) {
      return {
        results: webhookResponse.results,
        message: webhookResponse.message
      };
    }

    // Si hay un error explícito
    if (webhookResponse.error) {
      throw new ApiError(webhookResponse.error);
    }

    // If no results, throw error
    throw new ApiError('No results received from server');

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error while processing file'
    );
  }
}

/**
 * Procesa múltiples archivos en paralelo
 * Envía todas las peticiones simultáneamente y devuelve la última respuesta
 */
export async function uploadMultipleRfqFiles(
  files: File[],
  additionalMetadata?: {
    project_id?: string;
    proyecto?: string;
    proveedor?: string;
    tipoEvaluacion?: string[];
  }
): Promise<RfqUploadResponse> {
  if (files.length === 0) {
    throw new ApiError('No files to process');
  }

  try {
    // Enviar todas las peticiones en paralelo con la metadata
    const uploadPromises = files.map(file => uploadRfqFile(file, additionalMetadata));

    // Esperar a que todas terminen
    const allResults = await Promise.all(uploadPromises);

    // Devolver la última respuesta (contiene todos los datos actualizados)
    return allResults[allResults.length - 1];

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Error processing multiple files'
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
 * @param projectId - ID del proyecto al que pertenece este documento
 * @returns Información sobre la RFQ procesada
 */
export async function uploadRfqBase(file: File, projectId?: string): Promise<RfqIngestaResponse> {
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
      // Project ID for multi-project support
      project_id: projectId || null
    };

    console.log('📤 Sending base RFQ to n8n:', {
      fileName: fileTitle,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      endpoint: API_CONFIG.N8N_RFQ_INGESTA_URL,
      timeout: `${API_CONFIG.REQUEST_TIMEOUT / 1000}s (up to 30 min for AI processing)`
    });

    const startTime = Date.now();

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

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    const data = await response.json();

    console.log('📥 Complete response from n8n:', {
      status: response.status,
      statusText: response.statusText,
      elapsedTime: `${elapsedTime}s`,
      data: data
    });

    // Si la respuesta HTTP fue exitosa (200-299), procesar los datos
    if (response.ok) {
      // Normalizar la respuesta para que siempre tenga la estructura esperada
      const normalizedData: RfqIngestaResponse = {
        success: data.success !== false, // If not present or true, consider successful
        message: data.message || 'RFQ processed successfully',
        file_id: data.file_id || fileId, // Usar el fileId generado si no viene en la respuesta
        tipos_procesados: data.tipos_procesados || []
      };

      console.log('✅ Base RFQ processed successfully:', {
        fileId: normalizedData.file_id,
        tiposProcesados: normalizedData.tipos_procesados
      });

      return normalizedData;
    }

    // If HTTP response was not successful, throw error
    throw new ApiError(
      data.message || `Server error (${response.status}): ${response.statusText}`
    );

  } catch (error) {
    console.error('❌ Error al procesar RFQ base:', {
      error,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      fileName: fileTitle
    });

    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error while processing base RFQ'
    );
  }
}

/**
 * Genera una auditoría técnica Q&A para un proyecto y proveedor específico
 *
 * Este webhook analiza las deficiencias detectadas en la oferta del proveedor,
 * genera preguntas técnicas agrupadas por disciplina y las almacena en Supabase.
 *
 * @param payload - Objeto con project_id y provider
 * @returns Información sobre las preguntas generadas
 */
export async function generateTechnicalAudit(
  payload: GenerateAuditPayload
): Promise<GenerateAuditResponse> {
  try {
    console.log('🔍 Generating technical audit:', {
      projectId: payload.project_id,
      provider: payload.provider,
      endpoint: API_CONFIG.N8N_QA_AUDIT_URL
    });

    const startTime = Date.now();

    const response = await fetchWithTimeout(
      API_CONFIG.N8N_QA_AUDIT_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      },
      API_CONFIG.REQUEST_TIMEOUT
    );

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Verificar si la respuesta tiene contenido antes de parsear JSON
    const responseText = await response.text();
    
    console.log('📥 Audit generation response:', {
      status: response.status,
      statusText: response.statusText,
      elapsedTime: `${elapsedTime}s`,
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
    });

    // Si la respuesta está vacía o no es JSON válido
    if (!responseText.trim()) {
      throw new ApiError('El servidor devolvió una respuesta vacía. El workflow puede estar teniendo problemas.');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON parse error:', {
        parseError,
        responseText: responseText.substring(0, 500)
      });
      throw new ApiError('La respuesta del servidor no es JSON válido. El workflow puede tener un error interno.');
    }

    if (response.ok) {
      // Si n8n devuelve el número de preguntas generadas
      const auditResponse: GenerateAuditResponse = {
        success: data.success !== false,
        preguntas_generadas: Array.isArray(data) ? data.length : (data.preguntas_generadas || 0),
        message: data.message || 'Technical audit generated successfully',
        data: Array.isArray(data) ? data : (data.results || data.data || [])
      };

      console.log('✅ Technical audit generated:', {
        questionsGenerated: auditResponse.preguntas_generadas,
        message: auditResponse.message
      });

      return auditResponse;
    }

    // Si HTTP no fue exitoso, lanzar error con más detalles
    const errorMessage = data?.message || data?.error || `Server error (${response.status}): ${response.statusText}`;
    throw new ApiError(errorMessage);

  } catch (error) {
    console.error('❌ Error generating technical audit:', {
      error,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      payload,
      endpoint: API_CONFIG.N8N_QA_AUDIT_URL,
      isDev: import.meta.env.DEV
    });

    if (error instanceof ApiError) {
      // Mejorar mensajes de error según el código HTTP
      if (error.statusCode === 404) {
        const isDev = import.meta.env.DEV;
        const message = isDev
          ? 'El endpoint del webhook no está disponible. Asegúrate de que el servidor de desarrollo está corriendo (npm run dev) y que el proxy está configurado correctamente.'
          : 'El webhook de auditoría técnica no está disponible. Verifica que el workflow esté activo en n8n.';
        throw new ApiError(message, 404);
      }
      
      if (error.statusCode === 500) {
        const message = import.meta.env.DEV
          ? 'Error interno del servidor (500). Verifica la consola de n8n para ver los detalles del error en el workflow.'
          : 'Error interno del servidor. Contacta al administrador del sistema.';
        throw new ApiError(message, 500);
      }
      
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error while generating technical audit';
    throw new ApiError(errorMessage);
  }
}
