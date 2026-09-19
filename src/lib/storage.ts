// The sole owner of the persisted library. Nothing else touches localStorage.
import type { LibraryData } from '../types';
import { migrate, toPayload } from './migrate';

export const STORAGE_KEY = 'rss-reader-pwa.library.v1';

export interface SaveResult {
  ok: boolean;
  error?: 'unavailable' | 'quota';
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // access can throw in some privacy modes
  }
}

/** Load and migrate the stored library, or null when there is nothing usable. */
export function load(): LibraryData | null {
  const store = storage();
  if (!store) return null;
  let raw: string | null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return migrate(JSON.parse(raw));
  } catch {
    return null; // corrupt JSON: treat as no data rather than crash
  }
}

/** Persist the library. Never throws; reports failure so the UI can warn. */
export function save(data: LibraryData): SaveResult {
  const store = storage();
  if (!store) return { ok: false, error: 'unavailable' };
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(toPayload(data)));
    return { ok: true };
  } catch (err) {
    const quota =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    return { ok: false, error: quota ? 'quota' : 'unavailable' };
  }
}
