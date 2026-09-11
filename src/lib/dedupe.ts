// Merge freshly-parsed items into the stored entries for a feed. New items are
// appended; items whose identity already exists are skipped, so existing read
// and bookmark state is preserved across refreshes.
import type { Entry } from '../types';
import type { ParsedItem } from './parseFeed';
import { makeId } from './id';

export interface MergeResult {
  entries: Entry[];
  added: number;
}

export function toEntry(item: ParsedItem, feedId: string): Entry {
  return {
    id: makeId('e'),
    feedId,
    title: item.title,
    author: item.author,
    link: item.link,
    guid: item.sourceId,
    publishedAt: item.publishedAt,
    snippet: item.snippet,
    body: item.body,
    read: false,
    marked: false,
  };
}

export function mergeFeedEntries(
  existing: Entry[],
  items: ParsedItem[],
  feedId: string,
): MergeResult {
  const seen = new Set(existing.filter((e) => e.feedId === feedId).map((e) => e.guid));
  const additions: Entry[] = [];
  for (const item of items) {
    if (seen.has(item.sourceId)) continue; // already stored, keep its state
    seen.add(item.sourceId); // also guards duplicates within one document
    additions.push(toEntry(item, feedId));
  }
  return { entries: existing.concat(additions), added: additions.length };
}
