import { describe, expect, it } from 'vitest';
import {
  ancestors,
  bookmarkTags,
  feedsUnder,
  flatten,
  isDescendant,
  tagsFor,
  unreadFor,
  visibleEntries,
} from './selectors';
import { entry, feed, folder, sampleTree } from '../test/fixtures';

describe('selectors', () => {
  const nodes = sampleTree();

  it('feedsUnder aggregates recursively', () => {
    expect(feedsUnder(nodes, 'f_tech').sort()).toEqual(['s_ars', 's_pl']);
    expect(feedsUnder(nodes, 's_ars')).toEqual(['s_ars']);
    expect(feedsUnder(nodes, 'f_design')).toEqual(['s_tw']);
  });

  it('ancestors are root-first and exclude self', () => {
    expect(ancestors(nodes, 's_pl').map((n) => n.name)).toEqual([
      'Technology',
      'Infrastructure',
    ]);
    expect(ancestors(nodes, 's_lr')).toEqual([]);
  });

  it('tagsFor is the hierarchy path plus the feed name', () => {
    expect(tagsFor(nodes, 's_pl')).toEqual([
      'Technology',
      'Infrastructure',
      'Packet Loss Weekly',
    ]);
    expect(tagsFor(nodes, 's_lr')).toEqual(['Longreads']);
  });

  it('isDescendant walks up the tree', () => {
    expect(isDescendant(nodes, 'f_tech', 's_pl')).toBe(true);
    expect(isDescendant(nodes, 'f_infra', 's_pl')).toBe(true);
    expect(isDescendant(nodes, 'f_design', 's_pl')).toBe(false);
  });

  it('flatten skips children of collapsed folders', () => {
    const open = flatten(nodes).map((r) => r.node.id);
    expect(open).toContain('s_pl');
    const collapsed = flatten(
      nodes.map((n) => (n.id === 'f_infra' ? { ...n, collapsed: true } : n)),
    ).map((r) => r.node.id);
    expect(collapsed).not.toContain('s_pl');
    expect(collapsed).toContain('f_infra');
  });

  it('unreadFor counts only unread beneath a node', () => {
    const entries = [
      entry('e1', 's_ars', { read: false }),
      entry('e2', 's_ars', { read: true }),
      entry('e3', 's_pl', { read: false }),
    ];
    expect(unreadFor(nodes, entries, 'f_tech')).toBe(2);
    expect(unreadFor(nodes, entries, 's_ars')).toBe(1);
  });

  it('visibleEntries filters by selection', () => {
    const entries = [
      entry('e1', 's_ars', { read: false }),
      entry('e2', 's_pl', { read: true, marked: true }),
      entry('e3', 's_lr', { read: false, marked: true }),
    ];
    expect(visibleEntries(nodes, entries, { kind: 'all' }, '', []).length).toBe(3);
    expect(visibleEntries(nodes, entries, { kind: 'unread' }, '', []).map((e) => e.id)).toEqual([
      'e1',
      'e3',
    ]);
    expect(
      visibleEntries(nodes, entries, { kind: 'node', id: 'f_tech' }, '', []).map((e) => e.id),
    ).toEqual(['e1', 'e2']);
  });

  it('bookmark search combines tags (AND) and keyword', () => {
    const entries = [
      entry('e2', 's_pl', { marked: true, title: 'Anycast routing' }),
      entry('e3', 's_lr', { marked: true, title: 'Mapmakers' }),
    ];
    // tag filter: only Technology-tagged bookmarks
    expect(
      visibleEntries(nodes, entries, { kind: 'bookmarks' }, '', ['Technology']).map((e) => e.id),
    ).toEqual(['e2']);
    // two tags AND
    expect(
      visibleEntries(nodes, entries, { kind: 'bookmarks' }, '', [
        'Technology',
        'Design',
      ]),
    ).toEqual([]);
    // keyword
    expect(
      visibleEntries(nodes, entries, { kind: 'bookmarks' }, 'mapmakers', []).map((e) => e.id),
    ).toEqual(['e3']);
    // keyword + tag combined (no match)
    expect(
      visibleEntries(nodes, entries, { kind: 'bookmarks' }, 'anycast', ['Design']),
    ).toEqual([]);
  });

  it('bookmarkTags lists distinct tags across bookmarks only', () => {
    const entries = [
      entry('e1', 's_ars', { marked: false }),
      entry('e2', 's_pl', { marked: true }),
    ];
    expect(bookmarkTags(nodes, entries)).toEqual([
      'Technology',
      'Infrastructure',
      'Packet Loss Weekly',
    ]);
  });

  it('handles missing nodes gracefully', () => {
    expect(feedsUnder([folder('x', 'X')], 'missing')).toEqual([]);
    expect(tagsFor([feed('y', 'Y')], 'missing')).toEqual([]);
  });
});
