import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './store';
import { entry, sampleTree } from '../test/fixtures';
import { node } from './selectors';

const reset = () =>
  useStore.setState({
    nodes: sampleTree(),
    entries: [
      entry('e1', 's_ars'),
      entry('e2', 's_pl'),
      entry('e3', 's_lr'),
    ],
    sel: { kind: 'all' },
    selEntry: null,
    activeTags: [],
    query: '',
  });

describe('store mutations', () => {
  beforeEach(reset);

  it('openEntry marks the entry read', () => {
    useStore.getState().openEntry('e1');
    expect(useStore.getState().entries.find((e) => e.id === 'e1')!.read).toBe(true);
    expect(useStore.getState().selEntry).toBe('e1');
  });

  it('toggleMark and toggleRead flip state', () => {
    useStore.getState().toggleMark('e2');
    expect(useStore.getState().entries.find((e) => e.id === 'e2')!.marked).toBe(true);
    useStore.getState().toggleRead('e2');
    expect(useStore.getState().entries.find((e) => e.id === 'e2')!.read).toBe(true);
  });

  it('markVisibleRead marks the current list', () => {
    useStore.setState({ sel: { kind: 'node', id: 'f_tech' } });
    useStore.getState().markVisibleRead();
    const e = useStore.getState().entries;
    expect(e.find((x) => x.id === 'e1')!.read).toBe(true); // s_ars, under f_tech
    expect(e.find((x) => x.id === 'e2')!.read).toBe(true); // s_pl, under f_tech
    expect(e.find((x) => x.id === 'e3')!.read).toBe(false); // s_lr, top level
  });

  it('deleteNode on a folder reparents children and keeps entries', () => {
    useStore.getState().deleteNode('f_infra');
    const nodes = useStore.getState().nodes;
    expect(node(nodes, 'f_infra')).toBeUndefined();
    // s_pl moves up to f_tech (f_infra's parent)
    expect(node(nodes, 's_pl')!.parentId).toBe('f_tech');
    expect(useStore.getState().entries.some((e) => e.id === 'e2')).toBe(true);
  });

  it('deleteNode on a feed removes its entries', () => {
    useStore.getState().deleteNode('s_pl');
    expect(node(useStore.getState().nodes, 's_pl')).toBeUndefined();
    expect(useStore.getState().entries.some((e) => e.feedId === 's_pl')).toBe(false);
  });

  it('deleting the selected node resets selection to all', () => {
    useStore.setState({ sel: { kind: 'node', id: 's_pl' } });
    useStore.getState().deleteNode('s_pl');
    expect(useStore.getState().sel).toEqual({ kind: 'all' });
  });

  it('moveNode into a folder reparents', () => {
    useStore.getState().moveNode('s_lr', 'f_design');
    expect(node(useStore.getState().nodes, 's_lr')!.parentId).toBe('f_design');
  });

  it('moveNode onto a feed makes it a sibling', () => {
    useStore.getState().moveNode('s_lr', 's_ars'); // s_ars parent is f_tech
    expect(node(useStore.getState().nodes, 's_lr')!.parentId).toBe('f_tech');
  });

  it('moveNode to top level clears parent', () => {
    useStore.getState().moveNode('s_pl', null);
    expect(node(useStore.getState().nodes, 's_pl')!.parentId).toBeNull();
  });

  it('moveNode rejects dropping a folder into its own descendant', () => {
    const before = useStore.getState().nodes.map((n) => ({ id: n.id, p: n.parentId }));
    useStore.getState().moveNode('f_tech', 'f_infra'); // f_infra is inside f_tech
    const after = useStore.getState().nodes.map((n) => ({ id: n.id, p: n.parentId }));
    expect(after).toEqual(before);
  });

  it('commitRename with empty value keeps the old name', () => {
    useStore.getState().startRename('f_design');
    useStore.getState().setRenameValue('   ');
    useStore.getState().commitRename();
    expect(node(useStore.getState().nodes, 'f_design')!.name).toBe('Design');
  });

  it('toggleTag adds and removes', () => {
    useStore.getState().toggleTag('Design');
    expect(useStore.getState().activeTags).toEqual(['Design']);
    useStore.getState().toggleTag('Design');
    expect(useStore.getState().activeTags).toEqual([]);
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
