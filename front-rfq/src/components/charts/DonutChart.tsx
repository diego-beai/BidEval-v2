import React, { useState, useMemo } from 'react';
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
  small: 80,
  medium: 160,
  large: 240
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
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const sizeInPx = SIZE_MAP[size];

  // Calcular total para porcentajes
  const total = useMemo(() => {
    return data.reduce((sum, d) => sum + d.value, 0);
  }, [data]);

  // Generar conic-gradient string
  const conicGradient = useMemo(() => {
    if (total === 0) {
      return 'conic-gradient(rgba(203, 213, 225, 0.3) 0% 100%)';
    }

    let currentAngle = 0;
    const gradientStops: string[] = [];

    data.forEach((d) => {
      const percentage = (d.value / total) * 100;
      const startAngle = currentAngle;
      const endAngle = currentAngle + percentage;

      const color = d.isEmpty || d.value === 0 ? 'rgba(203, 213, 225, 0.3)' : d.color;

      gradientStops.push(`${color} ${startAngle}% ${endAngle}%`);
      currentAngle = endAngle;
    });

    return `conic-gradient(${gradientStops.join(', ')})`;
  }, [data, total]);

  // Calcular qué sector está en hover basado en posición del mouse
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || total === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const mouseX = e.clientX - rect.left - centerX;
    const mouseY = e.clientY - rect.top - centerY;

    // Calcular ángulo del mouse
    let angle = Math.atan2(mouseY, mouseX) * (180 / Math.PI);
    angle = (angle + 90 + 360) % 360; // Normalizar a 0-360 empezando desde arriba

    // Encontrar qué sector corresponde a este ángulo
    let currentAngle = 0;
    let foundIndex = -1;

    for (let idx = 0; idx < data.length; idx++) {
      const percentage = (data[idx].value / total) * 100;
      const sectorAngle = (percentage / 100) * 360;

      if (angle >= currentAngle && angle < currentAngle + sectorAngle) {
        foundIndex = idx;
        break;
      }

      currentAngle += sectorAngle;
    }

    setHoveredIndex(foundIndex >= 0 ? foundIndex : null);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const handleClick = () => {
    if (!interactive || !onSectorClick || hoveredIndex === null) return;
    onSectorClick(hoveredIndex, data[hoveredIndex]);
  };

  return (
    <div className={`donut-chart-container ${className}`}>
      <div
        className={`donut-chart donut-chart-${size} ${interactive ? 'interactive' : ''} ${
          hoveredIndex !== null ? 'hovered' : ''
        }`}
        style={{
          width: sizeInPx,
          height: sizeInPx,
          background: conicGradient,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <div className="donut-center">
          {centerText && <span className="donut-center-text">{centerText}</span>}
        </div>
      </div>

      {/* Tooltip */}
      {interactive && hoveredIndex !== null && data[hoveredIndex].value > 0 && (
        <div
          className="donut-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 30,
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          <div className="donut-tooltip-label">{data[hoveredIndex].label}</div>
          <div className="donut-tooltip-value">
            {data[hoveredIndex].value} ({((data[hoveredIndex].value / total) * 100).toFixed(1)}%)
          </div>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="donut-legend">
          {data.map((d, i) => (
            <div
              key={i}
              className={`donut-legend-item ${hoveredIndex === i ? 'active' : ''}`}
              onMouseEnter={() => interactive && setHoveredIndex(i)}
              onMouseLeave={() => interactive && setHoveredIndex(null)}
            >
              <div
                className="donut-legend-color"
                style={{ background: d.isEmpty || d.value === 0 ? 'rgba(203, 213, 225, 0.3)' : d.color }}
              />
              <span className="donut-legend-label">{d.label}</span>
              <span className="donut-legend-value">{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DonutChart;
