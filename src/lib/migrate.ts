// Migration chain for the persisted library payload.
//
// v0 = the design mock's shape: `{ nodes, entries }` with no `version`, and
//      entries carrying a relative `ago` string, a `body` string[], and no
//      `link`/`guid`/`publishedAt`.
// v1 = current: `{ version: 1, nodes, entries }` with absolute `publishedAt`,
//      a stable `guid`, a `link`, and an HTML `body` string.
import type { Entry, LibraryData, LibraryNode, LibraryPayloadV1 } from '../types';

export const CURRENT_VERSION = 1 as const;

interface LegacyEntry {
  id: string;
  feedId: string;
  title?: string;
  author?: string;
  ago?: string;
  snippet?: string;
  body?: unknown;
  read?: boolean;
  marked?: boolean;
  link?: string | null;
  guid?: string;
  publishedAt?: number | null;
}

/** Best-effort absolute time from a legacy relative string like "32m"/"3h"/"1d". */
export function parseRelativeAge(ago: string | undefined, now: number): number | null {
  if (!ago) return null;
  const s = ago.trim().toLowerCase();
  if (s === 'now') return now;
  const m = /^(\d+)\s*(m|h|d|w)$/.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 }[m[2]]!;
  return now - n * unit;
}

function bodyToHtml(body: unknown, snippet: string): string {
  if (typeof body === 'string') return body;
  if (Array.isArray(body)) {
    return body
      .filter((p) => typeof p === 'string' && p.trim() !== '')
      .map((p) => `<p>${p}</p>`)
      .join('');
  }
  return snippet ? `<p>${snippet}</p>` : '';
}

function migrateEntryFromV0(raw: LegacyEntry, now: number): Entry {
  const snippet = raw.snippet ?? '';
  return {
    id: raw.id,
    feedId: raw.feedId,
    title: raw.title ?? 'Untitled',
    author: raw.author ?? '',
    link: raw.link ?? null,
    guid: raw.guid ?? raw.link ?? raw.id,
    publishedAt: raw.publishedAt ?? parseRelativeAge(raw.ago, now),
    snippet,
    body: bodyToHtml(raw.body, snippet),
    read: !!raw.read,
    marked: !!raw.marked,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function looksLikeLibrary(v: unknown): v is { nodes: unknown; entries: unknown } {
  return isRecord(v) && Array.isArray(v.nodes) && Array.isArray(v.entries);
}

/**
 * Upgrade any stored payload to the current shape. Returns null when the input
 * is not a recognizable library (caller should treat as "no data").
 */
export function migrate(raw: unknown, now: number = Date.now()): LibraryData | null {
  if (!looksLikeLibrary(raw)) return null;

  const rec = raw as Record<string, unknown>;
  const version = typeof rec.version === 'number' ? rec.version : 0;
  const nodes = raw.nodes as LibraryNode[];

  if (version >= CURRENT_VERSION) {
    // Current or newer: keep data as-is (newer fields are preserved, not dropped).
    return { nodes, entries: raw.entries as Entry[] };
  }

  // v0 -> v1
  const entries = (raw.entries as LegacyEntry[]).map((e) => migrateEntryFromV0(e, now));
  return { nodes, entries };
}

export function toPayload(data: LibraryData): LibraryPayloadV1 {
  return { version: CURRENT_VERSION, nodes: data.nodes, entries: data.entries };
}
