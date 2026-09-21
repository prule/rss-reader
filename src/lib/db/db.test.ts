import { afterEach, describe, expect, it } from 'vitest';
import { LibraryDb, SCHEMA_VERSION } from './db';
import { flag, fromRow, toRow } from './rows';
import { entry } from '../../test/fixtures';

const open = async (name: string) => {
  const db = new LibraryDb(name);
  await db.open();
  return db;
};

let opened: LibraryDb | null = null;

afterEach(async () => {
  if (opened) {
    const name = opened.name;
    opened.close();
    await new LibraryDb(name).delete();
    opened = null;
  }
});

describe('schema', () => {
  it('opens at the current version with both tables', async () => {
    opened = await open('schema-open');
    expect(opened.verno).toBe(SCHEMA_VERSION);
    expect(opened.tables.map((t) => t.name).sort()).toEqual(['entries', 'nodes']);
  });

  it('declares every index the UI queries through', async () => {
    opened = await open('schema-indexes');

    const indexesOf = (table: string) =>
      opened!
        .table(table)
        .schema.indexes.map((i) => i.name)
        .sort();

    expect(indexesOf('entries')).toEqual(
      [
        'feedId',
        'publishedAt',
        '[feedId+publishedAt]',
        '[read+publishedAt]',
        '[marked+publishedAt]',
        'read',
        'marked',
        'guid',
      ].sort(),
    );
    expect(indexesOf('nodes')).toEqual(['parentId']);
    expect(opened.table('entries').schema.primKey.name).toBe('id');
    expect(opened.table('nodes').schema.primKey.name).toBe('id');
  });
});

describe('row mapping', () => {
  it('round-trips an entry through storage unchanged', () => {
    const e = entry('e1', 's1', { read: true, marked: false });
    expect(fromRow(toRow(e))).toEqual(e);
  });

  it('stores booleans as numbers and returns them as booleans', () => {
    const row = toRow(entry('e1', 's1', { read: true, marked: false }));
    expect(row.read).toBe(1);
    expect(row.marked).toBe(0);
    expect(typeof row.read).toBe('number');
    expect(typeof row.marked).toBe('number');

    const back = fromRow(row);
    expect(back.read).toBe(true);
    expect(back.marked).toBe(false);
    expect(typeof back.read).toBe('boolean');
    expect(typeof back.marked).toBe('boolean');
  });

  it('maps both flag values', () => {
    expect(flag(true)).toBe(1);
    expect(flag(false)).toBe(0);
  });
});

describe('flag queries are index-driven', () => {
  it('finds unread and bookmarked entries through the index, not a scan', async () => {
    opened = await open('schema-flag-queries');
    await opened.entries.bulkPut(
      [
        entry('e1', 's1', { read: false, marked: true }),
        entry('e2', 's1', { read: true, marked: false }),
        entry('e3', 's1', { read: false, marked: false }),
      ].map(toRow),
    );

    // where(...) only resolves against a declared index — a missing index
    // throws SchemaError rather than silently falling back to a scan.
    const unread = await opened.entries.where('read').equals(0).toArray();
    expect(unread.map((r) => r.id).sort()).toEqual(['e1', 'e3']);

    const marked = await opened.entries.where('marked').equals(1).toArray();
    expect(marked.map((r) => r.id)).toEqual(['e1']);

    expect(await opened.entries.where('read').equals(0).count()).toBe(2);
  });
});
