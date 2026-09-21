// The one module permitted to touch the retired localStorage key.
//
// A library saved by the pre-database build is NOT migrated — that is a recorded,
// deliberate break (see openspec/changes/replace-localstorage-with-dexie). What it
// gets instead is a single chance to leave as a file: the stored payload is
// already the shape `buildJSON` produces, so a rescued file drops straight back in
// through the ordinary JSON import.
//
// The key is removed once the user has accepted or declined, and nothing ever
// writes to it again — so removal is itself the "already offered" record and no
// separate marker is needed. The ESLint localStorage ban is lifted for this file
// only; see eslint.config.js.
import { download, stamp, type JsonExport } from './exporters';

export const LEGACY_KEY = 'rss-reader-pwa.library.v1';

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // access can throw in some privacy modes
  }
}

/**
 * The legacy payload, or null when there is none worth offering. Anything that
 * does not parse as a library is dropped rather than offered — a corrupt string
 * is not a backup.
 */
export function readLegacyPayload(): string | null {
  const s = store();
  if (!s) return null;
  let raw: string | null;
  try {
    raw = s.getItem(LEGACY_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  return looksLikeLibrary(raw) ? raw : null;
}

function looksLikeLibrary(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      Array.isArray((parsed as { nodes?: unknown }).nodes) &&
      Array.isArray((parsed as { entries?: unknown }).entries)
    );
  } catch {
    return false;
  }
}

/** Drop the legacy payload. Called once the user has accepted or declined. */
export function discardLegacyPayload(): void {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(LEGACY_KEY);
  } catch {
    // Nothing to do: the payload is never loaded either way.
  }
}

/**
 * Hand the legacy payload to the user as a JSON file, in the same shape and
 * through the same helper as a normal JSON export, then drop it.
 */
export function downloadLegacyPayload(raw: string, now: Date = new Date()): void {
  download(`rss-reader-rescued-${stamp(now)}.json`, 'application/json', toExportShape(raw, now));
  discardLegacyPayload();
}

/**
 * Wrap the stored `{version, nodes, entries}` payload in the export envelope, so
 * the file is indistinguishable from one `buildJSON` produced.
 */
function toExportShape(raw: string, now: Date): string {
  const parsed = JSON.parse(raw) as { nodes: unknown; entries: unknown };
  const payload: JsonExport = {
    app: 'rss-reader-pwa',
    version: 1,
    exported: now.toISOString(),
    nodes: parsed.nodes as JsonExport['nodes'],
    entries: parsed.entries as JsonExport['entries'],
  };
  return JSON.stringify(payload, null, 2);
}
