import { create } from 'zustand';
import type { Entry, FeedForm, LibraryData, LibraryNode, Selection } from '../types';
import type { DiscoveredFeed } from '../lib/relay';
import { makeId } from '../lib/id';
import { isDescendant, node, visibleEntries } from './selectors';

/** Which step the add-feed dialog is showing. */
export type AddPhase = 'input' | 'choosing' | 'none';

export interface AppState {
  // Persisted
  nodes: LibraryNode[];
  entries: Entry[];

  // UI
  sel: Selection;
  selEntry: string | null;
  hoverId: string | null;
  renamingId: string | null;
  renameValue: string;
  dragId: string | null;
  dropId: string | null;
  dropRoot: boolean;
  showAddFeed: boolean;
  form: FeedForm;
  // Discovery step of the add-feed dialog (transient; never persisted).
  addPhase: AddPhase;
  discovering: boolean;
  candidates: DiscoveredFeed[];
  selectedUrls: string[];
  query: string;
  activeTags: string[];
  toast: string;
  refreshing: boolean;

  // Hydration / bulk replace
  hydrate: (data: LibraryData) => void;
  replaceLibrary: (data: LibraryData) => void;

  // Selection
  selectAll: () => void;
  selectUnread: () => void;
  selectBookmarks: () => void;
  selectNode: (id: string) => void;
  openEntry: (id: string) => void;

  // Hover / tree ui
  setHover: (id: string | null) => void;
  toggleCollapse: (id: string) => void;

  // Rename
  startRename: (id: string) => void;
  setRenameValue: (v: string) => void;
  commitRename: () => void;
  cancelRename: () => void;

  // Structure
  newFolder: () => void;
  addFeedNode: (name: string, url: string, parentId: string | null) => string;
  markFetched: (feedId: string, when: number) => void;
  deleteNode: (id: string) => void;
  moveNode: (dragId: string | null, targetId: string | null) => void;

  // Drag state
  setDrag: (id: string | null) => void;
  setDrop: (id: string | null) => void;
  setDropRoot: (v: boolean) => void;
  endDrag: () => void;

  // Entries
  addEntries: (entries: Entry[]) => void;
  setEntries: (entries: Entry[]) => void;
  patchEntry: (id: string, patch: Partial<Entry>) => void;
  toggleMark: (id: string) => void;
  toggleRead: (id: string) => void;
  markVisibleRead: () => void;

  // Add-feed form
  openAddFeed: () => void;
  closeAddFeed: () => void;
  setForm: (patch: Partial<FeedForm>) => void;

  // Add-feed discovery step
  setDiscovering: (v: boolean) => void;
  showCandidates: (candidates: DiscoveredFeed[]) => void;
  showNoneFound: () => void;
  toggleCandidate: (url: string) => void;
  backToInput: () => void;

  // Search
  setQuery: (q: string) => void;
  toggleTag: (tag: string) => void;

  // Status / refresh
  setRefreshing: (v: boolean) => void;
  say: (msg: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

const emptyForm = (): FeedForm => ({ url: '', name: '', parent: '' });

export const useStore = create<AppState>((set, get) => ({
  nodes: [],
  entries: [],
  sel: { kind: 'all' },
  selEntry: null,
  hoverId: null,
  renamingId: null,
  renameValue: '',
  dragId: null,
  dropId: null,
  dropRoot: false,
  showAddFeed: false,
  form: emptyForm(),
  addPhase: 'input',
  discovering: false,
  candidates: [],
  selectedUrls: [],
  query: '',
  activeTags: [],
  toast: '',
  refreshing: false,

  hydrate: (data) => set({ nodes: data.nodes, entries: data.entries }),
  replaceLibrary: (data) =>
    set({
      nodes: data.nodes,
      entries: data.entries,
      sel: { kind: 'all' },
      selEntry: null,
      activeTags: [],
      query: '',
    }),

  selectAll: () => set({ sel: { kind: 'all' } }),
  selectUnread: () => set({ sel: { kind: 'unread' } }),
  selectBookmarks: () => set({ sel: { kind: 'bookmarks' } }),
  selectNode: (id) => set({ sel: { kind: 'node', id } }),
  openEntry: (id) =>
    set((s) => ({
      selEntry: id,
      entries: s.entries.map((e) => (e.id === id ? { ...e, read: true } : e)),
    })),

  setHover: (id) => set((s) => (s.hoverId === id ? s : { hoverId: id })),
  toggleCollapse: (id) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id && n.type === 'folder' ? { ...n, collapsed: !n.collapsed } : n,
      ),
    })),

  startRename: (id) => {
    const n = node(get().nodes, id);
    set({ renamingId: id, renameValue: n ? n.name : '' });
  },
  setRenameValue: (v) => set({ renameValue: v }),
  commitRename: () =>
    set((s) => {
      const id = s.renamingId;
      const v = s.renameValue.trim();
      if (!id) return { renamingId: null };
      return {
        nodes: v ? s.nodes.map((n) => (n.id === id ? { ...n, name: v } : n)) : s.nodes,
        renamingId: null,
      };
    }),
  cancelRename: () => set({ renamingId: null }),

  newFolder: () => {
    const id = makeId('f');
    set((s) => ({
      nodes: s.nodes.concat([
        { id, type: 'folder', name: 'New Folder', parentId: null, collapsed: false },
      ]),
      renamingId: id,
      renameValue: 'New Folder',
    }));
  },

  addFeedNode: (name, url, parentId) => {
    const id = makeId('s');
    set((s) => ({
      nodes: s.nodes.concat([
        { id, type: 'feed', name, parentId: parentId ?? null, collapsed: false, url },
      ]),
      sel: { kind: 'node', id },
    }));
    return id;
  },

  markFetched: (feedId, when) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === feedId ? { ...n, fetchedAt: when } : n)),
    })),

  deleteNode: (id) =>
    set((s) => {
      const n = s.nodes.find((x) => x.id === id);
      const nodes = s.nodes
        .filter((x) => x.id !== id)
        .map((x) => (x.parentId === id ? { ...x, parentId: n ? n.parentId : null } : x));
      const feedGone = n && n.type === 'feed';
      const selCleared = s.sel.kind === 'node' && s.sel.id === id;
      return {
        nodes,
        entries: feedGone ? s.entries.filter((e) => e.feedId !== id) : s.entries,
        sel: selCleared ? { kind: 'all' } : s.sel,
      };
    }),

  moveNode: (dragId, targetId) =>
    set((s) => {
      if (!dragId || dragId === targetId) return { dragId: null, dropId: null, dropRoot: false };
      const target = targetId ? node(s.nodes, targetId) : null;
      const newParent = !target ? null : target.type === 'folder' ? target.id : target.parentId;
      if (dragId === newParent || isDescendant(s.nodes, dragId, newParent)) {
        return { dragId: null, dropId: null, dropRoot: false };
      }
      const nodes = s.nodes.slice();
      const i = nodes.findIndex((n) => n.id === dragId);
      if (i < 0) return { dragId: null, dropId: null, dropRoot: false };
      const moved: LibraryNode = { ...nodes[i], parentId: newParent };
      nodes.splice(i, 1);
      let at = target ? nodes.findIndex((n) => n.id === target.id) + 1 : nodes.length;
      if (at < 0) at = nodes.length;
      nodes.splice(at, 0, moved);
      return { nodes, dragId: null, dropId: null, dropRoot: false };
    }),

  setDrag: (id) => set({ dragId: id }),
  setDrop: (id) => set((s) => (s.dropId === id ? s : { dropId: id, dropRoot: false })),
  setDropRoot: (v) => set((s) => (s.dropRoot === v ? s : { dropRoot: v, dropId: null })),
  endDrag: () => set({ dragId: null, dropId: null, dropRoot: false }),

  addEntries: (incoming) => set((s) => ({ entries: s.entries.concat(incoming) })),
  setEntries: (entries) => set({ entries }),
  patchEntry: (id, patch) =>
    set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
  toggleMark: (id) =>
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, marked: !e.marked } : e)),
    })),
  toggleRead: (id) =>
    set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, read: !e.read } : e)) })),
  markVisibleRead: () =>
    set((s) => {
      const ids = new Set(
        visibleEntries(s.nodes, s.entries, s.sel, s.query, s.activeTags).map((e) => e.id),
      );
      return { entries: s.entries.map((e) => (ids.has(e.id) ? { ...e, read: true } : e)) };
    }),

  openAddFeed: () =>
    set({
      showAddFeed: true,
      addPhase: 'input',
      discovering: false,
      candidates: [],
      selectedUrls: [],
    }),
  closeAddFeed: () =>
    set({
      showAddFeed: false,
      form: emptyForm(),
      addPhase: 'input',
      discovering: false,
      candidates: [],
      selectedUrls: [],
    }),
  setForm: (patch) => set((s) => ({ form: { ...s.form, ...patch } })),

  setDiscovering: (v) => set({ discovering: v }),
  showCandidates: (candidates) =>
    set({
      addPhase: 'choosing',
      discovering: false,
      candidates,
      selectedUrls: candidates.map((c) => c.url), // default: all selected
    }),
  showNoneFound: () =>
    set({ addPhase: 'none', discovering: false, candidates: [], selectedUrls: [] }),
  toggleCandidate: (url) =>
    set((s) => ({
      selectedUrls: s.selectedUrls.includes(url)
        ? s.selectedUrls.filter((u) => u !== url)
        : s.selectedUrls.concat([url]),
    })),
  backToInput: () => set({ addPhase: 'input', candidates: [], selectedUrls: [] }),

  setQuery: (q) => set({ query: q }),
  toggleTag: (tag) =>
    set((s) => ({
      activeTags: s.activeTags.includes(tag)
        ? s.activeTags.filter((t) => t !== tag)
        : s.activeTags.concat([tag]),
    })),

  setRefreshing: (v) => set({ refreshing: v }),
  say: (msg) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: '' }), 2600);
  },
}));
