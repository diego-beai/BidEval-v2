import { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useMailStore } from '../../stores/useMailStore';
import { useCommunicationsStore } from '../../stores/useCommunicationsStore';
import { useQAStore } from '../../stores/useQAStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { getProviderDisplayName } from '../../types/provider.types';
import { API_CONFIG } from '../../config/constants';

interface EmailComposerProps {
  providerName: string;
  onClose: () => void;
}

export const EmailComposer = ({ providerName, onClose }: EmailComposerProps) => {
  const {
    subject, setSubject,
    body, setBody,
    isGenerating, hasGenerated,
    error,
    setHasGenerated,
    generateDraft,
    pendingQAItems,
    selectedQAItemIds,
    toggleQAItemSelection,
    selectAllQAItems,
    deselectAllQAItems,
    addQAItem,
  } = useMailStore();

  const { createCommunication } = useCommunicationsStore();
  const { questions: qaQuestions, loadQuestions: loadQAQuestions } = useQAStore();
  const { t } = useLanguageStore();
  const { getActiveProject } = useProjectStore();
  const activeProject = getActiveProject();

  const [tone, setTone] = useState('formal');
  const [isEditing, setIsEditing] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');

  // Generate email from provider name
  useEffect(() => {
    if (providerName) {
      const normalized = providerName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '');
      setRecipientEmail(`contact@${normalized}.com`);
    }
  }, [providerName]);

  // Load Q&A questions
  useEffect(() => {
    if (qaQuestions.length === 0 && activeProject?.display_name) {
      loadQAQuestions(activeProject.display_name);
    }
  }, [activeProject?.display_name]);

  // Sync approved Q&A items
  useEffect(() => {
    const approved = qaQuestions.filter(q => q.status === 'Approved' || q.estado === 'Approved');
    approved.forEach(q => {
      if (!pendingQAItems.some(item => item.id === q.id)) {
        addQAItem(q);
      }
    });
  }, [qaQuestions]);

  const normalizeProvider = (name: string) => name.trim().toUpperCase().replace(/\s+/g, '');

  const filteredQAItems = useMemo(() => {
    if (!providerName) return [];
    const key = normalizeProvider(providerName);
    return pendingQAItems.filter(item => {
      const itemKey = normalizeProvider(item.provider_name || '');
      return itemKey === key;
    });
  }, [providerName, pendingQAItems]);

  const selectedQAItemsForProvider = useMemo(() => {
    return filteredQAItems.filter(item => selectedQAItemIds.includes(item.id));
  }, [filteredQAItems, selectedQAItemIds]);

  const handleGenerate = async () => {
    if (!providerName) return;
    generateDraft({
      project_id: activeProject?.id || '',
      project_name: activeProject?.display_name || '',
      provider_name: providerName,
      provider_key: normalizeProvider(providerName),
      tone,
      issues: [],
      qa_items: selectedQAItemsForProvider,
      language: activeProject?.default_language || 'es',
      currency: activeProject?.currency || 'EUR',
    });
  };

  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) return;
    setIsSendingEmail(true);

    try {
      const response = await fetch(API_CONFIG.N8N_QA_SEND_EMAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject,
          body,
          provider_name: providerName,
          project_id: activeProject?.id,
          project_name: activeProject?.display_name,
        }),
      });

      if (!response.ok) throw new Error('Failed to send email');

      // Save via communications store
      if (activeProject?.id) {
        await createCommunication({
          project_id: activeProject.id,
          provider_name: providerName,
          recipient_email: recipientEmail,
          subject,
          body,
          tone,
          status: 'sent',
          comm_type: 'email',
          qa_item_ids: selectedQAItemsForProvider.map(q => q.id),
          sent_at: new Date().toISOString(),
        });
      }

      setHasGenerated(false);
      setSubject('');
      setBody('');
      onClose();
    } catch (err) {
      console.error('Error sending email:', err);

      if (activeProject?.id) {
        await createCommunication({
          project_id: activeProject.id,
          provider_name: providerName,
          recipient_email: recipientEmail,
          subject,
          body,
          tone,
          status: 'failed',
          comm_type: 'email',
          qa_item_ids: selectedQAItemsForProvider.map(q => q.id),
          sent_at: new Date().toISOString(),
        });
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Compose view (before generation)
  if (!hasGenerated && !isGenerating) {
    return (
      <div className="comm-new-form">
        <div className="comm-new-form-header">
          <div className="comm-new-form-title">
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#12b5b0' }} />
            {t('comm.new.email')} — {getProviderDisplayName(providerName)}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tone */}
        <div className="comm-form-group">
          <label>{t('mail.tone')}</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['formal', 'urgent', 'friendly'].map(toneOption => (
              <button
                key={toneOption}
                onClick={() => setTone(toneOption)}
                style={{
                  padding: '6px 12px',
                  flex: 1,
                  borderRadius: 'var(--radius-sm)',
                  border: tone === toneOption ? '1px solid var(--color-cyan)' : '1px solid var(--border-color)',
                  background: tone === toneOption ? 'rgba(18, 181, 176, 0.1)' : 'transparent',
                  color: tone === toneOption ? 'var(--color-cyan)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
              >
                {t(`mail.tone.${toneOption}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Q&A Items */}
        {filteredQAItems.length > 0 && (
          <div className="comm-form-group">
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>
                {t('mail.tech_questions')}
                <span style={{
                  marginLeft: '8px',
                  padding: '2px 8px',
                  background: selectedQAItemsForProvider.length > 0 ? 'var(--color-cyan)' : 'var(--border-color)',
                  color: selectedQAItemsForProvider.length > 0 ? 'white' : 'var(--text-tertiary)',
                  borderRadius: '10px',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                }}>
                  {selectedQAItemsForProvider.length}/{filteredQAItems.length}
                </span>
              </span>
              <span style={{ display: 'flex', gap: '4px' }}>
                <button onClick={selectAllQAItems} style={{ background: 'none', border: 'none', color: 'var(--color-cyan)', cursor: 'pointer', fontSize: '0.75rem' }}>
                  {t('mail.btn.all')}
                </button>
                <button onClick={deselectAllQAItems} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '0.75rem' }}>
                  {t('mail.btn.none')}
                </button>
              </span>
            </label>
            <div style={{ maxHeight: '160px', overflowY: 'auto', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredQAItems.map(item => {
                const isSelected = selectedQAItemIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleQAItemSelection(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '1px solid var(--color-cyan)' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(18, 181, 176, 0.05)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      border: isSelected ? '2px solid var(--color-cyan)' : '2px solid var(--border-color)',
                      background: isSelected ? 'var(--color-cyan)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                      {item.question}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="comm-form-actions">
          <button className="btn-cancel" onClick={onClose}>
            {t('comm.form.cancel')}
          </button>
          <button className="btn-save" onClick={handleGenerate} disabled={isGenerating}>
            {t('mail.btn.generate')}
          </button>
        </div>
      </div>
    );
  }

  // Generating overlay
  if (isGenerating) {
    return (
      <div className="comm-new-form" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="ai-spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }}></div>
        <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{t('mail.ai_drafting')}</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>{t('mail.analyzing')}</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="comm-new-form" style={{ textAlign: 'center', padding: '32px 20px' }}>
        <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: '8px' }}>{t('mail.generation_failed')}</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('mail.generation_failed_desc')}</p>
        <div className="comm-form-actions" style={{ justifyContent: 'center' }}>
          <button className="btn-cancel" onClick={onClose}>{t('comm.form.cancel')}</button>
          <button className="btn-save" onClick={handleGenerate}>{t('mail.btn.regenerate')}</button>
        </div>
      </div>
    );
  }

  // Preview / Edit generated email
  return (
    <div className="comm-new-form" style={{ maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
      <div className="comm-new-form-header">
        <div className="comm-new-form-title">
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#12b5b0' }} />
          {t('mail.preview.header')}
        </div>
        <button onClick={() => { setHasGenerated(false); onClose(); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* To + Subject */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, minWidth: '50px' }}>{t('mail.preview.to')}</span>
          <input
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            readOnly={!isEditing}
            style={{
              flex: 1,
              padding: '6px 10px',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              background: isEditing ? 'var(--bg-surface)' : 'transparent',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, minWidth: '50px' }}>{t('mail.preview.subject')}</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            readOnly={!isEditing}
            style={{
              flex: 1,
              padding: '6px 10px',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              background: isEditing ? 'var(--bg-surface)' : 'transparent',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px', background: 'var(--bg-surface)', minHeight: '150px' }}>
        {isEditing ? (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none',
              minHeight: '200px',
            }}
            autoFocus
          />
        ) : (
          <div className="markdown-preview" style={{ fontSize: '0.85rem' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={isEditing ? 'btn-save' : 'btn-cancel'}
            onClick={() => setIsEditing(!isEditing)}
            style={{ fontSize: '0.82rem' }}
          >
            {isEditing ? t('mail.btn.done') : t('mail.btn.edit')}
          </button>
          <button className="btn-cancel" onClick={() => setHasGenerated(false)} style={{ fontSize: '0.82rem' }}>
            {t('mail.btn.regenerate')}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-cancel" onClick={() => { setHasGenerated(false); onClose(); }} style={{ fontSize: '0.82rem' }}>
            {t('mail.btn.discard')}
          </button>
          <button
            className="btn-save"
            onClick={handleSendEmail}
            disabled={isSendingEmail}
            style={{ fontSize: '0.82rem', minWidth: '100px' }}
          >
            {isSendingEmail ? t('mail.btn.sending') : t('mail.btn.send')}
          </button>
        </div>
      </div>
    </div>
  );
};
