import { memo } from 'react';
import { useRfqStore } from '../../stores/useRfqStore';
import { ProcessingStage } from '../../types/rfq.types';
import { Spinner } from '../ui/Spinner';

export const ProcessingStatus = memo(function ProcessingStatus() {
  const { status, isProcessing } = useRfqStore();

  if (!isProcessing && status.stage === ProcessingStage.IDLE) {
    return null;
  }

  const isError = status.stage === ProcessingStage.ERROR;
  const isComplete = status.stage === ProcessingStage.COMPLETED;

  return (
    <div style={{ marginTop: '24px', display: 'grid', gap: '16px', justifyItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        {isProcessing && <Spinner />}
        <p
          className="status"
          data-variant={isError ? 'error' : isComplete ? 'ok' : undefined}
        >
          {status.message}
        </p>
      </div>

      {isProcessing && (
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
                width: `${status.progress}%`,
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
            {status.progress}% completado
          </p>
        </div>
      )}
    </div>
  );
});
