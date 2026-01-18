import { memo, useState, useEffect } from 'react';
import { useRfqStore } from '../../stores/useRfqStore';
import { ProcessingStage } from '../../types/rfq.types';

interface ProcessingStatusProps {
  onViewResults?: () => void;
  onClose?: () => void;
}

export const ProcessingStatus = memo(function ProcessingStatus({ onViewResults, onClose }: ProcessingStatusProps) {
  const { status, isProcessing, results, rfqMetadata, processingStartTime, processingFileCount } = useRfqStore();
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second when processing
  useEffect(() => {
    if (isProcessing && processingStartTime) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - processingStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [isProcessing, processingStartTime]);

  // Format elapsed time as MM:SS
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isProcessing && status.stage === ProcessingStage.IDLE) {
    return null;
  }

  const isError = status.stage === ProcessingStage.ERROR;
  const isComplete = status.stage === ProcessingStage.COMPLETED;

  // No mostrar mensaje de error aquí, ya que se muestra en el botón
  if (isError) {
    return null;
  }

  return (
    <div style={{
      marginTop: '32px',
      padding: '32px 28px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-md)',
      animation: 'fadeInUp 0.4s ease-out',
      position: 'relative'
    }}>
      {/* Close button - only show when completed */}
      {isComplete && onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
          aria-label="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px'
      }}>
        {/* Icon/Spinner Section */}
        <div style={{
          position: 'relative',
          width: '72px',
          height: '72px'
        }}>
          {isProcessing ? (
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '4px solid rgba(18, 181, 176, 0.2)',
              borderTopColor: 'var(--color-cyan)',
              animation: 'spin 1s linear infinite'
            }}></div>
          ) : isComplete ? (
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'var(--color-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          ) : null}
        </div>

        {/* Message */}
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <p style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: isComplete ? 'var(--color-cyan)' : 'var(--text-primary)',
            marginBottom: '8px',
            lineHeight: '1.4'
          }}>
            {isProcessing ? 'Processing your proposals with AI...' : status.message}
          </p>
          {isProcessing && (
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              The n8n workflow is analyzing your documents. This will continue until completion.
            </p>
          )}

          {isComplete && results && results.length > 0 && (
            <div style={{
              marginTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              width: '100%',
              maxWidth: '400px'
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-cyan)', marginBottom: '4px' }}>
                Processing Summary
              </div>

              {rfqMetadata.proveedor && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'rgba(18, 181, 176, 0.08)',
                  border: '1px solid rgba(18, 181, 176, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: 'var(--color-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Provider</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{rfqMetadata.proveedor}</div>
                  </div>
                </div>
              )}

              {rfqMetadata.tipoEvaluacion && rfqMetadata.tipoEvaluacion.length > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'rgba(18, 181, 176, 0.08)',
                  border: '1px solid rgba(18, 181, 176, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: 'var(--color-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Evaluation Type</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{rfqMetadata.tipoEvaluacion.join(', ')}</div>
                  </div>
                </div>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: 'rgba(18, 181, 176, 0.08)',
                border: '1px solid rgba(18, 181, 176, 0.3)',
                borderRadius: '8px'
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'var(--color-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Requirements</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{results.length} evaluated</div>
                </div>
              </div>
            </div>
          )}

          {isComplete && onViewResults && (
            <button
              className="btn btnPrimary"
              onClick={onViewResults}
              style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
            >
              View Results
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          )}
        </div>

        {/* Elapsed Time Indicator */}
        {isProcessing && (
          <div style={{ width: '100%', maxWidth: '520px' }}>
            {/* Animated progress bar (indeterminate) */}
            <div
              style={{
                height: '6px',
                background: 'var(--bg-hover)',
                borderRadius: '999px',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: '30%',
                  background: 'linear-gradient(90deg, var(--color-primary), var(--color-cyan))',
                  borderRadius: '999px',
                  position: 'absolute',
                  boxShadow: '0 0 10px rgba(18, 181, 176, 0.5)',
                  animation: 'indeterminateProgress 1.5s ease-in-out infinite'
                }}
              ></div>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '12px',
              fontSize: '0.875rem',
              fontWeight: 600
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                Processing {processingFileCount} file{processingFileCount > 1 ? 's' : ''}
              </span>
              <span style={{
                color: 'var(--color-primary)',
                fontFamily: 'monospace',
                fontSize: '1rem'
              }}>
                {formatElapsedTime(elapsedTime)}
              </span>
            </div>

            {/* Warning banner for long operations */}
            <div style={{
              marginTop: '16px',
              padding: '14px 16px',
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, marginTop: '2px' }}
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <div>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#fbbf24',
                  margin: '0 0 4px 0'
                }}>
                  Do not close this browser window
                </p>
                <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  AI document processing typically takes 5-15 minutes per file.
                  Large or complex PDFs may take up to 30 minutes.
                  {processingFileCount > 1 && ` Processing ${processingFileCount} files in parallel.`}
                </p>
              </div>
            </div>

            {/* Processing phases indicator */}
            <div style={{
              marginTop: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              {[
                { label: 'Upload', time: '< 1 min' },
                { label: 'OCR', time: '2-5 min' },
                { label: 'Analysis', time: '5-15 min' },
                { label: 'Evaluation', time: '5-10 min' }
              ].map((phase, idx) => {
                const isActive = elapsedTime >= idx * 120; // Rough estimate
                return (
                  <div
                    key={phase.label}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '8px 4px',
                      background: isActive ? 'rgba(18, 181, 176, 0.1)' : 'var(--bg-surface-alt)',
                      borderRadius: '6px',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: isActive ? 'var(--color-cyan)' : 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {phase.label}
                    </div>
                    <div style={{
                      fontSize: '0.65rem',
                      color: 'var(--text-tertiary)',
                      marginTop: '2px'
                    }}>
                      {phase.time}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes indeterminateProgress {
          0% {
            left: -30%;
          }
          100% {
            left: 100%;
          }
        }
      `}</style>
    </div>
  );
});
