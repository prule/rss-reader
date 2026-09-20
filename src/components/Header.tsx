import { useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { useStore } from '../store/store';
import { ancestors, node, feedCount } from '../store/selectors';
import { refreshAll } from '../lib/feeds';
import { buildCSV, buildJSON, download, stamp } from '../lib/exporters';
import { fromCSV, fromJSON } from '../lib/importers';
import { ICON_STROKE, IconDownload, IconNewFolder, IconPlus, IconUpload } from './icons';

function useCrumb(): string {
  const s = useStore();
  if (s.sel.kind === 'all') return 'All Entries';
  if (s.sel.kind === 'unread') return 'Unread';
  if (s.sel.kind === 'bookmarks') return 'Bookmarks';
  const n = node(s.nodes, s.sel.id);
  if (!n) return 'All Entries';
  return ancestors(s.nodes, n.id)
    .map((a) => a.name)
    .concat([n.name])
    .join('  ›  ');
}

export function Header() {
  const s = useStore();
  const crumb = useCrumb();
  const fileRef = useRef<HTMLInputElement>(null);
  const hasFeeds = feedCount(s.nodes) > 0;

  const exportJSON = () => {
    download(
      `rss-reader-${stamp()}.json`,
      'application/json',
      buildJSON({ nodes: s.nodes, entries: s.entries }),
    );
    s.say('Exported JSON');
  };
  const exportCSV = () => {
    download(`rss-reader-${stamp()}.csv`, 'text/csv', buildCSV(s.nodes, s.entries));
    s.say('Exported CSV');
  };
  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      try {
        const data = /\.csv$/i.test(file.name) ? fromCSV(text) : fromJSON(text);
        s.replaceLibrary(data);
        s.say(`Imported ${data.entries.length} entries`);
      } catch {
        s.say('Could not read that file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
        <span className="brand">RSS Reader</span>
        <span className="brand-badge">Local</span>
        <span className="crumb">{crumb}</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          className="btn btn-secondary"
          onClick={() => void refreshAll({ force: true })}
          disabled={s.refreshing || !hasFeeds}
          title="Refresh all feeds now"
          style={{ height: 26, fontSize: 12 }}
        >
          <RefreshCw size={14} strokeWidth={ICON_STROKE} absoluteStrokeWidth />
          Refresh
        </button>
        <button
          className="btn btn-secondary"
          onClick={exportJSON}
          title="Download feeds, folders and bookmarks as JSON"
          style={{ height: 26, fontSize: 12 }}
        >
          <IconDownload />
          JSON
        </button>
        <button
          className="btn btn-secondary"
          onClick={exportCSV}
          title="Download entries and bookmark tags as CSV"
          style={{ height: 26, fontSize: 12 }}
        >
          <IconDownload />
          CSV
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => fileRef.current?.click()}
          title="Restore from a JSON or CSV export"
          style={{ height: 26, fontSize: 12 }}
        >
          <IconUpload />
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv,application/json,text/csv"
          className="hidden-file"
          onChange={onImportFile}
        />
        <span className="divider-v" />
        <button
          className="btn btn-secondary"
          onClick={s.newFolder}
          style={{ height: 26, fontSize: 12 }}
        >
          <IconNewFolder />
          New Folder
        </button>
        <button
          className="btn btn-primary"
          onClick={s.openAddFeed}
          style={{ height: 26, fontSize: 12 }}
        >
          <IconPlus />
          Add Feed
        </button>
      </div>
    </header>
  );
}
