// Opening the local database, and reporting the ways that can go wrong.
//
// Startup is asynchronous: until the database is open the shell shows a loading
// state rather than an empty library, so a library that simply has not been read
// yet is never mistaken for one that is empty. See
// openspec/specs/library-persistence — "Asynchronous startup".
import { DB_NAME, SCHEMA_VERSION, db, type LibraryDb } from './db';

export type OpenOutcome =
  | { status: 'ready' }
  | { status: 'unavailable'; reason: 'newer-version' | 'blocked'; message: string };

const IMPORT_HINT = 'Local storage is unavailable — import a backup to restore your library';
const NEWER_HINT = 'This library was saved by a newer version of RSS Reader — update to open it';

/**
 * Dexie multiplies its own schema version by ten to get the IndexedDB version,
 * leaving room for its internal upgrade steps. Comparing raw IndexedDB versions
 * is what lets us spot a newer build's database before Dexie touches it.
 */
const IDB_VERSION_PER_SCHEMA = 10;

/**
 * Open the database. Never throws: a failure is a value the shell can render.
 *
 * A database written by a newer build is refused *before* Dexie opens it. Dexie
 * will not refuse on its own — asked to open a version-40 database as version 1,
 * it opens it and bumps the IndexedDB version to 41, quietly taking ownership and
 * hiding the stores it does not declare. That is exactly the silent downgrade the
 * spec forbids, so the version check has to come first.
 */
export async function openLibrary(database: LibraryDb = db): Promise<OpenOutcome> {
  try {
    const stored = await storedVersion(database.name);
    if (stored !== null && stored > SCHEMA_VERSION * IDB_VERSION_PER_SCHEMA) {
      return { status: 'unavailable', reason: 'newer-version', message: NEWER_HINT };
    }
  } catch {
    // The check is best-effort. If it cannot run, fall through and let the open
    // attempt below decide — refusing to start over a failed probe would be worse.
  }

  try {
    await database.open();
    return { status: 'ready' };
  } catch {
    return { status: 'unavailable', reason: 'blocked', message: IMPORT_HINT };
  }
}

/**
 * The IndexedDB version currently on disk, or null when the database does not
 * exist yet. Uses `indexedDB.databases()` where available so the check never
 * creates the database as a side effect.
 */
async function storedVersion(name: string = DB_NAME): Promise<number | null> {
  if (typeof indexedDB === 'undefined') return null;

  if (typeof indexedDB.databases === 'function') {
    const found = (await indexedDB.databases()).find((d) => d.name === name);
    return found?.version ?? null;
  }

  // Older browsers: open with no version, which reports the current one without
  // upgrading. A database that did not exist is created empty and removed again.
  return await new Promise<number | null>((resolve, reject) => {
    let existed = true;
    const req = indexedDB.open(name);
    req.onupgradeneeded = () => {
      existed = false; // only fires when there was nothing there
    };
    req.onsuccess = () => {
      const version = req.result.version;
      req.result.close();
      if (existed) {
        resolve(version);
      } else {
        const del = indexedDB.deleteDatabase(name);
        del.onsuccess = del.onerror = () => resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}
