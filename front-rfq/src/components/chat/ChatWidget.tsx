import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../stores/useChatStore';
import { ChatRole, ChatStatus } from '../../types/chat.types';
import { Spinner } from '../ui/Spinner';

/**
 * Widget de chat flotante
 */
export function ChatWidget() {
  const {
    isOpen,
    messages,
    unreadCount,
    status,
    error,
    toggleChat,
    closeChat,
    sendMessage,
    clearMessages
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatWidgetRef = useRef<HTMLDivElement>(null);
  const chatButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus en input cuando se abre el chat
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Cerrar al hacer click fuera del chat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isOpen &&
        chatWidgetRef.current &&
        !chatWidgetRef.current.contains(target) &&
        chatButtonRef.current &&
        !chatButtonRef.current.contains(target)
      ) {
        closeChat();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeChat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || status === ChatStatus.SENDING) return;

    await sendMessage(inputValue);
    setInputValue('');
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Botón flotante - siempre visible */}
      <button
        ref={chatButtonRef}
        onClick={toggleChat}
        className={`chatButton ${isOpen ? 'chatButton--active' : ''}`}
        aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {unreadCount > 0 && !isOpen && (
          <span className="chatButtonBadge">{unreadCount}</span>
        )}
      </button>

      {/* Ventana de chat */}
      {isOpen && (
        <div ref={chatWidgetRef} className="chatWidget">
          {/* Header */}
          <div className="chatHeader">
            <div className="chatHeaderInfo">
              <h3 className="chatTitle">Asistente RFQ</h3>
              <p className="chatSubtitle">
                Consulta sobre las ofertas procesadas
              </p>
            </div>
            <div className="chatHeaderActions">
              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="chatHeaderBtn"
                  aria-label="Limpiar conversación"
                  title="Limpiar conversación"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
              <button
                onClick={closeChat}
                className="chatHeaderBtn"
                aria-label="Cerrar chat"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div className="chatMessages">
            {messages.length === 0 ? (
              <div className="chatEmpty">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p className="chatEmptyTitle">Inicia una conversación</p>
                <p className="chatEmptyText">
                  Pregunta sobre las ofertas procesadas, precios, especificaciones técnicas y más.
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`chatMessage chatMessage--${message.role}`}
                  >
                    <div className="chatMessageContent">
                      {message.role === ChatRole.ASSISTANT && (
                        <div className="chatMessageAvatar chatMessageAvatar--assistant">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            {/* Icono de cerebro mejorado */}
                            <path d="M9.5 2.5a2.5 2.5 0 0 1 5 0v1.5a1 1 0 0 0 1 1v3.5a1 1 0 0 0 1 1v2.5a1 1 0 0 0 1 1v1.5a2.5 2.5 0 0 1-5 0v-1.5a1 1 0 0 0-1-1v-2.5a1 1 0 0 0-1-1V6a1 1 0 0 0-1-1V2.5Z" />
                            <path d="M7.5 8.5h9" />
                            <path d="M8.5 12.5h7" />
                            <path d="M6.5 6.5a2.5 2.5 0 0 1 5 0v1" />
                            <path d="M12.5 6.5a2.5 2.5 0 0 1 5 0v1" />
                          </svg>
                        </div>
                      )}
                      <div className="chatMessageBubble">
                        <p className="chatMessageText">{message.content}</p>
                        <span className="chatMessageTime">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {status === ChatStatus.SENDING && (
                  <div className="chatMessage chatMessage--assistant">
                    <div className="chatMessageContent">
                      <div className="chatMessageAvatar chatMessageAvatar--assistant">
                        <Spinner size="small" />
                      </div>
                      <div className="chatMessageBubble">
                        <p className="chatMessageText chatMessageText--loading">
                          Pensando...
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="chatInput">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe tu pregunta..."
              className="chatInputField"
              disabled={status === ChatStatus.SENDING}
            />
            <button
              type="submit"
              className="chatInputBtn"
              disabled={!inputValue.trim() || status === ChatStatus.SENDING}
              aria-label="Enviar mensaje"
            >
              {status === ChatStatus.SENDING ? (
                <Spinner size="small" />
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className="chatError">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}
        </div>
      )}
    </>
  );
}
