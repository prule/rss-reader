import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, load, save } from './storage';
import { entry, feed } from '../test/fixtures';

describe('storage', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('returns null on first run', () => {
    expect(load()).toBeNull();
  });

  it('round-trips a saved library', () => {
    const data = { nodes: [feed('s1', 'A')], entries: [entry('e1', 's1', { marked: true })] };
    expect(save(data).ok).toBe(true);
    const loaded = load()!;
    expect(loaded.nodes).toEqual(data.nodes);
    expect(loaded.entries[0].marked).toBe(true);
  });

  it('stamps a version on disk (payload is v1)', () => {
    save({ nodes: [], entries: [] });
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(raw.version).toBe(1);
  });

  it('migrates a versionless payload found in storage', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        nodes: [feed('s1', 'A')],
        entries: [{ id: 'e1', feedId: 's1', title: 'T', ago: '1d', body: ['x'], marked: true }],
      }),
    );
    const loaded = load()!;
    expect(loaded.entries[0].guid).toBe('e1');
    expect(loaded.entries[0].body).toBe('<p>x</p>');
    expect(loaded.entries[0].marked).toBe(true);
  });

  it('treats corrupt JSON as no data', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    expect(load()).toBeNull();
  });

  it('reports quota failure without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const res = save({ nodes: [], entries: [] });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('quota');
  });
});
