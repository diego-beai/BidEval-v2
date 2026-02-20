import { useState } from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useRfpGeneratorStore } from '../../stores/useRfpGeneratorStore';
import { RfpSectionEditor, RfpAgentType } from './RfpSectionEditor';

// ============================================
// AGENT TYPE PRESET OPTIONS
// ============================================

const AGENT_PRESETS: Array<{ type: RfpAgentType; labelEs: string; labelEn: string }> = [
  { type: 'context', labelEs: 'Contexto y Antecedentes', labelEn: 'Context & Background' },
  { type: 'technical_scope', labelEs: 'Alcance Tecnico', labelEn: 'Technical Scope' },
  { type: 'functional_requirements', labelEs: 'Requisitos Funcionales', labelEn: 'Functional Requirements' },
  { type: 'economic_conditions', labelEs: 'Condiciones Economicas', labelEn: 'Economic Conditions' },
  { type: 'general_clauses', labelEs: 'Clausulas Generales', labelEn: 'General Clauses' },
  { type: 'consolidator', labelEs: 'Consolidador Final', labelEn: 'Final Consolidator' },
];

// ============================================
// COMPONENT
// ============================================

export const RfpSectionList = () => {
  const { language } = useLanguageStore();
  const {
    sections,
    isGenerating,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
    lockSection,
    generateSection,
    generateAllSections,
  } = useRfpGeneratorStore();

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const handleRegenerate = async (id: string) => {
    setGeneratingId(id);
    await generateSection(id);
    setGeneratingId(null);
  };

  const handleGenerateAll = async () => {
    await generateAllSections();
  };

  const handleAddSection = (agentType: RfpAgentType, title: string) => {
    addSection(agentType, title);
    setShowAddMenu(false);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) reorderSections(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index < sections.length - 1) reorderSections(index, index + 1);
  };

  // Progress indicator
  const filledSections = sections.filter((s) => s.content.trim().length > 0).length;
  const totalSections = sections.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Progress bar + actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap',
        }}
      >
        {/* Section count */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span style={{ fontWeight: 600 }}>
            {filledSections}/{totalSections}
          </span>
          <span>{language === 'es' ? 'secciones con contenido' : 'sections with content'}</span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            flex: 1,
            height: '4px',
            background: 'var(--border-color)',
            borderRadius: '2px',
            overflow: 'hidden',
            minWidth: '60px',
          }}
        >
          <div
            style={{
              width: totalSections > 0 ? `${(filledSections / totalSections) * 100}%` : '0%',
              height: '100%',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              borderRadius: '2px',
              transition: 'width 0.3s',
            }}
          />
        </div>

        {/* Generate all */}
        <button
          onClick={handleGenerateAll}
          disabled={isGenerating || totalSections === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: isGenerating || totalSections === 0 ? 'not-allowed' : 'pointer',
            opacity: isGenerating || totalSections === 0 ? 0.5 : 1,
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(18, 181, 176, 0.2)',
          }}
        >
          {isGenerating ? (
            <>
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }}
              />
              {language === 'es' ? 'Generando...' : 'Generating...'}
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              {language === 'es' ? 'Generar todo' : 'Generate All'}
            </>
          )}
        </button>

        {/* Add section */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 12px',
              background: 'var(--bg-surface-alt)',
              border: '1px dashed var(--border-color)',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {language === 'es' ? 'Agregar seccion' : 'Add section'}
          </button>

          {/* Add section dropdown */}
          {showAddMenu && (
            <>
              {/* Backdrop */}
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 99,
                }}
                onClick={() => setShowAddMenu(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  minWidth: '240px',
                  zIndex: 100,
                  overflow: 'hidden',
                  animation: 'fadeInUp 0.15s ease-out',
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--text-tertiary)',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  {language === 'es' ? 'Tipo de agente' : 'Agent type'}
                </div>
                {AGENT_PRESETS.map((preset) => (
                  <button
                    key={preset.type}
                    onClick={() =>
                      handleAddSection(
                        preset.type,
                        language === 'es' ? preset.labelEs : preset.labelEn
                      )
                    }
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px 14px',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-surface-alt)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                    }}
                  >
                    {language === 'es' ? preset.labelEs : preset.labelEn}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section list */}
      {sections.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="1.5"
            style={{ opacity: 0.4, marginBottom: '12px' }}
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p
            style={{
              fontSize: '0.88rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              margin: '0 0 4px',
            }}
          >
            {language === 'es' ? 'Sin secciones' : 'No sections'}
          </p>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-tertiary)',
              margin: 0,
            }}
          >
            {language === 'es'
              ? 'Agrega secciones usando el boton de arriba o usa "Iniciar con plantilla".'
              : 'Add sections using the button above or use "Start with template".'}
          </p>
          <button
            onClick={() => useRfpGeneratorStore.getState().initDefaultSections()}
            style={{
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: 'var(--color-primary-light)',
              border: '1px solid var(--color-primary)',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--color-primary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            {language === 'es' ? 'Iniciar con plantilla' : 'Start with template'}
          </button>
        </div>
      ) : (
        sections.map((section, index) => (
          <RfpSectionEditor
            key={section.id}
            section={section}
            onUpdate={(content) => updateSection(section.id, content)}
            onRegenerate={() => handleRegenerate(section.id)}
            onDelete={() => deleteSection(section.id)}
            onToggleLock={() => lockSection(section.id, !section.isLocked)}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
            isGenerating={isGenerating || generatingId === section.id}
            isFirst={index === 0}
            isLast={index === sections.length - 1}
          />
        ))
      )}
    </div>
  );
};
