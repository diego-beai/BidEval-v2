import { Provider } from '../types/provider.types';

/**
 * Configuración de API y endpoints
 */
export const API_CONFIG = {
  // URL del webhook de ofertas de proveedores (usa proxy en desarrollo)
  N8N_WEBHOOK_URL: import.meta.env.DEV ? 'https://n8n.beaienergy.com/webhook/ofertas-proveedores' : (import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.beaienergy.com/webhook/ofertas-proveedores'),
  // URL del webhook de ingesta de RFQ base del cliente (usa proxy en desarrollo)
  N8N_RFQ_INGESTA_URL: import.meta.env.DEV ? 'https://n8n.beaienergy.com/webhook/ingesta-rfq' : (import.meta.env.VITE_N8N_RFQ_INGESTA_URL || 'https://n8n.beaienergy.com/webhook/ingesta-rfq'),
  // URL del webhook de chat de n8n (usa proxy en desarrollo)
  N8N_CHAT_URL: import.meta.env.DEV ? 'https://n8n.beaienergy.com/webhook/chat-rfq' : (import.meta.env.VITE_N8N_CHAT_URL || 'https://n8n.beaienergy.com/webhook/chat-rfq'),
  // URL del webhook para ver tabla adicional (usa proxy en desarrollo)
  N8N_TABLA_URL: import.meta.env.DEV ? 'https://n8n.beaienergy.com/webhook/tabla' : (import.meta.env.VITE_N8N_TABLA_URL || 'https://n8n.beaienergy.com/webhook/tabla'),
  // URL del webhook para el generador de correos (usa proxy en desarrollo)
  N8N_MAIL_URL: import.meta.env.DEV ? 'https://n8n.beaienergy.com/webhook/mail' : (import.meta.env.VITE_N8N_MAIL_URL || 'https://n8n.beaienergy.com/webhook/mail'),
  // URL del webhook para generar auditoría técnica Q&A (usa proxy en desarrollo)
  N8N_QA_AUDIT_URL: import.meta.env.DEV ? 'https://n8n.beaienergy.com/webhook/qa-audit-generator' : (import.meta.env.VITE_N8N_QA_AUDIT_URL || 'https://n8n.beaienergy.com/webhook/qa-audit-generator'),
  // URL del webhook para el scoring de proveedores
  N8N_SCORING_URL: import.meta.env.DEV ? 'https://n8n.beaienergy.com/webhook/scoring-evaluation' : (import.meta.env.VITE_N8N_SCORING_URL || 'https://n8n.beaienergy.com/webhook/scoring-evaluation'),
  // URL del webhook para enviar Q&A al proveedor (genera token y link)
  N8N_QA_SEND_TO_SUPPLIER_URL: import.meta.env.DEV ? 'https://n8n.beaienergy.com/webhook/qa-send-to-supplier' : (import.meta.env.VITE_N8N_QA_SEND_TO_SUPPLIER_URL || 'https://n8n.beaienergy.com/webhook/qa-send-to-supplier'),
  // URL del webhook para procesar respuestas del proveedor
  N8N_QA_PROCESS_RESPONSES_URL: import.meta.env.DEV ? 'https://n8n.beaienergy.com/webhook/qa-process-responses' : (import.meta.env.VITE_N8N_QA_PROCESS_RESPONSES_URL || 'https://n8n.beaienergy.com/webhook/qa-process-responses'),
  // URL del webhook para enviar email Q&A (desde Mail Dashboard)
  N8N_QA_SEND_EMAIL_URL: import.meta.env.DEV ? 'https://n8n.beaienergy.com/webhook/qa-send-email' : (import.meta.env.VITE_N8N_QA_SEND_EMAIL_URL || 'https://n8n.beaienergy.com/webhook/qa-send-email'),
  // URL del webhook para procesar respuesta de email con IA
  N8N_QA_PROCESS_EMAIL_RESPONSE_URL: import.meta.env.DEV ? 'https://n8n.beaienergy.com/webhook/qa-process-email-response' : (import.meta.env.VITE_N8N_QA_PROCESS_EMAIL_RESPONSE_URL || 'https://n8n.beaienergy.com/webhook/qa-process-email-response'),
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
