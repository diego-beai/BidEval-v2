import { useState, useEffect, useMemo, useCallback, useRef, DragEvent, ChangeEvent } from 'react';
import DOMPurify from 'dompurify';
import { useProjectStore } from '../stores/useProjectStore';
import { useLanguageStore } from '../stores/useLanguageStore';
import { useScoringConfigStore } from '../stores/useScoringConfigStore';
import { usePdfTemplateStore } from '../stores/usePdfTemplateStore';
import { useRfpGeneratorStore } from '../stores/useRfpGeneratorStore';
import { GenerateRfpResponse } from '../services/n8n.service';
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
const ACCEPTED_FORMATS = ['.pdf', '.docx', '.doc'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface RfpTemplate {
  id: string;
  name: string;
  requirements: string;
  sections: string[];
  createdAt: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const RfpGeneratorPage = () => {
  const { t, language } = useLanguageStore();
  const { getActiveProject } = useProjectStore();
  const { categories } = useScoringConfigStore();
  const addToast = useToastStore(s => s.addToast);

  const project = getActiveProject();

  // Estado persistente — sobrevive a la navegación
  const {
    requirements,
    selectedSections,
    isGenerating,
    result,
    error: generateError,
    setRequirements,
    toggleSection,
    selectAllSections,
    deselectAllSections,
    clearResult,
    generate,
  } = useRfpGeneratorStore();

  // Estado local — solo UI
  const [showCopied, setShowCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template state
  const [templates, setTemplates] = useState<RfpTemplate[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // PDF template config
  const [showTemplateConfig, setShowTemplateConfig] = useState(false);
  const pdfTemplate = usePdfTemplateStore();
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTemplates(loadTemplates()); }, []);

  // Cargar config PDF desde Supabase al montar (solo una vez)
  useEffect(() => { pdfTemplate.loadConfig(); }, []);

  // Mostrar error de generación via toast
  useEffect(() => {
    if (generateError) addToast(generateError, 'error');
  }, [generateError]);

  const criteria = useMemo(() => {
    return categories.map(c => ({ name: c.name, weight: c.weight }));
  }, [categories]);


  // File upload handlers
  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_FORMATS.includes(ext)) return t('rfp_gen.invalid_format');
    if (file.size > MAX_FILE_SIZE) return t('rfp_gen.file_too_large');
    return null;
  };

  const addFiles = (files: FileList | File[]) => {
    const newFiles: UploadedFile[] = [];
    for (const file of Array.from(files)) {
      const error = validateFile(file);
      if (error) {
        addToast(error, 'error');
        continue;
      }
      // Avoid duplicates by name
      if (uploadedFiles.some(f => f.name === file.name)) continue;
      newFiles.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        name: file.name,
        size: file.size,
        type: file.type,
        file,
      });
    }
    if (newFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...newFiles]);
      addToast(t('rfp_gen.template_upload_success'), 'success');
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };
  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
    e.target.value = '';
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      addToast(t('rfp_gen.logo_too_large'), 'error');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      pdfTemplate.setLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGenerate = async () => {
    if (!project || !requirements.trim()) return;
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
      language: project.default_language || language,
      currency: project.currency || 'EUR',
      sections: selectedSections,
    };
    await generate(payload, project.id);
    if (!useRfpGeneratorStore.getState().error) {
      addToast(t('rfp_gen.success'), 'success');
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const text = getCleanDocumentMarkdown(result);
    navigator.clipboard.writeText(text);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const text = getCleanDocumentMarkdown(result);
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

  const handleDownloadPdf = () => {
    if (!result) return;
    const md = getCleanDocumentMarkdown(result);
    const htmlBody = formatMarkdown(md);
    const safeTitle = (result.title || 'RFP').replace(/[<>"&]/g, '');

    const pc = pdfTemplate.primaryColor || '#0a2540';
    const safeName = (pdfTemplate.companyName || '').replace(/[<>"&]/g, '');
    const safeFooter = (pdfTemplate.footerText || '').replace(/[<>"&]/g, '');

    // Build header HTML
    let headerHtml = '';
    if (safeName || pdfTemplate.logoDataUrl) {
      headerHtml = `<div class="pdf-header">`;
      if (pdfTemplate.logoDataUrl) {
        headerHtml += `<img class="pdf-header-logo" src="${pdfTemplate.logoDataUrl}" alt="Logo" />`;
      }
      if (safeName) {
        headerHtml += `<span class="pdf-header-company">${safeName}</span>`;
      }
      headerHtml += `</div><div class="pdf-header-line"></div>`;
    }

    // Build footer HTML
    let footerHtml = '';
    if (safeFooter || pdfTemplate.showPageNumbers) {
      footerHtml = `<div class="pdf-footer">`;
      footerHtml += `<span class="pdf-footer-text">${safeFooter}</span>`;
      footerHtml += `</div>`;
    }

    const w = window.open('', '_blank');
    if (!w) {
      addToast(language === 'es' ? 'Permite ventanas emergentes para exportar PDF' : 'Allow popups to export PDF', 'error');
      return;
    }

    w.document.write(`<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<style>
@page { size: A4; margin: 22mm 20mm ${safeFooter || pdfTemplate.showPageNumbers ? '28mm' : '22mm'} 20mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.7;
  color: #1a1a2e;
}
/* PDF Header */
.pdf-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 6px;
}
.pdf-header-logo {
  max-height: 48px;
  max-width: 160px;
  object-fit: contain;
}
.pdf-header-company {
  font-size: 14pt;
  font-weight: 700;
  color: ${pc};
}
.pdf-header-line {
  border-bottom: 2.5px solid ${pc};
  margin-bottom: 20px;
  padding-bottom: 0;
}
/* PDF Footer */
.pdf-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 8pt;
  color: #6b7280;
  border-top: 1px solid #e5e7eb;
  padding: 6px 20mm;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pdf-footer-text {
  flex: 1;
  text-align: left;
}
/* Content styles */
h1 {
  font-size: 15pt; font-weight: 700; color: ${pc};
  margin: 28px 0 10px; padding-bottom: 6px;
  border-bottom: 2px solid ${pc};
}
h2 {
  font-size: 12.5pt; font-weight: 600; color: ${pc};
  margin: 22px 0 8px; padding-bottom: 4px;
  border-bottom: 1px solid #d1d5db;
}
h3 { font-size: 11pt; font-weight: 600; color: #1a1a2e; margin: 16px 0 6px; }
h4 { font-size: 10.5pt; font-weight: 600; color: #333; margin: 12px 0 4px; }
p { margin: 6px 0; text-align: justify; orphans: 3; widows: 3; }
ul, ol { padding-left: 22px; margin: 6px 0; }
li { margin: 3px 0; }
strong { font-weight: 600; }
em { font-style: italic; }
hr { border: none; border-top: 1px solid #d1d5db; margin: 18px 0; }
p, ul, ol, li, blockquote { break-inside: avoid-page; page-break-inside: avoid; }
table {
  width: 100%; border-collapse: collapse; margin: 14px 0;
  font-size: 9.5pt; break-inside: avoid; page-break-inside: avoid;
}
th, td { padding: 7px 10px; border: 1px solid #cbd5e1; text-align: left; vertical-align: top; }
th { background: #f1f5f9; font-weight: 600; color: ${pc}; }
tr:nth-child(even) td { background: #f8fafc; }
h1, h2, h3, h4 { break-after: avoid-page; page-break-after: avoid; }
thead { display: table-header-group; }
tfoot { display: table-footer-group; }
tr, img { break-inside: avoid; page-break-inside: avoid; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>
${headerHtml}
${htmlBody}
${footerHtml}
<` + `script>window.onload=function(){setTimeout(function(){window.print()},400)};window.onafterprint=function(){window.close()};` + `<` + `/script>
</body></html>`);
    w.document.close();
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
    useRfpGeneratorStore.getState().setSelectedSections(tpl.sections);
    clearResult();
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

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );
  };

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

      {/* Main 2-column layout */}
      <div className="rfp-main-grid">
        {/* LEFT COLUMN: Context + Requirements */}
        <div className="rfp-col-left">
          {/* Project Context — compact horizontal bar */}
          <div className="rfp-context-bar">
            <div className="rfp-context-bar-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span className="rfp-context-label">{t('rfp_gen.project')}</span>
              <span className="rfp-context-value">{project.display_name || project.name}</span>
            </div>
            <div className="rfp-context-bar-divider" />
            <div className="rfp-context-bar-item">
              <span className="rfp-context-label">{t('rfp_gen.type')}</span>
              <span className="rfp-context-value accent">{project.project_type || 'RFP'}</span>
            </div>
            {criteria.length > 0 && (
              <>
                <div className="rfp-context-bar-divider" />
                <div className="rfp-context-bar-item">
                  <span className="rfp-context-label">{t('rfp_gen.criteria_loaded')}</span>
                  <span className="rfp-context-value small">{criteria.map(c => `${c.name} (${c.weight}%)`).join(', ')}</span>
                </div>
              </>
            )}
          </div>

          {/* Requirements */}
          <div className="rfp-card rfp-card-requirements">
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
            <div className="rfp-textarea-footer">
              <span>{requirements.length} {t('rfp_gen.chars')}</span>
            </div>
          </div>

          {/* Reference Documents Upload */}
          <div className="rfp-card">
            <div className="rfp-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {t('rfp_gen.ref_documents')}
            </div>
            <p className="rfp-upload-hint-text">{t('rfp_gen.ref_documents_hint')}</p>

            <div
              className={`rfp-upload-zone ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                multiple
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="rfp-upload-zone-text">{t('rfp_gen.upload_hint')}</span>
              <span className="rfp-upload-zone-formats">{t('rfp_gen.upload_formats')}</span>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="rfp-uploaded-files">
                {uploadedFiles.map(f => (
                  <div key={f.id} className="rfp-uploaded-file">
                    {getFileIcon(f.name)}
                    <span className="rfp-uploaded-file-name">{f.name}</span>
                    <span className="rfp-uploaded-file-size">{formatFileSize(f.size)}</span>
                    <button className="rfp-uploaded-file-remove" onClick={() => removeFile(f.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Sections + Templates */}
        <div className="rfp-col-right">
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
              <div className="rfp-sections-actions">
                <button className="rfp-sections-toggle" onClick={selectAllSections}>
                  {language === 'es' ? 'Todas' : 'All'}
                </button>
                <button className="rfp-sections-toggle" onClick={deselectAllSections}>
                  {language === 'es' ? 'Ninguna' : 'None'}
                </button>
              </div>
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

          {/* PDF Template Config */}
          <div className="rfp-card">
            <div className="rfp-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {t('rfp_gen.configure_template')}
              <button
                className="rfp-template-config-toggle"
                onClick={() => setShowTemplateConfig(prev => !prev)}
              >
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ transform: showTemplateConfig ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            {showTemplateConfig && (
              <div className="rfp-template-config">
                {/* Company Name */}
                <div className="rfp-template-config-field">
                  <label>{t('rfp_gen.company_name')}</label>
                  <input
                    type="text"
                    className="rfp-template-config-input"
                    value={pdfTemplate.companyName}
                    onChange={(e) => pdfTemplate.updateConfig({ companyName: e.target.value })}
                    placeholder={t('rfp_gen.company_name_placeholder')}
                  />
                </div>

                {/* Logo Upload */}
                <div className="rfp-template-config-field">
                  <label>{t('rfp_gen.upload_logo')}</label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                  />
                  {pdfTemplate.logoDataUrl ? (
                    <div className="rfp-template-logo-preview">
                      <img src={pdfTemplate.logoDataUrl} alt="Logo" />
                      <button
                        className="rfp-template-logo-remove"
                        onClick={() => pdfTemplate.setLogo('')}
                        title={t('rfp_gen.logo_remove')}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      className="rfp-template-logo-upload-btn"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      {t('rfp_gen.upload_logo')}
                    </button>
                  )}
                </div>

                {/* Primary Color */}
                <div className="rfp-template-config-field">
                  <label>{t('rfp_gen.primary_color')}</label>
                  <div className="rfp-template-color-row">
                    <input
                      type="color"
                      className="rfp-template-color-picker"
                      value={pdfTemplate.primaryColor}
                      onChange={(e) => pdfTemplate.updateConfig({ primaryColor: e.target.value })}
                    />
                    <span className="rfp-template-color-hex">{pdfTemplate.primaryColor}</span>
                  </div>
                </div>

                {/* Footer Text */}
                <div className="rfp-template-config-field">
                  <label>{t('rfp_gen.footer_text')}</label>
                  <input
                    type="text"
                    className="rfp-template-config-input"
                    value={pdfTemplate.footerText}
                    onChange={(e) => pdfTemplate.updateConfig({ footerText: e.target.value })}
                    placeholder={t('rfp_gen.footer_placeholder')}
                  />
                </div>

                {/* Page Numbers Toggle */}
                <div className="rfp-template-config-field row">
                  <label>{t('rfp_gen.page_numbers')}</label>
                  <label className="rfp-template-toggle-switch">
                    <input
                      type="checkbox"
                      checked={pdfTemplate.showPageNumbers}
                      onChange={(e) => pdfTemplate.updateConfig({ showPageNumbers: e.target.checked })}
                    />
                    <span className="rfp-template-toggle-slider" />
                  </label>
                </div>

                {/* Reset */}
                <button
                  className="rfp-template-reset-btn"
                  onClick={pdfTemplate.resetConfig}
                >
                  {t('rfp_gen.reset_template')}
                </button>
              </div>
            )}

            {!showTemplateConfig && (
              <div className="rfp-template-config-summary">
                {pdfTemplate.companyName && (
                  <span className="rfp-template-config-tag">
                    {pdfTemplate.companyName}
                  </span>
                )}
                {pdfTemplate.logoDataUrl && (
                  <span className="rfp-template-config-tag">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Logo
                  </span>
                )}
                <span
                  className="rfp-template-config-tag color"
                  style={{ borderLeftColor: pdfTemplate.primaryColor }}
                >
                  {pdfTemplate.primaryColor}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Banner de generación en segundo plano (visible en otras páginas al volver) */}
      {isGenerating && (
        <div className="rfp-background-banner">
          <div className="spinner" />
          <span>{language === 'es' ? 'Generando RFP en segundo plano...' : 'Generating RFP in background...'}</span>
          <span className="rfp-background-banner-hint">
            {language === 'es' ? 'Puedes navegar y volver cuando esté listo.' : 'You can navigate away and come back when ready.'}
          </span>
        </div>
      )}

      {/* Generate Button — full width */}
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
            {result ? (language === 'es' ? 'Regenerar' : 'Regenerate') : t('rfp_gen.generate')}
          </>
        )}
      </button>

      {/* Result Section */}
      {(isGenerating || result) && (
        <div className="rfp-result-section">
          {isGenerating && !result && (
            <div className="rfp-output-empty">
              <div className="rfp-generating-spinner" />
              <p>{t('rfp_gen.generating_doc')}</p>
              <p style={{ fontSize: '0.8rem', marginTop: '8px', color: 'var(--text-tertiary)' }}>
                {language === 'es' ? 'Puedes navegar a otras secciones. El resultado te estará esperando aquí al volver.' : 'You can navigate to other sections. The result will be waiting here when you return.'}
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
                  <button className="rfp-action-btn" onClick={handleDownload} title={t('rfp_gen.download_md')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    .md
                  </button>
                  <button
                    className="rfp-action-btn primary"
                    onClick={handleDownloadPdf}
                    title={t('rfp_gen.download_pdf')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <path d="M9 15h6" />
                      <path d="M9 11h6" />
                    </svg>
                    PDF
                  </button>
                </div>
              </div>
              <div
                className="rfp-document-content"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(formatMarkdown(getCleanDocumentMarkdown(result)))
                }}
              />
            </div>
          )}
        </div>
      )}

      {showCopied && (
        <div className="rfp-copied-toast">{t('rfp_gen.copied')}</div>
      )}
    </div>
  );
};

/** Inline markdown: bold, italic, bold-italic */
function inlineFormat(text: string): string {
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function getCleanDocumentMarkdown(result: GenerateRfpResponse): string {
  const raw = result.document || result.sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n');
  return cleanRfpMarkdown(raw);
}

function cleanRfpMarkdown(md: string): string {
  if (!md) return '';
  const cleaned = md
    // Remove standalone logo placeholders generated by AI (es/en), with or without image syntax.
    .replace(
      /(?:^|\n)\s*!?\[\s*(?:logo(?:\s+de\s+la)?(?:\s+empresa)?|company\s+logo)\s*\](?:\([^\)]*\))?\s*(?=\n|$)/gi,
      '\n'
    );

  return cleaned
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Block-level markdown-to-HTML converter with proper table, HR, and list support.
 */
function formatMarkdown(md: string): string {
  if (!md) return '';
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;

  const parseCells = (row: string) => row.slice(1, -1).split('|').map(c => c.trim());
  const isSeparator = (row: string) => /^\|[\s\-:|]+\|$/.test(row);

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Empty line
    if (trimmed === '') { i++; continue; }

    // Table — starts and ends with |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableRows.push(lines[i].trim());
        i++;
      }
      if (tableRows.length >= 1) {
        let html = '<table>';
        let dataStart = 0;
        if (tableRows.length >= 2 && isSeparator(tableRows[1])) {
          const hCells = parseCells(tableRows[0]);
          html += '<thead><tr>' + hCells.map(c => `<th>${inlineFormat(c)}</th>`).join('') + '</tr></thead>';
          dataStart = 2;
        }
        html += '<tbody>';
        for (let j = dataStart; j < tableRows.length; j++) {
          if (isSeparator(tableRows[j])) continue;
          const cells = parseCells(tableRows[j]);
          html += '<tr>' + cells.map(c => `<td>${inlineFormat(c)}</td>`).join('') + '</tr>';
        }
        html += '</tbody></table>';
        out.push(html);
      }
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed) || /^_{3,}$/.test(trimmed)) {
      out.push('<hr>');
      i++;
      continue;
    }

    // Headings (check h4, h3, h2, h1 in order)
    const h4 = trimmed.match(/^#### (.+)/);
    if (h4) { out.push(`<h4>${inlineFormat(h4[1])}</h4>`); i++; continue; }
    const h3 = trimmed.match(/^### (.+)/);
    if (h3) { out.push(`<h3>${inlineFormat(h3[1])}</h3>`); i++; continue; }
    const h2 = trimmed.match(/^## (.+)/);
    if (h2) { out.push(`<h2>${inlineFormat(h2[1])}</h2>`); i++; continue; }
    const h1 = trimmed.match(/^# (.+)/);
    if (h1) { out.push(`<h1>${inlineFormat(h1[1])}</h1>`); i++; continue; }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      out.push('<ul>' + items.map(it => `<li>${inlineFormat(it)}</li>`).join('') + '</ul>');
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push('<ol>' + items.map(it => `<li>${inlineFormat(it)}</li>`).join('') + '</ol>');
      continue;
    }

    // Paragraph — collect lines until next block element or blank line
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,4} /.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('|') &&
      !/^-{3,}$/.test(lines[i].trim()) &&
      !/^\*{3,}$/.test(lines[i].trim()) &&
      !/^_{3,}$/.test(lines[i].trim()) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      out.push(`<p>${inlineFormat(paraLines.join(' '))}</p>`);
    }
  }

  return out.join('\n');
}
