/**
 * Tipos para el sistema de chat integrado con n8n
 */

/**
 * Rol del mensaje en el chat
 */
export enum ChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

/**
 * Mensaje individual en el chat
 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
}

/**
 * Estado del chat
 */
export enum ChatStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  SENDING = 'sending',
  RECEIVING = 'receiving',
  ERROR = 'error'
}

/**
 * Respuesta del webhook de chat de n8n
 */
export interface ChatResponse {
  output: string;
  sessionId?: string;
}

/**
 * Payload para enviar al webhook de chat
 */
export interface ChatRequest {
  action: 'sendMessage';
  sessionId: string;
  chatInput: string;
}
