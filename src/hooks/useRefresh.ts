import { useEffect } from 'react';
import { refreshAll } from '../lib/feeds';

// RSS Reader re-checks feeds every fifteen minutes; each check refreshes only
// feeds stale beyond 24h (automatic mode). The toolbar Refresh button forces
// all feeds. An initial check runs shortly after load so an opened app catches
// up without waiting a full interval.
const POLL_INTERVAL = 15 * 60 * 1000;

export function useRefresh(): void {
  useEffect(() => {
    const initial = setTimeout(() => void refreshAll({ force: false }), 1500);
    const id = setInterval(() => void refreshAll({ force: false }), POLL_INTERVAL);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);
}
