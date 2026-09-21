// Screenplay interactions and questions for the on-device library.
//
// The library lives in IndexedDB now, so seeding it is no longer a one-line
// localStorage write. These keep that mechanic out of the tests — the pattern's
// whole point is that a test reads as intent, not plumbing.
//
// Seeding deliberately writes into the object stores the *app* created, rather
// than building a schema of its own. A test that reproduced the Dexie schema
// would keep passing after the real one changed underneath it.
import { AnswersQuestions, Interaction, Question, UsesAbilities } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright } from '@serenity-js/playwright';
import type { Page } from 'playwright-core';

export const LIBRARY_DB = 'rss-reader-pwa';
export const LEGACY_KEY = 'rss-reader-pwa.library.v1';

export interface SeedNode {
  id: string;
  type: 'folder' | 'feed';
  name: string;
  parentId: string | null;
  collapsed: boolean;
  url?: string;
  fetchedAt?: number;
}

export interface SeedEntry {
  id: string;
  feedId: string;
  title: string;
  author: string;
  link: string | null;
  guid: string;
  publishedAt: number | null;
  snippet: string;
  body: string;
  read: boolean;
  marked: boolean;
}

export interface SeedLibraryData {
  nodes: SeedNode[];
  entries: SeedEntry[];
}

/** Reach the Playwright page behind the actor, for the few native mechanics. */
async function nativePage(actor: UsesAbilities & AnswersQuestions): Promise<Page> {
  const page = await BrowseTheWebWithPlaywright.as(actor).currentPage();
  return await page.nativePage();
}

/**
 * Write a library into the app's own IndexedDB stores.
 *
 * `read` and `marked` are persisted as 0/1 because IndexedDB cannot index a
 * boolean — the same mapping `src/lib/db/rows.ts` owns in the app.
 */
export const SeedLibrary = {
  with: (data: SeedLibraryData): Interaction =>
    Interaction.where(`#actor seeds the library`, async (actor) => {
      const page = await nativePage(actor);
      await page.evaluate(
        async ([dbName, library]) => {
          const { nodes, entries } = library as SeedLibraryData;

          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const req = indexedDB.open(dbName as string);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });

          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(['nodes', 'entries'], 'readwrite');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);

            const nodeStore = tx.objectStore('nodes');
            const entryStore = tx.objectStore('entries');
            nodeStore.clear();
            entryStore.clear();
            for (const node of nodes) nodeStore.put(node);
            for (const entry of entries) {
              entryStore.put({ ...entry, read: entry.read ? 1 : 0, marked: entry.marked ? 1 : 0 });
            }
          });

          db.close();
        },
        [LIBRARY_DB, data] as const,
      );
    }),

  /** Put a library from the retired localStorage build in place. */
  asLegacyPayload: (payload: unknown): Interaction =>
    Interaction.where(`#actor leaves a pre-database library behind`, async (actor) => {
      const page = await nativePage(actor);
      await page.evaluate(
        ([key, text]) => window.localStorage.setItem(key as string, text as string),
        [LEGACY_KEY, JSON.stringify(payload)] as const,
      );
    }),
};

/**
 * Scroll the entry list to its end, which is what asks the list for another page.
 * Each call waits briefly for the page to land.
 */
export const ScrollEntryList = {
  toTheEnd: (times = 1): Interaction =>
    Interaction.where(`#actor scrolls the entry list to the end`, async (actor) => {
      const page = await nativePage(actor);
      for (let i = 0; i < times; i++) {
        await page.evaluate(() => {
          const el = document.querySelector('.list-scroll');
          if (el) el.scrollTop = el.scrollHeight;
        });
        await page.waitForTimeout(250);
      }
    }),
};

/**
 * Take the rescue download and hand it straight back through the ordinary Import
 * control — the path a real user would follow to restore the rescued file.
 */
export const RescueBackup = {
  downloadAndReimport: (): Interaction =>
    Interaction.where(`#actor downloads the rescue backup and imports it`, async (actor) => {
      const page = await nativePage(actor);

      const pending = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download backup' }).click();
      const file = await pending;
      const path = await file.path();
      if (!path) throw new Error('the rescue download produced no file');

      await page.setInputFiles('input[type="file"]', path);
    }),
};

/** Whether the retired localStorage key is still present. */
export const LegacyPayload = {
  isStillStored: (): Question<Promise<boolean>> =>
    Question.about('whether the pre-database library is still stored', async (actor) => {
      const page = await nativePage(actor);
      return await page.evaluate(
        (key) => window.localStorage.getItem(key as string) !== null,
        LEGACY_KEY,
      );
    }),
};

/** How many entry rows the list is currently rendering. */
export const RenderedEntries = {
  count: (): Question<Promise<number>> =>
    Question.about('the number of rendered entry rows', async (actor) => {
      const page = await nativePage(actor);
      return await page.locator('[data-testid^="entry-"]').count();
    }),
};

/** How many entries are stored in the library, regardless of what is rendered. */
export const StoredEntries = {
  count: (): Question<Promise<number>> =>
    Question.about('the number of stored entries', async (actor) => {
      const page = await nativePage(actor);
      return await page.evaluate(async (dbName) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open(dbName as string);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        const total = await new Promise<number>((resolve, reject) => {
          const req = db.transaction('entries', 'readonly').objectStore('entries').count();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        db.close();
        return total;
      }, LIBRARY_DB);
    }),
};

/**
 * Whether the rescue offer is on screen.
 *
 * A boolean question rather than `not(isPresent())`: that expectation waits for an
 * element to *become* absent, which never resolves for one that was never there.
 */
export const RescueOffer = {
  isShowing: (): Question<Promise<boolean>> =>
    Question.about('whether the rescue offer is showing', async (actor) => {
      const page = await nativePage(actor);
      return (await page.locator('[role="dialog"][aria-label="Old library found"]').count()) > 0;
    }),
};
