// Export the library to JSON (full fidelity) and CSV (one row per entry with
// resolved feed, folder path, and tags). Serialization is pure and testable;
// the browser download is a thin separate side effect.
import type { Entry, LibraryData, LibraryNode } from '../types';
import { ancestors, node, tagsFor } from '../store/selectors';

export interface JsonExport extends LibraryData {
  app: 'rss-reader-pwa';
  version: 1;
  exported: string;
}

export function buildJSON(data: LibraryData, now: Date = new Date()): string {
  const payload: JsonExport = {
    app: 'rss-reader-pwa',
    version: 1,
    exported: now.toISOString(),
    nodes: data.nodes,
    entries: data.entries,
  };
  return JSON.stringify(payload, null, 2);
}

export const CSV_HEADER = [
  'entry_id',
  'feed',
  'feed_url',
  'folder_path',
  'tags',
  'title',
  'author',
  'published',
  'link',
  'guid',
  'snippet',
  'read',
  'bookmarked',
] as const;

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function folderPath(nodes: LibraryNode[], feedId: string): string {
  return ancestors(nodes, feedId)
    .map((a) => a.name)
    .join(' / ');
}

export function buildCSV(nodes: LibraryNode[], entries: Entry[]): string {
  const rows = entries.map((e) => {
    const feed = node(nodes, e.feedId);
    const tags = tagsFor(nodes, e.feedId);
    return [
      e.id,
      feed ? feed.name : '',
      feed ? (feed.url ?? '') : '',
      folderPath(nodes, e.feedId),
      tags.join('; '),
      e.title,
      e.author,
      e.publishedAt == null ? '' : new Date(e.publishedAt).toISOString(),
      e.link ?? '',
      e.guid,
      e.snippet,
      e.read ? 'yes' : 'no',
      e.marked ? 'yes' : 'no',
    ]
      .map(csvCell)
      .join(',');
  });
  return [CSV_HEADER.join(',')].concat(rows).join('\n');
}

export function stamp(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Trigger a browser file download. No-op-safe outside a DOM. */
export function download(name: string, mime: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
