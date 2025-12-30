import { API_CONFIG } from '../config/constants';
import { fetchWithTimeout } from './api.service';
import { ApiError } from '../types/api.types';
import { ChatResponse } from '../types/chat.types';

/**
 * Genera un ID de sesión único para el chat
 */
function generateSessionId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Envía un mensaje al chat de n8n y recibe la respuesta
 */
export async function sendChatMessage(
  message: string,
  sessionId?: string
): Promise<{ response: string; sessionId: string }> {
  const currentSessionId = sessionId || generateSessionId();

  try {
    // Payload según el formato esperado por n8n chatTrigger
    const payload = {
      action: 'sendMessage',
      sessionId: currentSessionId,
      chatInput: message
    };

    const response = await fetchWithTimeout(
      API_CONFIG.N8N_CHAT_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      },
      API_CONFIG.REQUEST_TIMEOUT
    );

    const data = await response.json();

    // n8n puede devolver diferentes formatos dependiendo de la configuración
    let responseText: string;

    if (typeof data === 'string') {
      responseText = data;
    } else if (data.output) {
      responseText = data.output;
    } else if (data.text) {
      responseText = data.text;
    } else if (data.response) {
      responseText = data.response;
    } else {
      throw new ApiError('Formato de respuesta no reconocido del chat');
    }

    return {
      response: responseText,
      sessionId: currentSessionId
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Error al comunicarse con el chat'
    );
  }
}

/**
 * Obtiene el historial del chat para una sesión
 * Nota: La implementación depende de si n8n expone un endpoint para esto
 */
export async function getChatHistory(): Promise<ChatResponse[]> {
  // Por ahora retornamos vacío ya que el historial se mantiene en el store local
  // Si n8n expone un endpoint de historial, se puede implementar aquí
  return [];
}
