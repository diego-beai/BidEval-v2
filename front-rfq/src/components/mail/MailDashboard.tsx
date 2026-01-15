import { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useMailStore } from '../../stores/useMailStore';
import { useQAStore } from '../../stores/useQAStore';
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

    // Local UI State
    const [fontSize, setFontSize] = useState(16);
    const [isEditing, setIsEditing] = useState(false);

    // Metadata State (Context/Provider/Tone) selection remains local as it drives the generation
    const [selectedContext, setSelectedContext] = useState('Hydrogen Production Plant – La Zaida, Spain');
    const [selectedProvider, setSelectedProvider] = useState('');
    const [tone, setTone] = useState('formal');

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

    // Mock Data
    const providers = ['Técnicas Reunidas', 'IDOM', 'SACYR', 'WORLEY', 'SENER', 'TRESCA', 'EA'];

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

    const contextIssues: Record<string, Issue[]> = {
        'Técnicas Reunidas': [
            { id: 'tr_1', label: 'Missing detailed breakdown in Economic Proposal', type: 'critical', section: 'Economic' },
            { id: 'tr_2', label: 'Clarification on electrolyzer efficiency guarantee', type: 'warning', section: 'Technical' }
        ],
        'IDOM': [
            { id: 'id_1', label: 'Confirm valid period of the offer', type: 'info', section: 'General' }
        ],
        'SACYR': [
            { id: 'sa_1', label: 'Missing ISO 9001 certification document', type: 'warning', section: 'Compliance' },
            { id: 'sa_2', label: 'Scope of work deviation in Civil Works', type: 'critical', section: 'Technical' }
        ],
        'Worley': [],
        'WORLEY': [],
        'SENER': [],
        'TRESCA': [],
        'EA': []
    };

    const currentIssues = selectedProvider ? (contextIssues[selectedProvider] || []) : [];

    // Filter Q&A items for the selected provider
    const providerKeyMap: Record<string, string> = {
        'Técnicas Reunidas': 'TR',
        'TR': 'TR',
        'IDOM': 'IDOM',
        'SACYR': 'SACYR',
        'WORLEY': 'WORLEY',
        'Worley': 'WORLEY',
        'SENER': 'SENER',
        'TRESCA': 'TRESCA',
        'EA': 'EA'
    };

    const filteredQAItems = useMemo(() => {
        if (!selectedProvider) return [];
        const providerKey = providerKeyMap[selectedProvider] || selectedProvider.toUpperCase().replace(/\s+/g, '');
        return pendingQAItems.filter(item => item.provider_name === providerKey);
    }, [selectedProvider, pendingQAItems]);

    const selectedQAItemsForProvider = useMemo(() => {
        return filteredQAItems.filter(item => selectedQAItemIds.includes(item.id));
    }, [filteredQAItems, selectedQAItemIds]);

    const handleGenerate = async () => {
        if (!selectedProvider) return;

        const providerMap: Record<string, string> = {
            'Técnicas Reunidas': 'TR',
            'TR': 'TR',
            'IDOM': 'IDOM',
            'SACYR': 'SACYR',
            'WORLEY': 'WORLEY',
            'Worley': 'WORLEY',
            'SENER': 'SENER',
            'TRESCA': 'TRESCA',
            'EA': 'EA'
        };

        const issuesPayload = selectedIssues.map(id => {
            const issue = currentIssues.find(i => i.id === id);
            return issue ? `${issue.label} (${issue.section})` : null;
        }).filter((i): i is string => Boolean(i));

        const payload = {
            project_name: selectedContext,
            provider_name: selectedProvider,
            provider_key: providerMap[selectedProvider] || selectedProvider.toUpperCase().replace(/\s+/g, ''),
            tone: tone,
            issues: issuesPayload,
            qa_items: selectedQAItemsForProvider
        };

        // Call store action
        generateDraft(payload);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(`${subject}\n\n${body}`);
        alert('Email copied to clipboard!');
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
                        Mail Configuration
                    </h2>
                </div>

                <div className="config-body">
                    {/* Context */}
                    <div className="mail-form-group">
                        <label className="mail-label">Project</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                                className="mail-select"
                                value={selectedContext === 'Hydrogen Production Plant – La Zaida, Spain' ? selectedContext : 'custom'}
                                onChange={(e) => {
                                    if (e.target.value === 'custom') {
                                        setSelectedContext('');
                                    } else {
                                        setSelectedContext(e.target.value);
                                    }
                                }}
                            >
                                <option value="Hydrogen Production Plant – La Zaida, Spain">Hydrogen Production Plant – La Zaida, Spain</option>
                                <option value="custom">Custom Project...</option>
                            </select>
                        </div>
                        {selectedContext !== 'Hydrogen Production Plant – La Zaida, Spain' && (
                            <input
                                type="text"
                                className="mail-select"
                                style={{ marginTop: '8px' }}
                                placeholder="Enter custom project name..."
                                value={selectedContext}
                                onChange={(e) => setSelectedContext(e.target.value)}
                            />
                        )}
                    </div>

                    {/* Provider Selection */}
                    <div className="mail-form-group">
                        <label className="mail-label">Recipient Provider</label>
                        <select
                            className="mail-select"
                            value={selectedProvider}
                            onChange={(e) => {
                                setSelectedProvider(e.target.value);
                                setSelectedIssues([]); // Reset issues on provider change
                            }}
                        >
                            <option value="">Select Provider...</option>
                            {providers.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    {/* Detected Issues */}
                    {/* Detected Issues hidden as requested */}

                    {/* Tone Selection */}
                    <div className="mail-form-group">
                        <label className="mail-label">Tone</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['Formal', 'Urgent', 'Friendly'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTone(t.toLowerCase())}
                                    style={{
                                        padding: '8px 12px',
                                        flex: 1,
                                        borderRadius: 'var(--radius-md)',
                                        border: tone === t.toLowerCase() ? '1px solid var(--color-cyan)' : '1px solid var(--border-color)',
                                        background: tone === t.toLowerCase() ? 'rgba(18, 181, 176, 0.1)' : 'transparent',
                                        color: tone === t.toLowerCase() ? 'var(--color-cyan)' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 500,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Q&A Items Section - Compact Cards */}
                    {selectedProvider && filteredQAItems.length > 0 && (
                        <div className="qa-section">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label className="mail-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Technical Questions
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
                                    <button onClick={selectAllQAItems} className="btn-mini">All</button>
                                    <button onClick={deselectAllQAItems} className="btn-mini">None</button>
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
                            <p>No Q&A items for {selectedProvider}</p>
                            {pendingQAItems.length > 0 && (
                                <span className="qa-hint">{pendingQAItems.length} items for other providers</span>
                            )}
                        </div>
                    )}

                    <button
                        className="btn btnPrimary"
                        disabled={!selectedProvider || isGenerating}
                        onClick={handleGenerate}
                        style={{ marginTop: 'auto', padding: '12px' }}
                    >
                        {isGenerating ? 'Drafting Email...' : hasGenerated ? 'Regenerate Draft' : 'Generate Draft'}
                    </button>
                </div>
            </div>

            {/* Right Panel: Editor */}
            <div className="mail-editor-panel">
                {isGenerating && (
                    <div className="generating-overlay">
                        <div className="ai-spinner"></div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>AI Agent is drafting your email...</div>
                        <p style={{ marginTop: '8px', color: 'rgba(255,255,255,0.7)' }}>Analyzing context and formatting issues</p>
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
                        <h3 style={{ color: '#dc2626' }}>Generation Failed</h3>
                        <p>Failed to generate draft. Please try again.</p>
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
                        <h3>Ready to Draft</h3>
                        <p style={{ maxWidth: '300px' }}>Select a provider and issues on the left to generate a professional email draft powered by AI.</p>
                    </div>
                ) : (
                    <>
                        <div className="editor-toolbar">
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Draft Preview</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <span style={{ fontSize: '0.8rem', padding: '4px 8px', background: 'var(--bg-hover)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                                    {tone.charAt(0).toUpperCase() + tone.slice(1)} Tone
                                </span>
                            </div>
                        </div>

                        <div className="email-meta">
                            <div className="meta-row">
                                <span className="meta-label">To:</span>
                                <input className="meta-input" value={`${selectedProvider} <${getProviderEmail(selectedProvider)}>`} readOnly />
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">Subject:</span>
                                <input
                                    className="meta-input subject-input"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
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
                                    {isEditing ? 'Done' : 'Edit'}
                                </button>
                            </div>
                            <button className="btn btnSecondary" onClick={() => setHasGenerated(false)}>
                                Discard
                            </button>
                            <button className="btn btnSecondary" onClick={handleCopy}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                Copy Text
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
