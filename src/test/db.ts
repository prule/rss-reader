// Test harness for the library database. Component tests run against the real
// Dexie code on fake-indexeddb, so index behaviour, the 0/1 flag mapping and
// cursor ordering are all part of what is under test — a hand-written repository
// stub would need a contract test to be trustworthy, and this needs none.
import { act, waitFor } from '@testing-library/react';
import { db } from '../lib/db/db';
import { toRow } from '../lib/db/rows';
import { useStore } from '../store/store';
import type { Entry, LibraryData, LibraryNode } from '../types';

/** Seed the database and mark the store ready, as a real startup would. */
export async function seedLibrary(data: Partial<LibraryData> = {}): Promise<void> {
  if (!db.isOpen()) await db.open();
  await db.transaction('rw', db.nodes, db.entries, async () => {
    await db.nodes.clear();
    await db.entries.clear();
    if (data.nodes?.length) await db.nodes.bulkAdd(data.nodes);
    if (data.entries?.length) await db.entries.bulkAdd(data.entries.map(toRow));
  });
  useStore.getState().setDbStatus('ready');
}

/** Empty the database and reset UI state between tests. */
export async function resetLibrary(): Promise<void> {
  if (db.isOpen()) {
    await db.transaction('rw', db.nodes, db.entries, async () => {
      await db.nodes.clear();
      await db.entries.clear();
    });
  }
  useStore.setState({
    dbStatus: 'loading',
    storageNotice: '',
    legacyPayload: null,
    sel: { kind: 'all' },
    selEntry: null,
    query: '',
    activeTags: [],
    toast: '',
    renamingId: null,
    renameValue: '',
    showAddFeed: false,
    listEpoch: 0,
  });
}

export async function storedNodes(): Promise<LibraryNode[]> {
  return db.nodes.toArray();
}

export async function storedEntry(id: string): Promise<Entry | undefined> {
  const row = await db.entries.get(id);
  return row ? { ...row, read: row.read === 1, marked: row.marked === 1 } : undefined;
}

/** Markers the app shows while it is still reading from the database. */
const BUSY = '[data-testid="library-loading"], [data-testid="loading-more"]';

/** One turn of the event loop, inside `act` so React commits what it produced. */
async function tick(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/**
 * Wait until pending live queries have settled, before asserting on the DOM.
 *
 * A change propagates through several turns — Dexie notifies, `useLiveQuery`
 * resolves, an effect commits the result, the component re-renders, and a paging
 * hook may then ask for another read. How many turns that takes depends on the
 * data and on how busy the machine is, so a fixed count of flushes is a race: it
 * passes alone and fails under a parallel full-suite run.
 *
 * Settled therefore means observed quiet: no loading marker on screen, and the
 * DOM unchanged across `quietRounds` consecutive turns. `maxRounds` only bounds a
 * page that never stops changing, so a genuine hang still fails the test.
 */
export async function settle(quietRounds = 4, maxRounds = 400): Promise<void> {
  let last = document.body.innerHTML;
  let quiet = 0;
  for (let i = 0; i < maxRounds; i++) {
    await tick();
    const now = document.body.innerHTML;
    const busy = document.querySelector(BUSY) !== null;
    quiet = now === last && !busy ? quiet + 1 : 0;
    last = now;
    if (quiet >= quietRounds) return;
  }
}

/**
 * Flush until `check` passes, for assertions on state outside the DOM (the
 * store, the database) whose timing the DOM-quiet check cannot see.
 */
export async function settleUntil(check: () => boolean, tries = 400): Promise<void> {
  for (let i = 0; i < tries; i++) {
    if (check()) return;
    await tick();
  }
}

/**
 * Retry an assertion until it holds. For stored state after a user action: the
 * write is in flight in IndexedDB, where the DOM-quiet check in `settle` cannot
 * see it, so wait on the outcome itself.
 */
export async function eventually(assertion: () => void | Promise<void>): Promise<void> {
  await waitFor(assertion);
}
