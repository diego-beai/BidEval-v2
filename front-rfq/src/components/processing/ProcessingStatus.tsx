import { memo } from 'react';
import { useRfqStore } from '../../stores/useRfqStore';
import { ProcessingStage } from '../../types/rfq.types';

export const ProcessingStatus = memo(function ProcessingStatus({ onViewResults }: { onViewResults?: () => void }) {
  const { status, isProcessing, results, rfqMetadata } = useRfqStore();

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
      animation: 'fadeInUp 0.4s ease-out'
    }}>
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
            {status.message}
          </p>
          {isProcessing && (
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              Please wait while we process your request...
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

        {/* Progress Bar */}
        {isProcessing && (
          <div style={{ width: '100%', maxWidth: '520px' }}>
            <div
              style={{
                height: '10px',
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
                  background: 'linear-gradient(90deg, var(--color-primary), var(--color-cyan))',
                  transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: `${status.progress}%`,
                  borderRadius: '999px',
                  position: 'relative',
                  boxShadow: '0 0 10px rgba(18, 181, 176, 0.5)'
                }}
              >
                {/* Shine effect */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  animation: 'shimmer 2s infinite'
                }}></div>
              </div>
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
                Progress
              </span>
              <span style={{ color: 'var(--color-primary)' }}>
                {status.progress}%
              </span>
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
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
});
