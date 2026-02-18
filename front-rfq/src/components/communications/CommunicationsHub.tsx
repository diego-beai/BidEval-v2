import { useEffect } from 'react';
import { useCommunicationsStore } from '../../stores/useCommunicationsStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { ProviderPanel } from './ProviderPanel';
import { Timeline } from './Timeline';
import './CommunicationsHub.css';

interface CommunicationsHubProps {
  onNavigate?: (view: string) => void;
}

export const CommunicationsHub = ({ onNavigate }: CommunicationsHubProps) => {
  const { t } = useLanguageStore();
  const { activeProjectId } = useProjectStore();

  const {
    selectedProvider,
    setSelectedProvider,
    loadCommunications,
    loadQAForProvider,
    getTimeline,
    getProviderStats,
    subscribeRealtime,
  } = useCommunicationsStore();

  // Load communications when project changes
  useEffect(() => {
    if (activeProjectId) {
      loadCommunications(activeProjectId);
    }
  }, [activeProjectId, loadCommunications]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (activeProjectId) {
      const unsubscribe = subscribeRealtime(activeProjectId);
      return unsubscribe;
    }
  }, [activeProjectId, subscribeRealtime]);

  // Load Q&A items when provider changes
  useEffect(() => {
    if (activeProjectId && selectedProvider) {
      loadQAForProvider(activeProjectId, selectedProvider);
    }
  }, [selectedProvider, activeProjectId, loadQAForProvider]);

  const timeline = getTimeline();
  const providerStats = getProviderStats();

  const handleSelectProvider = (name: string) => {
    setSelectedProvider(name);
  };

  const handleNavigateQA = () => {
    if (onNavigate) onNavigate('qa');
  };

  return (
    <div className="comm-hub fade-in">
      <ProviderPanel
        providerStats={providerStats}
        selectedProvider={selectedProvider}
        onSelectProvider={handleSelectProvider}
      />

      {selectedProvider ? (
        <Timeline
          providerName={selectedProvider}
          timeline={timeline}
          onNavigateQA={handleNavigateQA}
        />
      ) : (
        <div className="comm-timeline-panel">
          <div className="comm-select-placeholder">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p>{t('comm.select_provider')}</p>
          </div>
        </div>
      )}
    </div>
  );
};
