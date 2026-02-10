import { useState, useEffect, useMemo, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useProjectStore } from '../stores/useProjectStore';
import { useLanguageStore } from '../stores/useLanguageStore';
import { useScoringConfigStore } from '../stores/useScoringConfigStore';
import { generateRfpDocument, GenerateRfpResponse } from '../services/n8n.service';
import { useToastStore } from '../stores/useToastStore';
import './RfpGeneratorPage.css';

const DEFAULT_SECTIONS = [
  'scope',
  'technical_requirements',
  'evaluation_criteria',
  'commercial_terms',
  'deadlines',
  'deliverables',
  'legal_terms',
  'submission_instructions',
];

const STORAGE_KEY = 'bideval-rfp-templates';

interface RfpTemplate {
  id: string;
  name: string;
  requirements: string;
  sections: string[];
  createdAt: string;
}

function loadTemplates(): RfpTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTemplates(templates: RfpTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export const RfpGeneratorPage = () => {
  const { t, language } = useLanguageStore();
  const { getActiveProject } = useProjectStore();
  const { categories } = useScoringConfigStore();
  const addToast = useToastStore(s => s.addToast);

  const project = getActiveProject();

  const [requirements, setRequirements] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>(DEFAULT_SECTIONS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerateRfpResponse | null>(null);
  const [showCopied, setShowCopied] = useState(false);

  // Template state
  const [templates, setTemplates] = useState<RfpTemplate[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Preview state
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => { setTemplates(loadTemplates()); }, []);

  const criteria = useMemo(() => {
    return categories.map(c => ({ name: c.name, weight: c.weight }));
  }, [categories]);

  const toggleSection = (section: string) => {
    setSelectedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const handleGenerate = async () => {
    if (!project || !requirements.trim()) return;
    setIsGenerating(true);
    setResult(null);
    setShowPreview(false);
    try {
      const payload = {
        project_id: project.id,
        project_name: project.display_name || project.name,
        project_type: project.project_type || 'RFP',
        description: project.description || '',
        requirements: requirements.trim(),
        criteria: criteria.length > 0 ? criteria : undefined,
        deadlines: {
          opening: project.date_opening || undefined,
          submission: project.date_submission_deadline || undefined,
          evaluation: project.date_evaluation || undefined,
          award: project.date_award || undefined,
        },
        language,
        sections: selectedSections,
      };
      const response = await generateRfpDocument(payload);
      setResult(response);
      addToast(t('rfp_gen.success'), 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error generating RFP';
      addToast(msg, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const text = result.document || result.sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const text = result.document || result.sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.title || 'RFP'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Template handlers
  const handleSaveTemplate = useCallback(() => {
    const name = templateName.trim();
    if (!name) return;
    const tpl: RfpTemplate = {
      id: Date.now().toString(),
      name,
      requirements,
      sections: selectedSections,
      createdAt: new Date().toISOString(),
    };
    const updated = [...templates, tpl];
    setTemplates(updated);
    saveTemplates(updated);
    setTemplateName('');
    setShowSaveTemplate(false);
    addToast(t('rfp_gen.template_saved'), 'success');
  }, [templateName, requirements, selectedSections, templates, addToast, t]);

  const handleLoadTemplate = (id: string) => {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    setRequirements(tpl.requirements);
    setSelectedSections(tpl.sections);
    setResult(null);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
    addToast(t('rfp_gen.template_deleted'), 'info');
  };

  if (!project) {
    return (
      <div className="rfp-generator">
        <div className="rfp-no-project">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p>{t('rfp_gen.no_project')}</p>
          <p>{t('rfp_gen.no_project_hint')}</p>
        </div>
      </div>
    );
  }

  const sectionLabels: Record<string, string> = {
    scope: t('rfp_gen.section.scope'),
    technical_requirements: t('rfp_gen.section.technical'),
    evaluation_criteria: t('rfp_gen.section.criteria'),
    commercial_terms: t('rfp_gen.section.commercial'),
    deadlines: t('rfp_gen.section.deadlines'),
    deliverables: t('rfp_gen.section.deliverables'),
    legal_terms: t('rfp_gen.section.legal'),
    submission_instructions: t('rfp_gen.section.submission'),
  };

  const deadlines = [
    { key: 'opening', label: t('rfp_gen.deadline_opening'), value: project.date_opening },
    { key: 'submission', label: t('rfp_gen.deadline_submission'), value: project.date_submission_deadline },
    { key: 'evaluation', label: t('rfp_gen.deadline_evaluation'), value: project.date_evaluation },
    { key: 'award', label: t('rfp_gen.deadline_award'), value: project.date_award },
  ].filter(d => d.value);

  return (
    <div className="rfp-generator">
      {/* Header */}
      <div className="rfp-generator-header">
        <div className="rfp-header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M12 18v-6" />
            <path d="M9 15l3-3 3 3" />
          </svg>
        </div>
        <div>
          <h2>{t('rfp_gen.title')}</h2>
          <p>{t('rfp_gen.subtitle')}</p>
        </div>
      </div>

      <div className="rfp-layout">
        {/* Left: Input */}
        <div className="rfp-input-panel">
          {/* Templates Card */}
          <div className="rfp-card">
            <div className="rfp-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              {t('rfp_gen.templates')}
            </div>

            {templates.length === 0 && !showSaveTemplate && (
              <div className="rfp-templates-empty">{t('rfp_gen.no_templates')}</div>
            )}

            {templates.length > 0 && (
              <div className="rfp-templates-list">
                {templates.map(tpl => (
                  <div key={tpl.id} className="rfp-template-item">
                    <button
                      className="rfp-template-load"
                      onClick={() => handleLoadTemplate(tpl.id)}
                      title={tpl.requirements.slice(0, 100)}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span>{tpl.name}</span>
                      <span className="rfp-template-meta">{tpl.sections.length}s</span>
                    </button>
                    <button
                      className="rfp-template-delete"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      title="Delete"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showSaveTemplate ? (
              <div className="rfp-template-save-row">
                <input
                  className="rfp-template-input"
                  placeholder={t('rfp_gen.template_name_placeholder')}
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
                  autoFocus
                />
                <button className="rfp-template-save-btn" onClick={handleSaveTemplate} disabled={!templateName.trim()}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button className="rfp-template-cancel-btn" onClick={() => { setShowSaveTemplate(false); setTemplateName(''); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                className="rfp-save-template-trigger"
                onClick={() => setShowSaveTemplate(true)}
                disabled={!requirements.trim()}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                {t('rfp_gen.save_template')}
              </button>
            )}
          </div>

          {/* Project Context */}
          <div className="rfp-card">
            <div className="rfp-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              {t('rfp_gen.context')}
            </div>
            <div className="rfp-context-grid">
              <div className="rfp-context-item">
                <div className="label">{t('rfp_gen.project')}</div>
                <div className="value">{project.display_name || project.name}</div>
              </div>
              <div className="rfp-context-item">
                <div className="label">{t('rfp_gen.type')}</div>
                <div className="value accent">{project.project_type || 'RFP'}</div>
              </div>
              {criteria.length > 0 && (
                <div className="rfp-context-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="label">{t('rfp_gen.criteria_loaded')}</div>
                  <div className="value" style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                    {criteria.map(c => `${c.name} (${c.weight}%)`).join(', ')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Requirements */}
          <div className="rfp-card">
            <div className="rfp-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {t('rfp_gen.requirements')}
            </div>
            <textarea
              className="rfp-textarea"
              placeholder={t('rfp_gen.requirements_placeholder')}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              disabled={isGenerating}
            />
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              {requirements.length} {t('rfp_gen.chars')}
            </div>
          </div>

          {/* Sections to Include */}
          <div className="rfp-card">
            <div className="rfp-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              {t('rfp_gen.sections')}
            </div>
            <div className="rfp-sections-grid">
              {DEFAULT_SECTIONS.map(section => (
                <label
                  key={section}
                  className={`rfp-section-check ${selectedSections.includes(section) ? 'active' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(section)}
                    onChange={() => toggleSection(section)}
                    disabled={isGenerating}
                  />
                  <span>{sectionLabels[section] || section}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="rfp-actions-row">
            <button
              className={`rfp-preview-btn ${showPreview && !result ? 'active' : ''}`}
              onClick={() => { setShowPreview(p => !p); setResult(null); }}
              disabled={isGenerating}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {t('rfp_gen.preview')}
            </button>
            <button
              className="rfp-generate-btn"
              onClick={handleGenerate}
              disabled={isGenerating || !requirements.trim()}
            >
              {isGenerating ? (
                <>
                  <div className="spinner" />
                  {t('rfp_gen.generating')}
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  {t('rfp_gen.generate')}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Output / Preview */}
        <div className="rfp-output-panel">
          {/* Preview mode */}
          {showPreview && !result && !isGenerating && (
            <div className="rfp-preview-card">
              <div className="rfp-preview-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>{t('rfp_gen.preview_title')}</span>
              </div>

              <div className="rfp-preview-doc-title">
                {project.project_type || 'RFP'} &mdash; {project.display_name || project.name}
              </div>

              <div className="rfp-preview-hint">{t('rfp_gen.preview_hint')}</div>

              {/* Sections outline */}
              <div className="rfp-preview-section-label">
                {selectedSections.length} {t('rfp_gen.preview_sections_count')}
              </div>
              <div className="rfp-preview-sections">
                {selectedSections.map((s, i) => (
                  <div key={s} className="rfp-preview-section-pill">
                    <span className="rfp-preview-section-num">{i + 1}</span>
                    {sectionLabels[s] || s}
                  </div>
                ))}
              </div>

              {/* Requirements summary */}
              {requirements.trim() ? (
                <div className="rfp-preview-block">
                  <div className="rfp-preview-block-title">{t('rfp_gen.preview_requirements')}</div>
                  <div className="rfp-preview-block-content">
                    {requirements.length > 200 ? requirements.slice(0, 200) + '...' : requirements}
                  </div>
                </div>
              ) : (
                <div className="rfp-preview-empty-req">{t('rfp_gen.preview_no_req')}</div>
              )}

              {/* Criteria */}
              {criteria.length > 0 && (
                <div className="rfp-preview-block">
                  <div className="rfp-preview-block-title">{t('rfp_gen.preview_criteria')}</div>
                  <div className="rfp-preview-criteria-list">
                    {criteria.map(c => (
                      <div key={c.name} className="rfp-preview-criteria-item">
                        <span>{c.name}</span>
                        <span className="rfp-preview-criteria-weight">{c.weight}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deadlines */}
              {deadlines.length > 0 && (
                <div className="rfp-preview-block">
                  <div className="rfp-preview-block-title">{t('rfp_gen.preview_deadlines')}</div>
                  <div className="rfp-preview-deadlines">
                    {deadlines.map(d => (
                      <div key={d.key} className="rfp-preview-deadline-item">
                        <span className="rfp-preview-deadline-label">{d.label}</span>
                        <span>{new Date(d.value!).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state (no preview, no result) */}
          {!showPreview && !result && !isGenerating && (
            <div className="rfp-output-empty">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <p>{t('rfp_gen.empty_title')}</p>
              <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>{t('rfp_gen.empty_hint')}</p>
            </div>
          )}

          {isGenerating && (
            <div className="rfp-output-empty">
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                border: '3px solid rgba(168, 85, 247, 0.2)', borderTopColor: '#a855f7',
                animation: 'spin 0.8s linear infinite', marginBottom: '16px'
              }} />
              <p>{t('rfp_gen.generating_doc')}</p>
              <p style={{ fontSize: '0.8rem', marginTop: '8px', color: 'var(--text-tertiary)' }}>
                {t('rfp_gen.generating_hint')}
              </p>
            </div>
          )}

          {result && (
            <div className="rfp-document">
              <div className="rfp-document-header">
                <div>
                  <div className="rfp-document-title">{result.title}</div>
                  {result.metadata && (
                    <div className="rfp-document-meta">
                      {result.metadata.word_count} {t('rfp_gen.words')} &middot; {new Date(result.metadata.generated_at).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="rfp-document-actions">
                  <button className="rfp-action-btn" onClick={handleCopy} title={t('rfp_gen.copy')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    {t('rfp_gen.copy')}
                  </button>
                  <button className="rfp-action-btn primary" onClick={handleDownload} title={t('rfp_gen.download')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {t('rfp_gen.download')}
                  </button>
                </div>
              </div>
              <div
                className="rfp-document-content"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(formatMarkdown(result.document || result.sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n')))
                }}
              />
            </div>
          )}
        </div>
      </div>

      {showCopied && (
        <div className="rfp-copied-toast">{t('rfp_gen.copied')}</div>
      )}
    </div>
  );
};

/**
 * Basic markdown-to-HTML converter for rendering the generated document.
 */
function formatMarkdown(md: string): string {
  if (!md) return '';
  let html = md
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\s*[-*]\s+(.*$)/gm, '<li>$1</li>')
    .replace(/^\s*\d+\.\s+(.*$)/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  html = html.replace(/(<li>.*?<\/li>)(?:\s*<br\/>)*/gs, (match) => `<ul>${match}</ul>`);
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  return `<p>${html}</p>`;
}
