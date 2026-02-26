import { Provider } from '../types/provider.types';
import { getProviderColor, getProviderDisplayName, getProviderFullDisplayName } from '../types/provider.types';

// Re-export dynamic provider helpers for backward compatibility
export { getProviderColor, getProviderDisplayName, getProviderFullDisplayName };

/**
 * Configuración de API y endpoints
 * En desarrollo, usamos el proxy de Vite para evitar problemas de CORS
 * En producción, usamos las URLs directas o las variables de entorno
 */
export const API_CONFIG = {
  // URL del webhook de ofertas de proveedores
  // nginx proxies /api/n8n/* to n8n.beaienergy.com/webhook/*
  N8N_WEBHOOK_URL: import.meta.env.VITE_N8N_WEBHOOK_URL || '/api/n8n/ofertas',
  // URL del webhook de ingesta de RFQ base del cliente
  N8N_RFQ_INGESTA_URL: import.meta.env.VITE_N8N_RFQ_INGESTA_URL || '/api/n8n/ingesta-rfq',
  // URL del webhook de chat de n8n
  N8N_CHAT_URL: import.meta.env.VITE_N8N_CHAT_URL || '/api/n8n/chat-rfq',
  // URL del webhook para ver tabla adicional
  N8N_TABLA_URL: import.meta.env.VITE_N8N_TABLA_URL || '/api/n8n/tabla',
  // URL del webhook para el generador de correos
  N8N_MAIL_URL: import.meta.env.VITE_N8N_MAIL_URL || '/api/n8n/mail',
  // URL del webhook para generar auditoría técnica Q&A
  N8N_QA_AUDIT_URL: import.meta.env.VITE_N8N_QA_AUDIT_URL || '/api/n8n/qa-audit-generator',
  // URL del webhook para el scoring de proveedores
  N8N_SCORING_URL: import.meta.env.VITE_N8N_SCORING_URL || '/api/n8n/scoring-evaluation',
  // URL del webhook para enviar Q&A al proveedor
  N8N_QA_SEND_TO_SUPPLIER_URL: import.meta.env.VITE_N8N_QA_SEND_TO_SUPPLIER_URL || '/api/n8n/qa-send-to-supplier',
  // URL del webhook para procesar respuestas del proveedor
  N8N_QA_PROCESS_RESPONSES_URL: import.meta.env.VITE_N8N_QA_PROCESS_RESPONSES_URL || '/api/n8n/qa-process-responses',
  // URL del webhook para enviar email Q&A
  N8N_QA_SEND_EMAIL_URL: import.meta.env.VITE_N8N_QA_SEND_EMAIL_URL || '/api/n8n/qa-send-email',
  // URL del webhook para procesar respuesta de email con IA
  N8N_QA_PROCESS_EMAIL_RESPONSE_URL: import.meta.env.VITE_N8N_QA_PROCESS_EMAIL_RESPONSE_URL || '/api/n8n/qa-process-email-response',
  // URL del webhook para generar RFP con IA a partir de requisitos
  N8N_RFP_GENERATE_URL: import.meta.env.VITE_N8N_RFP_GENERATE_URL || '/api/n8n/rfp-generate',
  // URL del webhook para enviar email de invitación
  N8N_SEND_INVITE_URL: import.meta.env.VITE_N8N_SEND_INVITE_URL || '/api/n8n/send-invite',
  REQUEST_TIMEOUT: parseInt(import.meta.env.VITE_REQUEST_TIMEOUT || '1800000', 10), // 30 minutos por defecto (procesamiento de PDFs puede tardar hasta 30 min)
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_FILE_TYPES: ['application/pdf'],
  ALLOWED_EXTENSIONS: ['.pdf']
};

/**
 * Colores asignados a cada proveedor (usando CSS variables del styles.css)
 */
export const PROVIDER_COLORS: Record<Provider, string> = {
  [Provider.TR]: 'var(--accent)',
  [Provider.IDOM]: '#41d17a', // --ok
  [Provider.SACYR]: '#a78bfa',
  [Provider.EA]: '#fb923c',
  [Provider.SENER]: '#ec4899',
  [Provider.TRESCA]: '#22d3ee',
  [Provider.WORLEY]: '#fbbf24'
};

/**
 * Nombres display para proveedores
 */
export const PROVIDER_DISPLAY_NAMES: Record<Provider, string> = {
  [Provider.TR]: 'Técnicas Reunidas',
  [Provider.IDOM]: 'IDOM',
  [Provider.SACYR]: 'SACYR',
  [Provider.EA]: 'Empresarios Agrupados',
  [Provider.SENER]: 'SENER',
  [Provider.TRESCA]: 'TRESCA',
  [Provider.WORLEY]: 'WORLEY'
};

/**
 * Mensajes de estado para cada etapa del procesamiento
 */
export const STAGE_MESSAGES = {
  idle: 'Esperando archivo...',
  uploading: 'Subiendo archivo a n8n...',
  ocr_processing: 'Extrayendo texto del PDF...',
  classifying: 'Clasificando proveedor y tipo de evaluación...',
  embedding: 'Generando embeddings vectoriales...',
  evaluating: 'Evaluando ítems de Propuesta con IA...',
  completed: '¡Procesamiento completado exitosamente!',
  error: 'Error durante el procesamiento'
};
