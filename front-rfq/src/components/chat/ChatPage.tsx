import React, { useState, useRef, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ChatPage.css';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useChatStore } from '../../stores/useChatStore';

/**
 * Error Boundary para capturar errores de renderizado de Markdown
 */
interface ErrorBoundaryProps {
    children: ReactNode;
    fallback: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

class MarkdownErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.warn('[MarkdownErrorBoundary] Error rendering markdown:', error.message, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

/**
 * Detecta y reformatea tablas mal formateadas (todo en una línea)
 * Convierte: | A | B | |---|---| | 1 | 2 |
 * A formato Markdown válido con saltos de línea
 */
function reformatInlineTables(content: string): string {
    // Detectar si hay separadores de tabla (|---|) en una línea sin saltos previos
    if (!content.includes('|---') && !content.includes('| ---')) {
        return content;
    }

    let result = content;

    // Dividir por líneas para procesar cada una
    const lines = result.split('\n');
    const processedLines: string[] = [];

    for (const line of lines) {
        // Si la línea contiene un separador de tabla inline
        if ((line.includes('|---') || line.includes('| ---')) && line.includes('| |')) {
            // Encontrar donde empieza el separador
            // Patrón: cabecera | |---| datos
            const separatorMatch = line.match(/^(.*?\|)\s*(\|[-:\s|]+\|)\s*(\|.*)$/);

            if (separatorMatch) {
                const [, header, separator, dataRows] = separatorMatch;

                // Dividir las filas de datos - cada fila empieza después de || o | |
                // La separación entre filas es cuando hay || seguido de un nombre (mayúscula)
                let remainingData = dataRows;
                const rows: string[] = [];

                // Buscar patrones como: | | IDOM | o || IDOM |
                const rowPattern = /\|\s*\|\s*([A-Z][A-Za-z]*)\s*\|/g;
                let lastIndex = 0;
                let match;

                while ((match = rowPattern.exec(remainingData)) !== null) {
                    if (lastIndex > 0) {
                        const prevRow = remainingData.slice(lastIndex - 1, match.index).trim();
                        if (prevRow && !prevRow.startsWith('|')) {
                            rows.push('|' + prevRow);
                        } else if (prevRow) {
                            rows.push(prevRow);
                        }
                    }
                    lastIndex = match.index + 1;
                }

                // Agregar la última fila
                if (lastIndex > 0) {
                    const lastRow = remainingData.slice(lastIndex - 1).trim();
                    if (lastRow && !lastRow.startsWith('|')) {
                        rows.push('|' + lastRow);
                    } else if (lastRow) {
                        rows.push(lastRow);
                    }
                }

                // Si no encontramos filas con el patrón, intentar dividir por ||
                if (rows.length === 0) {
                    const simpleSplit = dataRows.split(/\|\s*\|/).filter(r => r.trim());
                    for (const row of simpleSplit) {
                        const trimmed = row.trim();
                        if (trimmed) {
                            rows.push(trimmed.startsWith('|') ? trimmed : '| ' + trimmed);
                        }
                    }
                }

                // Construir la tabla formateada
                const formattedTable = [
                    header.trim(),
                    separator.trim(),
                    ...rows.map(r => r.endsWith('|') ? r : r + ' |')
                ].join('\n');

                processedLines.push(formattedTable);
                continue;
            }
        }
        processedLines.push(line);
    }

    return processedLines.join('\n');
}

/**
 * Sanitiza contenido para evitar errores de parsing
 */
function sanitizeContent(content: string): string {
    if (typeof content !== 'string') return '';

    // Remover caracteres de control problemáticos excepto saltos de línea y tabs
    let safe = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Remover secuencias que pueden romper el parser
    safe = safe.replace(/_{3,}/g, '___'); // Limitar underscores consecutivos
    safe = safe.replace(/\*{3,}/g, '***'); // Limitar asteriscos consecutivos

    // Intentar reformatear tablas inline
    safe = reformatInlineTables(safe);

    return safe;
}

/**
 * Renderiza texto plano de forma segura
 */
const PlainText: React.FC<{ content: string }> = ({ content }) => (
    <pre style={{
        whiteSpace: 'pre-wrap',
        margin: 0,
        fontFamily: 'inherit',
        wordBreak: 'break-word'
    }}>
        {content}
    </pre>
);

/**
 * Componente seguro para renderizar Markdown
 * Usa Error Boundary para capturar errores de renderizado
 */
const SafeMarkdown: React.FC<{ content: string }> = ({ content }) => {
    const safeContent = useMemo(() => sanitizeContent(content), [content]);

    // Fallback en texto plano
    const fallback = <PlainText content={safeContent} />;

    return (
        <MarkdownErrorBoundary fallback={fallback}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ children }) => <p style={{ margin: '0.5em 0' }}>{children}</p>,
                    code: ({ children, className }) => {
                        const isInline = !className;
                        return isInline
                            ? <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>{children}</code>
                            : <code className={className}>{children}</code>;
                    },
                    // Soporte para tablas Markdown
                    table: ({ children }) => (
                        <div style={{ overflowX: 'auto', margin: '1em 0' }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '0.9rem',
                                background: 'rgba(0, 0, 0, 0.2)',
                                borderRadius: '8px',
                                overflow: 'hidden'
                            }}>
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead style={{
                            background: 'rgba(18, 181, 176, 0.15)',
                            borderBottom: '1px solid rgba(18, 181, 176, 0.3)'
                        }}>
                            {children}
                        </thead>
                    ),
                    tbody: ({ children }) => <tbody>{children}</tbody>,
                    tr: ({ children }) => (
                        <tr style={{ borderBottom: '1px solid rgba(128, 128, 128, 0.2)' }}>
                            {children}
                        </tr>
                    ),
                    th: ({ children }) => (
                        <th style={{
                            padding: '10px 12px',
                            textAlign: 'left',
                            fontWeight: 600,
                            color: 'var(--color-cyan)',
                            whiteSpace: 'nowrap'
                        }}>
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td style={{
                            padding: '10px 12px',
                            color: 'var(--text-primary)'
                        }}>
                            {children}
                        </td>
                    ),
                    // Soporte para listas
                    ul: ({ children }) => (
                        <ul style={{ margin: '0.5em 0', paddingLeft: '1.5em' }}>{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol style={{ margin: '0.5em 0', paddingLeft: '1.5em' }}>{children}</ol>
                    ),
                    li: ({ children }) => (
                        <li style={{ margin: '0.3em 0' }}>{children}</li>
                    ),
                    // Headers
                    h1: ({ children }) => <h1 style={{ fontSize: '1.4em', margin: '0.8em 0 0.4em', fontWeight: 700 }}>{children}</h1>,
                    h2: ({ children }) => <h2 style={{ fontSize: '1.2em', margin: '0.8em 0 0.4em', fontWeight: 600 }}>{children}</h2>,
                    h3: ({ children }) => <h3 style={{ fontSize: '1.1em', margin: '0.6em 0 0.3em', fontWeight: 600 }}>{children}</h3>,
                    // Strong y emphasis
                    strong: ({ children }) => <strong style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{children}</strong>,
                    em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
                    // Separador horizontal
                    hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(128, 128, 128, 0.3)', margin: '1em 0' }} />
                }}
            >
                {safeContent}
            </ReactMarkdown>
        </MarkdownErrorBoundary>
    );
};

export const ChatPage: React.FC = () => {
    const { messages, sendMessage, status, clearMessages, loadHistory, historyLoaded } = useChatStore();
    const { t } = useLanguageStore();
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isLoading = status === 'sending';
    const isLoadingHistory = status === 'connecting';

    // Cargar historial al montar el componente
    useEffect(() => {
        if (!historyLoaded) {
            loadHistory();
        }
    }, [historyLoaded, loadHistory]);

    // Limpiar mensajes corruptos al montar el componente
    useEffect(() => {
        const hasCorruptMessages = messages.some(msg => {
            if (typeof msg.content !== 'string') return true;
            // Detectar caracteres problemáticos
            if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(msg.content)) return true;
            return false;
        });

        if (hasCorruptMessages) {
            console.warn('[ChatPage] Detectados mensajes corruptos, limpiando...');
            clearMessages();
        }
    }, []);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const content = input;
        setInput('');

        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        await sendMessage(content);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    // Filtrar mensajes válidos para renderizar
    const validMessages = useMemo(() => {
        return messages.filter(msg => typeof msg.content === 'string' && msg.content.length > 0);
    }, [messages]);

    return (
        <div className="chat-page">
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                zIndex: 20
            }}>
                <button
                    onClick={() => clearMessages()}
                    className="action-btn"
                    title={t('chat.clear_conversation')}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                </button>
            </div>

            {isLoadingHistory ? (
                <div className="chat-welcome">
                    <div className="typing-indicator" style={{ margin: '0 auto' }}>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                    </div>
                    <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
                        {t('chat.loadingHistory') || 'Loading chat history...'}
                    </p>
                </div>
            ) : validMessages.length === 0 ? (
                <div className="chat-welcome">
                    <h1>{t('chat.welcome')}</h1>
                </div>
            ) : (
                <div className="chat-messages">
                    {validMessages.map(msg => (
                        <div key={msg.id} className={`message ${msg.role}`}>
                            {msg.role === 'assistant' && (
                                <div className="message-avatar">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
                                        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
                                    </svg>
                                </div>
                            )}
                            <div className="message-bubble-container">
                                <div className="message-content markdown-body">
                                    <SafeMarkdown content={msg.content} />
                                </div>
                                <button
                                    className="copy-btn-message"
                                    onClick={() => handleCopy(msg.content)}
                                    title={t('chat.copy_clipboard')}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="message assistant">
                            <div className="message-avatar">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
                                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
                                </svg>
                            </div>
                            <div className="message-bubble-container">
                                <div className="message-content">
                                    <div className="typing-indicator">
                                        <span className="typing-dot"></span>
                                        <span className="typing-dot"></span>
                                        <span className="typing-dot"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            )}

            <div className="chat-input-container">
                <div
                    className="chat-input-wrapper"
                    onClick={() => textareaRef.current?.focus()}
                >
                    <textarea
                        ref={textareaRef}
                        className="chat-textarea"
                        placeholder={t('chat.placeholder') || "Ask me anything..."}
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />

                    <div className="chat-input-actions">
                        <div className="action-buttons-left">
                            <button className="action-btn" title={t('chat.attach')}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                            </button>
                            <button className="action-btn" title={t('chat.search')}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            </button>
                        </div>

                        <button
                            className="send-btn"
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                        >
                            {isLoading ? (
                                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="19" x2="12" y2="5"></line>
                                    <polyline points="5 12 12 5 19 12"></polyline>
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
