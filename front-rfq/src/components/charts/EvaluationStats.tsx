import React from 'react';

export interface EvaluationStatsProps {
  totalFiles: number;
  totalSize: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  evaluationCounts?: Record<string, number>;
}

export const EvaluationStats: React.FC<EvaluationStatsProps> = ({
  totalFiles,
  totalSize,
  status,
  evaluationCounts = {}
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return '#f59e0b'; // Orange
      case 'completed':
        return 'var(--color-success)'; // Green
      case 'error':
        return 'var(--color-error)'; // Red
      default:
        return 'var(--text-secondary)'; // Gray
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'Ready';
    }
  };

  const totalEvaluations = Object.values(evaluationCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '16px',
        width: '100%'
      }}
    >
      {/* Files Card */}
      <div className="stat-mini-card">
        <div className="stat-mini-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(59, 130, 246, 0.8)" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <div className="stat-mini-content">
          <div className="stat-mini-label">Files</div>
          <div className="stat-mini-value">{totalFiles}</div>
        </div>
      </div>

      {/* Size Card */}
      <div className="stat-mini-card">
        <div className="stat-mini-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(139, 92, 246, 0.8)" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          </svg>
        </div>
        <div className="stat-mini-content">
          <div className="stat-mini-label">Total Size</div>
          <div className="stat-mini-value" style={{ fontSize: '0.95rem' }}>{totalSize}</div>
        </div>
      </div>

      {/* Status Card */}
      <div className="stat-mini-card">
        <div className="stat-mini-icon" style={{ background: `${getStatusColor()}15` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={getStatusColor()} strokeWidth="2">
            {status === 'processing' && (
              <>
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </>
            )}
            {status === 'completed' && (
              <>
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="8 12 11 15 16 10"></polyline>
              </>
            )}
            {status === 'error' && (
              <>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </>
            )}
            {status === 'idle' && (
              <>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </>
            )}
          </svg>
        </div>
        <div className="stat-mini-content">
          <div className="stat-mini-label">Status</div>
          <div className="stat-mini-value" style={{ fontSize: '0.85rem', color: getStatusColor() }}>
            {getStatusText()}
          </div>
        </div>
      </div>

      {/* Evaluations Card (if available) */}
      {totalEvaluations > 0 && (
        <div className="stat-mini-card">
          <div className="stat-mini-icon" style={{ background: 'rgba(18, 181, 176, 0.1)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(18, 181, 176, 0.8)" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </div>
          <div className="stat-mini-content">
            <div className="stat-mini-label">Evaluations</div>
            <div className="stat-mini-value">{totalEvaluations}</div>
          </div>
        </div>
      )}

      <style>{`
        .stat-mini-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          transition: all 0.2s ease;
        }

        .stat-mini-card:hover {
          border-color: var(--color-primary);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .stat-mini-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-mini-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .stat-mini-label {
          font-size: 0.7rem;
          color: var(--text-secondary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-mini-value {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 768px) {
          .stat-mini-card {
            padding: 12px 14px;
          }

          .stat-mini-icon {
            width: 36px;
            height: 36px;
          }

          .stat-mini-value {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default EvaluationStats;
