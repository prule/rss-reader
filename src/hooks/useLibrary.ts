// Live reads of the library. Every hook here goes through the repository, so no
// component imports Dexie; `useLiveQuery` re-runs them when the tables change,
// which is what replaced the old write-through store subscription.
import { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Entry, LibraryNode, Selection } from '../types';
import * as repo from '../lib/db/repository';
import { feedsUnder } from '../store/selectors';

/**
 * The tree. `undefined` while the first query is in flight — the shell uses that
 * to tell "not read yet" apart from "empty", which the spec forbids conflating.
 */
export function useNodes(): LibraryNode[] | undefined {
  return useLiveQuery(() => repo.nodesAll(), []);
}

export interface LibraryCounts {
  all: number;
  unread: number;
  marked: number;
}

/** The three library-shortcut counts, each an indexed `count()`. */
export function useCounts(): LibraryCounts | undefined {
  return useLiveQuery(async () => {
    const [all, unread, marked] = await Promise.all([
      repo.countAll(),
      repo.countUnread(),
      repo.countMarked(),
    ]);
    return { all, unread, marked };
  }, []);
}

/** Unread count beneath a node — the sidebar badge. */
export function useUnreadFor(nodes: LibraryNode[], id: string): number {
  const feedIds = feedsUnder(nodes, id);
  const key = feedIds.join(',');
  return useLiveQuery(() => repo.countUnreadIn(feedIds), [key]) ?? 0;
}

/** The total a view's header shows: every matching entry, not just the loaded ones. */
export function useCountFor(sel: Selection, nodes: LibraryNode[]): number | undefined {
  const feedIds = sel.kind === 'node' ? feedsUnder(nodes, sel.id) : undefined;
  return useLiveQuery(
    () => repo.countFor(sel, feedIds),
    [sel.kind, sel.kind === 'node' ? sel.id : '', (feedIds ?? []).join(',')],
  );
}

export function useEntry(id: string | null): Entry | undefined {
  return useLiveQuery(() => (id ? repo.entryById(id) : Promise.resolve(undefined)), [id]);
}

/** Every bookmarked entry — a small set, scanned for keyword and tag filtering. */
export function useBookmarks(): Entry[] | undefined {
  return useLiveQuery(() => repo.bookmarkedEntries(), []);
}

export interface EntryPage {
  entries: Entry[];
  /** True while a page is in flight. */
  loading: boolean;
  /** True once the selection has no further entries. */
  atEnd: boolean;
  /** Load the next page. Safe to call repeatedly; ignored while loading or ended. */
  loadMore: () => void;
  /** Ensure at least `n` entries are loaded, for J past the loaded boundary. */
  ensureLoaded: (n: number) => void;
}

/**
 * The incremental entry list. Holds the pages loaded so far and a cursor for the
 * next one; the selection (and `epoch`, bumped on import) resets it to page one.
 *
 * The loaded window is re-read whenever the tables change, so a read or bookmark
 * toggle is reflected without dropping the user's scroll position.
 */
export function useEntryPages(
  sel: Selection,
  nodes: LibraryNode[],
  epoch: number,
  pageSize: number = repo.PAGE_SIZE,
): EntryPage {
  const feedIds = sel.kind === 'node' ? feedsUnder(nodes, sel.id) : undefined;
  const feedKey = (feedIds ?? []).join(',');
  const selKey = `${sel.kind}:${sel.kind === 'node' ? sel.id : ''}:${feedKey}:${epoch}`;

  // How many pages have been asked for, tagged with the selection they belong to.
  // Tagging lets the count fall back to one page by pure derivation when the
  // selection changes, instead of resetting it from an effect.
  const [req, setReq] = useState({ key: selKey, pages: 1 });
  const pages = req.key === selKey ? req.pages : 1;

  // Re-read the whole loaded window rather than appending: walking from the top
  // each time means a page boundary is never straddled by two different cursors,
  // and `useLiveQuery` re-runs this whenever the tables change — so a read or
  // bookmark toggle shows up without disturbing the user's scroll position.
  const live = useLiveQuery(async () => {
    const collected: Entry[] = [];
    let cursor: repo.Cursor | null = null;
    for (let i = 0; i < pages; i++) {
      const page = await repo.entriesFor(sel, pageSize, cursor, feedIds);
      collected.push(...page.entries);
      cursor = page.next;
      if (!cursor) break;
    }
    return { entries: collected, atEnd: cursor == null, key: selKey };
    // selKey encodes the selection and its feed ids, so it stands in for both.
  }, [selKey, pages, pageSize]);

  // A live query keeps serving its previous result until the new one resolves, so
  // the key check stops one selection's entries appearing under another's heading.
  const fresh = live?.key === selKey;

  const loadMore = useCallback(() => {
    setReq((r) => {
      const current = r.key === selKey ? r.pages : 1;
      return { key: selKey, pages: current + 1 };
    });
  }, [selKey]);

  const ensureLoaded = useCallback(
    (n: number) => {
      const needed = Math.ceil(n / pageSize);
      setReq((r) => {
        const current = r.key === selKey ? r.pages : 1;
        return { key: selKey, pages: Math.max(current, needed) };
      });
    },
    [selKey, pageSize],
  );

  return {
    entries: fresh ? live.entries : [],
    loading: !fresh,
    atEnd: fresh ? live.atEnd : false,
    loadMore,
    ensureLoaded,
  };
}
