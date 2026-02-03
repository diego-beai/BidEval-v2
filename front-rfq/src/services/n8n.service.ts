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
  },
  abortSignal?: AbortSignal
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
      API_CONFIG.REQUEST_TIMEOUT,
      {},
      abortSignal
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
 * Result of individual file upload
 */
export interface FileUploadResult {
  fileName: string;
  success: boolean;
  results?: RfqItem[];
  error?: string;
}

/**
 * Result of multiple file upload with individual status per file
 */
export interface MultiFileUploadResponse {
  totalFiles: number;
  successCount: number;
  failureCount: number;
  fileResults: FileUploadResult[];
  combinedResults: RfqItem[];
}

/**
 * File with individual metadata for multi-file upload
 */
interface FileWithMetadataInput {
  file: File;
  metadata: {
    proyecto: string;
    proveedor: string;
    tipoEvaluacion: string[];
  };
}

/**
 * Procesa múltiples archivos en paralelo, cada uno con su propia metadata
 * Envía todas las peticiones simultáneamente y devuelve resultados individuales y combinados
 */
export async function uploadMultipleRfqFiles(
  filesWithMetadata: FileWithMetadataInput[],
  globalMetadata?: {
    project_id?: string;
  },
  abortSignal?: AbortSignal
): Promise<MultiFileUploadResponse> {
  if (filesWithMetadata.length === 0) {
    throw new ApiError('No files to process');
  }

  // Send all requests in parallel with individual metadata per file
  const uploadPromises = filesWithMetadata.map(async ({ file, metadata }) => {
    try {
      const result = await uploadRfqFile(file, {
        project_id: globalMetadata?.project_id,
        proyecto: metadata.proyecto,
        proveedor: metadata.proveedor,
        tipoEvaluacion: metadata.tipoEvaluacion
      }, abortSignal);

      return {
        fileName: file.name,
        success: true,
        results: result.results
      } as FileUploadResult;
    } catch (error) {
      return {
        fileName: file.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as FileUploadResult;
    }
  });

  // Wait for all to complete
  const fileResults = await Promise.all(uploadPromises);

  // Calculate stats
  const successCount = fileResults.filter(r => r.success).length;
  const failureCount = fileResults.length - successCount;

  // Combine all successful results
  const combinedResults: RfqItem[] = [];
  fileResults.forEach(r => {
    if (r.success && r.results) {
      combinedResults.push(...r.results);
    }
  });

  return {
    totalFiles: filesWithMetadata.length,
    successCount,
    failureCount,
    fileResults,
    combinedResults
  };
}

/**
 * Legacy function for backward compatibility
 * Procesa múltiples archivos con metadata compartida
 */
export async function uploadMultipleRfqFilesLegacy(
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
    // Enviar todas las peticiones en paralelo con la metadata compartida
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
 * @param projectName - Nombre display del proyecto (opcional, se obtiene del store)
 * @returns Información sobre la RFQ procesada
 */
export async function uploadRfqBase(
  file: File,
  projectId?: string,
  projectName?: string
): Promise<RfqIngestaResponse> {
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
      project_id: projectId || null,
      // Project name for display purposes (fixes issue where file_title was used as project name)
      project_name: projectName || fileTitle.replace(/\.pdf$/i, '')
    };

    console.log('📤 Sending base RFQ to n8n:', {
      fileName: fileTitle,
      projectId: projectId || 'null',
      projectName: projectName || 'using filename as fallback',
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
      // Normalizar la respuesta - ser muy permisivo con el formato
      // porque n8n puede devolver diferentes estructuras
      const normalizedData: RfqIngestaResponse = {
        success: true, // Si response.ok, asumimos éxito
        message: data.message || data.msg || 'RFQ procesada correctamente',
        file_id: data.file_id || data.fileId || data.id || fileId,
        tipos_procesados: data.tipos_procesados || data.types || data.tipos || []
      };

      console.log('✅ Base RFQ processed successfully:', {
        fileId: normalizedData.file_id,
        tiposProcesados: normalizedData.tipos_procesados,
        message: normalizedData.message
      });

      return normalizedData;
    }

    // If HTTP response was not successful, throw error
    throw new ApiError(
      data.message || data.error || `Server error (${response.status}): ${response.statusText}`
    );

  } catch (error) {
    // Log detallado del error
    console.error('❌ Error al procesar RFQ base:', {
      error,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      fileName: fileTitle,
      endpoint: API_CONFIG.N8N_RFQ_INGESTA_URL,
      projectId: projectId
    });

    // Mostrar alerta para debug
    console.warn('🔍 DEBUG - Error details:', JSON.stringify({
      hasMessage: error instanceof Error && !!error.message,
      isApiError: error instanceof ApiError,
      errorString: String(error),
      errorKeys: error && typeof error === 'object' ? Object.keys(error) : []
    }, null, 2));

    if (error instanceof ApiError) {
      throw error;
    }

    // Mejorar el mensaje de error con más detalles
    let errorMessage = 'Unknown error while processing base RFQ.';

    if (error instanceof Error && error.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string' && error.trim()) {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      // Intentar extraer cualquier propiedad útil
      const err = error as any;
      errorMessage = err.message || err.error || err.statusText || JSON.stringify(error);
    }

    throw new ApiError(errorMessage);
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
/**
 * Payload para enviar Q&A al proveedor
 */
export interface SendToSupplierPayload {
  project_id: string;
  provider_name: string;
  question_ids: string[];
  email_to?: string;
  expires_days?: number;
}

/**
 * Respuesta del webhook de envío al proveedor
 */
export interface SendToSupplierResponse {
  success: boolean;
  token: string;
  response_link: string;
  expires_at: string;
  project_name: string;
  provider_name: string;
  question_count: number;
  email_to?: string;
  email_subject?: string;
  email_html?: string;
}

/**
 * Envía preguntas Q&A al proveedor generando un link único
 *
 * @param payload - Datos del envío (proyecto, proveedor, IDs de preguntas)
 * @returns Token, link de respuesta y contenido del email
 */
export async function sendQAToSupplier(
  payload: SendToSupplierPayload
): Promise<SendToSupplierResponse> {
  try {
    console.log('📧 Sending Q&A to supplier:', {
      projectId: payload.project_id,
      provider: payload.provider_name,
      questionCount: payload.question_ids.length,
      endpoint: API_CONFIG.N8N_QA_SEND_TO_SUPPLIER_URL
    });

    const response = await fetchWithTimeout(
      API_CONFIG.N8N_QA_SEND_TO_SUPPLIER_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      },
      30000 // 30 seconds timeout
    );

    const data = await response.json();

    if (response.ok && data.success !== false) {
      console.log('✅ Q&A sent to supplier:', {
        token: data.token?.substring(0, 8) + '...',
        responseLink: data.response_link,
        questionCount: data.question_count
      });

      return data as SendToSupplierResponse;
    }

    throw new ApiError(data.error || data.message || 'Error sending Q&A to supplier');

  } catch (error) {
    console.error('❌ Error sending Q&A to supplier:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error while sending Q&A to supplier'
    );
  }
}

/**
 * Payload para ejecutar el scoring de proveedores
 */
export interface ScoringEvaluationPayload {
  project_id: string;
  provider_name?: string;
  recalculate_all?: boolean;
}

/**
 * Respuesta del webhook de scoring
 */
export interface ScoringEvaluationResponse {
  success: boolean;
  ranking: Array<{
    position: number;
    provider_name: string;
    overall_score: number;
    compliance_percentage: number;
    category_scores: {
      technical: number;
      economic: number;
      execution: number;
      hse_esg: number;
    };
  }>;
  statistics: {
    total_providers: number;
    average_score: number;
    top_performer: string;
  };
  message?: string;
}

/**
 * Ejecuta el scoring de proveedores para un proyecto
 *
 * @param payload - Datos del proyecto y filtro opcional de proveedor
 * @returns Ranking de proveedores con sus scores
 */
export async function triggerScoringEvaluation(
  payload: ScoringEvaluationPayload
): Promise<ScoringEvaluationResponse> {
  try {
    console.log('📊 Triggering scoring evaluation:', {
      projectId: payload.project_id,
      providerFilter: payload.provider_name || 'all',
      endpoint: API_CONFIG.N8N_SCORING_URL
    });

    const startTime = Date.now();

    const response = await fetchWithTimeout(
      API_CONFIG.N8N_SCORING_URL,
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

    console.log('📥 Scoring evaluation response:', {
      status: response.status,
      elapsedTime: `${elapsedTime}s`,
      providersRanked: data.ranking?.length || 0
    });

    if (response.ok && data.success !== false) {
      return data as ScoringEvaluationResponse;
    }

    throw new ApiError(data.error || data.message || 'Error executing scoring evaluation');

  } catch (error) {
    console.error('❌ Error in scoring evaluation:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error during scoring evaluation'
    );
  }
}

export async function generateTechnicalAudit(
  payload: GenerateAuditPayload
): Promise<GenerateAuditResponse> {
  try {
    console.log('🔍 Generating technical audit:', {
      projectId: payload.project_id,
      projectName: payload.project_name,
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

/**
 * Payload para enviar preguntas Q&A por email
 */
export interface SendQAEmailPayload {
  project_id: string;
  provider_name: string;
  question_ids: string[];
  email_to: string;
  subject?: string;
}

/**
 * Respuesta del webhook de envío de email
 */
export interface SendQAEmailResponse {
  success: boolean;
  message: string;
  sent_count: number;
  email_to: string;
  subject: string;
}

/**
 * Envía preguntas Q&A por email al proveedor usando Gmail API
 *
 * @param payload - Datos del envío (proyecto, proveedor, IDs de preguntas, email destino)
 * @returns Resultado del envío
 */
export async function sendQAEmail(
  payload: SendQAEmailPayload
): Promise<SendQAEmailResponse> {
  try {
    console.log('📧 Sending Q&A email:', {
      projectId: payload.project_id,
      provider: payload.provider_name,
      questionCount: payload.question_ids.length,
      emailTo: payload.email_to,
      endpoint: API_CONFIG.N8N_QA_SEND_EMAIL_URL
    });

    const response = await fetchWithTimeout(
      API_CONFIG.N8N_QA_SEND_EMAIL_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      },
      60000 // 60 seconds timeout for email sending
    );

    const data = await response.json();

    if (response.ok && data.success !== false) {
      console.log('✅ Q&A email sent successfully:', {
        sentCount: data.sent_count,
        emailTo: data.email_to
      });

      return data as SendQAEmailResponse;
    }

    throw new ApiError(data.error || data.message || 'Error sending Q&A email');

  } catch (error) {
    console.error('❌ Error sending Q&A email:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error while sending Q&A email'
    );
  }
}

/**
 * Payload para procesar respuesta de email con IA
 */
export interface ProcessEmailResponsePayload {
  project_id: string;
  provider_name: string;
  email_content: string;
}

/**
 * Mapeo de respuesta individual
 */
export interface ResponseMapping {
  question_id: string;
  question_text: string;
  response_text: string;
  confidence: number;
  matched: boolean;
}

/**
 * Respuesta del webhook de procesamiento de email con IA
 */
export interface ProcessEmailResponseResult {
  success: boolean;
  message: string;
  processed_count: number;
  mappings: ResponseMapping[];
}

/**
 * Procesa el contenido de un email de respuesta del proveedor usando IA
 * para mapear cada respuesta a su pregunta original
 *
 * @param payload - Datos del procesamiento (proyecto, proveedor, contenido del email)
 * @returns Resultado del mapeo con las respuestas identificadas
 */
export async function processEmailResponse(
  payload: ProcessEmailResponsePayload
): Promise<ProcessEmailResponseResult> {
  try {
    console.log('🤖 Processing email response with AI:', {
      projectId: payload.project_id,
      provider: payload.provider_name,
      contentLength: payload.email_content.length,
      endpoint: API_CONFIG.N8N_QA_PROCESS_EMAIL_RESPONSE_URL
    });

    const response = await fetchWithTimeout(
      API_CONFIG.N8N_QA_PROCESS_EMAIL_RESPONSE_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      },
      120000 // 2 minutes timeout for AI processing
    );

    const data = await response.json();

    if (response.ok && data.success !== false) {
      console.log('✅ Email response processed successfully:', {
        processedCount: data.processed_count,
        mappingsCount: data.mappings?.length || 0
      });

      return data as ProcessEmailResponseResult;
    }

    throw new ApiError(data.error || data.message || 'Error processing email response');

  } catch (error) {
    console.error('❌ Error processing email response:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error while processing email response'
    );
  }
}

/**
 * Payload para confirmar y guardar las respuestas mapeadas
 */
export interface SaveMappedResponsesPayload {
  project_id: string;
  provider_name: string;
  mappings: Array<{
    question_id: string;
    response_text: string;
  }>;
}

/**
 * Respuesta del guardado de respuestas
 */
export interface SaveMappedResponsesResult {
  success: boolean;
  message: string;
  saved_count: number;
}

/**
 * Guarda las respuestas mapeadas confirmadas en la base de datos
 *
 * @param payload - Respuestas mapeadas a guardar
 * @returns Resultado del guardado
 */
export async function saveMappedResponses(
  payload: SaveMappedResponsesPayload
): Promise<SaveMappedResponsesResult> {
  try {
    console.log('💾 Saving mapped responses:', {
      projectId: payload.project_id,
      provider: payload.provider_name,
      mappingsCount: payload.mappings.length,
      endpoint: API_CONFIG.N8N_QA_PROCESS_RESPONSES_URL
    });

    const response = await fetchWithTimeout(
      API_CONFIG.N8N_QA_PROCESS_RESPONSES_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...payload,
          action: 'save_responses'
        })
      },
      30000 // 30 seconds timeout
    );

    const data = await response.json();

    if (response.ok && data.success !== false) {
      console.log('✅ Responses saved successfully:', {
        savedCount: data.saved_count
      });

      return data as SaveMappedResponsesResult;
    }

    throw new ApiError(data.error || data.message || 'Error saving responses');

  } catch (error) {
    console.error('❌ Error saving responses:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error while saving responses'
    );
  }
}

/**
 * Note: n8n's public API does NOT support stopping running executions.
 * The /executions/{id}/stop endpoint is not available.
 * See: https://community.n8n.io/t/n8n-api-stop-cancel-execution/133701
 *
 * When we abort the fetch request, the HTTP connection is closed.
 * Whether n8n stops the workflow depends on its internal behavior —
 * synchronous webhook workflows may stop, but async ones will continue.
 */
export function cancelRunningN8nExecutions(): Promise<void> {
  // No-op: n8n public API doesn't support stopping executions
  console.log('ℹ️ HTTP requests aborted. n8n workflows may continue in the background.');
  return Promise.resolve();
}
