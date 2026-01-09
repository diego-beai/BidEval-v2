import React from 'react';

export interface ProgressRingProps {
  progress: number; // 0-100
  size?: 'small' | 'medium' | 'large';
  label?: string;
  showPercentage?: boolean;
  color?: string;
}

const SIZE_MAP = {
  small: { size: 60, stroke: 4 },
  medium: { size: 100, stroke: 6 },
  large: { size: 140, stroke: 8 }
};

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 'medium',
  label,
  showPercentage = true,
  color = '#12b5b0'
}) => {
  const { size: diameter, stroke } = SIZE_MAP[size];
  const radius = (diameter - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <div style={{ position: 'relative', width: diameter, height: diameter }}>
        <svg
          width={diameter}
          height={diameter}
          style={{
            transform: 'rotate(-90deg)',
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
          }}
        >
          {/* Background circle */}
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            stroke="var(--border-color)"
            strokeWidth={stroke}
            fill="none"
            opacity={0.2}
          />

          {/* Progress circle */}
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: `drop-shadow(0 0 4px ${color}40)`
            }}
          />
        </svg>

        {/* Center content */}
        {showPercentage && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontSize: size === 'small' ? '1rem' : size === 'medium' ? '1.5rem' : '2rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1
              }}
            >
              {Math.round(progress)}%
            </div>
            {size !== 'small' && (
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  marginTop: '2px'
                }}
              >
                complete
              </div>
            )}
          </div>
        )}
      </div>

      {label && (
        <div
          style={{
            fontSize: size === 'small' ? '0.75rem' : '0.85rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textAlign: 'center'
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

export default ProgressRing;
