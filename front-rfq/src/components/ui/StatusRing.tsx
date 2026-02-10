import { useState } from 'react';

export const StatusRing = ({
    statuses,
    size = '60px',
    interactive = true
}: {
    statuses: { technical: boolean, economical: boolean, other: boolean },
    size?: string,
    interactive?: boolean
}) => {
    const colors = {
        technical: 'rgba(18, 181, 176, 0.8)',   // Cyan
        economical: 'rgba(245, 158, 11, 0.8)',  // Amber/Orange
        other: 'rgba(139, 92, 246, 0.8)',        // Purple
        missing: 'rgba(255, 255, 255, 0.05)'    // Very subtle grey
    };

    // Mapping (3 segments, 120° each):
    // Top-Right (0-120): Technical
    // Bottom (120-240): Economical
    // Top-Left (240-360): Others

    const c1 = statuses.technical ? colors.technical : colors.missing;
    const c2 = statuses.economical ? colors.economical : colors.missing;
    const c3 = statuses.other ? colors.other : colors.missing;

    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => interactive && setIsHovered(true)}
            onMouseLeave={() => interactive && setIsHovered(false)}
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: `conic-gradient(
                    ${c1} 0deg 120deg,
                    ${c2} 120deg 240deg,
                    ${c3} 240deg 360deg
                )`,
                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                cursor: interactive ? 'pointer' : 'default',
                boxShadow: isHovered ? '0 0 15px rgba(255,255,255,0.1)' : 'none',
                position: 'relative'
            }}
        >
            {/* Center hole for Donut effect */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '40%',
                height: '40%',
                borderRadius: '50%',
                background: 'var(--bg-surface)'
            }} />
        </div>
    );
};

export const StatusLegend = ({ color, label }: { color: string, label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }}></div>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{label}</span>
    </div>
);
