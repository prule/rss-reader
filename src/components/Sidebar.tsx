import type { DragEvent } from 'react';
import { useStore } from '../store/store';
import { flatten, unreadFor } from '../store/selectors';
import {
  IconAll,
  IconBookmark,
  IconChevron,
  IconDelete,
  IconFeed,
  IconFolder,
  IconRename,
  IconUnread,
} from './icons';

const SEL_BG = 'color-mix(in srgb, var(--color-accent) 22%, transparent)';
const DROP_BG = 'color-mix(in srgb, var(--color-accent) 12%, transparent)';
const HOVER_BG = 'color-mix(in srgb, var(--color-text) 6%, transparent)';
const MUTED = 'color-mix(in srgb, var(--color-text) 55%, transparent)';

export function Sidebar() {
  const s = useStore();
  const rows = flatten(s.nodes);
  const totalCount = s.entries.length;
  const unreadCount = s.entries.filter((e) => !e.read).length;
  const bookmarkCount = s.entries.filter((e) => e.marked).length;

  const dragData = (e: DragEvent) => e.dataTransfer.getData('text/plain') || s.dragId;

  return (
    <nav
      className="sidebar"
      aria-label="Library"
      onDragOver={(e) => {
        e.preventDefault();
        s.setDropRoot(true);
      }}
      onDrop={(e) => {
        e.preventDefault();
        s.moveNode(dragData(e), null);
      }}
    >
      <div className="side-heading">Library</div>

      <div
        className="side-row"
        onClick={s.selectAll}
        style={{ background: s.sel.kind === 'all' ? SEL_BG : 'transparent' }}
      >
        <IconAll />
        <span className="grow">All Entries</span>
        <span className="count-muted">{totalCount}</span>
      </div>
      <div
        className="side-row"
        onClick={s.selectUnread}
        style={{ background: s.sel.kind === 'unread' ? SEL_BG : 'transparent' }}
      >
        <IconUnread />
        <span className="grow">Unread</span>
        <span className="count-accent">{unreadCount}</span>
      </div>
      <div
        className="side-row"
        onClick={s.selectBookmarks}
        style={{ background: s.sel.kind === 'bookmarks' ? SEL_BG : 'transparent' }}
      >
        <IconBookmark />
        <span className="grow">Bookmarks</span>
        <span className="count-muted">{bookmarkCount}</span>
      </div>

      <div className="side-heading" style={{ paddingTop: 'var(--space-4)' }}>
        Feeds
      </div>

      {rows.map(({ node: n, depth }) => {
        const selected = s.sel.kind === 'node' && s.sel.id === n.id;
        const hovered = s.hoverId === n.id;
        const renaming = s.renamingId === n.id;
        const unread = unreadFor(s.nodes, s.entries, n.id);
        const bg = selected
          ? SEL_BG
          : s.dropId === n.id
            ? DROP_BG
            : hovered
              ? HOVER_BG
              : 'transparent';
        return (
          <div
            key={n.id}
            className="tree-row"
            draggable
            data-testid={`node-${n.id}`}
            onClick={() => s.selectNode(n.id)}
            onMouseEnter={() => s.setHover(n.id)}
            onMouseLeave={() => s.hoverId === n.id && s.setHover(null)}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', n.id);
              s.setDrag(n.id);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              s.setDrop(n.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              s.moveNode(dragData(e), n.id);
            }}
            onDragEnd={s.endDrag}
            style={{
              paddingLeft: 10 + depth * 14,
              background: bg,
              boxShadow: s.dropId === n.id ? 'inset 0 0 0 1px var(--color-accent)' : 'none',
              opacity: s.dragId === n.id ? 0.4 : 1,
            }}
          >
            <span
              className="tree-chev"
              data-testid={`chev-${n.id}`}
              onClick={(e) => {
                e.stopPropagation();
                if (n.type === 'folder') s.toggleCollapse(n.id);
              }}
              style={{
                color: n.type === 'folder' ? MUTED : 'transparent',
                transform: n.type === 'folder' && !n.collapsed ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              <IconChevron />
            </span>

            {n.type === 'folder' ? (
              <span style={{ display: 'flex', color: 'var(--color-accent-700)', flex: 'none' }}>
                <IconFolder />
              </span>
            ) : (
              <span style={{ display: 'flex', color: MUTED, flex: 'none' }}>
                <IconFeed />
              </span>
            )}

            {renaming ? (
              <input
                className="rename-input"
                aria-label="Rename"
                autoFocus
                value={s.renameValue}
                onFocus={(e) => e.target.select()}
                onChange={(e) => s.setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') s.cancelRename();
                }}
                onBlur={s.commitRename}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="tree-name" style={{ fontWeight: selected ? 600 : 400 }}>
                {n.name}
              </span>
            )}

            <span className="tree-actions" style={{ opacity: hovered && !renaming ? 1 : 0 }}>
              <button
                className="icon-btn"
                title="Rename"
                aria-label={`Rename ${n.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  s.startRename(n.id);
                }}
              >
                <IconRename />
              </button>
              <button
                className="icon-btn"
                title="Delete"
                aria-label={`Delete ${n.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  s.deleteNode(n.id);
                }}
              >
                <IconDelete />
              </button>
            </span>

            <span
              className="tree-badge"
              style={{
                color: unread > 0 ? 'var(--color-accent-700)' : 'transparent',
              }}
            >
              {unread > 0 ? unread : ''}
            </span>
          </div>
        );
      })}

      <div
        className={`root-drop${s.dropRoot ? ' active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          s.setDropRoot(true);
        }}
        onDrop={(e) => {
          e.preventDefault();
          s.moveNode(dragData(e), null);
        }}
      />
    </nav>
  );
}
