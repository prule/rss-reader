import { useEffect } from 'react';
import { refreshAll } from '../lib/feeds';

// Ferrite polls every fifteen minutes; a manual refresh is available from the
// toolbar. An initial refresh runs shortly after load so an opened app catches
// up without waiting a full interval.
const POLL_INTERVAL = 15 * 60 * 1000;

export function useRefresh(): void {
  useEffect(() => {
    const initial = setTimeout(() => void refreshAll(), 1500);
    const id = setInterval(() => void refreshAll(), POLL_INTERVAL);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);
}
