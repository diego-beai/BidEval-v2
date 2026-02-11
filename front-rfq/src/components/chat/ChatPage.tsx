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
 */
function reformatInlineTables(content: string): string {
    if (!content.includes('|---') && !content.includes('| ---')) {
        return content;
    }

    let result = content;
    const lines = result.split('\n');
    const processedLines: string[] = [];

    for (const line of lines) {
        if ((line.includes('|---') || line.includes('| ---')) && line.includes('| |')) {
            const separatorMatch = line.match(/^(.*?\|)\s*(\|[-:\s|]+\|)\s*(\|.*)$/);

            if (separatorMatch) {
                const [, header, separator, dataRows] = separatorMatch;
                let remainingData = dataRows;
                const rows: string[] = [];
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

                if (lastIndex > 0) {
                    const lastRow = remainingData.slice(lastIndex - 1).trim();
                    if (lastRow && !lastRow.startsWith('|')) {
                        rows.push('|' + lastRow);
                    } else if (lastRow) {
                        rows.push(lastRow);
                    }
                }

                if (rows.length === 0) {
                    const simpleSplit = dataRows.split(/\|\s*\|/).filter(r => r.trim());
                    for (const row of simpleSplit) {
                        const trimmed = row.trim();
                        if (trimmed) {
                            rows.push(trimmed.startsWith('|') ? trimmed : '| ' + trimmed);
                        }
                    }
                }

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

// FIX: js-hoist-regexp — hoist regex out of functions to avoid re-creation per call
const RE_CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const RE_CONTROL_CHARS_TEST = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/; // without /g for .test()
const RE_EXCESSIVE_UNDERSCORES = /_{3,}/g;
const RE_EXCESSIVE_ASTERISKS = /\*{3,}/g;

function sanitizeContent(content: string): string {
    if (typeof content !== 'string') return '';
    let safe = content.replace(RE_CONTROL_CHARS, '');
    safe = safe.replace(RE_EXCESSIVE_UNDERSCORES, '___');
    safe = safe.replace(RE_EXCESSIVE_ASTERISKS, '***');
    safe = reformatInlineTables(safe);
    return safe;
}

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

const SafeMarkdown: React.FC<{ content: string }> = ({ content }) => {
    const safeContent = useMemo(() => sanitizeContent(content), [content]);
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
                    ul: ({ children }) => (
                        <ul style={{ margin: '0.5em 0', paddingLeft: '1.5em' }}>{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol style={{ margin: '0.5em 0', paddingLeft: '1.5em' }}>{children}</ol>
                    ),
                    li: ({ children }) => (
                        <li style={{ margin: '0.3em 0' }}>{children}</li>
                    ),
                    h1: ({ children }) => <h1 style={{ fontSize: '1.4em', margin: '0.8em 0 0.4em', fontWeight: 700 }}>{children}</h1>,
                    h2: ({ children }) => <h2 style={{ fontSize: '1.2em', margin: '0.8em 0 0.4em', fontWeight: 600 }}>{children}</h2>,
                    h3: ({ children }) => <h3 style={{ fontSize: '1.1em', margin: '0.6em 0 0.3em', fontWeight: 600 }}>{children}</h3>,
                    strong: ({ children }) => <strong style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{children}</strong>,
                    em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
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

    // Load history
    useEffect(() => {
        if (!historyLoaded) {
            loadHistory();
        }
    }, [historyLoaded, loadHistory]);

    // Clean corrupt messages
    // FIX: js-hoist-regexp — reuse hoisted regex instead of inline creation
    useEffect(() => {
        const hasCorruptMessages = messages.some(msg => {
            if (typeof msg.content !== 'string') return true;
            if (RE_CONTROL_CHARS_TEST.test(msg.content)) return true;
            return false;
        });

        if (hasCorruptMessages) {
            console.warn('[ChatPage] Detected corrupt messages, cleaning...');
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

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (text?: string) => {
        const content = text || input;
        if (!content.trim() || isLoading) return;

        if (!text) setInput('');
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

    const validMessages = useMemo(() => {
        return messages.filter(msg => typeof msg.content === 'string' && msg.content.length > 0);
    }, [messages]);

    // Suggestion prompts for the welcome screen
    const suggestions = [
        { key: 'compare', label: t('chat.suggestion_compare'), icon: 'M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z' },
        { key: 'summary', label: t('chat.suggestion_summary'), icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2' },
        { key: 'gaps', label: t('chat.suggestion_gaps'), icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01' },
        { key: 'price', label: t('chat.suggestion_price'), icon: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
    ];

    return (
        <div className="chat-page">
            {/* Main Chat Area */}
            <div className="chat-main">
                {/* Header actions */}
                <div className="chat-header-actions">
                    <button
                        onClick={() => clearMessages()}
                        className="chat-clear-btn"
                        title={t('chat.clear_conversation')}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                        <p className="chat-welcome-subtitle">{t('chat.welcome_subtitle')}</p>

                        {/* Suggestion chips */}
                        <div className="chat-suggestions">
                            {suggestions.map(s => (
                                <button
                                    key={s.key}
                                    className="chat-suggestion-btn"
                                    onClick={() => handleSend(s.label)}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d={s.icon} />
                                    </svg>
                                    {s.label}
                                </button>
                            ))}
                        </div>
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
                            <button
                                className="send-btn"
                                onClick={() => handleSend()}
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
        </div>
    );
};
