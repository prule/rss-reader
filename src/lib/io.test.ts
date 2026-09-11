import { describe, expect, it } from 'vitest';
import { buildCSV, buildJSON } from './exporters';
import { fromCSV, fromJSON, parseCSV } from './importers';
import { ancestors, tagsFor } from '../store/selectors';
import { entry, sampleTree } from '../test/fixtures';

const library = () => ({
  nodes: sampleTree(),
  entries: [
    entry('e1', 's_pl', { title: 'Anycast', read: true, marked: true, publishedAt: 1_700_000_000_000 }),
    entry('e2', 's_lr', { title: 'Map, maker "quote"', read: false, marked: false }),
  ],
});

describe('JSON export/import', () => {
  it('round-trips the full library', () => {
    const data = library();
    const restored = fromJSON(buildJSON(data));
    expect(restored.nodes).toEqual(data.nodes);
    expect(restored.entries).toEqual(data.entries);
  });

  it('throws on non-library JSON', () => {
    expect(() => fromJSON('{"foo":1}')).toThrow();
    expect(() => fromJSON('not json')).toThrow();
  });
});

describe('CSV export/import', () => {
  it('escapes commas and quotes so parsing round-trips', () => {
    const csv = buildCSV(library().nodes, library().entries);
    const rows = parseCSV(csv);
    const titles = rows.slice(1).map((r) => r[rows[0].indexOf('title')]);
    expect(titles).toContain('Map, maker "quote"');
  });

  it('rebuilds the folder hierarchy from folder_path', () => {
    const data = library();
    const csv = buildCSV(data.nodes, data.entries);
    const restored = fromCSV(csv);

    // The Anycast entry's feed should sit under Technology / Infrastructure.
    const anycast = restored.entries.find((e) => e.title === 'Anycast')!;
    expect(anycast.read).toBe(true);
    expect(anycast.marked).toBe(true);
    expect(tagsFor(restored.nodes, anycast.feedId)).toEqual([
      'Technology',
      'Infrastructure',
      'Packet Loss Weekly',
    ]);
    // Longreads sits at the top level.
    const map = restored.entries.find((e) => e.title.startsWith('Map'))!;
    expect(ancestors(restored.nodes, map.feedId)).toEqual([]);
  });

  it('throws on an empty CSV', () => {
    expect(() => fromCSV('')).toThrow();
    expect(() => fromCSV('only_header')).toThrow();
  });
});
