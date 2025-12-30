import { Provider } from '../types/provider.types';

/**
 * Configuración de API y endpoints
 */
export const API_CONFIG = {
  // Usar proxy en desarrollo para evitar CORS, URL directa en producción
  N8N_WEBHOOK_URL: import.meta.env.PROD
    ? (import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.beaienergy.com/webhook-test/rfq')
    : '/api/n8n/webhook-test/rfq',
  // URL del webhook de ingesta de RFQ base del cliente
  N8N_RFQ_INGESTA_URL: import.meta.env.PROD
    ? (import.meta.env.VITE_N8N_RFQ_INGESTA_URL || 'https://n8n.beaienergy.com/webhook-test/ingesta-rfq')
    : '/api/n8n/webhook-test/ingesta-rfq',
  // URL del webhook de chat de n8n
  N8N_CHAT_URL: import.meta.env.PROD
    ? (import.meta.env.VITE_N8N_CHAT_URL || 'http://localhost:5678/webhook/072a6322-4bb1-444b-bd82-5c1df6db623f/chat')
    : '/api/n8n/webhook/072a6322-4bb1-444b-bd82-5c1df6db623f/chat',
  REQUEST_TIMEOUT: parseInt(import.meta.env.VITE_REQUEST_TIMEOUT || '600000', 10), // 10 minutos por defecto
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
