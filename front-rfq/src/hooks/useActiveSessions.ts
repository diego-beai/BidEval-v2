import { useChatStore } from '../stores/useChatStore';
import { useMailStore } from '../stores/useMailStore';
import { useRfqStore } from '../stores/useRfqStore';
import { useSessionViewStore } from '../stores/useSessionViewStore';

/**
 * Hook para detectar sesiones activas en diferentes módulos
 * Ahora verifica si el contenido NO ha sido visto (unread)
 */
export interface ActiveSession {
  module: 'chat' | 'mail' | 'upload';
  hasContent: boolean;
  hasUnreadContent: boolean; // Nueva propiedad
  timestamp?: Date;
  description?: string;
}

export const useActiveSessions = (): ActiveSession[] => {
  const chatMessages = useChatStore(state => state.messages);
  const mailHasGenerated = useMailStore(state => state.hasGenerated);
  const mailSubject = useMailStore(state => state.subject);
  const rfqMetadata = useRfqStore(state => state.rfqMetadata);

  // Acceder al store de sesiones vistas
  const hasUnreadContent = useSessionViewStore(state => state.hasUnreadContent);

  const sessions: ActiveSession[] = [];

  // Chat session
  if (chatMessages.length > 0) {
    const lastMessage = chatMessages[chatMessages.length - 1];
    sessions.push({
      module: 'chat',
      hasContent: true,
      hasUnreadContent: hasUnreadContent('chat'),
      timestamp: lastMessage.timestamp,
      description: `${chatMessages.length} messages`
    });
  }

  // Mail session
  if (mailHasGenerated && mailSubject) {
    sessions.push({
      module: 'mail',
      hasContent: true,
      hasUnreadContent: hasUnreadContent('mail'),
      description: `Draft: ${mailSubject.substring(0, 30)}...`
    });
  }

  // RFQ/Upload session
  if (rfqMetadata.proyecto && rfqMetadata.proveedor) {
    sessions.push({
      module: 'upload',
      hasContent: true,
      hasUnreadContent: hasUnreadContent('upload'),
      description: `${rfqMetadata.proyecto} - ${rfqMetadata.proveedor}`
    });
  }

  return sessions;
};

/**
 * Hook to check if a specific module has active UNREAD content
 */
export const useHasActiveSession = (module: 'chat' | 'mail' | 'upload'): boolean => {
  const sessions = useActiveSessions();
  return sessions.some(s => s.module === module && s.hasUnreadContent);
};
