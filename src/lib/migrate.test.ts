import { describe, expect, it } from 'vitest';
import { CURRENT_VERSION, migrate, parseRelativeAge, toPayload } from './migrate';

describe('migrate', () => {
  it('returns null for unrecognizable input', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate({})).toBeNull();
    expect(migrate({ nodes: [] })).toBeNull();
    expect(migrate('nope')).toBeNull();
  });

  it('upgrades a versionless v0 payload without losing user state', () => {
    const now = 1_000_000_000_000;
    const v0 = {
      nodes: [{ id: 's1', type: 'feed', name: 'A', parentId: null, collapsed: false, url: 'u' }],
      entries: [
        {
          id: 'e1',
          feedId: 's1',
          title: 'Hi',
          author: 'R',
          ago: '3h',
          snippet: 'snip',
          body: ['one', 'two'],
          read: true,
          marked: true,
        },
      ],
    };
    const out = migrate(v0, now)!;
    expect(out.entries).toHaveLength(1);
    const e = out.entries[0];
    expect(e.read).toBe(true); // preserved
    expect(e.marked).toBe(true); // preserved
    expect(e.guid).toBe('e1'); // derived (no guid/link -> id)
    expect(e.link).toBeNull();
    expect(e.publishedAt).toBe(now - 3 * 3_600_000); // "3h" parsed
    expect(e.body).toBe('<p>one</p><p>two</p>'); // array -> HTML
    expect('ago' in e).toBe(false); // legacy field dropped
  });

  it('keeps a current (v1) payload as-is', () => {
    const v1 = {
      version: 1,
      nodes: [],
      entries: [
        {
          id: 'e1',
          feedId: 's1',
          title: 'T',
          author: '',
          link: 'https://x/1',
          guid: 'g1',
          publishedAt: 42,
          snippet: 's',
          body: '<p>b</p>',
          read: false,
          marked: false,
        },
      ],
    };
    const out = migrate(v1)!;
    expect(out.entries[0].publishedAt).toBe(42);
    expect(out.entries[0].guid).toBe('g1');
  });

  it('parseRelativeAge understands m/h/d/w and now', () => {
    const now = 10_000_000;
    expect(parseRelativeAge('now', now)).toBe(now);
    expect(parseRelativeAge('5m', now)).toBe(now - 5 * 60_000);
    expect(parseRelativeAge('2d', now)).toBe(now - 2 * 86_400_000);
    expect(parseRelativeAge('bogus', now)).toBeNull();
    expect(parseRelativeAge(undefined, now)).toBeNull();
  });

  it('toPayload stamps the current version', () => {
    expect(toPayload({ nodes: [], entries: [] }).version).toBe(CURRENT_VERSION);
  });

  it('passes feed nodes through, preserving or leaving fetchedAt absent', () => {
    const out = migrate({
      version: 1,
      nodes: [
        {
          id: 's1',
          type: 'feed',
          name: 'A',
          parentId: null,
          collapsed: false,
          url: 'u',
          fetchedAt: 123,
        },
        { id: 's2', type: 'feed', name: 'B', parentId: null, collapsed: false, url: 'u2' },
      ],
      entries: [],
    })!;
    expect(out.nodes.find((n) => n.id === 's1')!.fetchedAt).toBe(123);
    expect(out.nodes.find((n) => n.id === 's2')!.fetchedAt).toBeUndefined();
  });
});
