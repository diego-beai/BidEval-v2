import { API_CONFIG } from '../config/constants';
import { fetchWithTimeout } from './api.service';
import { ApiError } from '../types/api.types';
import { ChatMessage, ChatRole } from '../types/chat.types';
import { supabase } from '../lib/supabase';
import { N8nChatMessage } from '../types/database.types';

/**
 * Tipo para la fila de n8n_chat_history desde Supabase
 */
interface N8nChatHistoryRow {
  id: number;
  session_id: string;
  message: N8nChatMessage;
}

/**
 * Genera un ID de sesión único para el chat
 * Incluye el projectId para separar conversaciones por proyecto
 */
function generateSessionId(projectId?: string | null): string {
  const projectPart = projectId ? `proj-${projectId.substring(0, 8)}` : 'global';
  const uuid = crypto.randomUUID?.() ?? `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  return `chat-${projectPart}-${Date.now()}-${uuid}`;
}

/**
 * Envía un mensaje al chat de n8n y recibe la respuesta
 * @param message - El mensaje del usuario
 * @param sessionId - ID de sesión opcional
 * @param projectId - ID del proyecto activo para filtrar las respuestas
 * @param documentIds - IDs de documentos seleccionados para acotar el contexto
 */
export async function sendChatMessage(
  message: string,
  sessionId?: string,
  projectId?: string | null,
  documentIds?: string[],
  language?: string,
  currency?: string
): Promise<{ response: string; sessionId: string }> {
  // Si no hay sessionId, generar uno nuevo que incluya el projectId
  const currentSessionId = sessionId || generateSessionId(projectId);

  try {
    // Payload según el formato esperado por n8n chatTrigger
    // Incluye project_id para filtrar datos por proyecto
    // Incluye document_ids para acotar a documentos específicos
    const payload: Record<string, unknown> = {
      action: 'sendMessage',
      sessionId: currentSessionId,
      chatInput: message,
      project_id: projectId || '',
      language: language || 'es',
      currency: currency || 'EUR'
    };

    if (documentIds && documentIds.length > 0) {
      payload.document_ids = documentIds;
    }

    const response = await fetchWithTimeout(
      API_CONFIG.N8N_CHAT_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      },
      API_CONFIG.REQUEST_TIMEOUT,
      { maxRetries: 0 }
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
 * Obtiene el historial del chat para una sesión desde Supabase
 */
export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('n8n_chat_histories')
      .select('id, session_id, message')
      .eq('session_id', sessionId)
      .order('id', { ascending: true }) as { data: N8nChatHistoryRow[] | null; error: unknown };

    if (error) {
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Convertir mensajes de n8n a formato ChatMessage
    return data.map((row: N8nChatHistoryRow) => {
      const msg = row.message;
      return {
        id: `msg-${row.id}`,
        role: msg.type === 'human' ? ChatRole.USER : ChatRole.ASSISTANT,
        content: msg.content,
        timestamp: new Date() // n8n no guarda timestamp, usamos fecha actual
      };
    });
  } catch (error) {
    return [];
  }
}

/**
 * Obtiene la lista de sesiones de chat disponibles
 */
export async function getChatSessions(): Promise<{ sessionId: string; messageCount: number; lastMessage: string }[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('n8n_chat_histories')
      .select('session_id, message')
      .order('id', { ascending: false }) as { data: N8nChatHistoryRow[] | null; error: unknown };

    if (error || !data) {
      return [];
    }

    // Agrupar por session_id y contar mensajes
    const sessionMap = new Map<string, { count: number; lastMessage: string }>();

    for (const row of data) {
      const msg = row.message;
      if (!sessionMap.has(row.session_id)) {
        sessionMap.set(row.session_id, {
          count: 1,
          lastMessage: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')
        });
      } else {
        const existing = sessionMap.get(row.session_id)!;
        existing.count++;
      }
    }

    return Array.from(sessionMap.entries()).map(([sessionId, info]) => ({
      sessionId,
      messageCount: info.count,
      lastMessage: info.lastMessage
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Obtiene la última sesión de chat activa (la más reciente)
 */
export async function getLastActiveSession(): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('n8n_chat_histories')
      .select('session_id')
      .order('id', { ascending: false })
      .limit(1) as { data: { session_id: string }[] | null; error: unknown };

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0].session_id;
  } catch (error) {
    return null;
  }
}
