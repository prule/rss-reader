import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './store';

// The store holds UI state only. Everything that touches the library is in
// actions.ts and tested in actions.test.ts against the real database.
const reset = () =>
  useStore.setState({
    sel: { kind: 'all' },
    selEntry: null,
    activeTags: [],
    query: '',
    listEpoch: 0,
    renamingId: null,
    renameValue: '',
  });

describe('selection', () => {
  beforeEach(reset);

  it('switching selection restarts paging', () => {
    const before = useStore.getState().listEpoch;
    useStore.getState().selectUnread();
    expect(useStore.getState().sel).toEqual({ kind: 'unread' });
    expect(useStore.getState().listEpoch).toBe(before + 1);

    useStore.getState().selectNode('f_tech');
    expect(useStore.getState().sel).toEqual({ kind: 'node', id: 'f_tech' });
    expect(useStore.getState().listEpoch).toBe(before + 2);
  });

  it('resetList clears filters and returns to All Entries', () => {
    useStore.setState({ sel: { kind: 'bookmarks' }, query: 'x', activeTags: ['t'] });
    useStore.getState().resetList();
    const s = useStore.getState();
    expect(s.sel).toEqual({ kind: 'all' });
    expect(s.query).toBe('');
    expect(s.activeTags).toEqual([]);
    expect(s.selEntry).toBeNull();
  });

  it('toggleTag adds and removes', () => {
    useStore.getState().toggleTag('Design');
    expect(useStore.getState().activeTags).toEqual(['Design']);
    useStore.getState().toggleTag('Design');
    expect(useStore.getState().activeTags).toEqual([]);
  });
});

describe('rename state', () => {
  beforeEach(reset);

  it('startRename seeds the field with the current name', () => {
    useStore.getState().startRename('f_design', 'Design');
    expect(useStore.getState().renamingId).toBe('f_design');
    expect(useStore.getState().renameValue).toBe('Design');
  });

  it('cancelRename drops the edit', () => {
    useStore.getState().startRename('f_design', 'Design');
    useStore.getState().cancelRename();
    expect(useStore.getState().renamingId).toBeNull();
  });
});

describe('storage lifecycle state', () => {
  it('starts out loading, so the shell does not show an empty library', () => {
    useStore.setState({ dbStatus: 'loading', storageNotice: '' });
    expect(useStore.getState().dbStatus).toBe('loading');
  });

  it('records an unavailable store with its notice', () => {
    useStore.getState().noteStorage('Local storage is unavailable');
    useStore.getState().setDbStatus('unavailable');
    expect(useStore.getState().dbStatus).toBe('unavailable');
    expect(useStore.getState().storageNotice).toBe('Local storage is unavailable');
  });

  it('holds a legacy payload until the rescue offer is answered', () => {
    useStore.getState().offerLegacyPayload('{"nodes":[],"entries":[]}');
    expect(useStore.getState().legacyPayload).toBeTruthy();
    useStore.getState().clearLegacyPayload();
    expect(useStore.getState().legacyPayload).toBeNull();
  });
});

describe('add-feed discovery state', () => {
  const cands = [
    { url: 'https://x/feed', type: 'rss' as const, title: 'X' },
    { url: 'https://y/feed', type: 'atom' as const, title: 'Y' },
  ];

  it('showCandidates enters the choosing phase with all selected by default', () => {
    useStore.getState().openAddFeed();
    useStore.getState().showCandidates(cands);
    const s = useStore.getState();
    expect(s.addPhase).toBe('choosing');
    expect(s.discovering).toBe(false);
    expect(s.selectedUrls).toEqual(['https://x/feed', 'https://y/feed']);
  });

  it('toggleCandidate flips a single selection', () => {
    useStore.getState().showCandidates(cands);
    useStore.getState().toggleCandidate('https://x/feed');
    expect(useStore.getState().selectedUrls).toEqual(['https://y/feed']);
  });

  it('closeAddFeed clears all transient discovery state', () => {
    useStore.getState().showCandidates(cands);
    useStore.getState().setDiscovering(true);
    useStore.getState().closeAddFeed();
    const s = useStore.getState();
    expect(s.showAddFeed).toBe(false);
    expect(s.addPhase).toBe('input');
    expect(s.discovering).toBe(false);
    expect(s.candidates).toEqual([]);
    expect(s.selectedUrls).toEqual([]);
  });
});
