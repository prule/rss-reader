import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryDb } from './db';
import { toRow } from './rows';
import * as repo from './repository';
import { entry, feed, folder, sampleTree } from '../../test/fixtures';
import { feedsUnder } from '../../store/selectors';
import type { Entry, Selection } from '../../types';

let db: LibraryDb;
let dbn = 0;

beforeEach(async () => {
  db = new LibraryDb(`repo-${++dbn}`);
  await db.open();
});

afterEach(async () => {
  db.close();
  await new LibraryDb(`repo-${dbn}`).delete();
  vi.restoreAllMocks();
});

const put = (entries: Entry[]) => db.entries.bulkPut(entries.map(toRow));

describe('nodes', () => {
  it('adds folders and feeds', async () => {
    const fid = await repo.addFolder('Tech', null, db);
    const sid = await repo.addFeed('Ars', 'https://ars/feed', fid, db);

    const nodes = await repo.nodesAll(db);
    expect(nodes).toHaveLength(2);
    expect(nodes.find((n) => n.id === sid)).toMatchObject({
      type: 'feed',
      name: 'Ars',
      parentId: fid,
      url: 'https://ars/feed',
    });
  });

  it('renames, reparents, and toggles collapse', async () => {
    const a = await repo.addFolder('A', null, db);
    const b = await repo.addFolder('B', null, db);

    await repo.renameNode(a, 'Renamed', db);
    await repo.setParent(b, a, db);
    await repo.toggleCollapsed(a, db);

    expect((await repo.nodeById(a, db))!.name).toBe('Renamed');
    expect((await repo.nodeById(a, db))!.collapsed).toBe(true);
    expect((await repo.nodeById(b, db))!.parentId).toBe(a);
  });

  it('does not collapse a feed', async () => {
    const sid = await repo.addFeed('F', 'https://f', null, db);
    await repo.toggleCollapsed(sid, db);
    expect((await repo.nodeById(sid, db))!.collapsed).toBe(false);
  });

  it('stamps the last fetch time', async () => {
    const sid = await repo.addFeed('F', 'https://f', null, db);
    await repo.markFetched(sid, 1234, db);
    expect((await repo.nodeById(sid, db))!.fetchedAt).toBe(1234);
  });

  it('reparents a deleted folder’s children to its own parent', async () => {
    // Top > Mid > (Leaf feed, Sub folder). Deleting Mid lifts both to Top.
    await db.nodes.bulkPut([
      folder('top', 'Top'),
      folder('mid', 'Mid', 'top'),
      feed('leaf', 'Leaf', 'mid'),
      folder('sub', 'Sub', 'mid'),
    ]);

    await repo.deleteNode('mid', db);

    expect(await repo.nodeById('mid', db)).toBeUndefined();
    expect((await repo.nodeById('leaf', db))!.parentId).toBe('top');
    expect((await repo.nodeById('sub', db))!.parentId).toBe('top');
  });

  it('reparents children of a deleted top-level folder to the root', async () => {
    await db.nodes.bulkPut([folder('top', 'Top'), feed('leaf', 'Leaf', 'top')]);
    await repo.deleteNode('top', db);
    expect((await repo.nodeById('leaf', db))!.parentId).toBeNull();
  });

  it('deletes a feed’s entries with it and leaves other feeds alone', async () => {
    await db.nodes.bulkPut([feed('s1', 'One'), feed('s2', 'Two')]);
    await put([entry('a', 's1'), entry('b', 's1'), entry('c', 's2')]);

    await repo.deleteNode('s1', db);

    expect(await db.entries.toCollection().primaryKeys()).toEqual(['c']);
    expect(await repo.nodeById('s2', db)).toBeDefined();
  });

  it('is a no-op for an unknown node', async () => {
    await expect(repo.deleteNode('nope', db)).resolves.toBeUndefined();
  });
});

describe('counts', () => {
  beforeEach(async () => {
    await db.nodes.bulkPut(sampleTree());
    // 120 entries — more than two pages — spread across two feeds.
    await put([
      ...Array.from({ length: 60 }, (_, i) =>
        entry(`p${i}`, 's_pl', { publishedAt: 9000 - i, read: i % 2 === 0, marked: i < 5 }),
      ),
      ...Array.from({ length: 60 }, (_, i) =>
        entry(`a${i}`, 's_ars', { publishedAt: 8000 - i, read: false, marked: i < 3 }),
      ),
    ]);
  });

  it('counts the full match total, not what a page loaded', async () => {
    const all: Selection = { kind: 'all' };
    const page = await repo.entriesFor(all, 10, null, undefined, db);

    expect(page.entries).toHaveLength(10);
    expect(await repo.countFor(all, undefined, db)).toBe(120);
  });

  it('counts unread and bookmarks over their indexes', async () => {
    expect(await repo.countUnread(db)).toBe(90); // 30 read among p*, none among a*
    expect(await repo.countMarked(db)).toBe(8);
    expect(await repo.countFor({ kind: 'unread' }, undefined, db)).toBe(90);
    expect(await repo.countFor({ kind: 'bookmarks' }, undefined, db)).toBe(8);
  });

  it('counts a folder selection across every nested feed', async () => {
    const nodes = await repo.nodesAll(db);
    const feedIds = feedsUnder(nodes, 'f_tech'); // s_ars + s_pl
    expect(await repo.countFor({ kind: 'node', id: 'f_tech' }, feedIds, db)).toBe(120);

    const justPl = feedsUnder(nodes, 's_pl');
    expect(await repo.countFor({ kind: 'node', id: 's_pl' }, justPl, db)).toBe(60);
  });

  it('counts nothing for a folder with no feeds', async () => {
    expect(await repo.countFor({ kind: 'node', id: 'f_empty' }, [], db)).toBe(0);
  });

  it('counts unread within a feed set for the sidebar badge', async () => {
    expect(await repo.countUnreadIn(['s_pl'], db)).toBe(30);
    expect(await repo.countUnreadIn(['s_ars'], db)).toBe(60);
    expect(await repo.countUnreadIn([], db)).toBe(0);
  });
});

describe('single-entry writes', () => {
  it('writes only the target row when toggling read', async () => {
    await put([entry('a', 's1'), entry('b', 's1'), entry('c', 's1')]);
    const before = await db.entries.toArray();

    const written: unknown[] = [];
    const hook = (key: unknown) => void written.push(key);
    db.entries.hook('updating', hook);
    try {
      await repo.toggleRead('b', db);
    } finally {
      db.entries.hook('updating').unsubscribe(hook);
    }

    expect(written).toHaveLength(1);

    const after = await db.entries.toArray();
    const byId = (rows: typeof after) => Object.fromEntries(rows.map((r) => [r.id, r]));
    // Untouched rows are byte-identical; only b changed.
    expect(byId(after).a).toEqual(byId(before).a);
    expect(byId(after).c).toEqual(byId(before).c);
    expect(byId(after).b.read).toBe(1);
  });

  it('toggles a bookmark on one row', async () => {
    await put([entry('a', 's1', { marked: false }), entry('b', 's1', { marked: true })]);
    await repo.toggleMarked('a', db);
    await repo.toggleMarked('b', db);
    expect((await repo.entryById('a', db))!.marked).toBe(true);
    expect((await repo.entryById('b', db))!.marked).toBe(false);
  });

  it('sets read explicitly', async () => {
    await put([entry('a', 's1', { read: false })]);
    await repo.setRead('a', true, db);
    expect((await repo.entryById('a', db))!.read).toBe(true);
    await repo.setRead('a', false, db);
    expect((await repo.entryById('a', db))!.read).toBe(false);
  });

  it('patches other fields while mapping flags', async () => {
    await put([entry('a', 's1', { read: false })]);
    await repo.patchEntry('a', { title: 'New title', read: true }, db);
    const e = (await repo.entryById('a', db))!;
    expect(e.title).toBe('New title');
    expect(e.read).toBe(true);
  });

  it('ignores a toggle on a missing entry', async () => {
    await expect(repo.toggleRead('ghost', db)).resolves.toBeUndefined();
    await expect(repo.toggleMarked('ghost', db)).resolves.toBeUndefined();
  });
});

describe('markAllRead', () => {
  it('marks entries that were never paged in', async () => {
    // 120 unread; a page shows 10.
    await put(
      Array.from({ length: 120 }, (_, i) => entry(`e${i}`, 's1', { publishedAt: 9000 - i })),
    );
    const sel: Selection = { kind: 'all' };
    const page = await repo.entriesFor(sel, 10, null, undefined, db);
    expect(page.entries).toHaveLength(10);

    const changed = await repo.markAllRead(sel, undefined, db);

    expect(changed).toBe(120);
    expect(await repo.countUnread(db)).toBe(0);
    expect(await repo.countFor({ kind: 'unread' }, undefined, db)).toBe(0);
  });

  it('marks only the selected folder’s entries', async () => {
    const nodes = sampleTree();
    await db.nodes.bulkPut(nodes);
    await put([
      entry('in1', 's_pl', { publishedAt: 100 }),
      entry('in2', 's_ars', { publishedAt: 90 }),
      entry('out', 's_lr', { publishedAt: 80 }),
    ]);

    const feedIds = feedsUnder(nodes, 'f_tech');
    await repo.markAllRead({ kind: 'node', id: 'f_tech' }, feedIds, db);

    expect((await repo.entryById('in1', db))!.read).toBe(true);
    expect((await repo.entryById('in2', db))!.read).toBe(true);
    expect((await repo.entryById('out', db))!.read).toBe(false);
  });

  it('does nothing for a folder with no feeds', async () => {
    await put([entry('a', 's1')]);
    expect(await repo.markAllRead({ kind: 'node', id: 'f' }, [], db)).toBe(0);
    expect((await repo.entryById('a', db))!.read).toBe(false);
  });

  it('marks a given id set, for the filtered bookmarks view', async () => {
    await put([
      entry('a', 's1', { marked: true }),
      entry('b', 's1', { marked: true }),
      entry('c', 's1', { marked: true }),
    ]);
    const changed = await repo.markReadByIds(['a', 'c'], db);
    expect(changed).toBe(2);
    expect((await repo.entryById('b', db))!.read).toBe(false);
    expect(await repo.markReadByIds([], db)).toBe(0);
  });
});

describe('merging refreshed items', () => {
  const item = (sourceId: string, title = sourceId) => ({
    title,
    author: 'A',
    link: `https://x/${sourceId}`,
    sourceId,
    publishedAt: 500,
    snippet: 's',
    body: '<p>s</p>',
  });

  it('adds only items whose guid is not already stored', async () => {
    const added = await repo.mergeFeedItems('s1', [item('g1'), item('g2')], db);
    expect(added).toBe(2);

    const again = await repo.mergeFeedItems('s1', [item('g2'), item('g3')], db);
    expect(again).toBe(1);
    expect(await db.entries.count()).toBe(3);
  });

  it('preserves read and bookmark state across a refresh', async () => {
    await repo.mergeFeedItems('s1', [item('g1')], db);
    const stored = (await db.entries.where('guid').equals('g1').toArray())[0];
    await repo.patchEntry(stored.id, { read: true, marked: true }, db);

    await repo.mergeFeedItems('s1', [item('g1'), item('g2')], db);

    const kept = (await repo.entryById(stored.id, db))!;
    expect(kept.read).toBe(true);
    expect(kept.marked).toBe(true);
    expect(await db.entries.count()).toBe(2);
  });

  it('guards duplicates within one document', async () => {
    const added = await repo.mergeFeedItems('s1', [item('g1'), item('g1')], db);
    expect(added).toBe(1);
  });

  it('treats the same guid in a different feed as distinct', async () => {
    await repo.mergeFeedItems('s1', [item('g1')], db);
    await repo.mergeFeedItems('s2', [item('g1')], db);
    expect(await db.entries.count()).toBe(2);
  });

  it('is a no-op for an empty batch', async () => {
    expect(await repo.mergeFeedItems('s1', [], db)).toBe(0);
  });
});

describe('whole-library writes are atomic', () => {
  const original = () => ({
    nodes: [feed('s1', 'One')],
    entries: [entry('a', 's1', { read: true, marked: true })],
  });

  it('round-trips a library through replace and read', async () => {
    const data = original();
    await repo.replaceLibrary(data, db);
    const back = await repo.readLibrary(db);
    expect(back.nodes).toEqual(data.nodes);
    expect(back.entries).toEqual(data.entries);
  });

  it('leaves the previous library intact when an import fails part-way', async () => {
    await repo.replaceLibrary(original(), db);
    const before = await repo.readLibrary(db);

    // Fail after the clears and the node insert have already run.
    const bulkAdd = db.entries.bulkAdd.bind(db.entries);
    vi.spyOn(db.entries, 'bulkAdd').mockImplementation(() => {
      throw new Error('disk full');
    });

    await expect(
      repo.replaceLibrary({ nodes: [feed('s9', 'Nine')], entries: [entry('z', 's9')] }, db),
    ).rejects.toThrow('disk full');

    vi.mocked(db.entries.bulkAdd).mockRestore();
    void bulkAdd;

    const after = await repo.readLibrary(db);
    expect(after.nodes).toEqual(before.nodes);
    expect(after.entries).toEqual(before.entries);
  });

  it('leaves a feed and its entries intact when a delete fails part-way', async () => {
    await db.nodes.bulkPut([feed('s1', 'One'), feed('s2', 'Two')]);
    await put([entry('a', 's1'), entry('b', 's2')]);
    const beforeNodes = await repo.nodesAll(db);
    const beforeEntries = await db.entries.toArray();

    // The entry delete is the last step of deleteNode; failing it must roll the
    // node delete back too.
    vi.spyOn(db.entries, 'where').mockImplementation(() => {
      throw new Error('interrupted');
    });

    await expect(repo.deleteNode('s1', db)).rejects.toThrow('interrupted');

    vi.mocked(db.entries.where).mockRestore();

    expect(await repo.nodesAll(db)).toEqual(beforeNodes);
    expect(await db.entries.toArray()).toEqual(beforeEntries);
  });

  it('clears both tables together', async () => {
    await repo.replaceLibrary(original(), db);
    await repo.clearLibrary(db);
    expect(await db.nodes.count()).toBe(0);
    expect(await db.entries.count()).toBe(0);
  });
});

describe('bookmarked entries', () => {
  it('returns every bookmark, newest first', async () => {
    await put([
      entry('m1', 's1', { publishedAt: 100, marked: true }),
      entry('p', 's1', { publishedAt: 200, marked: false }),
      entry('m2', 's1', { publishedAt: 300, marked: true }),
    ]);
    expect((await repo.bookmarkedEntries(db)).map((e) => e.id)).toEqual(['m2', 'm1']);
  });
});
