import { useStore } from '../store/store';
import { bookmarkTags, feedsUnder, node, visibleEntries } from '../store/selectors';
import { timeAgo } from '../lib/timeAgo';
import { IconBookmark, IconSearch } from './icons';

const SEL_BG = 'color-mix(in srgb, var(--color-accent) 22%, transparent)';
const ACCENT = 'var(--color-accent)';
const MUTED30 = 'color-mix(in srgb, var(--color-text) 30%, transparent)';

function listTitle(s: ReturnType<typeof useStore.getState>): string {
  if (s.sel.kind === 'all') return 'All Entries';
  if (s.sel.kind === 'unread') return 'Unread';
  if (s.sel.kind === 'bookmarks') return 'Bookmarks';
  const n = node(s.nodes, s.sel.id);
  return n ? n.name : 'All Entries';
}

export function EntryList() {
  const s = useStore();
  const list = visibleEntries(s.nodes, s.entries, s.sel, s.query, s.activeTags);
  const title = listTitle(s);
  const bookmarkMode = s.sel.kind === 'bookmarks';

  const selectedNode = s.sel.kind === 'node' ? node(s.nodes, s.sel.id) : undefined;
  const subtitle =
    selectedNode && selectedNode.type === 'folder'
      ? `${feedsUnder(s.nodes, selectedNode.id).length} feeds · ${list.length} entries`
      : `${list.length} entries`;

  return (
    <section className="list-col" aria-label="Entries">
      <div className="list-head">
        <div className="list-head-row">
          <h4 className="list-title">{title}</h4>
          <button
            className="btn btn-ghost"
            onClick={s.markVisibleRead}
            style={{ fontSize: 11, height: 22 }}
          >
            Mark all read
          </button>
        </div>
        {bookmarkMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div className="search-box">
              <span style={{ display: 'flex', color: 'color-mix(in srgb, var(--color-text) 55%, transparent)' }}>
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
              {bookmarkTags(s.nodes, s.entries).map((t) => {
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

      <div className="list-scroll">
        {list.map((e) => {
          const feed = node(s.nodes, e.feedId);
          const active = s.selEntry === e.id;
          const ago = timeAgo(e.publishedAt);
          const meta = [feed ? feed.name : 'Removed feed', ago, e.author]
            .filter(Boolean)
            .join(' · ');
          return (
            <div
              key={e.id}
              className="entry-row"
              data-testid={`entry-${e.id}`}
              onClick={() => s.openEntry(e.id)}
              style={{ padding: '10px 12px', background: active ? SEL_BG : 'transparent' }}
            >
              <span
                className="entry-dot"
                style={{ background: e.read ? 'transparent' : ACCENT }}
              />
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
                  s.toggleMark(e.id);
                }}
                style={{ color: e.marked ? 'var(--color-accent-700)' : MUTED30 }}
              >
                <IconBookmark fill={e.marked} />
              </button>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="empty">
            {bookmarkMode
              ? 'No bookmarks match these tags and keywords.'
              : 'Nothing here yet.'}
          </div>
        )}
      </div>
    </section>
  );
}
