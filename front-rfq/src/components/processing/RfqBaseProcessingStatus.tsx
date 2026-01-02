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
      <div style={{ marginTop: '24px', display: 'grid', gap: '16px', justifyItems: 'center' }}>
        <p
          className="status"
          style={{
            color: 'var(--danger)',
            textAlign: 'center',
            maxWidth: '600px'
          }}
        >
          {rfqBaseStatus.message}
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '24px', display: 'grid', gap: '16px', justifyItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        {isProcessingRfqBase && <Spinner />}
        <p
          className="status"
          data-variant={isComplete ? 'ok' : undefined}
        >
          {rfqBaseStatus.message}
        </p>
      </div>

      {isProcessingRfqBase && (
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <div
            style={{
              height: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                transition: 'width 0.3s ease',
                width: `${rfqBaseStatus.progress}%`,
                borderRadius: '8px'
              }}
            />
          </div>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--muted2)',
              textAlign: 'center',
              marginTop: '8px'
            }}
          >
            {rfqBaseStatus.progress}% completado
          </p>
        </div>
      )}
    </div>
  );
});
