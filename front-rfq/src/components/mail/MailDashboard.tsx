import { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useMailStore } from '../../stores/useMailStore';
import { useQAStore } from '../../stores/useQAStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useProviderStore } from '../../stores/useProviderStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { getProviderDisplayName } from '../../types/provider.types';
import { API_CONFIG } from '../../config/constants';
import './MailDashboard.css';

interface Issue {
    id: string;
    label: string;
    type: 'critical' | 'warning' | 'info';
    section?: string;
}

// Icons for Q&A section
const QAIcons = {
    Checkbox: ({ checked }: { checked: boolean }) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill={checked ? 'var(--color-cyan)' : 'none'} stroke={checked ? 'var(--color-cyan)' : 'var(--text-tertiary)'} strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            {checked && <polyline points="9 11 12 14 20 6" stroke="white" strokeWidth="2.5" />}
        </svg>
    ),
    Remove: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
    QA: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    )
};

export const MailDashboard = () => {
    // Global State from Store
    const {
        subject, setSubject,
        body, setBody,
        isGenerating, hasGenerated,
        error,
        setHasGenerated,
        generateDraft,
        // Q&A Items
        pendingQAItems,
        selectedQAItemIds,
        toggleQAItemSelection,
        removeQAItem,
        selectAllQAItems,
        deselectAllQAItems,
        addQAItem
    } = useMailStore();

    // Get approved questions from Q&A store
    const { questions: qaQuestions, loadQuestions: loadQAQuestions } = useQAStore();

    // Get translation function
    const { t } = useLanguageStore();

    // Get projects from global store
    const { projects, getActiveProject } = useProjectStore();

    // Dynamic providers from store
    const { projectProviders } = useProviderStore();
    const activeProject = getActiveProject();

    // Local UI State
    const [fontSize, setFontSize] = useState(16);
    const [isEditing, setIsEditing] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState('');

    // Metadata State (Context/Provider/Tone) selection remains local as it drives the generation
    // Initialize selectedContext from active project
    const [selectedContext, setSelectedContext] = useState(activeProject?.display_name || '');
    const [selectedProvider, setSelectedProvider] = useState('');
    const [tone, setTone] = useState('formal');

    // Sync selectedContext with active project changes
    useEffect(() => {
        if (activeProject?.display_name) {
            setSelectedContext(activeProject.display_name);
        }
    }, [activeProject?.display_name]);

    // Update recipient email when provider changes
    useEffect(() => {
        if (selectedProvider) {
            setRecipientEmail(getProviderEmail(selectedProvider));
        }
    }, [selectedProvider]);

    // Issues selection state (even though UI is hidden, logic remains)
    const [selectedIssues, setSelectedIssues] = useState<string[]>([]);

    // Load Q&A questions on mount (needed if user goes directly to Mail without visiting Q&A first)
    useEffect(() => {
        if (qaQuestions.length === 0 && selectedContext) {
            loadQAQuestions(selectedContext);
        }
    }, [selectedContext]);

    // Sync approved Q&A items to Mail store
    useEffect(() => {
        const approvedQuestions = qaQuestions.filter(q =>
            (q.status === 'Approved' || q.estado === 'Approved')
        );

        // Add any approved questions that aren't already in pendingQAItems
        approvedQuestions.forEach(q => {
            const alreadyExists = pendingQAItems.some(item => item.id === q.id);
            if (!alreadyExists) {
                addQAItem(q);
            }
        });
    }, [qaQuestions]); // Only depend on qaQuestions to avoid infinite loops

    // Providers from store (display names)
    const providers = projectProviders;

    // Helper function to generate email from provider name
    const getProviderEmail = (provider: string): string => {
        if (!provider) return '';
        const normalized = provider
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/\s+/g, ''); // Remove spaces
        return `contact@${normalized}.com`;
    };

    const contextIssues: Record<string, Issue[]> = {};

    const currentIssues = selectedProvider ? (contextIssues[selectedProvider] || []) : [];

    // Filter Q&A items for the selected provider
    const normalizeProvider = (name: string) => name.trim().toUpperCase().replace(/\s+/g, '');

    const filteredQAItems = useMemo(() => {
        if (!selectedProvider) return [];
        const providerKey = normalizeProvider(selectedProvider);
        return pendingQAItems.filter(item => {
            const itemKey = normalizeProvider(item.provider_name || '');
            return itemKey === providerKey ||
                (itemKey === 'TECNICASREUNIDAS' && providerKey === 'TR') ||
                (itemKey === 'TR' && providerKey === 'TECNICASREUNIDAS');
        });
    }, [selectedProvider, pendingQAItems]);

    const selectedQAItemsForProvider = useMemo(() => {
        return filteredQAItems.filter(item => selectedQAItemIds.includes(item.id));
    }, [filteredQAItems, selectedQAItemIds]);

    const handleGenerate = async () => {
        if (!selectedProvider) return;

        const issuesPayload = selectedIssues.map(id => {
            const issue = currentIssues.find(i => i.id === id);
            return issue ? `${issue.label} (${issue.section})` : null;
        }).filter((i): i is string => Boolean(i));

        const payload = {
            project_id: activeProject?.id || '',
            project_name: selectedContext,
            provider_name: selectedProvider,
            provider_key: normalizeProvider(selectedProvider),
            tone: tone,
            issues: issuesPayload,
            qa_items: selectedQAItemsForProvider
        };

        // Call store action
        generateDraft(payload);
    };

    const handleCopy = async () => {
        const textToCopy = `${subject}\n\n${body}`;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(textToCopy);
            } else {
                // Fallback for HTTP
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            alert(t('mail.alert.copy_success'));
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleSendEmail = async () => {
        if (!recipientEmail || !recipientEmail.includes('@')) {
            alert(t('mail.alert.enter_email'));
            return;
        }

        if (!confirm(`${t('mail.alert.confirm_send')} ${recipientEmail}?`)) {
            return;
        }

        setIsSendingEmail(true);
        setEmailSent(false);

        try {
            const response = await fetch(API_CONFIG.N8N_QA_SEND_EMAIL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: recipientEmail,
                    subject: subject,
                    body: body,
                    provider_name: selectedProvider,
                    project_id: activeProject?.id,
                    project_name: selectedContext
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send email');
            }

            setEmailSent(true);
            alert(t('mail.alert.send_success'));
        } catch (error) {
            console.error('Error sending email:', error);
            alert(t('mail.alert.send_failed'));
        } finally {
            setIsSendingEmail(false);
        }
    };

    return (
        <div className="mail-container fade-in">
            {/* Left Panel: Configuration */}
            <div className="mail-config-panel">
                <div className="config-header">
                    <h2>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                            <path d="M2 2l7.586 7.586"></path>
                            <circle cx="11" cy="11" r="2"></circle>
                        </svg>
                        {t('mail.config')}
                    </h2>
                </div>

                <div className="config-body">
                    {/* Context */}
                    <div className="mail-form-group">
                        <label className="mail-label">{t('mail.project')}</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                                className="mail-select"
                                value={selectedContext}
                                onChange={(e) => setSelectedContext(e.target.value)}
                            >
                                {projects.length === 0 ? (
                                    <option value="">{t('common.no_projects')}</option>
                                ) : (
                                    projects.map(project => (
                                        <option key={project.id} value={project.display_name}>
                                            {project.display_name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Provider Selection */}
                    <div className="mail-form-group">
                        <label className="mail-label">{t('mail.provider')}</label>
                        <select
                            className="mail-select"
                            value={selectedProvider}
                            onChange={(e) => {
                                setSelectedProvider(e.target.value);
                                setSelectedIssues([]); // Reset issues on provider change
                            }}
                        >
                            <option value="">{t('mail.provider.select')}</option>
                            {providers.map(p => (
                                <option key={p} value={p}>{getProviderDisplayName(p)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Detected Issues */}
                    {/* Detected Issues hidden as requested */}

                    {/* Tone Selection */}
                    <div className="mail-form-group">
                        <label className="mail-label">{t('mail.tone')}</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {[
                                { key: 'formal', label: t('mail.tone.formal') },
                                { key: 'urgent', label: t('mail.tone.urgent') },
                                { key: 'friendly', label: t('mail.tone.friendly') }
                            ].map(toneOption => (
                                <button
                                    key={toneOption.key}
                                    onClick={() => setTone(toneOption.key)}
                                    style={{
                                        padding: '8px 12px',
                                        flex: 1,
                                        borderRadius: 'var(--radius-md)',
                                        border: tone === toneOption.key ? '1px solid var(--color-cyan)' : '1px solid var(--border-color)',
                                        background: tone === toneOption.key ? 'rgba(18, 181, 176, 0.1)' : 'transparent',
                                        color: tone === toneOption.key ? 'var(--color-cyan)' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 500,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {toneOption.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Q&A Items Section - Compact Cards */}
                    {selectedProvider && filteredQAItems.length > 0 && (
                        <div className="qa-section">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label className="mail-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {t('mail.tech_questions')}
                                    <span style={{
                                        padding: '2px 8px',
                                        background: selectedQAItemsForProvider.length > 0 ? 'var(--color-cyan)' : 'var(--border-color)',
                                        color: selectedQAItemsForProvider.length > 0 ? 'white' : 'var(--text-tertiary)',
                                        borderRadius: '10px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600
                                    }}>
                                        {selectedQAItemsForProvider.length}/{filteredQAItems.length}
                                    </span>
                                </label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={selectAllQAItems} className="btn-mini">{t('mail.btn.all')}</button>
                                    <button onClick={deselectAllQAItems} className="btn-mini">{t('mail.btn.none')}</button>
                                </div>
                            </div>

                            <div className="qa-cards-container">
                                {filteredQAItems.map(item => {
                                    const isSelected = selectedQAItemIds.includes(item.id);
                                    return (
                                        <div
                                            key={item.id}
                                            className={`qa-card ${isSelected ? 'selected' : ''}`}
                                            onClick={() => toggleQAItemSelection(item.id)}
                                            title={item.question}
                                        >
                                            <div className="checkbox">
                                                {isSelected && (
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="question-text">{item.question}</span>
                                            <span className="qa-badge discipline">{item.discipline.substring(0, 4)}</span>
                                            <span className={`qa-badge ${item.importance.toLowerCase()}`}>
                                                {item.importance.charAt(0)}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeQAItem(item.id); }}
                                                className="btn-remove"
                                                title="Remove"
                                            >
                                                <QAIcons.Remove />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Empty state for Q&A */}
                    {selectedProvider && filteredQAItems.length === 0 && (
                        <div className="qa-empty-state">
                            <QAIcons.QA />
                            <p>{t('mail.no_qa_items')} {selectedProvider}</p>
                            {pendingQAItems.length > 0 && (
                                <span className="qa-hint">{pendingQAItems.length} {t('mail.other_items')}</span>
                            )}
                        </div>
                    )}

                    <button
                        className="btn btnPrimary"
                        disabled={!selectedProvider || isGenerating}
                        onClick={handleGenerate}
                        style={{ marginTop: 'auto', padding: '12px' }}
                    >
                        {isGenerating ? t('mail.btn.drafting') : hasGenerated ? t('mail.btn.regenerate') : t('mail.btn.generate')}
                    </button>
                </div>
            </div>

            {/* Right Panel: Editor */}
            <div className="mail-editor-panel">
                {isGenerating && (
                    <div className="generating-overlay">
                        <div className="ai-spinner"></div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t('mail.ai_drafting')}</div>
                        <p style={{ marginTop: '8px', color: 'rgba(255,255,255,0.7)' }}>{t('mail.analyzing')}</p>
                    </div>
                )}

                {error ? (
                    <div className="mail-empty-state">
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'rgba(220, 38, 38, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '16px',
                            color: '#dc2626'
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </div>
                        <h3 style={{ color: '#dc2626' }}>{t('mail.generation_failed')}</h3>
                        <p>{t('mail.generation_failed_desc')}</p>
                    </div>
                ) : !hasGenerated && !isGenerating ? (
                    <div className="mail-empty-state">
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'var(--bg-hover)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '24px',
                            color: 'var(--text-tertiary)'
                        }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                        </div>
                        <h3>{t('mail.empty.title')}</h3>
                        <p style={{ maxWidth: '300px' }}>{t('mail.empty.desc')}</p>
                    </div>
                ) : (
                    <>
                        <div className="editor-toolbar">
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t('mail.preview.header')}</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <span style={{ fontSize: '0.8rem', padding: '4px 8px', background: 'var(--bg-hover)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                                    {t(`mail.tone.${tone}`)} {t('mail.tone_label')}
                                </span>
                            </div>
                        </div>

                        <div className="email-meta">
                            <div className="meta-row">
                                <span className="meta-label">{t('mail.preview.to')}</span>
                                <input
                                    className="meta-input"
                                    value={recipientEmail}
                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                    readOnly={!isEditing}
                                    style={{
                                        background: isEditing ? 'var(--bg-surface)' : 'transparent',
                                        cursor: isEditing ? 'text' : 'default'
                                    }}
                                    placeholder={t('mail.recipient_placeholder')}
                                />
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">{t('mail.preview.subject')}</span>
                                <input
                                    className="meta-input subject-input"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    readOnly={!isEditing}
                                    style={{
                                        background: isEditing ? 'var(--bg-surface)' : 'transparent',
                                        cursor: isEditing ? 'text' : 'default'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="email-body">
                            {isEditing ? (
                                <textarea
                                    className="body-textarea"
                                    value={body}
                                    style={{ fontSize: `${fontSize}px` }}
                                    onChange={(e) => setBody(e.target.value)}
                                    autoFocus
                                />
                            ) : (
                                <div className="markdown-preview" style={{ fontSize: `${fontSize}px` }}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
                                </div>
                            )}
                        </div>

                        <div className="editor-footer">
                            <div style={{ marginRight: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    className="btn btnSecondary"
                                    onClick={() => setFontSize(prev => Math.max(12, prev - 1))}
                                    title="Decrease font size"
                                    style={{ padding: '8px 12px' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </button>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '24px', textAlign: 'center' }}>
                                    {fontSize}
                                </span>
                                <button
                                    className="btn btnSecondary"
                                    onClick={() => setFontSize(prev => Math.min(24, prev + 1))}
                                    title="Increase font size"
                                    style={{ padding: '8px 12px' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </button>

                                <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px' }}></div>

                                <button
                                    className={`btn ${isEditing ? 'btnPrimary' : 'btnSecondary'}`}
                                    onClick={() => setIsEditing(!isEditing)}
                                    style={{ padding: '8px 16px' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                        {isEditing ? (
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        ) : (
                                            <>
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </>
                                        )}
                                    </svg>
                                    {isEditing ? t('mail.btn.done') : t('mail.btn.edit')}
                                </button>
                            </div>
                            <button className="btn btnSecondary" onClick={() => setHasGenerated(false)}>
                                {t('mail.btn.discard')}
                            </button>
                            <button className="btn btnSecondary" onClick={handleCopy}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                {t('mail.btn.copy_short')}
                            </button>
                            <button
                                className="btn btnPrimary"
                                onClick={handleSendEmail}
                                disabled={isSendingEmail}
                                style={{
                                    background: emailSent ? '#10b981' : 'linear-gradient(135deg, #12b5b0 0%, #0d9488 100%)',
                                    minWidth: '120px'
                                }}
                            >
                                {isSendingEmail ? (
                                    <>
                                        <span className="spinner-small" style={{ marginRight: '8px' }}></span>
                                        {t('mail.btn.sending')}
                                    </>
                                ) : emailSent ? (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        {t('mail.btn.sent')}
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                                            <line x1="22" y1="2" x2="11" y2="13"></line>
                                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                        </svg>
                                        {t('mail.btn.send')}
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
