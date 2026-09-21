// The only surface the app uses to read and write the library. Components,
// hooks and the store depend on this module; none of them import Dexie.
//
// Two rules shape what lives here:
//   - Tree logic stays pure in src/store/selectors.ts. The tree is small and is
//     held in memory; this module takes the feed ids a selector computed and
//     turns them into an indexed entry query.
//   - A write costs what it changes. Toggling one entry updates one row; a
//     change spanning several rows runs in one transaction so it cannot land
//     half-applied.
import type { Entry, LibraryData, LibraryNode, Selection } from '../../types';
import { db, type LibraryDb } from './db';
import { flag, fromRow, toRow, type EntryRow } from './rows';
import { makeId } from '../id';
import type { ParsedItem } from '../parseFeed';
import { toEntry } from '../dedupe';

/** Page size for the incremental entry list. */
export const PAGE_SIZE = 50;

/**
 * Where the next page starts. `publishedAt` descending, then `id` descending as
 * the tiebreaker, so the order is total even when entries share a timestamp.
 *
 * The tiebreaker runs descending because that is the direction a reversed index
 * walk already yields among equal keys: matching it means the sort never fights
 * the walk, which is what keeps a page's boundary exact.
 *
 * Undated entries (`publishedAt: null`) cannot share an index with dated ones
 * and must sort last, so paging runs in two phases and the cursor says which.
 */
export type Cursor =
  { phase: 'dated'; publishedAt: number; id: string } | { phase: 'undated'; id: string | null };

export interface Page {
  entries: Entry[];
  /** Pass to the next `entriesFor` call. `null` means the end of the list. */
  next: Cursor | null;
}

const EMPTY_PAGE: Page = { entries: [], next: null };

/** Newest first; among equal timestamps, by descending id. Mirrors the cursor. */
function byNewest(a: EntryRow, b: EntryRow): number {
  const at = a.publishedAt ?? 0;
  const bt = b.publishedAt ?? 0;
  if (at !== bt) return bt - at;
  return byIdDesc(a, b);
}

/** Descending id — the order a reversed index walk yields among equal keys. */
function byIdDesc(a: EntryRow, b: EntryRow): number {
  return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
}

function cursorFor(row: EntryRow): Cursor {
  return row.publishedAt == null
    ? { phase: 'undated', id: row.id }
    : { phase: 'dated', publishedAt: row.publishedAt, id: row.id };
}

/** The upper bound of a descending dated walk: the cursor's timestamp, or open. */
function datedCeiling(cursor: Cursor | null): number {
  return cursor?.phase === 'dated' ? cursor.publishedAt : Infinity;
}

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

export function nodesAll(database: LibraryDb = db): Promise<LibraryNode[]> {
  return database.nodes.toArray();
}

export function nodeById(id: string, database: LibraryDb = db): Promise<LibraryNode | undefined> {
  return database.nodes.get(id);
}

export async function addFolder(
  name = 'New Folder',
  parentId: string | null = null,
  database: LibraryDb = db,
): Promise<string> {
  const id = makeId('f');
  await database.nodes.add({ id, type: 'folder', name, parentId, collapsed: false });
  return id;
}

export async function addFeed(
  name: string,
  url: string,
  parentId: string | null,
  database: LibraryDb = db,
): Promise<string> {
  const id = makeId('s');
  await database.nodes.add({ id, type: 'feed', name, parentId, collapsed: false, url });
  return id;
}

export async function renameNode(
  id: string,
  name: string,
  database: LibraryDb = db,
): Promise<void> {
  await database.nodes.update(id, { name });
}

export async function toggleCollapsed(id: string, database: LibraryDb = db): Promise<void> {
  const n = await database.nodes.get(id);
  if (n && n.type === 'folder') await database.nodes.update(id, { collapsed: !n.collapsed });
}

export async function setParent(
  id: string,
  parentId: string | null,
  database: LibraryDb = db,
): Promise<void> {
  await database.nodes.update(id, { parentId });
}

export async function markFetched(
  feedId: string,
  when: number,
  database: LibraryDb = db,
): Promise<void> {
  await database.nodes.update(feedId, { fetchedAt: when });
}

/**
 * Delete a node. A folder's children are reparented to its own parent; a feed
 * takes its entries with it. Both happen in one transaction, so an interrupted
 * delete cannot leave orphaned children or stranded entries.
 */
export async function deleteNode(id: string, database: LibraryDb = db): Promise<void> {
  await database.transaction('rw', database.nodes, database.entries, async () => {
    const n = await database.nodes.get(id);
    if (!n) return;
    await database.nodes.delete(id);
    await database.nodes.where('parentId').equals(id).modify({ parentId: n.parentId });
    if (n.type === 'feed') await database.entries.where('feedId').equals(id).delete();
  });
}

// ---------------------------------------------------------------------------
// Entry queries
// ---------------------------------------------------------------------------

/**
 * The entries a selection matches, as a Dexie collection. Callers add ordering
 * and paging. `feedIds` is required for a node selection and comes from the pure
 * `feedsUnder` walk over the in-memory tree.
 */
function matching(sel: Selection, feedIds: string[] | undefined, database: LibraryDb) {
  switch (sel.kind) {
    case 'unread':
      return database.entries.where('read').equals(flag(false));
    case 'bookmarks':
      return database.entries.where('marked').equals(flag(true));
    case 'node':
      return database.entries.where('feedId').anyOf(feedIds ?? []);
    case 'all':
      return database.entries.toCollection();
  }
}

/**
 * How many entries the selection matches in the stored library — the full total,
 * independent of how many a list has paged in. Indexed `count()`, so it never
 * loads the rows.
 */
export function countFor(
  sel: Selection,
  feedIds?: string[],
  database: LibraryDb = db,
): Promise<number> {
  if (sel.kind === 'node' && (feedIds ?? []).length === 0) return Promise.resolve(0);
  return matching(sel, feedIds, database).count();
}

export function countAll(database: LibraryDb = db): Promise<number> {
  return database.entries.count();
}

export function countUnread(database: LibraryDb = db): Promise<number> {
  return database.entries.where('read').equals(flag(false)).count();
}

export function countMarked(database: LibraryDb = db): Promise<number> {
  return database.entries.where('marked').equals(flag(true)).count();
}

/** Unread entries among a set of feeds — the sidebar's per-node badge. */
export async function countUnreadIn(feedIds: string[], database: LibraryDb = db): Promise<number> {
  if (feedIds.length === 0) return 0;
  return database.entries
    .where('feedId')
    .anyOf(feedIds)
    .filter((r) => r.read === 0)
    .count();
}

export async function entryById(id: string, database: LibraryDb = db): Promise<Entry | undefined> {
  const row = await database.entries.get(id);
  return row ? fromRow(row) : undefined;
}

/**
 * One page of the selection, newest first, starting after `cursor`.
 *
 * Paging is by cursor rather than `offset` for two reasons: `offset` rescans
 * from the start on every page, and it shifts when a refresh inserts an entry
 * mid-scroll — which would duplicate or skip rows the user has already seen.
 */
export async function entriesFor(
  sel: Selection,
  limit: number = PAGE_SIZE,
  cursor: Cursor | null = null,
  feedIds?: string[],
  database: LibraryDb = db,
): Promise<Page> {
  if (sel.kind === 'node' && (feedIds ?? []).length === 0) return EMPTY_PAGE;

  // Take limit + 1 so the extra row tells us whether more remain without a
  // second query. Phase one is the dated entries; phase two the undated ones.
  const want = limit + 1;
  const dated =
    cursor?.phase === 'undated' ? [] : await datedPage(sel, want, cursor, feedIds, database);

  const rows =
    dated.length >= want
      ? dated
      : dated.concat(await undatedPage(sel, want - dated.length, cursor, feedIds, database));

  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    entries: page.map(fromRow),
    next: last && rows.length > limit ? cursorFor(last) : null,
  };
}

/**
 * One index range to walk: the index name plus the key prefix that scopes it.
 * `null` prefix means the bare `publishedAt` index (the All Entries view).
 */
interface Leg {
  index: string;
  prefix: string | number | null;
}

/** The index leg(s) a selection's dated entries live on. */
function legsFor(sel: Selection, feedIds: string[] | undefined): Leg[] {
  switch (sel.kind) {
    case 'unread':
      return [{ index: '[read+publishedAt]', prefix: flag(false) }];
    case 'bookmarks':
      return [{ index: '[marked+publishedAt]', prefix: flag(true) }];
    // `anyOf` collections cannot be ordered, so a folder becomes one leg per
    // descendant feed, merged below.
    case 'node':
      return (feedIds ?? []).map((feedId) => ({ index: '[feedId+publishedAt]', prefix: feedId }));
    case 'all':
      return [{ index: 'publishedAt', prefix: null }];
  }
}

/**
 * Descending walk of the selection's dated entries, stopped by `.limit()` so
 * only the rows needed are read. A folder merges one walk per descendant feed,
 * bounding the work at `feeds x want` rows rather than the whole selection.
 */
async function datedPage(
  sel: Selection,
  want: number,
  cursor: Cursor | null,
  feedIds: string[] | undefined,
  database: LibraryDb,
): Promise<EntryRow[]> {
  const legs = legsFor(sel, feedIds);
  if (legs.length === 0) return [];
  const rows = await Promise.all(legs.map((leg) => walkLeg(leg, want, cursor, database)));
  return rows.flat().sort(byNewest).slice(0, want);
}

/**
 * One leg, newest first, resuming exactly after the cursor.
 *
 * An index range cannot start "just after" a `(publishedAt, id)` pair, so the
 * walk is split: the entries still to come at the cursor's own timestamp, then
 * everything strictly older. Splitting it keeps the resume exact — no overshoot
 * constant, and no row read twice.
 */
async function walkLeg(
  leg: Leg,
  want: number,
  cursor: Cursor | null,
  database: LibraryDb,
): Promise<EntryRow[]> {
  const at = cursor?.phase === 'dated' ? await tieGroup(leg, cursor, want, database) : [];
  if (at.length >= want) return at;

  const older = await olderThan(leg, datedCeiling(cursor), want - at.length, database);
  return at.concat(older);
}

/** The rest of the tie group at the cursor's timestamp: same time, lower id. */
async function tieGroup(
  leg: Leg,
  cursor: Extract<Cursor, { phase: 'dated' }>,
  want: number,
  database: LibraryDb,
): Promise<EntryRow[]> {
  const key = leg.prefix == null ? cursor.publishedAt : [leg.prefix, cursor.publishedAt];
  const rows = await database.entries
    .where(leg.index)
    .equals(key)
    // Reversed so `limit` keeps the ids just below the cursor rather than the
    // lowest ones in the group — truncating the wrong end would skip rows.
    .reverse()
    .filter((r) => r.id < cursor.id)
    .limit(want)
    .toArray();
  return rows.sort(byIdDesc);
}

/** Entries strictly older than `ceiling`, newest first. */
function olderThan(
  leg: Leg,
  ceiling: number,
  want: number,
  database: LibraryDb,
): Promise<EntryRow[]> {
  if (want <= 0) return Promise.resolve([]);
  const open = ceiling === Infinity;
  const where = database.entries.where(leg.index);
  const collection =
    leg.prefix == null
      ? open
        ? where.belowOrEqual(Number.MAX_SAFE_INTEGER)
        : where.below(ceiling)
      : where.between(
          [leg.prefix, -Infinity],
          [leg.prefix, open ? Infinity : ceiling],
          true,
          open, // include the upper bound only when it is unbounded
        );
  return collection.reverse().limit(want).toArray();
}

/**
 * Phase two: entries with no publish time. They are absent from every
 * `publishedAt` index — IndexedDB will not index a null key — so they are walked
 * over the selection's own index and ordered by primary key.
 */
async function undatedPage(
  sel: Selection,
  want: number,
  cursor: Cursor | null,
  feedIds: string[] | undefined,
  database: LibraryDb,
): Promise<EntryRow[]> {
  const from = cursor?.phase === 'undated' ? cursor.id : null;
  // One walk per leg, mirroring the dated phase: a single `anyOf` walk would be
  // ordered by feedId first, so `limit` could truncate away a lower feed's rows.
  const legs = undatedLegs(sel, feedIds, database);
  if (legs.length === 0) return [];

  const rows = await Promise.all(
    legs.map((collection) =>
      collection
        .reverse() // primary-key descending, matching the dated tiebreaker
        .filter((r) => r.publishedAt == null && (from == null || r.id < from))
        .limit(want)
        .toArray(),
    ),
  );
  return rows.flat().sort(byIdDesc).slice(0, want);
}

/**
 * The collections holding a selection's undated entries. Undated rows are not in
 * any `publishedAt` index, so this filters during the walk. It runs only once
 * the dated phase is exhausted — at the very end of a list — so the scan it
 * implies is paid once, not per page.
 */
function undatedLegs(sel: Selection, feedIds: string[] | undefined, database: LibraryDb) {
  if (sel.kind === 'node') {
    return (feedIds ?? []).map((feedId) => database.entries.where('feedId').equals(feedId));
  }
  return [matching(sel, feedIds, database)];
}

/** Every bookmarked entry. Bookmarks are a small subset, so tag derivation and
 *  keyword search work over the whole set rather than an inverted index. */
export async function bookmarkedEntries(database: LibraryDb = db): Promise<Entry[]> {
  const rows = await database.entries.where('marked').equals(flag(true)).toArray();
  return rows.sort(byNewest).map(fromRow);
}

// ---------------------------------------------------------------------------
// Entry mutations
// ---------------------------------------------------------------------------

export async function setRead(id: string, read: boolean, database: LibraryDb = db): Promise<void> {
  await database.entries.update(id, { read: flag(read) });
}

export async function toggleRead(id: string, database: LibraryDb = db): Promise<void> {
  const row = await database.entries.get(id);
  if (row) await database.entries.update(id, { read: flag(row.read === 0) });
}

export async function toggleMarked(id: string, database: LibraryDb = db): Promise<void> {
  const row = await database.entries.get(id);
  if (row) await database.entries.update(id, { marked: flag(row.marked === 0) });
}

export async function patchEntry(
  id: string,
  patch: Partial<Entry>,
  database: LibraryDb = db,
): Promise<void> {
  const { read, marked, ...rest } = patch;
  const row: Partial<EntryRow> = { ...rest };
  if (read !== undefined) row.read = flag(read);
  if (marked !== undefined) row.marked = flag(marked);
  await database.entries.update(id, row);
}

/**
 * Mark every entry the selection matches as read — including entries the list
 * never paged in. A bulk `modify` over the indexed query, in one transaction,
 * so the count it produces is the one the user sees.
 */
export async function markAllRead(
  sel: Selection,
  feedIds?: string[],
  database: LibraryDb = db,
): Promise<number> {
  if (sel.kind === 'node' && (feedIds ?? []).length === 0) return 0;
  return database.transaction('rw', database.entries, () =>
    matching(sel, feedIds, database)
      .filter((r) => r.read === 0)
      .modify({ read: flag(true) }),
  );
}

/** Mark read only the entries whose ids are given — the bookmark view's
 *  mark-all, where the visible set is narrowed by keyword and tag filters. */
export async function markReadByIds(ids: string[], database: LibraryDb = db): Promise<number> {
  if (ids.length === 0) return 0;
  return database.transaction('rw', database.entries, () =>
    database.entries
      .where('id')
      .anyOf(ids)
      .modify({ read: flag(true) }),
  );
}

export async function addEntries(entries: Entry[], database: LibraryDb = db): Promise<void> {
  if (entries.length === 0) return;
  await database.entries.bulkPut(entries.map(toRow));
}

/**
 * Merge freshly-parsed items into a feed, skipping any whose `guid` is already
 * stored so existing read and bookmark state survives a refresh. Returns how
 * many were new.
 */
export async function mergeFeedItems(
  feedId: string,
  items: ParsedItem[],
  database: LibraryDb = db,
): Promise<number> {
  if (items.length === 0) return 0;
  return database.transaction('rw', database.entries, async () => {
    const stored = await database.entries.where('feedId').equals(feedId).toArray();
    const seen = new Set(stored.map((r) => r.guid));
    const additions: Entry[] = [];
    for (const item of items) {
      if (seen.has(item.sourceId)) continue; // already stored, keep its state
      seen.add(item.sourceId); // also guards duplicates within one document
      additions.push(toEntry(item, feedId));
    }
    if (additions.length > 0) await database.entries.bulkAdd(additions.map(toRow));
    return additions.length;
  });
}

// ---------------------------------------------------------------------------
// Whole-library reads and writes
// ---------------------------------------------------------------------------

/** The whole library, for export. */
export async function readLibrary(database: LibraryDb = db): Promise<LibraryData> {
  const [nodes, rows] = await Promise.all([database.nodes.toArray(), database.entries.toArray()]);
  return { nodes, entries: rows.map(fromRow) };
}

/**
 * Replace the library wholesale — the import path. One transaction, so a failure
 * part-way leaves the previous library exactly as it was.
 */
export async function replaceLibrary(data: LibraryData, database: LibraryDb = db): Promise<void> {
  await database.transaction('rw', database.nodes, database.entries, async () => {
    await database.nodes.clear();
    await database.entries.clear();
    await database.nodes.bulkAdd(data.nodes);
    await database.entries.bulkAdd(data.entries.map(toRow));
  });
}

export async function clearLibrary(database: LibraryDb = db): Promise<void> {
  await database.transaction('rw', database.nodes, database.entries, async () => {
    await database.nodes.clear();
    await database.entries.clear();
  });
}
