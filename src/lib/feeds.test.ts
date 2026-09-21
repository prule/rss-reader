import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the relay so tests are deterministic and offline.
vi.mock('./relay', () => ({
  fetchFeedText: vi.fn(),
  discoverFeeds: vi.fn(),
  FeedFetchError: class extends Error {},
}));

import { fetchFeedText, discoverFeeds } from './relay';
import {
  STALE_MS,
  addFromInput,
  addSelectedFeeds,
  hostFrom,
  refreshAll,
  refreshFeed,
  subscribeFeed,
} from './feeds';
import { useStore } from '../store/store';
import { feed } from '../test/fixtures';
import { node } from '../store/selectors';
import { buildJSON } from './exporters';
import { fromJSON } from './importers';
import { readLibrary } from './db/repository';
import { resetLibrary, seedLibrary, storedNodes } from '../test/db';

const mockFetch = vi.mocked(fetchFeedText);
const mockDiscover = vi.mocked(discoverFeeds);

const RSS = (title: string, guid: string) => `<rss><channel><title>${title}</title>
  <item><title>${guid} item</title><link>https://x/${guid}</link><guid>${guid}</guid></item>
</channel></rss>`;

beforeEach(async () => {
  mockFetch.mockReset();
  mockDiscover.mockReset();
  await resetLibrary();
  await seedLibrary({ nodes: [], entries: [] });
  useStore.setState({ refreshing: false, toast: '' });
});

afterEach(resetLibrary);

/** The whole stored library, for assertions that used to read the store. */
const stored = () => readLibrary();

describe('hostFrom', () => {
  it('extracts a hostname without www', () => {
    expect(hostFrom('https://www.example.com/feed.xml')).toBe('example.com');
    expect(hostFrom('not a url')).toBe('not a url');
  });
});

describe('subscribeFeed', () => {
  it('creates a feed and imports entries, deriving the title from the feed', async () => {
    mockFetch.mockResolvedValueOnce(RSS('Ars Technica', 'a1'));
    const id = await subscribeFeed({ url: 'https://ars.example/feed', name: '', parent: null });
    expect(id).toBeTruthy();
    const lib = await stored();
    expect(lib.nodes.find((n) => n.id === id)!.name).toBe('Ars Technica');
    expect(lib.entries.filter((e) => e.feedId === id)).toHaveLength(1);
  });

  it('still creates the feed (named from host) when the first fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('boom'));
    const id = await subscribeFeed({ url: 'https://packet.example/rss', name: '', parent: null });
    const lib = await stored();
    expect(lib.nodes.find((n) => n.id === id)!.name).toBe('packet.example');
    expect(lib.entries).toHaveLength(0);
    expect(useStore.getState().toast).toContain("couldn't fetch");
  });

  it('ignores an empty submission', async () => {
    const id = await subscribeFeed({ url: '  ', name: '', parent: null });
    expect(id).toBeNull();
  });
});

describe('addFromInput (smart add)', () => {
  it('subscribes directly when the URL is itself a feed (no discovery)', async () => {
    mockFetch.mockResolvedValueOnce(RSS('Ars', 'a1'));
    const r = await addFromInput({ url: 'https://ars.example/feed', name: '', parent: null });
    expect(r.kind).toBe('subscribed');
    expect(mockDiscover).not.toHaveBeenCalled();
    expect(await storedNodes()).toHaveLength(1);
  });

  it('discovers feeds when the URL is a site page, creating nothing', async () => {
    mockFetch.mockRejectedValueOnce(new Error('not a feed')); // feed parse fails
    mockDiscover.mockResolvedValueOnce([
      { url: 'https://tc.example/feed', type: 'rss', title: 'Main' },
      { url: 'https://tc.example/ai/feed', type: 'rss', title: 'AI' },
    ]);
    const r = await addFromInput({ url: 'https://tc.example', name: '', parent: null });
    expect(r).toEqual({
      kind: 'discovered',
      candidates: [
        { url: 'https://tc.example/feed', type: 'rss', title: 'Main' },
        { url: 'https://tc.example/ai/feed', type: 'rss', title: 'AI' },
      ],
    });
    expect(await storedNodes()).toHaveLength(0); // nothing added yet
  });

  it('reports none-found when a page advertises no feeds', async () => {
    mockFetch.mockRejectedValueOnce(new Error('not a feed'));
    mockDiscover.mockResolvedValueOnce([]);
    const r = await addFromInput({ url: 'https://empty.example', name: '', parent: null });
    expect(r.kind).toBe('none-found');
    expect(await storedNodes()).toHaveLength(0);
  });

  it('reports error and creates nothing when the site is unreachable', async () => {
    mockFetch.mockRejectedValueOnce(new Error('offline'));
    mockDiscover.mockRejectedValueOnce(new Error('offline'));
    const r = await addFromInput({ url: 'https://down.example', name: '', parent: null });
    expect(r.kind).toBe('error');
    expect(await storedNodes()).toHaveLength(0);
  });

  it('ignores an empty submission', async () => {
    expect((await addFromInput({ url: '  ', name: '', parent: null })).kind).toBe('empty');
  });
});

describe('addSelectedFeeds (batch)', () => {
  it('adds only the selected feeds into the target folder, reconciling real titles', async () => {
    await seedLibrary({
      nodes: [{ id: 'fold', type: 'folder', name: 'Tech', parentId: null, collapsed: false }],
    });
    mockFetch.mockImplementation(async (url: string) =>
      url.includes('ai') ? RSS('Real AI Title', 'ai1') : RSS('Real Main Title', 'm1'),
    );
    await addSelectedFeeds(
      [
        { url: 'https://tc.example/feed', type: 'rss', title: 'Main (discovered)' },
        { url: 'https://tc.example/ai/feed', type: 'rss', title: 'AI (discovered)' },
      ],
      'fold',
    );
    const feeds = (await storedNodes()).filter((n) => n.type === 'feed');
    expect(feeds).toHaveLength(2);
    expect(feeds.every((f) => f.parentId === 'fold')).toBe(true);
    expect(feeds.map((f) => f.name).sort()).toEqual(['Real AI Title', 'Real Main Title']);
  });

  it('falls back to the discovered title when a feed fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('down'));
    await addSelectedFeeds(
      [{ url: 'https://x.example/feed', type: 'rss', title: 'Discovered Name' }],
      null,
    );
    const f = (await storedNodes()).find((n) => n.type === 'feed')!;
    expect(f.name).toBe('Discovered Name');
  });

  it('produces ordinary nodes/entries that survive a JSON export/import round-trip', async () => {
    mockFetch.mockImplementation(async (url: string) =>
      url.includes('ai') ? RSS('AI', 'ai1') : RSS('Main', 'm1'),
    );
    await addSelectedFeeds(
      [
        { url: 'https://tc.example/feed', type: 'rss', title: 'Main' },
        { url: 'https://tc.example/ai/feed', type: 'rss', title: 'AI' },
      ],
      null,
    );
    const { nodes, entries } = await stored();
    const restored = fromJSON(buildJSON({ nodes, entries }));
    expect(restored.nodes).toEqual(nodes);
    expect(restored.entries).toEqual(entries);
  });
});

describe('refreshFeed / refreshAll', () => {
  it('refreshFeed merges new entries', async () => {
    await seedLibrary({ nodes: [feed('s1', 'A', null, 'https://a/feed')] });
    mockFetch.mockResolvedValueOnce(RSS('A', 'x1'));
    const added = await refreshFeed('s1');
    expect(added).toBe(1);
    expect((await stored()).entries).toHaveLength(1);
  });

  it('isolates per-feed failures so one failure does not block others', async () => {
    await seedLibrary({
      nodes: [feed('s1', 'A', null, 'https://a/feed'), feed('s2', 'B', null, 'https://b/feed')],
    });
    // s1 fails, s2 succeeds.
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('a/feed')) throw new Error('down');
      return RSS('B', 'b1');
    });
    await refreshAll();
    const lib = await stored();
    expect(lib.entries.filter((e) => e.feedId === 's2')).toHaveLength(1); // s2 refreshed
    expect(useStore.getState().refreshing).toBe(false);
    expect(useStore.getState().toast).toContain('1 feed');
  });
});

describe('refresh staleness gating', () => {
  // Omit the key entirely when there is no fetch time, so the stored row looks
  // like a never-fetched feed rather than one with an explicit undefined.
  const withFetchedAt = (id: string, url: string, fetchedAt?: number) =>
    fetchedAt === undefined ? feed(id, id, null, url) : { ...feed(id, id, null, url), fetchedAt };

  it('refreshFeed stamps fetchedAt on success', async () => {
    await seedLibrary({ nodes: [feed('s1', 'A', null, 'https://a/feed')] });
    mockFetch.mockResolvedValueOnce(RSS('A', 'x1'));
    const before = Date.now();
    await refreshFeed('s1');
    const at = node(await storedNodes(), 's1')!.fetchedAt!;
    expect(at).toBeGreaterThanOrEqual(before);
  });

  it('automatic refresh skips a feed fetched within 24h', async () => {
    await seedLibrary({
      nodes: [withFetchedAt('fresh', 'https://fresh/feed', Date.now() - 60_000)],
    });
    mockFetch.mockResolvedValue(RSS('X', 'x1'));
    await refreshAll({ force: false });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(useStore.getState().toast).toBe('Up to date');
  });

  it('automatic refresh fetches a never-fetched or >24h-old feed', async () => {
    await seedLibrary({
      nodes: [
        withFetchedAt('never', 'https://never/feed', undefined),
        withFetchedAt('old', 'https://old/feed', Date.now() - (STALE_MS + 60_000)),
        withFetchedAt('fresh', 'https://fresh/feed', Date.now() - 60_000),
      ],
    });
    mockFetch.mockImplementation(async (url: string) =>
      RSS('X', url.includes('never') ? 'n1' : 'o1'),
    );
    await refreshAll({ force: false });
    const urls = mockFetch.mock.calls.map((c) => c[0]);
    expect(urls).toContain('https://never/feed');
    expect(urls).toContain('https://old/feed');
    expect(urls).not.toContain('https://fresh/feed'); // fresh skipped
  });

  it('manual refresh forces a fresh feed to fetch', async () => {
    await seedLibrary({
      nodes: [withFetchedAt('fresh', 'https://fresh/feed', Date.now() - 60_000)],
    });
    mockFetch.mockResolvedValue(RSS('X', 'x1'));
    await refreshAll({ force: true });
    expect(mockFetch).toHaveBeenCalledWith('https://fresh/feed');
  });

  it('a failed fetch does not advance fetchedAt (stays eligible)', async () => {
    await seedLibrary({ nodes: [withFetchedAt('s1', 'https://a/feed', undefined)] });
    mockFetch.mockRejectedValue(new Error('down'));
    await refreshAll({ force: false });
    expect(node(await storedNodes(), 's1')!.fetchedAt).toBeUndefined();
  });
});
