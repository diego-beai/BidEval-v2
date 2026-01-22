import React, { useState, useMemo } from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import './DonutChart.css';

export interface DonutChartData {
  label: string;
  value: number;
  color: string;
  isEmpty?: boolean;
}

export interface DonutChartProps {
  data: DonutChartData[];
  size?: 'small' | 'medium' | 'large';
  centerText?: string;
  showLegend?: boolean;
  interactive?: boolean;
  onSectorClick?: (index: number, data: DonutChartData) => void;
  className?: string;
}

const SIZE_MAP = {
  small: 100,
  medium: 160,
  large: 200
};

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 'medium',
  centerText,
  showLegend = false,
  interactive = true,
  onSectorClick,
  className = ''
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { t } = useLanguageStore();

  const sizeInPx = SIZE_MAP[size];
  const strokeWidth = size === 'small' ? 12 : size === 'medium' ? 16 : 20;
  const radius = (sizeInPx - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const centerXY = sizeInPx / 2;

  // Calculate total
  const total = useMemo(() => {
    return data.reduce((sum, d) => sum + d.value, 0);
  }, [data]);

  // Generate arc segments
  const segments = useMemo(() => {
    if (total === 0) {
      return [{
        offset: 0,
        length: circumference,
        color: 'rgba(100, 116, 139, 0.2)',
        data: { label: t('chart.no_data'), value: 0, color: 'rgba(100, 116, 139, 0.2)' },
        index: -1
      }];
    }

    let currentOffset = 0;
    const gap = 3;

    return data.map((d, index) => {
      const percentage = d.value / total;
      const segmentLength = percentage * circumference - gap;
      const segment = {
        offset: currentOffset,
        length: Math.max(0, segmentLength),
        color: d.isEmpty || d.value === 0 ? 'rgba(100, 116, 139, 0.2)' : d.color,
        data: d,
        index
      };
      currentOffset += percentage * circumference;
      return segment;
    });
  }, [data, total, circumference]);

  const handleSegmentClick = (index: number) => {
    if (!interactive || !onSectorClick || index < 0) return;
    onSectorClick(index, data[index]);
  };

  return (
    <div className={`donut-chart-wrapper ${className}`}>
      <div className="donut-chart-layout">
        {/* Chart */}
        <div className="donut-chart-modern">
          {/* Outer glow ring */}
          <div
            className="donut-glow-ring"
            style={{
              width: sizeInPx + 16,
              height: sizeInPx + 16,
              opacity: hoveredIndex !== null ? 0.6 : 0.3
            }}
          />

          {/* SVG Chart */}
          <svg
            width={sizeInPx}
            height={sizeInPx}
            viewBox={`0 0 ${sizeInPx} ${sizeInPx}`}
            className="donut-svg"
          >
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Background track */}
            <circle
              cx={centerXY}
              cy={centerXY}
              r={radius}
              fill="none"
              stroke="rgba(100, 116, 139, 0.08)"
              strokeWidth={strokeWidth + 2}
            />

            {/* Data segments */}
            {segments.map((segment, i) => (
              <circle
                key={i}
                cx={centerXY}
                cy={centerXY}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={hoveredIndex === segment.index ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={`${segment.length} ${circumference}`}
                strokeDashoffset={-segment.offset}
                strokeLinecap="round"
                className={`donut-segment ${hoveredIndex === segment.index ? 'active' : ''}`}
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                  filter: hoveredIndex === segment.index ? 'url(#glow)' : 'none',
                  opacity: hoveredIndex !== null && hoveredIndex !== segment.index ? 0.4 : 1,
                  cursor: interactive && segment.index >= 0 ? 'pointer' : 'default'
                }}
                onMouseEnter={() => interactive && segment.index >= 0 && setHoveredIndex(segment.index)}
                onMouseLeave={() => interactive && setHoveredIndex(null)}
                onClick={() => handleSegmentClick(segment.index)}
              />
            ))}
          </svg>

          {/* Center content */}
          <div className="donut-center-modern">
            <div className="donut-center-content">
              {hoveredIndex !== null && data[hoveredIndex] ? (
                <>
                  <span className="donut-center-value">{data[hoveredIndex].value}</span>
                  <span className="donut-center-label">{data[hoveredIndex].label.split(' ')[0]}</span>
                </>
              ) : (
                <>
                  <span className="donut-center-value">{centerText || total}</span>
                  <span className="donut-center-label">{t('chart.total')}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Compact Legend */}
        {showLegend && (
          <div className="donut-legend-compact">
            {data.map((d, i) => {
              const percentage = total > 0 ? ((d.value / total) * 100).toFixed(0) : 0;
              return (
                <div
                  key={i}
                  className={`legend-item-compact ${hoveredIndex === i ? 'active' : ''} ${d.value === 0 ? 'empty' : ''}`}
                  onMouseEnter={() => interactive && setHoveredIndex(i)}
                  onMouseLeave={() => interactive && setHoveredIndex(null)}
                >
                  <div
                    className="legend-dot"
                    style={{
                      background: d.isEmpty || d.value === 0
                        ? 'rgba(100, 116, 139, 0.3)'
                        : d.color
                    }}
                  />
                  <span className="legend-name">{d.label}</span>
                  <span className="legend-val">{d.value}</span>
                  <div className="legend-bar-track">
                    <div
                      className="legend-bar-fill"
                      style={{
                        width: `${percentage}%`,
                        background: d.isEmpty || d.value === 0 ? 'rgba(100, 116, 139, 0.3)' : d.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DonutChart;
