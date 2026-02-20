import { useState } from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import DOMPurify from 'dompurify';

// ============================================
// TYPES
// ============================================

export type RfpAgentType =
  | 'context'
  | 'technical_scope'
  | 'functional_requirements'
  | 'economic_conditions'
  | 'general_clauses'
  | 'consolidator';

export interface RfpSection {
  id: string;
  title: string;
  content: string;
  agentType: RfpAgentType;
  sortOrder: number;
  isLocked: boolean;
}

interface RfpSectionEditorProps {
  section: RfpSection;
  onUpdate: (content: string) => void;
  onRegenerate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isGenerating: boolean;
  isFirst: boolean;
  isLast: boolean;
}

// ============================================
// AGENT TYPE LABELS AND COLORS
// ============================================

const AGENT_COLORS: Record<RfpAgentType, string> = {
  context: '#3b82f6',
  technical_scope: '#12b5b0',
  functional_requirements: '#8b5cf6',
  economic_conditions: '#f59e0b',
  general_clauses: '#6b7280',
  consolidator: '#ef4444',
};

// ============================================
// SIMPLE MARKDOWN TO HTML (for preview)
// ============================================

function simpleMarkdownToHtml(md: string): string {
  if (!md) return '<p style="color: var(--text-tertiary); font-style: italic;">Sin contenido</p>';
  return md
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hulo])/gm, '<p>')
    .replace(/(?<![>])$/gm, '</p>')
    .replace(/<p><\/p>/g, '');
}

// ============================================
// COMPONENT
// ============================================

export const RfpSectionEditor = ({
  section,
  onUpdate,
  onRegenerate,
  onDelete,
  onToggleLock,
  onMoveUp,
  onMoveDown,
  isGenerating,
  isFirst,
  isLast,
}: RfpSectionEditorProps) => {
  const { t, language } = useLanguageStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const agentColor = AGENT_COLORS[section.agentType] || '#6b7280';

  const agentLabels: Record<RfpAgentType, string> = {
    context: language === 'es' ? 'Contexto' : 'Context',
    technical_scope: language === 'es' ? 'Alcance Tecnico' : 'Technical Scope',
    functional_requirements: language === 'es' ? 'Req. Funcionales' : 'Functional Req.',
    economic_conditions: language === 'es' ? 'Cond. Economicas' : 'Economic Conditions',
    general_clauses: language === 'es' ? 'Clausulas Generales' : 'General Clauses',
    consolidator: language === 'es' ? 'Consolidador' : 'Consolidator',
  };

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        transition: 'box-shadow 0.3s, border-color 0.3s',
        boxShadow: 'var(--shadow-sm)',
        borderLeftWidth: '3px',
        borderLeftColor: agentColor,
        opacity: section.isLocked ? 0.85 : 1,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          background: 'var(--bg-surface-alt)',
          borderBottom: isCollapsed ? 'none' : '1px solid var(--border-color)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {/* Collapse arrow */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-tertiary)"
          strokeWidth="2"
          style={{
            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>

        {/* Agent type badge */}
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: agentColor,
            background: `${agentColor}14`,
            padding: '2px 8px',
            borderRadius: '4px',
            flexShrink: 0,
          }}
        >
          {agentLabels[section.agentType]}
        </span>

        {/* Title */}
        <span
          style={{
            flex: 1,
            fontSize: '0.88rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {section.title}
        </span>

        {/* Lock indicator */}
        {section.isLocked && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="2"
            style={{ flexShrink: 0 }}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        )}

        {/* Content length badge */}
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-tertiary)',
            background: 'var(--bg-surface)',
            padding: '2px 6px',
            borderRadius: '4px',
            flexShrink: 0,
          }}
        >
          {section.content.length} {t('rfp_gen.chars')}
        </span>
      </div>

      {/* Body */}
      {!isCollapsed && (
        <div style={{ padding: '16px' }}>
          {/* Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '12px',
              flexWrap: 'wrap',
            }}
          >
            {/* Preview toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPreview(!showPreview);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 500,
                background: showPreview ? 'var(--color-primary-light)' : 'var(--bg-surface-alt)',
                border: `1px solid ${showPreview ? 'var(--color-primary)' : 'var(--border-color)'}`,
                borderRadius: '6px',
                color: showPreview ? 'var(--color-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {language === 'es' ? 'Vista previa' : 'Preview'}
            </button>

            {/* Lock/Unlock */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLock();
              }}
              title={section.isLocked
                ? (language === 'es' ? 'Desbloquear seccion' : 'Unlock section')
                : (language === 'es' ? 'Bloquear seccion' : 'Lock section')
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 500,
                background: section.isLocked ? '#f59e0b14' : 'var(--bg-surface-alt)',
                border: `1px solid ${section.isLocked ? '#f59e0b40' : 'var(--border-color)'}`,
                borderRadius: '6px',
                color: section.isLocked ? '#f59e0b' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {section.isLocked ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </svg>
              )}
              {section.isLocked
                ? (language === 'es' ? 'Bloqueada' : 'Locked')
                : (language === 'es' ? 'Bloquear' : 'Lock')
              }
            </button>

            {/* Regenerate */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
              disabled={isGenerating || section.isLocked}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 500,
                background: 'var(--bg-surface-alt)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: isGenerating || section.isLocked ? 'var(--text-tertiary)' : 'var(--color-primary)',
                cursor: isGenerating || section.isLocked ? 'not-allowed' : 'pointer',
                opacity: isGenerating || section.isLocked ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              {isGenerating ? (
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid var(--color-primary-light)',
                    borderTopColor: 'var(--color-primary)',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              )}
              {isGenerating
                ? (language === 'es' ? 'Generando...' : 'Generating...')
                : (language === 'es' ? 'Regenerar' : 'Regenerate')
              }
            </button>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Move up */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
              disabled={isFirst}
              title={language === 'es' ? 'Mover arriba' : 'Move up'}
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: isFirst ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                cursor: isFirst ? 'not-allowed' : 'pointer',
                opacity: isFirst ? 0.4 : 1,
                transition: 'all 0.15s',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>

            {/* Move down */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
              disabled={isLast}
              title={language === 'es' ? 'Mover abajo' : 'Move down'}
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: isLast ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                cursor: isLast ? 'not-allowed' : 'pointer',
                opacity: isLast ? 0.4 : 1,
                transition: 'all 0.15s',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Delete */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title={language === 'es' ? 'Eliminar seccion' : 'Delete section'}
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: '1px solid transparent',
                borderRadius: '6px',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.08)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)';
                (e.currentTarget as HTMLButtonElement).style.background = 'none';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>

          {/* Content: textarea or preview */}
          {showPreview ? (
            <div
              style={{
                padding: '16px',
                background: 'var(--bg-surface-alt)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                lineHeight: 1.7,
                color: 'var(--text-primary)',
                maxHeight: '400px',
                overflowY: 'auto',
              }}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(simpleMarkdownToHtml(section.content)),
              }}
            />
          ) : (
            <textarea
              value={section.content}
              onChange={(e) => onUpdate(e.target.value)}
              disabled={section.isLocked}
              placeholder={
                language === 'es'
                  ? 'Escribe el contenido de esta seccion en Markdown...'
                  : 'Write the section content in Markdown...'
              }
              style={{
                width: '100%',
                minHeight: '160px',
                padding: '12px 14px',
                background: section.isLocked ? 'var(--bg-surface)' : 'var(--bg-surface-alt)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                fontSize: '0.82rem',
                lineHeight: 1.6,
                resize: 'vertical',
                transition: 'border-color 0.15s',
                outline: 'none',
              }}
              onFocus={(e) => {
                if (!section.isLocked) {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-light)';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
