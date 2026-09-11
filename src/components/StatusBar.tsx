import { useStore } from '../store/store';
import { feedCount } from '../store/selectors';

export function StatusBar() {
  const s = useStore();
  const unread = s.entries.filter((e) => !e.read).length;
  const feeds = feedCount(s.nodes);
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
