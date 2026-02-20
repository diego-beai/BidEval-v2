import React, { useEffect } from 'react';
import { useAwardStore } from '../../stores/useAwardStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { getProviderDisplayName } from '../../types/provider.types';

export const ProjectLockBanner: React.FC = () => {
  const { t } = useLanguageStore();
  const { activeProjectId } = useProjectStore();
  const { award, loadAward } = useAwardStore();

  useEffect(() => {
    if (activeProjectId) {
      loadAward(activeProjectId);
    }
  }, [activeProjectId, loadAward]);

  if (!award || award.award_status === 'cancelled') return null;

  const statusColors: Record<string, { bg: string; border: string; text: string }> = {
    draft: { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.25)', text: 'var(--color-info)' },
    pending_approval: { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)', text: 'var(--color-warning)' },
    approved: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)', text: 'var(--color-success)' },
    notified: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)', text: 'var(--color-success)' },
    contracted: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)', text: 'var(--color-success)' },
  };

  const colors = statusColors[award.award_status] || statusColors.draft;

  return (
    <div style={{
      padding: '10px 20px',
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: colors.text }}>
          {t('award.lock_title')}
        </span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
          {t('award.lock_winner')}: <strong style={{ color: 'var(--text-primary)' }}>{getProviderDisplayName(award.winner_provider_name)}</strong>
        </span>
      </div>
      <span style={{
        padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700,
        background: colors.text, color: 'white', textTransform: 'uppercase',
      }}>
        {t(`award.status_${award.award_status}`)}
      </span>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};
