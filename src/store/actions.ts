// The imperative shell: turns a UI intent into repository writes plus whatever
// UI state has to move with it. Components call these rather than the repository,
// so every write reports its own failure in one place.
//
// A rejected write never pretends to have succeeded — the spec requires the
// failure be surfaced, not swallowed (library-persistence, "Storage is
// unavailable or full").
import type { LibraryData, LibraryNode, Selection } from '../types';
import * as repo from '../lib/db/repository';
import { useStore } from './store';
import { feedsUnder, isDescendant, node } from './selectors';

const QUOTA_HINT = 'Could not save — storage is full. Export a backup to be safe';
const WRITE_HINT = 'Could not save that change — export a backup to be safe';

function isQuota(err: unknown): boolean {
  if (err instanceof DOMException) {
    return err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED';
  }
  return err instanceof Error && /quota/i.test(err.name + err.message);
}

/**
 * The outcome of a write. Success and failure are distinct cases rather than a
 * nullable value — most repository writes resolve to `undefined`, so "no value"
 * cannot stand in for "it failed".
 */
export type WriteResult<T> = { ok: true; value: T } | { ok: false };

/** Run a write, reporting a failure instead of throwing. */
export async function write<T>(op: () => Promise<T>): Promise<WriteResult<T>> {
  try {
    return { ok: true, value: await op() };
  } catch (err) {
    useStore.getState().say(isQuota(err) ? QUOTA_HINT : WRITE_HINT);
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

/** Open an entry: select it, and mark it read. */
export async function openEntry(id: string): Promise<void> {
  useStore.getState().setSelEntry(id);
  await write(() => repo.setRead(id, true));
}

export async function toggleMark(id: string): Promise<void> {
  await write(() => repo.toggleMarked(id));
}

export async function toggleRead(id: string): Promise<void> {
  await write(() => repo.toggleRead(id));
}

/**
 * Mark read every entry the current selection matches — including ones the list
 * has not paged in. In the bookmarks view the visible set is narrowed by keyword
 * and tag filters, so there the caller passes the ids it is actually showing.
 */
export async function markAllRead(nodes: LibraryNode[], visibleIds?: string[]): Promise<void> {
  const { sel } = useStore.getState();
  if (sel.kind === 'bookmarks') {
    await write(() => repo.markReadByIds(visibleIds ?? []));
    return;
  }
  const feedIds = sel.kind === 'node' ? feedsUnder(nodes, sel.id) : undefined;
  await write(() => repo.markAllRead(sel, feedIds));
}

// ---------------------------------------------------------------------------
// Tree
// ---------------------------------------------------------------------------

export async function newFolder(): Promise<void> {
  const res = await write(() => repo.addFolder('New Folder', null));
  if (res.ok) useStore.getState().startRename(res.value, 'New Folder');
}

export async function addFeedNode(
  name: string,
  url: string,
  parentId: string | null,
): Promise<string | undefined> {
  const res = await write(() => repo.addFeed(name, url, parentId));
  if (!res.ok) return undefined;
  useStore.getState().selectNode(res.value);
  return res.value;
}

export async function toggleCollapse(id: string): Promise<void> {
  await write(() => repo.toggleCollapsed(id));
}

/** Commit an in-progress rename. Whitespace-only input keeps the old name. */
export async function commitRename(): Promise<void> {
  const { renamingId, renameValue } = useStore.getState();
  useStore.getState().endRename();
  const name = renameValue.trim();
  if (!renamingId || !name) return;
  await write(() => repo.renameNode(renamingId, name));
}

export async function deleteNode(id: string): Promise<void> {
  const res = await write(() => repo.deleteNode(id));
  if (!res.ok) return;
  const { sel, selectAll } = useStore.getState();
  if (sel.kind === 'node' && sel.id === id) selectAll();
}

/**
 * Re-parent a dragged node. Dropping onto a folder makes it a child; onto a feed,
 * a sibling under that feed's parent; onto nothing, a root node.
 *
 * Only the parent moves. Sibling order is not part of the tree's specified
 * behaviour, and the old array-splice that produced an incidental ordering went
 * away with the in-memory array.
 */
export async function moveNode(
  nodes: LibraryNode[],
  dragId: string | null,
  targetId: string | null,
): Promise<void> {
  useStore.getState().endDrag();
  if (!dragId || dragId === targetId) return;

  const target = targetId ? node(nodes, targetId) : null;
  const newParent = !target ? null : target.type === 'folder' ? target.id : target.parentId;
  // A folder cannot be dropped into itself or into its own descendants.
  if (dragId === newParent || isDescendant(nodes, dragId, newParent)) return;

  await write(() => repo.setParent(dragId, newParent));
}

// ---------------------------------------------------------------------------
// Whole library
// ---------------------------------------------------------------------------

/** Replace the library from an import, then send the UI back to a clean slate. */
export async function replaceLibrary(data: LibraryData): Promise<boolean> {
  const res = await write(() => repo.replaceLibrary(data));
  if (!res.ok) return false;
  useStore.getState().resetList();
  return true;
}

/** The feed ids a selection covers, or undefined when it is not a node. */
export function feedIdsFor(sel: Selection, nodes: LibraryNode[]): string[] | undefined {
  return sel.kind === 'node' ? feedsUnder(nodes, sel.id) : undefined;
}
