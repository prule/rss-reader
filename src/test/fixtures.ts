import type { Entry, LibraryNode } from '../types';

export function folder(id: string, name: string, parentId: string | null = null): LibraryNode {
  return { id, type: 'folder', name, parentId, collapsed: false };
}

export function feed(
  id: string,
  name: string,
  parentId: string | null = null,
  url = `https://example.com/${id}.xml`,
): LibraryNode {
  return { id, type: 'feed', name, parentId, collapsed: false, url };
}

export function entry(id: string, feedId: string, patch: Partial<Entry> = {}): Entry {
  return {
    id,
    feedId,
    title: `Title ${id}`,
    author: 'Author',
    link: `https://example.com/${id}`,
    guid: id,
    publishedAt: 0,
    snippet: `snippet ${id}`,
    body: `<p>body ${id}</p>`,
    read: false,
    marked: false,
    ...patch,
  };
}

/**
 * Tech
 *  ├─ Ars (s_ars)
 *  └─ Infra
 *      └─ Packet (s_pl)
 * Design
 *  └─ Typewolf (s_tw)
 * Longreads (s_lr)  [top level]
 */
export function sampleTree(): LibraryNode[] {
  return [
    folder('f_tech', 'Technology'),
    feed('s_ars', 'Ars Technica', 'f_tech'),
    folder('f_infra', 'Infrastructure', 'f_tech'),
    feed('s_pl', 'Packet Loss Weekly', 'f_infra'),
    folder('f_design', 'Design'),
    feed('s_tw', 'Typewolf', 'f_design'),
    feed('s_lr', 'Longreads', null),
  ];
}
