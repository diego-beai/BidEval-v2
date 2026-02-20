import { API_CONFIG } from '../config/constants';
import { fetchWithTimeout } from './api.service';
import { ApiError } from '../types/api.types';
import { ChatMessage, ChatRole } from '../types/chat.types';
import { supabase } from '../lib/supabase';
import { N8nChatMessage } from '../types/database.types';
import { generateUUID } from '../utils/uuid';

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
  const uuid = generateUUID();
  return `chat-${projectPart}-${Date.now()}-${uuid}`;
}

/**
 * Builds a project context summary to inject in the chat system prompt.
 * Fetches project details, providers, scores and economic data from Supabase.
 */
export async function buildProjectContext(projectId: string): Promise<string> {
  if (!supabase) return '';

  try {
    // Fetch project details
    const { data: project } = await (supabase as any)
      .from('projects')
      .select('name, display_name, project_type, status, invited_suppliers, date_submission_deadline')
      .eq('id', projectId)
      .single();

    if (!project) return '';

    // Fetch ranking
    const { data: ranking } = await (supabase as any)
      .from('ranking_proveedores')
      .select('provider_name, overall_score')
      .eq('project_id', projectId)
      .order('overall_score', { ascending: false });

    // Fetch economic offers summary
    const { data: offers } = await (supabase as any)
      .from('economic_offers')
      .select('provider_name, total_price, currency')
      .eq('project_id', projectId);

    const providers = (project.invited_suppliers || []) as string[];
    const rankingLines = (ranking || []).map((r: any, i: number) => {
      const score = r.overall_score != null
        ? (r.overall_score > 10 ? (r.overall_score / 10).toFixed(1) : Number(r.overall_score).toFixed(1))
        : 'N/A';
      return `${i + 1}. ${r.provider_name} (${score}/10)`;
    });

    let economicSummary = '';
    if (offers && offers.length > 0) {
      const prices = offers.filter((o: any) => o.total_price != null).map((o: any) => o.total_price as number);
      if (prices.length > 0) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const currency = offers[0].currency || 'EUR';
        economicSummary = `${min.toLocaleString()} - ${max.toLocaleString()} ${currency}`;
      }
    }

    return `
## Contexto del Proyecto Activo
- Nombre: ${project.display_name || project.name}
- Tipo: ${project.project_type || 'RFP'}
- Proveedores invitados: ${providers.join(', ') || 'N/A'}
- Estado: ${project.status || 'N/A'}
${rankingLines.length > 0 ? `- Ranking actual: ${rankingLines.join(', ')}` : ''}
${economicSummary ? `- Rango de precios: ${economicSummary}` : ''}
    `.trim();
  } catch {
    return '';
  }
}

/**
 * Envía un mensaje al chat de n8n y recibe la respuesta
 * @param message - El mensaje del usuario
 * @param sessionId - ID de sesión opcional
 * @param projectId - ID del proyecto activo para filtrar las respuestas
 * @param documentIds - IDs de documentos seleccionados para acotar el contexto
 * @param language - Idioma preferido
 * @param currency - Moneda del proyecto
 * @param projectContext - Contexto resumido del proyecto para inyectar en el prompt
 * @param enableCrossProject - Habilitar consultas cruzadas entre proyectos
 */
export async function sendChatMessage(
  message: string,
  sessionId?: string,
  projectId?: string | null,
  documentIds?: string[],
  language?: string,
  currency?: string,
  projectContext?: string,
  enableCrossProject?: boolean
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

    if (projectContext) {
      payload.project_context = projectContext;
    }

    if (enableCrossProject) {
      payload.enable_cross_project = true;
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
