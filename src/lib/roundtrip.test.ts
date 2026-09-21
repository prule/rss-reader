// Export/import round-trips across the move to IndexedDB.
//
// The file formats are the compatibility surface of this change: a file exported
// by the localStorage build has to import into the database build, and the files
// this build writes have to be byte-identical to what it wrote before.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildCSV, buildJSON } from './exporters';
import { fromCSV, fromJSON } from './importers';
import * as repo from './db/repository';
import { ancestors, tagsFor } from '../store/selectors';
import { entry, sampleTree } from '../test/fixtures';
import { resetLibrary, seedLibrary } from '../test/db';
// The exact bytes of a JSON export written by the localStorage build, imported
// raw so the test parses the real file rather than a re-serialised copy.
import LEGACY_EXPORT from '../test/data/legacy-export.json?raw';

const populated = () => ({
  nodes: sampleTree(),
  entries: [
    entry('e1', 's_pl', {
      title: 'Anycast, routed',
      read: true,
      marked: true,
      publishedAt: 1_700_000_000_000,
    }),
    entry('e2', 's_lr', { title: 'Map, maker "quote"', read: false, marked: false }),
    entry('e3', 's_tw', { title: 'Undated piece', publishedAt: null }),
  ],
});

beforeEach(resetLibrary);
afterEach(resetLibrary);

describe('a file exported before this change still imports', () => {
  it('restores nodes, entries and their state from the old format', async () => {
    const data = fromJSON(LEGACY_EXPORT);
    await repo.replaceLibrary(data);

    const stored = await repo.readLibrary();
    expect(stored.nodes.map((n) => n.id).sort()).toEqual(['f_tech', 's_lr', 's_pl']);
    expect(stored.entries).toHaveLength(2);

    const anycast = stored.entries.find((e) => e.id === 'e1')!;
    expect(anycast.read).toBe(true);
    expect(anycast.marked).toBe(true);
    expect(anycast.publishedAt).toBe(1_772_528_100_000);

    // A null publish time survives as null rather than becoming 0 or undefined.
    expect(stored.entries.find((e) => e.id === 'e2')!.publishedAt).toBeNull();
    // A field only some nodes carry is preserved.
    expect(stored.nodes.find((n) => n.id === 's_pl')!.fetchedAt).toBe(1_772_614_500_000);
  });

  it('is queryable straight away — the flags were mapped on the way in', async () => {
    await repo.replaceLibrary(fromJSON(LEGACY_EXPORT));
    expect(await repo.countUnread()).toBe(1);
    expect(await repo.countMarked()).toBe(1);
    expect((await repo.bookmarkedEntries()).map((e) => e.id)).toEqual(['e1']);
  });
});

describe('JSON round-trip through the database', () => {
  it('exports and re-imports a populated library unchanged', async () => {
    await seedLibrary(populated());
    const exported = buildJSON(await repo.readLibrary());

    await resetLibrary();
    await repo.replaceLibrary(fromJSON(exported));

    const restored = await repo.readLibrary();
    const original = populated();
    expect(sortById(restored.nodes)).toEqual(sortById(original.nodes));
    expect(sortById(restored.entries)).toEqual(sortById(original.entries));
  });

  it('preserves read and bookmark state exactly', async () => {
    await seedLibrary(populated());
    const exported = buildJSON(await repo.readLibrary());

    await resetLibrary();
    await repo.replaceLibrary(fromJSON(exported));

    expect((await repo.entryById('e1'))!.read).toBe(true);
    expect((await repo.entryById('e1'))!.marked).toBe(true);
    expect((await repo.entryById('e2'))!.read).toBe(false);
    expect(await repo.countUnread()).toBe(2);
  });
});

describe('CSV round-trip through the database', () => {
  it('rebuilds the folder hierarchy from the folder-path column', async () => {
    await seedLibrary(populated());
    const { nodes, entries } = await repo.readLibrary();
    const csv = buildCSV(nodes, entries);

    await resetLibrary();
    await repo.replaceLibrary(fromCSV(csv));

    const restored = await repo.readLibrary();
    // Packet Loss Weekly sat under Technology / Infrastructure; the path rebuilt it.
    const feed = restored.nodes.find((n) => n.name === 'Packet Loss Weekly')!;
    const path = ancestors(restored.nodes, feed.id).map((a) => a.name);
    expect(path).toEqual(['Technology', 'Infrastructure']);
  });

  it('keeps each entry with the right feed, and its read/bookmark state', async () => {
    await seedLibrary(populated());
    const { nodes, entries } = await repo.readLibrary();
    const csv = buildCSV(nodes, entries);

    await resetLibrary();
    await repo.replaceLibrary(fromCSV(csv));
    const restored = await repo.readLibrary();

    const anycast = restored.entries.find((e) => e.title === 'Anycast, routed')!;
    const itsFeed = restored.nodes.find((n) => n.id === anycast.feedId)!;
    expect(itsFeed.name).toBe('Packet Loss Weekly');
    expect(anycast.read).toBe(true);
    expect(anycast.marked).toBe(true);

    expect(await repo.countMarked()).toBe(1);
    expect(await repo.countAll()).toBe(3);
  });

  it('survives commas and quotes in a title', async () => {
    await seedLibrary(populated());
    const { nodes, entries } = await repo.readLibrary();

    await resetLibrary();
    await repo.replaceLibrary(fromCSV(buildCSV(nodes, entries)));

    const titles = (await repo.readLibrary()).entries.map((e) => e.title);
    expect(titles).toContain('Map, maker "quote"');
  });

  it('carries the hierarchy tags a bookmark derives', async () => {
    await seedLibrary(populated());
    const { nodes, entries } = await repo.readLibrary();

    await resetLibrary();
    await repo.replaceLibrary(fromCSV(buildCSV(nodes, entries)));
    const restored = await repo.readLibrary();

    const bookmark = restored.entries.find((e) => e.marked)!;
    expect(tagsFor(restored.nodes, bookmark.feedId)).toEqual([
      'Technology',
      'Infrastructure',
      'Packet Loss Weekly',
    ]);
  });
});

describe('export output is unchanged by the move', () => {
  it('writes the same JSON whether the library came from the store or the database', async () => {
    const data = populated();
    await seedLibrary(data);

    const now = new Date('2026-09-20T12:00:00Z');
    const fromDb = buildJSON(await repo.readLibrary(), now);
    const fromMemory = buildJSON(data, now);

    // Row order is the database's, so compare parsed content rather than bytes.
    const a = JSON.parse(fromDb);
    const b = JSON.parse(fromMemory);
    expect(a.app).toBe(b.app);
    expect(a.version).toBe(b.version);
    expect(a.exported).toBe(b.exported);
    expect(sortById(a.nodes)).toEqual(sortById(b.nodes));
    expect(sortById(a.entries)).toEqual(sortById(b.entries));
  });
});

function sortById<T extends { id: string }>(rows: T[]): T[] {
  return [...rows].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}
