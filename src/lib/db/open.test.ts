import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LibraryDb, SCHEMA_VERSION } from './db';
import { openLibrary } from './open';
import { toRow } from './rows';
import { entry, feed } from '../../test/fixtures';

const NAME = 'open-test';

afterEach(async () => {
  vi.restoreAllMocks();
  await new Dexie(NAME).delete();
});

describe('openLibrary', () => {
  it('opens a fresh database and reports ready', async () => {
    const db = new LibraryDb(NAME);
    const outcome = await openLibrary(db);
    expect(outcome).toEqual({ status: 'ready' });
    expect(db.isOpen()).toBe(true);
    db.close();
  });

  it('opens an existing database of the current version without touching its data', async () => {
    const first = new LibraryDb(NAME);
    await first.open();
    await first.nodes.add(feed('s1', 'Kept'));
    await first.entries.add(toRow(entry('e1', 's1', { read: true, marked: true })));
    first.close();

    const second = new LibraryDb(NAME);
    expect(await openLibrary(second)).toEqual({ status: 'ready' });
    expect(await second.nodes.count()).toBe(1);
    const row = (await second.entries.get('e1'))!;
    expect(row.read).toBe(1);
    expect(row.marked).toBe(1);
    second.close();
  });

  it('refuses a database written by a newer version, leaving its data intact', async () => {
    // Write a database stamped one version ahead of what this build understands.
    const future = new Dexie(NAME);
    future.version(SCHEMA_VERSION + 1).stores({
      nodes: 'id, parentId',
      entries: 'id, feedId, publishedAt, guid',
      // A table this build knows nothing about, as a later schema might add.
      settings: 'key',
    });
    await future.open();
    await future.table('nodes').add(feed('s1', 'From the future'));
    await future.table('settings').add({ key: 'theme', value: 'dark' });
    future.close();

    const outcome = await openLibrary(new LibraryDb(NAME));

    expect(outcome.status).toBe('unavailable');
    if (outcome.status === 'unavailable') {
      expect(outcome.reason).toBe('newer-version');
      expect(outcome.message).toMatch(/newer version/i);
    }

    // Nothing was downgraded, deleted, or rewritten: reopening at the newer
    // version still finds every row, including the table this build cannot see,
    // and the stored IndexedDB version has not moved.
    const check = new Dexie(NAME);
    check.version(SCHEMA_VERSION + 1).stores({
      nodes: 'id, parentId',
      entries: 'id, feedId, publishedAt, guid',
      settings: 'key',
    });
    await check.open();
    expect(check.backendDB().version).toBe((SCHEMA_VERSION + 1) * 10);
    expect(await check.table('nodes').count()).toBe(1);
    expect((await check.table('nodes').get('s1'))!.name).toBe('From the future');
    expect(await check.table('settings').count()).toBe(1);
    check.close();
  });

  it('does not create a database merely by checking for one', async () => {
    const before = (await indexedDB.databases()).map((d) => d.name);
    expect(before).not.toContain(NAME);

    const db = new LibraryDb(NAME);
    await openLibrary(db);
    db.close();

    // It exists now because we opened it, not because the version check ran.
    expect((await indexedDB.databases()).map((d) => d.name)).toContain(NAME);
  });

  it('reports an unopenable database with a hint to import a backup', async () => {
    const db = new LibraryDb(NAME);
    vi.spyOn(db, 'open').mockRejectedValue(new Error('blocked by the browser'));

    const outcome = await openLibrary(db);

    expect(outcome.status).toBe('unavailable');
    if (outcome.status === 'unavailable') {
      expect(outcome.reason).toBe('blocked');
      expect(outcome.message).toMatch(/import a backup/i);
    }
  });

  it('never throws — a failure is a value the shell can render', async () => {
    const db = new LibraryDb(NAME);
    vi.spyOn(db, 'open').mockRejectedValue(new DOMException('nope', 'UnknownError'));
    await expect(openLibrary(db)).resolves.toMatchObject({ status: 'unavailable' });
  });
});

describe('an evicted store', () => {
  it('starts from an empty library without error', async () => {
    const first = new LibraryDb(NAME);
    await first.open();
    await first.nodes.add(feed('s1', 'Doomed'));
    await first.entries.add(toRow(entry('e1', 's1')));
    first.close();

    // Eviction removes the whole database, as a browser reclaiming the origin does.
    await new Dexie(NAME).delete();

    const after = new LibraryDb(NAME);
    expect(await openLibrary(after)).toEqual({ status: 'ready' });
    expect(await after.nodes.count()).toBe(0);
    expect(await after.entries.count()).toBe(0);
    after.close();
  });
});
