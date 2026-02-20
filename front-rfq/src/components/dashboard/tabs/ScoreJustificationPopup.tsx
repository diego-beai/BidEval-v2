import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

interface ScoreJustificationPopupProps {
  score: number;
  criterionName: string;
  categoryName: string;
  categoryColor: string;
  justification?: string;
  strengths?: string[];
  weaknesses?: string[];
  summary?: string;
  providerName: string;
  onClose: () => void;
  anchorRect: DOMRect;
}

const displayProviderName = (name: string) => name === 'TECNICASREUNIDAS' ? 'TR' : name;

const getScoreBadgeColor = (score: number): { bg: string; text: string } => {
  if (score >= 8) return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981' };
  if (score >= 5) return { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b' };
  return { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444' };
};

export const ScoreJustificationPopup: React.FC<ScoreJustificationPopupProps> = ({
  score,
  criterionName,
  categoryName,
  categoryColor,
  justification,
  strengths,
  weaknesses,
  summary,
  providerName,
  onClose,
  anchorRect,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Position calculation
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - anchorRect.bottom;
  const showBelow = spaceBelow > 280;

  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(anchorRect.left, window.innerWidth - 400),
    top: showBelow ? anchorRect.bottom + 8 : undefined,
    bottom: showBelow ? undefined : viewportHeight - anchorRect.top + 8,
    maxWidth: 380,
    width: 380,
    zIndex: 100000,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)',
    animation: 'fadeInUp 0.15s ease-out',
    overflow: 'hidden',
  };

  // Filter strengths/weaknesses by criterion keywords
  const criterionWords = criterionName.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const relevantStrengths = (strengths || []).filter(s => {
    const lower = s.toLowerCase();
    return criterionWords.some(w => lower.includes(w));
  });
  const relevantWeaknesses = (weaknesses || []).filter(w => {
    const lower = w.toLowerCase();
    return criterionWords.some(word => lower.includes(word));
  });

  const hasRelevantData = justification || relevantStrengths.length > 0 || relevantWeaknesses.length > 0;
  const scoreBadge = getScoreBadgeColor(score);

  return ReactDOM.createPortal(
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          background: 'transparent',
        }}
      />
      {/* Popup */}
      <div ref={popupRef} style={popupStyle}>
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {criterionName}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
              {displayProviderName(providerName)}
              <span style={{
                marginLeft: 8,
                padding: '1px 6px',
                borderRadius: 4,
                background: `${categoryColor}18`,
                color: categoryColor,
                fontSize: '0.65rem',
                fontWeight: 600,
              }}>
                {categoryName}
              </span>
            </div>
          </div>
          {/* Score badge */}
          <div style={{
            padding: '6px 14px',
            borderRadius: 10,
            background: scoreBadge.bg,
            color: scoreBadge.text,
            fontSize: '1.15rem',
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {score.toFixed(1)}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 16px', maxHeight: 260, overflowY: 'auto' }}>
          {/* Justification text */}
          {justification && (
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 12,
              padding: '10px 12px',
              background: 'var(--bg-surface-alt)',
              borderRadius: 8,
              fontSize: '0.8rem',
              lineHeight: 1.5,
              color: 'var(--text-primary)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={categoryColor} strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>{justification}</span>
            </div>
          )}

          {/* Relevant strengths/weaknesses (if no justification or as supplement) */}
          {!justification && relevantStrengths.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#10b981', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Fortalezas
              </div>
              {relevantStrengths.slice(0, 3).map((s, i) => (
                <div key={i} style={{
                  padding: '6px 10px',
                  background: 'rgba(16,185,129,0.06)',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                  lineHeight: 1.4,
                }}>
                  {s}
                </div>
              ))}
            </div>
          )}

          {!justification && relevantWeaknesses.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#f59e0b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Areas de mejora
              </div>
              {relevantWeaknesses.slice(0, 3).map((w, i) => (
                <div key={i} style={{
                  padding: '6px 10px',
                  background: 'rgba(245,158,11,0.06)',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                  lineHeight: 1.4,
                }}>
                  {w}
                </div>
              ))}
            </div>
          )}

          {/* Fallback: global summary */}
          {!hasRelevantData && summary && (
            <div style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              fontStyle: 'italic',
            }}>
              {summary}
            </div>
          )}

        </div>
      </div>
    </>,
    document.body
  );
};
