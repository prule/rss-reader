import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as actions from './actions';
import { useStore } from './store';
import { node } from './selectors';
import { entry, sampleTree } from '../test/fixtures';
import { resetLibrary, seedLibrary, storedEntry, storedNodes } from '../test/db';
import { db } from '../lib/db/db';
import { countUnread } from '../lib/db/repository';

beforeEach(async () => {
  await resetLibrary();
  await seedLibrary({
    nodes: sampleTree(),
    entries: [
      entry('e1', 's_ars', { publishedAt: 300 }),
      entry('e2', 's_pl', { publishedAt: 200 }),
      entry('e3', 's_lr', { publishedAt: 100 }),
    ],
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await resetLibrary();
});

describe('entry actions', () => {
  it('openEntry selects it and marks it read', async () => {
    await actions.openEntry('e1');
    expect((await storedEntry('e1'))!.read).toBe(true);
    expect(useStore.getState().selEntry).toBe('e1');
  });

  it('toggleMark and toggleRead flip state', async () => {
    await actions.toggleMark('e2');
    expect((await storedEntry('e2'))!.marked).toBe(true);
    await actions.toggleRead('e2');
    expect((await storedEntry('e2'))!.read).toBe(true);
  });

  it('markAllRead marks the current selection only', async () => {
    useStore.getState().selectNode('f_tech');
    await actions.markAllRead(await storedNodes());

    expect((await storedEntry('e1'))!.read).toBe(true); // s_ars, under f_tech
    expect((await storedEntry('e2'))!.read).toBe(true); // s_pl, under f_tech
    expect((await storedEntry('e3'))!.read).toBe(false); // s_lr, top level
  });

  it('markAllRead in the bookmarks view marks only the filtered ids', async () => {
    useStore.getState().selectBookmarks();
    await actions.markAllRead(await storedNodes(), ['e2']);
    expect((await storedEntry('e2'))!.read).toBe(true);
    expect((await storedEntry('e1'))!.read).toBe(false);
  });
});

describe('tree actions', () => {
  it('deleteNode on a folder reparents children and keeps entries', async () => {
    await actions.deleteNode('f_infra');
    const nodes = await storedNodes();
    expect(node(nodes, 'f_infra')).toBeUndefined();
    // s_pl moves up to f_tech (f_infra's parent)
    expect(node(nodes, 's_pl')!.parentId).toBe('f_tech');
    expect(await storedEntry('e2')).toBeDefined();
  });

  it('deleteNode on a feed removes its entries', async () => {
    await actions.deleteNode('s_pl');
    expect(node(await storedNodes(), 's_pl')).toBeUndefined();
    expect(await storedEntry('e2')).toBeUndefined();
  });

  it('deleting the selected node resets selection to all', async () => {
    useStore.getState().selectNode('s_pl');
    await actions.deleteNode('s_pl');
    expect(useStore.getState().sel).toEqual({ kind: 'all' });
  });

  it('moveNode into a folder reparents', async () => {
    await actions.moveNode(await storedNodes(), 's_lr', 'f_design');
    expect(node(await storedNodes(), 's_lr')!.parentId).toBe('f_design');
  });

  it('moveNode onto a feed makes it a sibling', async () => {
    const nodes = await storedNodes();
    await actions.moveNode(nodes, 's_lr', 's_ars'); // s_ars parent is f_tech
    expect(node(await storedNodes(), 's_lr')!.parentId).toBe('f_tech');
  });

  it('moveNode to top level clears parent', async () => {
    await actions.moveNode(await storedNodes(), 's_pl', null);
    expect(node(await storedNodes(), 's_pl')!.parentId).toBeNull();
  });

  it('moveNode rejects dropping a folder into its own descendant', async () => {
    const nodes = await storedNodes();
    const before = nodes.map((n) => ({ id: n.id, p: n.parentId }));
    await actions.moveNode(nodes, 'f_tech', 'f_infra'); // f_infra is inside f_tech
    const after = (await storedNodes()).map((n) => ({ id: n.id, p: n.parentId }));
    expect(after).toEqual(before);
  });

  it('commitRename with empty value keeps the old name', async () => {
    useStore.getState().startRename('f_design', 'Design');
    useStore.getState().setRenameValue('   ');
    await actions.commitRename();
    expect(node(await storedNodes(), 'f_design')!.name).toBe('Design');
  });

  it('commitRename applies a trimmed name', async () => {
    useStore.getState().startRename('f_design', 'Design');
    useStore.getState().setRenameValue('  Visual  ');
    await actions.commitRename();
    expect(node(await storedNodes(), 'f_design')!.name).toBe('Visual');
  });

  it('newFolder creates one and starts renaming it', async () => {
    await actions.newFolder();
    const folders = (await storedNodes()).filter((n) => n.name === 'New Folder');
    expect(folders).toHaveLength(1);
    expect(useStore.getState().renamingId).toBe(folders[0].id);
  });
});

describe('failed writes are reported, not swallowed', () => {
  it('surfaces a quota failure and does not claim success', async () => {
    vi.spyOn(db.entries, 'update').mockRejectedValue(
      new DOMException('full', 'QuotaExceededError'),
    );

    await actions.toggleMark('e1');

    expect(useStore.getState().toast).toMatch(/storage is full/i);
    // The entry is unchanged: nothing pretended to have been saved.
    expect((await storedEntry('e1'))!.marked).toBe(false);
  });

  it('surfaces any other write failure', async () => {
    vi.spyOn(db.entries, 'update').mockRejectedValue(new Error('disk gone'));
    await actions.toggleRead('e1');
    expect(useStore.getState().toast).toMatch(/could not save/i);
  });

  it('does not reset the selection when a delete failed', async () => {
    useStore.getState().selectNode('s_pl');
    vi.spyOn(db, 'transaction').mockRejectedValue(new Error('interrupted'));

    await actions.deleteNode('s_pl');

    expect(useStore.getState().toast).toMatch(/could not save/i);
    expect(useStore.getState().sel).toEqual({ kind: 'node', id: 's_pl' });
  });

  it('reports a failed import and leaves the library alone', async () => {
    vi.spyOn(db, 'transaction').mockRejectedValue(new Error('interrupted'));

    const ok = await actions.replaceLibrary({ nodes: [], entries: [] });

    expect(ok).toBe(false);
    expect(useStore.getState().toast).toMatch(/could not save/i);
  });
});

describe('replaceLibrary', () => {
  it('replaces the library and resets the view', async () => {
    useStore.getState().selectBookmarks();
    useStore.setState({ query: 'x', activeTags: ['t'] });

    const ok = await actions.replaceLibrary({
      nodes: [{ id: 'n1', type: 'feed', name: 'Fresh', parentId: null, collapsed: false }],
      entries: [entry('new1', 'n1', { read: false })],
    });

    expect(ok).toBe(true);
    expect(await storedNodes()).toHaveLength(1);
    expect(await countUnread()).toBe(1);
    expect(useStore.getState().sel).toEqual({ kind: 'all' });
    expect(useStore.getState().query).toBe('');
  });
});
