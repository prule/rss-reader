// High-level feed operations: subscribing and refreshing. Orchestrates the
// relay client, the parser, and the merge over the store.
import { useStore } from '../store/store';
import { fetchFeedText } from './relay';
import { parseFeed } from './parseFeed';
import { mergeFeedEntries } from './dedupe';
import { node } from '../store/selectors';

export function hostFrom(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
}

/** Fetch + parse + merge a single feed. Returns the number of new entries. */
export async function refreshFeed(feedId: string): Promise<number> {
  const s = useStore.getState();
  const feed = node(s.nodes, feedId);
  if (!feed || feed.type !== 'feed' || !feed.url) return 0;

  const xml = await fetchFeedText(feed.url);
  const parsed = parseFeed(xml); // throws on malformed — caller keeps entries
  const { entries, added } = mergeFeedEntries(useStore.getState().entries, parsed.items, feedId);
  if (added > 0) useStore.getState().setEntries(entries);
  return added;
}

export interface SubscribeInput {
  url: string;
  name: string;
  parent: string | null;
}

/**
 * Subscribe to a feed. Creates the feed node even when the first fetch fails,
 * so the user can retry via refresh; a failed fetch never discards data.
 */
export async function subscribeFeed(input: SubscribeInput): Promise<string | null> {
  const s = useStore.getState();
  const url = input.url.trim();
  const providedName = input.name.trim();
  if (!url && !providedName) return null;

  let title = providedName;
  let items: ReturnType<typeof parseFeed>['items'] | null = null;
  let fetchError: unknown = null;

  if (url) {
    try {
      const parsed = parseFeed(await fetchFeedText(url));
      items = parsed.items;
      if (!title) title = parsed.title ?? '';
    } catch (err) {
      fetchError = err;
    }
  }
  if (!title) title = url ? hostFrom(url) : 'Untitled feed';

  const feedId = s.addFeedNode(title, url, input.parent);

  if (items) {
    const { entries, added } = mergeFeedEntries(useStore.getState().entries, items, feedId);
    useStore.getState().setEntries(entries);
    s.say(`Added ${title} — ${added} ${added === 1 ? 'entry' : 'entries'}`);
  } else if (fetchError) {
    s.say(`Added ${title}, but couldn't fetch it yet — try Refresh`);
  } else {
    s.say(`Added ${title}`);
  }
  return feedId;
}

/** Refresh every feed, isolating per-feed failures so one never blocks others. */
export async function refreshAll(): Promise<void> {
  const s = useStore.getState();
  const feeds = s.nodes.filter((n) => n.type === 'feed');
  if (feeds.length === 0) return;

  s.setRefreshing(true);
  const results = await Promise.allSettled(feeds.map((f) => refreshFeed(f.id)));
  s.setRefreshing(false);

  const added = results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value : 0), 0);
  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) {
    s.say(`Refreshed with ${failed} feed${failed === 1 ? '' : 's'} failing · ${added} new`);
  } else {
    s.say(added > 0 ? `${added} new ${added === 1 ? 'entry' : 'entries'}` : 'Up to date');
  }
}
