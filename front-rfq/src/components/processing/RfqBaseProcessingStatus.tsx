import { memo } from 'react';
import { useRfqStore } from '../../stores/useRfqStore';
import { ProcessingStage } from '../../types/rfq.types';
import { Spinner } from '../ui/Spinner';

export const RfqBaseProcessingStatus = memo(function RfqBaseProcessingStatus() {
  const { rfqBaseStatus, isProcessingRfqBase } = useRfqStore();

  if (!isProcessingRfqBase && rfqBaseStatus.stage === ProcessingStage.IDLE) {
    return null;
  }

  const isError = rfqBaseStatus.stage === ProcessingStage.ERROR;
  const isComplete = rfqBaseStatus.stage === ProcessingStage.COMPLETED;

  // Mostrar mensaje de error si existe
  if (isError) {
    return (
      <div style={{
        marginTop: '32px',
        padding: '28px 24px',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid var(--color-error)',
        borderRadius: 'var(--radius-lg)',
        animation: 'shake 0.5s ease-in-out'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--color-error)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <p style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--color-error)',
            textAlign: 'left',
            maxWidth: '600px',
            margin: 0
          }}>
            {rfqBaseStatus.message}
          </p>
        </div>
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
            20%, 40%, 60%, 80% { transform: translateX(8px); }
          }
        `}</style>
      </div>
    );
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
          {isProcessingRfqBase ? (
            <>
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'var(--color-primary-light)',
                animation: 'pulse 2s ease-in-out infinite'
              }}></div>
              <div style={{
                position: 'absolute',
                inset: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Spinner />
              </div>
            </>
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
            {rfqBaseStatus.message}
          </p>
          {isProcessingRfqBase && (
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              Estamos procesando tu RFQ base...
            </p>
          )}
        </div>

        {/* Progress Bar */}
        {isProcessingRfqBase && (
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
                  width: `${rfqBaseStatus.progress}%`,
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
                Progreso
              </span>
              <span style={{ color: 'var(--color-primary)' }}>
                {rfqBaseStatus.progress}%
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
        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
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
