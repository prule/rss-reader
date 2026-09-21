import { useMemo, useRef } from 'react';
import { useStore } from '../store/store';
import { bookmarkTags, feedsUnder, node, tagsFor } from '../store/selectors';
import { useBookmarks, useCountFor, useEntryPages, useNodes } from '../hooks/useLibrary';
import * as actions from '../store/actions';
import { timeAgo } from '../lib/timeAgo';
import type { Entry, LibraryNode, Selection } from '../types';
import { IconBookmark, IconSearch } from './icons';

const SEL_BG = 'color-mix(in srgb, var(--color-accent) 22%, transparent)';
const ACCENT = 'var(--color-accent)';
const MUTED30 = 'color-mix(in srgb, var(--color-text) 30%, transparent)';

/** How close to the bottom counts as "at the end", in px. */
const SCROLL_SLACK = 48;

/** Stable empty tree, so a not-yet-loaded library does not churn memo deps. */
const NO_NODES: LibraryNode[] = [];

function listTitle(sel: Selection, nodes: LibraryNode[]): string {
  if (sel.kind === 'all') return 'All Entries';
  if (sel.kind === 'unread') return 'Unread';
  if (sel.kind === 'bookmarks') return 'Bookmarks';
  const n = node(nodes, sel.id);
  return n ? n.name : 'All Entries';
}

export function EntryList() {
  const s = useStore();
  const nodes = useNodes() ?? NO_NODES;
  const bookmarkMode = s.sel.kind === 'bookmarks';

  // Bookmarks are a small set and their filters (keyword, tag chips) are derived
  // from the tree, so that view works over the whole set rather than paging.
  const bookmarks = useBookmarks();
  const paged = useEntryPages(s.sel, nodes, s.listEpoch);
  const total = useCountFor(s.sel, nodes);

  const filteredBookmarks = useMemo(
    () => filterBookmarks(bookmarks ?? [], nodes, s.query, s.activeTags),
    [bookmarks, nodes, s.query, s.activeTags],
  );

  const list = bookmarkMode ? filteredBookmarks : paged.entries;
  const title = listTitle(s.sel, nodes);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedNode = s.sel.kind === 'node' ? node(nodes, s.sel.id) : undefined;
  const shown = bookmarkMode ? filteredBookmarks.length : (total ?? list.length);
  const subtitle =
    selectedNode && selectedNode.type === 'folder'
      ? `${feedsUnder(nodes, selectedNode.id).length} feeds · ${shown} entries`
      : `${shown} entries`;

  const onScroll = () => {
    if (bookmarkMode || paged.loading || paged.atEnd) return;
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_SLACK) paged.loadMore();
  };

  return (
    <section className="list-col" aria-label="Entries">
      <div className="list-head">
        <div className="list-head-row">
          <h4 className="list-title">{title}</h4>
          <button
            className="btn btn-ghost"
            onClick={() =>
              void actions.markAllRead(
                nodes,
                bookmarkMode ? filteredBookmarks.map((e) => e.id) : undefined,
              )
            }
            style={{ fontSize: 11, height: 22 }}
          >
            Mark all read
          </button>
        </div>
        {bookmarkMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div className="search-box">
              <span
                style={{
                  display: 'flex',
                  color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
                }}
              >
                <IconSearch />
              </span>
              <input
                data-search
                aria-label="Search bookmarks"
                placeholder="Search bookmarks — keywords or tags"
                value={s.query}
                onChange={(e) => s.setQuery(e.target.value)}
              />
            </div>
            <div className="chips">
              {bookmarkTags(nodes, bookmarks ?? []).map((t) => {
                const on = s.activeTags.includes(t);
                return (
                  <button
                    key={t}
                    className={`chip${on ? ' on' : ''}`}
                    aria-pressed={on}
                    onClick={() => s.toggleTag(t)}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="list-subtitle">{subtitle}</div>
        )}
      </div>

      <div className="list-scroll" ref={scrollRef} onScroll={onScroll}>
        {list.map((e) => (
          <EntryRow key={e.id} entry={e} nodes={nodes} active={s.selEntry === e.id} />
        ))}

        {list.length === 0 && !paged.loading && (
          <div className="empty">
            {bookmarkMode ? 'No bookmarks match these tags and keywords.' : 'Nothing here yet.'}
          </div>
        )}

        {!bookmarkMode && paged.loading && (
          <div className="list-more" data-testid="loading-more" role="status">
            Loading more…
          </div>
        )}

        {!bookmarkMode && paged.atEnd && list.length > 0 && (
          <div className="list-end" data-testid="list-end">
            No more entries
          </div>
        )}
      </div>
    </section>
  );
}

function EntryRow({
  entry: e,
  nodes,
  active,
}: {
  entry: Entry;
  nodes: LibraryNode[];
  active: boolean;
}) {
  const feed = node(nodes, e.feedId);
  const ago = timeAgo(e.publishedAt);
  const meta = [feed ? feed.name : 'Removed feed', ago, e.author].filter(Boolean).join(' · ');

  return (
    <div
      className="entry-row"
      data-testid={`entry-${e.id}`}
      onClick={() => void actions.openEntry(e.id)}
      style={{ padding: '10px 12px', background: active ? SEL_BG : 'transparent' }}
    >
      <span className="entry-dot" style={{ background: e.read ? 'transparent' : ACCENT }} />
      <div className="entry-main">
        <div className="entry-title" style={{ fontWeight: e.read ? 400 : 600 }}>
          {e.title}
        </div>
        <div className="entry-meta">{meta}</div>
        {e.snippet && <div className="entry-snippet">{e.snippet}</div>}
      </div>
      <button
        className="icon-btn"
        title="Bookmark"
        aria-label={e.marked ? `Remove bookmark from ${e.title}` : `Bookmark ${e.title}`}
        onClick={(ev) => {
          ev.stopPropagation();
          void actions.toggleMark(e.id);
        }}
        style={{ color: e.marked ? 'var(--color-accent-700)' : MUTED30 }}
      >
        <IconBookmark fill={e.marked} />
      </button>
    </div>
  );
}

/** Keyword and tag filtering for the bookmarks view, over the tree's live tags. */
function filterBookmarks(
  bookmarks: Entry[],
  nodes: LibraryNode[],
  query: string,
  activeTags: string[],
): Entry[] {
  const q = query.trim().toLowerCase();
  return bookmarks.filter((e) => {
    const tags = tagsFor(nodes, e.feedId);
    if (!activeTags.every((t) => tags.includes(t))) return false;
    if (!q) return true;
    return (e.title + ' ' + e.snippet + ' ' + tags.join(' ')).toLowerCase().includes(q);
  });
}
