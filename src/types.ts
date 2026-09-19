// Core domain types for the RSS Reader's local library.

export type NodeType = 'folder' | 'feed';

/** A node in the navigation tree: a folder or a feed. */
export interface LibraryNode {
  id: string;
  type: NodeType;
  name: string;
  /** Parent folder id, or null when the node lives at the top level. */
  parentId: string | null;
  collapsed: boolean;
  /** Feed URL. Present on feeds, absent on folders. */
  url?: string;
  /** Epoch ms of this feed's last successful fetch. Absent = never fetched. */
  fetchedAt?: number;
}

/** A single feed entry, normalized from RSS/Atom (or created by the mock). */
export interface Entry {
  id: string;
  feedId: string;
  title: string;
  author: string;
  /** Canonical link to the item, when the feed provides one. */
  link: string | null;
  /** Stable identity used for dedup: guid/id, else link, else content hash. */
  guid: string;
  /** Absolute publish time in epoch ms, or null when the feed gives none. */
  publishedAt: number | null;
  /** Plain-text preview derived from the body. */
  snippet: string;
  /** Sanitized HTML body. */
  body: string;
  read: boolean;
  marked: boolean;
}

/** What the entry list is currently showing. */
export type Selection =
  | { kind: 'all' }
  | { kind: 'unread' }
  | { kind: 'bookmarks' }
  | { kind: 'node'; id: string };

/** The add-feed dialog form. */
export interface FeedForm {
  url: string;
  name: string;
  parent: string;
}

/** The persisted portion of the library. */
export interface LibraryData {
  nodes: LibraryNode[];
  entries: Entry[];
}

/** Current on-disk payload shape. */
export interface LibraryPayloadV1 extends LibraryData {
  version: 1;
}
