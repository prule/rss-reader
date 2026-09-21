import { useStore } from '../store/store';
import { feedCount } from '../store/selectors';
import { useCounts, useNodes } from '../hooks/useLibrary';

export function StatusBar() {
  const s = useStore();
  const counts = useCounts();
  const unread = counts?.unread ?? 0;
  const feeds = feedCount(useNodes() ?? []);
  const status = s.refreshing
    ? 'Refreshing…'
    : `${unread} unread · ${feeds} feeds · saved to this device`;

  return (
    <footer className="status">
      <span>{status}</span>
      {s.toast && <span className="toast">{s.toast}</span>}
      <div style={{ flex: 1 }} />
      <span>J / K move · B bookmark · U unread · N new feed · / search</span>
    </footer>
  );
}
