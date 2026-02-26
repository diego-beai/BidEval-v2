import { useState, useEffect } from 'react';
import { getLatestVersion } from '../components/changelog/Changelog';

export function useChangelogBadge() {
  const [hasNewChanges, setHasNewChanges] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem('bideval_last_seen_version') || '';
    const latest = getLatestVersion();
    setHasNewChanges(latest !== '' && latest !== lastSeen);
  }, []);

  const dismiss = () => {
    localStorage.setItem('bideval_last_seen_version', getLatestVersion());
    setHasNewChanges(false);
  };

  return { hasNewChanges, dismiss };
}
