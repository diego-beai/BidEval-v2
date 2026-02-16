import { useState, useRef, useEffect } from 'react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useCommunicationsStore } from '../../stores/useCommunicationsStore';
import { getProviderDisplayName } from '../../types/provider.types';
import { TimelineEntry } from './TimelineEntry';
import { NewCommForm } from './NewCommForm';
import { EmailComposer } from './EmailComposer';
import type { CommunicationType, TimelineFilterType, TimelineItem } from '../../types/communications.types';

interface TimelineProps {
  providerName: string;
  timeline: TimelineItem[];
  onNavigateQA: () => void;
}

const filterKeys: TimelineFilterType[] = ['all', 'email', 'call', 'meeting', 'note', 'qa'];

export const Timeline = ({ providerName, timeline, onNavigateQA }: TimelineProps) => {
  const { t } = useLanguageStore();
  const { filterType, setFilterType, showNewForm, setShowNewForm, showEmailComposer, setShowEmailComposer } = useCommunicationsStore();
  const [showNewMenu, setShowNewMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNewComm = (type: CommunicationType) => {
    setShowNewMenu(false);
    if (type === 'email') {
      setShowEmailComposer(true);
    } else {
      setShowNewForm(type);
    }
  };

  return (
    <div className="comm-timeline-panel">
      {/* Header */}
      <div className="comm-timeline-header">
        <div className="comm-timeline-header-top">
          <div className="comm-timeline-provider-name">
            {getProviderDisplayName(providerName)}
          </div>
          <div className="comm-new-dropdown" ref={menuRef}>
            <button className="comm-new-btn" onClick={() => setShowNewMenu(!showNewMenu)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t('comm.new')}
            </button>
            {showNewMenu && (
              <div className="comm-new-menu">
                <button className="comm-new-menu-item" onClick={() => handleNewComm('email')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#12b5b0" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  {t('comm.new.email')}
                </button>
                <button className="comm-new-menu-item" onClick={() => handleNewComm('call')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {t('comm.new.call')}
                </button>
                <button className="comm-new-menu-item" onClick={() => handleNewComm('meeting')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {t('comm.new.meeting')}
                </button>
                <button className="comm-new-menu-item" onClick={() => handleNewComm('note')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2">
                    <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
                    <path d="M14 3v4a2 2 0 0 0 2 2h4" />
                  </svg>
                  {t('comm.new.note')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="comm-timeline-filters">
          {filterKeys.map(key => (
            <button
              key={key}
              className={`comm-filter-btn ${filterType === key ? 'active' : ''}`}
              onClick={() => setFilterType(key)}
            >
              {t(`comm.filter.${key}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Inline forms */}
      {showNewForm && (
        <NewCommForm
          type={showNewForm}
          providerName={providerName}
          onClose={() => setShowNewForm(null)}
        />
      )}

      {showEmailComposer && (
        <EmailComposer
          providerName={providerName}
          onClose={() => setShowEmailComposer(false)}
        />
      )}

      {/* Timeline body */}
      <div className="comm-timeline-body">
        {timeline.length === 0 ? (
          <div className="comm-timeline-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h3>{t('comm.empty_timeline')}</h3>
            <p>{t('comm.empty_timeline_desc')}</p>
          </div>
        ) : (
          timeline.map(item => (
            <TimelineEntry
              key={item.id}
              item={item}
              onNavigateQA={onNavigateQA}
            />
          ))
        )}
      </div>
    </div>
  );
};
