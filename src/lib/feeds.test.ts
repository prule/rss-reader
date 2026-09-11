import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the relay so tests are deterministic and offline.
vi.mock('./relay', () => ({
  fetchFeedText: vi.fn(),
  FeedFetchError: class extends Error {},
}));

import { fetchFeedText } from './relay';
import { hostFrom, refreshAll, refreshFeed, subscribeFeed } from './feeds';
import { useStore } from '../store/store';
import { feed } from '../test/fixtures';

const mockFetch = vi.mocked(fetchFeedText);

const RSS = (title: string, guid: string) => `<rss><channel><title>${title}</title>
  <item><title>${guid} item</title><link>https://x/${guid}</link><guid>${guid}</guid></item>
</channel></rss>`;

beforeEach(() => {
  mockFetch.mockReset();
  useStore.setState({ nodes: [], entries: [], sel: { kind: 'all' }, refreshing: false });
});

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
    const s = useStore.getState();
    expect(s.nodes.find((n) => n.id === id)!.name).toBe('Ars Technica');
    expect(s.entries.filter((e) => e.feedId === id)).toHaveLength(1);
  });

  it('still creates the feed (named from host) when the first fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('boom'));
    const id = await subscribeFeed({ url: 'https://packet.example/rss', name: '', parent: null });
    const s = useStore.getState();
    expect(s.nodes.find((n) => n.id === id)!.name).toBe('packet.example');
    expect(s.entries).toHaveLength(0);
    expect(s.toast).toContain("couldn't fetch");
  });

  it('ignores an empty submission', async () => {
    const id = await subscribeFeed({ url: '  ', name: '', parent: null });
    expect(id).toBeNull();
  });
});

describe('refreshFeed / refreshAll', () => {
  it('refreshFeed merges new entries', async () => {
    useStore.setState({ nodes: [feed('s1', 'A', null, 'https://a/feed')] });
    mockFetch.mockResolvedValueOnce(RSS('A', 'x1'));
    const added = await refreshFeed('s1');
    expect(added).toBe(1);
    expect(useStore.getState().entries).toHaveLength(1);
  });

  it('isolates per-feed failures so one failure does not block others', async () => {
    useStore.setState({
      nodes: [feed('s1', 'A', null, 'https://a/feed'), feed('s2', 'B', null, 'https://b/feed')],
    });
    // s1 fails, s2 succeeds.
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('a/feed')) throw new Error('down');
      return RSS('B', 'b1');
    });
    await refreshAll();
    const s = useStore.getState();
    expect(s.entries.filter((e) => e.feedId === 's2')).toHaveLength(1); // s2 refreshed
    expect(s.refreshing).toBe(false);
    expect(s.toast).toContain('1 feed');
  });
});
