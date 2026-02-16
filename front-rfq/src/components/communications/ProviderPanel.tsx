import { useState, useMemo } from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useProviderStore } from '../../stores/useProviderStore';
import { getProviderDisplayName } from '../../types/provider.types';
import type { ProviderStats } from '../../types/communications.types';

interface ProviderPanelProps {
  providerStats: ProviderStats[];
  selectedProvider: string | null;
  onSelectProvider: (name: string) => void;
}

const PROVIDER_COLORS = [
  '#12b5b0', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#10b981', '#ec4899', '#6366f1', '#14b8a6', '#f97316',
];

function getProviderColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PROVIDER_COLORS[Math.abs(hash) % PROVIDER_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(/[\s_-]+/)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

function formatRelativeDate(dateStr: string | null, t: (k: string) => string): string {
  if (!dateStr) return t('comm.no_contact');
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('comm.ago.just_now');
  if (mins < 60) return `${mins}${t('comm.ago.minutes')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${t('comm.ago.hours')}`;
  const days = Math.floor(hours / 24);
  return `${days}${t('comm.ago.days')}`;
}

export const ProviderPanel = ({ providerStats, selectedProvider, onSelectProvider }: ProviderPanelProps) => {
  const { t } = useLanguageStore();
  const { projectProviders } = useProviderStore();
  const [search, setSearch] = useState('');

  // Merge project providers with stats: show all project providers even if no comms yet
  // Normalize names for dedup (project_providers uses UPPERCASE, comms may use mixed case)
  const allProviders = useMemo(() => {
    const normalize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const seen = new Set<string>();
    const result: ProviderStats[] = [];

    // Add providers that have stats first (from communications)
    for (const stat of providerStats) {
      result.push(stat);
      seen.add(normalize(stat.name));
    }

    // Add project providers without stats (skip if already seen with different casing)
    for (const p of projectProviders) {
      if (!seen.has(normalize(p))) {
        result.push({ name: p, totalComms: 0, lastContact: null });
        seen.add(normalize(p));
      }
    }

    return result;
  }, [providerStats, projectProviders]);

  const filtered = useMemo(() => {
    if (!search) return allProviders;
    const q = search.toLowerCase();
    return allProviders.filter(p =>
      p.name.toLowerCase().includes(q) ||
      getProviderDisplayName(p.name).toLowerCase().includes(q)
    );
  }, [allProviders, search]);

  return (
    <div className="comm-provider-panel">
      <div className="comm-provider-search">
        <input
          type="text"
          placeholder={t('comm.search_provider')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="comm-provider-list">
        {filtered.length === 0 ? (
          <div className="comm-provider-empty">{t('comm.no_providers')}</div>
        ) : (
          filtered.map((provider) => {
            const displayName = getProviderDisplayName(provider.name);
            const color = getProviderColor(provider.name);
            const isActive = selectedProvider !== null &&
              selectedProvider.trim().toUpperCase() === provider.name.trim().toUpperCase();

            return (
              <div
                key={provider.name}
                className={`comm-provider-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectProvider(provider.name)}
              >
                <div
                  className="comm-provider-avatar"
                  style={{ background: color }}
                >
                  {getInitials(displayName)}
                </div>
                <div className="comm-provider-info">
                  <div className="comm-provider-name">{displayName}</div>
                  <div className="comm-provider-meta">
                    {provider.lastContact
                      ? `${t('comm.last_contact')} ${formatRelativeDate(provider.lastContact, t)}`
                      : t('comm.no_contact')
                    }
                  </div>
                </div>
                {provider.totalComms > 0 && (
                  <span className="comm-provider-badge">{provider.totalComms}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
