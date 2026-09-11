import { describe, expect, it } from 'vitest';
import { mergeFeedEntries } from './dedupe';
import type { ParsedItem } from './parseFeed';
import { entry } from '../test/fixtures';

const item = (sourceId: string, title = sourceId): ParsedItem => ({
  title,
  link: `https://x/${sourceId}`,
  author: 'a',
  publishedAt: 0,
  sourceId,
  body: `<p>${title}</p>`,
  snippet: title,
});

describe('mergeFeedEntries', () => {
  it('appends new items as unread entries', () => {
    const { entries, added } = mergeFeedEntries([], [item('a'), item('b')], 's1');
    expect(added).toBe(2);
    expect(entries.every((e) => !e.read && !e.marked)).toBe(true);
  });

  it('skips items already stored, preserving read/bookmark state', () => {
    const existing = [entry('e1', 's1', { guid: 'a', read: true, marked: true })];
    const { entries, added } = mergeFeedEntries(existing, [item('a'), item('c')], 's1');
    expect(added).toBe(1); // only 'c' is new
    const kept = entries.find((e) => e.guid === 'a')!;
    expect(kept.read).toBe(true);
    expect(kept.marked).toBe(true);
    expect(kept.id).toBe('e1'); // same entry, untouched
  });

  it('dedups duplicates within one document', () => {
    const { added } = mergeFeedEntries([], [item('a'), item('a')], 's1');
    expect(added).toBe(1);
  });

  it('scopes identity to the feed', () => {
    const existing = [entry('e1', 'other', { guid: 'a' })];
    const { added } = mergeFeedEntries(existing, [item('a')], 's1');
    expect(added).toBe(1); // same guid but different feed -> still added
  });
});
