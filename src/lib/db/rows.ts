// The stored row shapes and the only mapping between them and the domain types.
//
// IndexedDB cannot index a JavaScript boolean, so `read` and `marked` persist as
// 0/1 — that is what lets "unread count" and "bookmarks" be indexed queries
// rather than a scan of every entry. Keeping the translation in one pair of
// functions is what stops that storage detail leaking into the app, which still
// works with `Entry.read: boolean` throughout.
import type { Entry, LibraryNode } from '../../types';

/** 0/1 stand-in for a boolean, so the field can carry an IndexedDB index. */
export type Flag = 0 | 1;

/** A node exactly as stored. Identical to the domain type — nodes need no mapping. */
export type NodeRow = LibraryNode;

/** An entry as stored: `read` and `marked` are flags, everything else is verbatim. */
export interface EntryRow extends Omit<Entry, 'read' | 'marked'> {
  read: Flag;
  marked: Flag;
}

export const flag = (v: boolean): Flag => (v ? 1 : 0);

export function toRow(entry: Entry): EntryRow {
  return { ...entry, read: flag(entry.read), marked: flag(entry.marked) };
}

export function fromRow(row: EntryRow): Entry {
  return { ...row, read: row.read === 1, marked: row.marked === 1 };
}
