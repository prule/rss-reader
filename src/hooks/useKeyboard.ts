import { useEffect, useRef } from 'react';
import { useStore } from '../store/store';
import { feedsUnder } from '../store/selectors';
import * as actions from '../store/actions';
import * as repo from '../lib/db/repository';
import type { LibraryNode } from '../types';

// Global keyboard shortcuts. Letter shortcuts are inert while a text field is
// focused; Escape always closes an open dialog or inline edit.
//
// J/K move through the *stored* order rather than a list held in memory, so
// pressing J on the last entry the list has paged in continues into the next one
// instead of stopping at the loaded boundary.
export function useKeyboard(nodes: LibraryNode[]): void {
  // The listener is installed once, so it reads the tree through a ref that an
  // effect keeps current rather than closing over the first render's array.
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    /** Move one entry forward (1) or back (-1) in the selection's stored order. */
    const step = async (delta: number): Promise<void> => {
      const { sel, selEntry } = useStore.getState();
      const next = await neighbour(sel, nodesRef.current, selEntry, delta);
      if (next) await actions.openEntry(next);
    };

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
      const s = useStore.getState();

      if (typing) {
        if (e.key === 'Escape') {
          (t as HTMLElement).blur();
          s.closeAddFeed();
          s.cancelRename();
        }
        return;
      }

      switch (e.key) {
        case 'j':
          e.preventDefault();
          void step(1);
          break;
        case 'k':
          e.preventDefault();
          void step(-1);
          break;
        case 'b':
          if (s.selEntry) void actions.toggleMark(s.selEntry);
          break;
        case 'u':
          if (s.selEntry) void actions.toggleRead(s.selEntry);
          break;
        case 'n':
          e.preventDefault();
          s.openAddFeed();
          break;
        case '/':
          e.preventDefault();
          s.selectBookmarks();
          setTimeout(() => {
            const input = document.querySelector<HTMLInputElement>('[data-search]');
            input?.focus();
          }, 0);
          break;
        case 'Escape':
          s.closeAddFeed();
          s.cancelRename();
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/**
 * The entry before or after `current` in the selection's order.
 *
 * Walks from the top in page-sized steps and stops as soon as the neighbour is
 * found, so it costs a page or two rather than the whole selection — and it is not
 * limited to the entries the list has rendered.
 */
async function neighbour(
  sel: ReturnType<typeof useStore.getState>['sel'],
  nodes: LibraryNode[],
  current: string | null,
  delta: number,
): Promise<string | null> {
  const feedIds = sel.kind === 'node' ? feedsUnder(nodes, sel.id) : undefined;
  let cursor: repo.Cursor | null = null;
  let previous: string | null = null;
  let found = false;

  for (;;) {
    const page = await repo.entriesFor(sel, repo.PAGE_SIZE, cursor, feedIds);
    for (const entry of page.entries) {
      if (found) return delta > 0 ? entry.id : previous;
      if (entry.id === current) {
        if (delta < 0) return previous; // the one just before it
        found = true;
      } else {
        previous = entry.id;
      }
    }
    if (!page.next) break;
    cursor = page.next;
  }

  // Nothing selected yet: J opens the first entry, K the last.
  if (!current) return delta > 0 ? await firstEntry(sel, feedIds) : previous;
  // On the last entry already, or the selection no longer holds it.
  return found ? null : await firstEntry(sel, feedIds);
}

async function firstEntry(
  sel: ReturnType<typeof useStore.getState>['sel'],
  feedIds: string[] | undefined,
): Promise<string | null> {
  const page = await repo.entriesFor(sel, 1, null, feedIds);
  return page.entries[0]?.id ?? null;
}
