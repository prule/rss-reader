import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LibraryDb } from './db';
import { toRow } from './rows';
import { entriesFor, type Cursor } from './repository';
import { entry, feed, folder } from '../../test/fixtures';
import { feedsUnder } from '../../store/selectors';
import type { Entry, Selection } from '../../types';

let db: LibraryDb;
let dbn = 0;

beforeEach(async () => {
  db = new LibraryDb(`paging-${++dbn}`);
  await db.open();
});

afterEach(async () => {
  db.close();
  await new LibraryDb(`paging-${dbn}`).delete();
});

const put = (entries: Entry[]) => db.entries.bulkPut(entries.map(toRow));

const ALL: Selection = { kind: 'all' };

/** Page through a selection to exhaustion, collecting ids in order. */
async function pageAll(
  sel: Selection,
  limit: number,
  feedIds?: string[],
): Promise<{ ids: string[]; pages: number }> {
  const ids: string[] = [];
  let cursor: Cursor | null = null;
  let pages = 0;
  do {
    const page = await entriesFor(sel, limit, cursor, feedIds, db);
    ids.push(...page.entries.map((e) => e.id));
    cursor = page.next;
    pages++;
    if (pages > 50) throw new Error('paging did not terminate');
  } while (cursor);
  return { ids, pages };
}

describe('ordering', () => {
  it('returns entries newest first', async () => {
    await put([
      entry('old', 's1', { publishedAt: 100 }),
      entry('new', 's1', { publishedAt: 300 }),
      entry('mid', 's1', { publishedAt: 200 }),
    ]);
    const page = await entriesFor(ALL, 10, null, undefined, db);
    expect(page.entries.map((e) => e.id)).toEqual(['new', 'mid', 'old']);
    expect(page.next).toBeNull();
  });

  it('breaks ties by descending id so the order is total', async () => {
    await put([
      entry('c', 's1', { publishedAt: 200 }),
      entry('a', 's1', { publishedAt: 200 }),
      entry('b', 's1', { publishedAt: 200 }),
    ]);
    const page = await entriesFor(ALL, 10, null, undefined, db);
    expect(page.entries.map((e) => e.id)).toEqual(['c', 'b', 'a']);
  });

  it('puts entries with no publish time last', async () => {
    await put([
      entry('undated-b', 's1', { publishedAt: null }),
      entry('dated-old', 's1', { publishedAt: 100 }),
      entry('undated-a', 's1', { publishedAt: null }),
      entry('dated-new', 's1', { publishedAt: 300 }),
    ]);
    const { ids } = await pageAll(ALL, 10);
    expect(ids).toEqual(['dated-new', 'dated-old', 'undated-b', 'undated-a']);
  });
});

describe('page boundaries', () => {
  it('splits into pages of the requested size and reports the end', async () => {
    await put(
      Array.from({ length: 7 }, (_, i) => entry(`e${i}`, 's1', { publishedAt: 1000 - i * 10 })),
    );

    const first = await entriesFor(ALL, 3, null, undefined, db);
    expect(first.entries.map((e) => e.id)).toEqual(['e0', 'e1', 'e2']);
    expect(first.next).not.toBeNull();

    const second = await entriesFor(ALL, 3, first.next, undefined, db);
    expect(second.entries.map((e) => e.id)).toEqual(['e3', 'e4', 'e5']);

    const third = await entriesFor(ALL, 3, second.next, undefined, db);
    expect(third.entries.map((e) => e.id)).toEqual(['e6']);
    expect(third.next).toBeNull();
  });

  it('reports the end when the last page is exactly full', async () => {
    await put(
      Array.from({ length: 6 }, (_, i) => entry(`e${i}`, 's1', { publishedAt: 1000 - i * 10 })),
    );
    const first = await entriesFor(ALL, 3, null, undefined, db);
    const second = await entriesFor(ALL, 3, first.next, undefined, db);
    expect(second.entries).toHaveLength(3);
    expect(second.next).toBeNull();
  });

  it('never duplicates or skips an entry across pages', async () => {
    // Deliberately messy: shared timestamps, undated entries, unsorted ids.
    const entries = [
      ...Array.from({ length: 12 }, (_, i) => entry(`t${i}`, 's1', { publishedAt: 500 })),
      ...Array.from({ length: 9 }, (_, i) => entry(`d${i}`, 's1', { publishedAt: 900 - i })),
      ...Array.from({ length: 4 }, (_, i) => entry(`u${i}`, 's1', { publishedAt: null })),
    ];
    await put(entries);

    for (const limit of [1, 2, 3, 5, 7, 25]) {
      const { ids } = await pageAll(ALL, limit);
      expect(new Set(ids).size, `limit ${limit} duplicated`).toBe(entries.length);
      expect(ids.length, `limit ${limit} skipped`).toBe(entries.length);
    }
  });

  it('pages a tie group larger than the page size without stalling', async () => {
    // Every entry shares one timestamp: paging must advance on id alone.
    await put(Array.from({ length: 10 }, (_, i) => entry(`e${i}`, 's1', { publishedAt: 500 })));
    const { ids } = await pageAll(ALL, 3);
    expect(ids).toEqual(['e9', 'e8', 'e7', 'e6', 'e5', 'e4', 'e3', 'e2', 'e1', 'e0']);
  });
});

describe('stability while more load', () => {
  it('does not duplicate or skip when a refresh inserts entries mid-scroll', async () => {
    await put(
      Array.from({ length: 6 }, (_, i) => entry(`old${i}`, 's1', { publishedAt: 500 - i })),
    );

    const first = await entriesFor(ALL, 3, null, undefined, db);
    expect(first.entries.map((e) => e.id)).toEqual(['old0', 'old1', 'old2']);

    // A refresh lands newer entries above the window, and one inside it.
    await put([
      entry('fresh', 's1', { publishedAt: 900 }),
      entry('inserted', 's1', { publishedAt: 502 }),
    ]);

    const second = await entriesFor(ALL, 3, first.next, undefined, db);
    const seen = first.entries.concat(second.entries).map((e) => e.id);

    // Already-listed entries keep their positions and are not repeated.
    expect(seen.slice(0, 3)).toEqual(['old0', 'old1', 'old2']);
    expect(new Set(seen).size).toBe(seen.length);
    // The newly-inserted entries sort above the cursor, so they are not
    // retroactively injected into a page the user already scrolled past.
    expect(second.entries.map((e) => e.id)).toEqual(['old3', 'old4', 'old5']);
  });
});

describe('selections', () => {
  it('pages the unread view over its own index', async () => {
    await put([
      entry('r1', 's1', { publishedAt: 300, read: true }),
      entry('u1', 's1', { publishedAt: 250, read: false }),
      entry('r2', 's1', { publishedAt: 200, read: true }),
      entry('u2', 's1', { publishedAt: 150, read: false }),
    ]);
    const { ids } = await pageAll({ kind: 'unread' }, 1);
    expect(ids).toEqual(['u1', 'u2']);
  });

  it('pages the bookmarks view over its own index', async () => {
    await put([
      entry('m1', 's1', { publishedAt: 300, marked: true }),
      entry('p1', 's1', { publishedAt: 250, marked: false }),
      entry('m2', 's1', { publishedAt: 200, marked: true }),
    ]);
    const { ids } = await pageAll({ kind: 'bookmarks' }, 1);
    expect(ids).toEqual(['m1', 'm2']);
  });

  it('merges every feed under a folder, recursively, in order', async () => {
    const nodes = [
      folder('f_top', 'Top'),
      feed('s_a', 'A', 'f_top'),
      folder('f_sub', 'Sub', 'f_top'),
      feed('s_b', 'B', 'f_sub'),
      feed('s_out', 'Outside', null),
    ];
    await db.nodes.bulkPut(nodes);
    await put([
      entry('a1', 's_a', { publishedAt: 400 }),
      entry('b1', 's_b', { publishedAt: 350 }),
      entry('a2', 's_a', { publishedAt: 300 }),
      entry('b2', 's_b', { publishedAt: 250 }),
      entry('x1', 's_out', { publishedAt: 500 }),
    ]);

    const sel: Selection = { kind: 'node', id: 'f_top' };
    const feedIds = feedsUnder(nodes, 'f_top');
    expect(feedIds.sort()).toEqual(['s_a', 's_b']);

    const { ids } = await pageAll(sel, 2, feedIds);
    expect(ids).toEqual(['a1', 'b1', 'a2', 'b2']);
  });

  it('returns nothing for a folder with no feeds under it', async () => {
    const page = await entriesFor({ kind: 'node', id: 'f_empty' }, 10, null, [], db);
    expect(page.entries).toEqual([]);
    expect(page.next).toBeNull();
  });
});

describe('work is bounded', () => {
  it('reads at most feeds x (limit + 1) rows for one folder page', async () => {
    const feedIds = ['s1', 's2', 's3'];
    await db.nodes.bulkPut(feedIds.map((id) => feed(id, id)));
    // 60 entries per feed — far more than one page.
    await put(
      feedIds.flatMap((fid) =>
        Array.from({ length: 60 }, (_, i) => entry(`${fid}-${i}`, fid, { publishedAt: 9000 - i })),
      ),
    );

    let read = 0;
    const hooked = (row: unknown) => {
      read++;
      return row;
    };
    db.entries.hook('reading', hooked);
    try {
      const page = await entriesFor({ kind: 'node', id: 'f' }, 10, null, feedIds, db);
      expect(page.entries).toHaveLength(10);
      // Per-feed legs take limit + 1; the whole 180-row selection is never read.
      expect(read).toBeLessThanOrEqual(feedIds.length * 11);
      expect(read).toBeLessThan(180);
    } finally {
      db.entries.hook('reading').unsubscribe(hooked);
    }
  });

  it('reads little more than one page for a flat All Entries page', async () => {
    await put(
      Array.from({ length: 200 }, (_, i) => entry(`e${i}`, 's1', { publishedAt: 9000 - i })),
    );
    let read = 0;
    const hooked = (row: unknown) => {
      read++;
      return row;
    };
    db.entries.hook('reading', hooked);
    try {
      const page = await entriesFor(ALL, 10, null, undefined, db);
      expect(page.entries).toHaveLength(10);
      expect(read).toBeLessThanOrEqual(11);
    } finally {
      db.entries.hook('reading').unsubscribe(hooked);
    }
  });
});
