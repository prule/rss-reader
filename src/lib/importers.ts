// Restore a library from a JSON or CSV export. Both throw on unusable input so
// the caller can leave the current library intact.
import type { Entry, LibraryData, LibraryNode } from '../types';
import { makeId } from './id';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/**
 * Validate an exported payload. The export envelope still carries `version: 1`
 * (see `JsonExport`), and files written by older builds carry the same
 * `{nodes, entries}` shape, so a file exported before the move to IndexedDB still
 * imports. Fields the current build does not know are preserved, not dropped.
 */
export function parseLibraryPayload(raw: unknown): LibraryData | null {
  if (!isRecord(raw) || !Array.isArray(raw.nodes) || !Array.isArray(raw.entries)) return null;
  return { nodes: raw.nodes as LibraryNode[], entries: raw.entries as Entry[] };
}

export function fromJSON(text: string): LibraryData {
  const data = parseLibraryPayload(JSON.parse(text));
  if (!data) throw new Error('Not an RSS Reader library export');
  return data;
}

/** Minimal RFC-4180-ish CSV parser (handles quotes, escaped quotes, newlines). */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (c !== '\r') {
      cell += c;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r[0] ?? '').trim() !== '');
}

export function fromCSV(text: string): LibraryData {
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error('CSV has no rows');

  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => head.indexOf(name);

  const nodes: LibraryNode[] = [];

  // Resolve (creating as needed) the folder chain for a "A / B / C" path.
  const folderIdFor = (path: string): string | null => {
    if (!path) return null;
    let parent: string | null = null;
    for (const name of path
      .split('/')
      .map((p) => p.trim())
      .filter(Boolean)) {
      let folder = nodes.find(
        (n) => n.type === 'folder' && n.name === name && n.parentId === parent,
      );
      if (!folder) {
        folder = { id: makeId('if'), type: 'folder', name, parentId: parent, collapsed: false };
        nodes.push(folder);
      }
      parent = folder.id;
    }
    return parent;
  };

  const entries: Entry[] = [];
  rows.slice(1).forEach((r) => {
    const get = (name: string) => {
      const i = col(name);
      return i >= 0 ? (r[i] ?? '') : '';
    };
    const feedName = get('feed') || 'Imported';
    const feedUrl = get('feed_url');
    const parent = folderIdFor(get('folder_path'));
    let feed = nodes.find((n) => n.type === 'feed' && n.name === feedName && n.parentId === parent);
    if (!feed) {
      feed = {
        id: makeId('is'),
        type: 'feed',
        name: feedName,
        parentId: parent,
        collapsed: false,
        url: feedUrl,
      };
      nodes.push(feed);
    }
    const published = get('published');
    const publishedAt = published ? Date.parse(published) : NaN;
    const snippet = get('snippet');
    entries.push({
      id: get('entry_id') || makeId('ie'),
      feedId: feed.id,
      title: get('title') || 'Untitled',
      author: get('author'),
      link: get('link') || null,
      guid: get('guid') || get('link') || get('entry_id') || makeId('g'),
      publishedAt: Number.isNaN(publishedAt) ? null : publishedAt,
      snippet,
      body: snippet ? `<p>${snippet}</p>` : '',
      read: get('read') === 'yes',
      marked: get('bookmarked') === 'yes',
    });
  });

  return { nodes, entries };
}
