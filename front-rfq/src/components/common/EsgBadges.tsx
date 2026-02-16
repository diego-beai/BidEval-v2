import React, { useMemo } from 'react';
import { Check, HelpCircle, Minus } from 'lucide-react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import type { ESGCertification } from '../../types/esg.types';
import { ESG_CATALOG, ESG_CATEGORY_LABELS } from '../../types/esg.types';
import './EsgBadges.css';

interface EsgBadgesProps {
    certifications: ESGCertification[];
    variant?: 'compact' | 'full';
    showNotDetected?: boolean;
    maxVisible?: number;
}

const StatusIcon: React.FC<{ status: ESGCertification['status'] }> = ({ status }) => {
    if (status === 'confirmed') return <Check size={13} />;
    if (status === 'mentioned') return <HelpCircle size={13} />;
    return <Minus size={13} />;
};

export const EsgBadges: React.FC<EsgBadgesProps> = ({
    certifications,
    variant = 'compact',
    showNotDetected = false,
    maxVisible,
}) => {
    const { language, t } = useLanguageStore();

    // Merge certifications with catalog for full display names
    const enriched = useMemo(() => {
        return certifications.map(cert => {
            const catalogEntry = ESG_CATALOG.find(c => c.id === cert.id);
            const displayName = catalogEntry
                ? (language === 'es' ? catalogEntry.display_name_es : catalogEntry.display_name)
                : cert.name;
            return { ...cert, displayName, shortName: catalogEntry?.name || cert.name };
        });
    }, [certifications, language]);

    // Filter and limit
    const filtered = useMemo(() => {
        let items = showNotDetected ? enriched : enriched.filter(c => c.status !== 'not_detected');
        if (maxVisible && items.length > maxVisible) {
            items = items.slice(0, maxVisible);
        }
        return items;
    }, [enriched, showNotDetected, maxVisible]);

    // Group by category
    const grouped = useMemo(() => {
        const groups: Record<string, typeof filtered> = {
            environmental: [],
            social: [],
            governance: [],
        };
        filtered.forEach(cert => {
            if (groups[cert.category]) {
                groups[cert.category].push(cert);
            }
        });
        return groups;
    }, [filtered]);

    if (filtered.length === 0) {
        return (
            <div className="esg-badges" style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                {t('esg.no_data')}
            </div>
        );
    }

    return (
        <div className="esg-badges">
            {(['environmental', 'social', 'governance'] as const).map(cat => {
                const items = grouped[cat];
                if (!items || items.length === 0) return null;
                const label = ESG_CATEGORY_LABELS[cat][language];

                return (
                    <div key={cat} className="esg-badge-group">
                        <span className="esg-badge-group-label">{label}</span>
                        <div className="esg-badge-group-items">
                            {items.map(cert => (
                                <div
                                    key={cert.id}
                                    className={`esg-badge esg-badge--${cert.status === 'not_detected' ? 'not-detected' : cert.status}`}
                                >
                                    <span className="esg-badge-icon">
                                        <StatusIcon status={cert.status} />
                                    </span>
                                    <span className="esg-badge-name">
                                        {variant === 'compact' ? cert.shortName : cert.displayName}
                                    </span>
                                    {variant === 'full' && cert.confidence > 0 && (
                                        <span className="esg-badge-confidence">
                                            <span
                                                className="esg-badge-confidence-fill"
                                                style={{ width: `${Math.round(cert.confidence * 100)}%` }}
                                            />
                                        </span>
                                    )}
                                    <span className="esg-badge-tooltip">
                                        {cert.displayName} — {Math.round(cert.confidence * 100)}% {t('esg.confidence')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
