// Pure derivations over the flat nodes/entries arrays. These never store
// derived data — tags and aggregation are always computed from current
// structure — which keeps them consistent and unit-testable without a DOM.
import type { Entry, LibraryNode, Selection } from '../types';

export function node(nodes: LibraryNode[], id: string | null): LibraryNode | undefined {
  return id == null ? undefined : nodes.find((n) => n.id === id);
}

export function childrenOf(nodes: LibraryNode[], id: string | null): LibraryNode[] {
  return nodes.filter((n) => n.parentId === id);
}

/** Ancestor folders of a node, ordered root-first (excludes the node itself). */
export function ancestors(nodes: LibraryNode[], id: string): LibraryNode[] {
  const out: LibraryNode[] = [];
  let n = node(nodes, id);
  while (n && n.parentId) {
    const p = node(nodes, n.parentId);
    if (!p) break;
    out.unshift(p);
    n = p;
  }
  return out;
}

/** All feed ids at or below a node (a feed returns itself). */
export function feedsUnder(nodes: LibraryNode[], id: string): string[] {
  const n = node(nodes, id);
  if (!n) return [];
  if (n.type === 'feed') return [n.id];
  return childrenOf(nodes, id).reduce<string[]>(
    (acc, c) => acc.concat(feedsUnder(nodes, c.id)),
    [],
  );
}

/** True when `id` is a descendant of `maybeAncestor`. */
export function isDescendant(
  nodes: LibraryNode[],
  maybeAncestor: string,
  id: string | null,
): boolean {
  let n = node(nodes, id);
  while (n && n.parentId) {
    if (n.parentId === maybeAncestor) return true;
    n = node(nodes, n.parentId);
  }
  return false;
}

/** The hierarchy-path tags for a feed: ancestor folder names plus the feed name. */
export function tagsFor(nodes: LibraryNode[], feedId: string): string[] {
  const feed = node(nodes, feedId);
  if (!feed) return [];
  return ancestors(nodes, feedId)
    .map((a) => a.name)
    .concat([feed.name]);
}

export interface FlatRow {
  node: LibraryNode;
  depth: number;
}

/** Depth-first flatten of the tree, skipping children of collapsed folders. */
export function flatten(nodes: LibraryNode[]): FlatRow[] {
  const out: FlatRow[] = [];
  const walk = (parentId: string | null, depth: number) => {
    nodes
      .filter((n) => n.parentId === parentId)
      .forEach((n) => {
        out.push({ node: n, depth });
        if (n.type === 'folder' && !n.collapsed) walk(n.id, depth + 1);
      });
  };
  walk(null, 0);
  return out;
}

export function unreadFor(nodes: LibraryNode[], entries: Entry[], id: string): number {
  const feeds = feedsUnder(nodes, id);
  return entries.filter((e) => !e.read && feeds.includes(e.feedId)).length;
}

/** The entries shown for the current selection, applying bookmark search. */
export function visibleEntries(
  nodes: LibraryNode[],
  entries: Entry[],
  sel: Selection,
  query: string,
  activeTags: string[],
): Entry[] {
  if (sel.kind === 'unread') return entries.filter((e) => !e.read);
  if (sel.kind === 'node') {
    const feeds = feedsUnder(nodes, sel.id);
    return entries.filter((e) => feeds.includes(e.feedId));
  }
  if (sel.kind === 'bookmarks') {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => e.marked)
      .filter((e) => {
        const tags = tagsFor(nodes, e.feedId);
        const okTags = activeTags.every((t) => tags.includes(t));
        if (!okTags) return false;
        if (!q) return true;
        const hay = (e.title + ' ' + e.snippet + ' ' + tags.join(' ')).toLowerCase();
        return hay.includes(q);
      });
  }
  return entries; // all
}

/** Distinct hierarchy tags present across all bookmarked entries. */
export function bookmarkTags(nodes: LibraryNode[], entries: Entry[]): string[] {
  const out: string[] = [];
  entries
    .filter((e) => e.marked)
    .forEach((e) =>
      tagsFor(nodes, e.feedId).forEach((t) => {
        if (!out.includes(t)) out.push(t);
      }),
    );
  return out;
}

export function feedCount(nodes: LibraryNode[]): number {
  return nodes.filter((n) => n.type === 'feed').length;
}
