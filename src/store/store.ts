// UI state only. The library itself lives in IndexedDB and is read through
// src/lib/db/repository.ts — see openspec/specs/library-persistence. Keeping the
// two apart is what lets a read-toggle write one row instead of the whole store.
import { create } from 'zustand';
import type { FeedForm, Selection } from '../types';
import type { DiscoveredFeed } from '../lib/relay';

/** Which step the add-feed dialog is showing. */
export type AddPhase = 'input' | 'choosing' | 'none';

/** How far along opening the local database is. */
export type DbStatus = 'loading' | 'ready' | 'unavailable';

export interface AppState {
  // Storage lifecycle
  dbStatus: DbStatus;
  /** Set when the stored library turned out to be gone or unreadable. */
  storageNotice: string;

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
  /** Bumped to ask the entry list to re-page from the top. */
  listEpoch: number;
  /** A library left by the pre-database build, awaiting the one-time rescue offer. */
  legacyPayload: string | null;

  // Storage lifecycle
  setDbStatus: (status: DbStatus) => void;
  noteStorage: (message: string) => void;
  offerLegacyPayload: (raw: string) => void;
  clearLegacyPayload: () => void;

  // Selection
  selectAll: () => void;
  selectUnread: () => void;
  selectBookmarks: () => void;
  selectNode: (id: string) => void;
  setSelEntry: (id: string | null) => void;

  // Hover / tree ui
  setHover: (id: string | null) => void;

  // Rename
  startRename: (id: string, current: string) => void;
  setRenameValue: (v: string) => void;
  endRename: () => void;
  cancelRename: () => void;

  // Drag state
  setDrag: (id: string | null) => void;
  setDrop: (id: string | null) => void;
  setDropRoot: (v: boolean) => void;
  endDrag: () => void;

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
  /** Reset the entry list to its first page — after an import or a selection reset. */
  resetList: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

const emptyForm = (): FeedForm => ({ url: '', name: '', parent: '' });

export const useStore = create<AppState>((set) => ({
  dbStatus: 'loading',
  storageNotice: '',
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
  listEpoch: 0,
  legacyPayload: null,

  setDbStatus: (dbStatus) => set({ dbStatus }),
  noteStorage: (storageNotice) => set({ storageNotice }),
  offerLegacyPayload: (raw) => set({ legacyPayload: raw }),
  clearLegacyPayload: () => set({ legacyPayload: null }),

  // Changing selection restarts paging: a cursor from one selection is
  // meaningless in another.
  selectAll: () => set((s) => ({ sel: { kind: 'all' }, listEpoch: s.listEpoch + 1 })),
  selectUnread: () => set((s) => ({ sel: { kind: 'unread' }, listEpoch: s.listEpoch + 1 })),
  selectBookmarks: () => set((s) => ({ sel: { kind: 'bookmarks' }, listEpoch: s.listEpoch + 1 })),
  selectNode: (id) => set((s) => ({ sel: { kind: 'node', id }, listEpoch: s.listEpoch + 1 })),
  setSelEntry: (id) => set({ selEntry: id }),

  setHover: (id) => set((s) => (s.hoverId === id ? s : { hoverId: id })),

  startRename: (id, current) => set({ renamingId: id, renameValue: current }),
  setRenameValue: (v) => set({ renameValue: v }),
  endRename: () => set({ renamingId: null }),
  cancelRename: () => set({ renamingId: null }),

  setDrag: (id) => set({ dragId: id }),
  setDrop: (id) => set((s) => (s.dropId === id ? s : { dropId: id, dropRoot: false })),
  setDropRoot: (v) => set((s) => (s.dropRoot === v ? s : { dropRoot: v, dropId: null })),
  endDrag: () => set({ dragId: null, dropId: null, dropRoot: false }),

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
  resetList: () =>
    set((s) => ({
      sel: { kind: 'all' },
      selEntry: null,
      activeTags: [],
      query: '',
      listEpoch: s.listEpoch + 1,
    })),
}));
