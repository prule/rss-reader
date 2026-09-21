import { useRef } from 'react';
import type { LibraryNode } from '../types';
import { RefreshCw } from 'lucide-react';
import { useStore } from '../store/store';
import { ancestors, node, feedCount } from '../store/selectors';
import { useNodes } from '../hooks/useLibrary';
import * as actions from '../store/actions';
import { readLibrary } from '../lib/db/repository';
import { refreshAll } from '../lib/feeds';
import { buildCSV, buildJSON, download, stamp } from '../lib/exporters';
import { fromCSV, fromJSON } from '../lib/importers';
import { ICON_STROKE, IconDownload, IconNewFolder, IconPlus, IconUpload } from './icons';

function crumbFor(sel: ReturnType<typeof useStore.getState>['sel'], nodes: LibraryNode[]): string {
  if (sel.kind === 'all') return 'All Entries';
  if (sel.kind === 'unread') return 'Unread';
  if (sel.kind === 'bookmarks') return 'Bookmarks';
  const n = node(nodes, sel.id);
  if (!n) return 'All Entries';
  return ancestors(nodes, n.id)
    .map((a) => a.name)
    .concat([n.name])
    .join('  ›  ');
}

export function Header() {
  const s = useStore();
  const nodes = useNodes() ?? [];
  const crumb = crumbFor(s.sel, nodes);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasFeeds = feedCount(nodes) > 0;

  // Exports read the whole library straight from the database rather than from a
  // copy held in the store, so the file is always what is actually stored.
  const exportJSON = async () => {
    const data = await readLibrary();
    download(`rss-reader-${stamp()}.json`, 'application/json', buildJSON(data));
    s.say('Exported JSON');
  };
  const exportCSV = async () => {
    const data = await readLibrary();
    download(`rss-reader-${stamp()}.csv`, 'text/csv', buildCSV(data.nodes, data.entries));
    s.say('Exported CSV');
  };
  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        const text = String(reader.result ?? '');
        let data;
        try {
          data = /\.csv$/i.test(file.name) ? fromCSV(text) : fromJSON(text);
        } catch {
          s.say('Could not read that file');
          return;
        }
        // The write is atomic: a failure leaves the previous library untouched,
        // and replaceLibrary reports it rather than claiming success.
        if (await actions.replaceLibrary(data)) {
          s.say(`Imported ${data.entries.length} entries`);
        }
      })();
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
          onClick={() => void exportJSON()}
          title="Download feeds, folders and bookmarks as JSON"
          style={{ height: 26, fontSize: 12 }}
        >
          <IconDownload />
          JSON
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => void exportCSV()}
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
          onClick={() => void actions.newFolder()}
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
