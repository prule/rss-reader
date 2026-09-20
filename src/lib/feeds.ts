// High-level feed operations: subscribing and refreshing. Orchestrates the
// relay client, the parser, and the merge over the store.
import { useStore } from '../store/store';
import { fetchFeedText, discoverFeeds, type DiscoveredFeed } from './relay';
import { parseFeed } from './parseFeed';
import { mergeFeedEntries } from './dedupe';
import { node } from '../store/selectors';

/** A feed is refreshed automatically only once its last fetch is this old. */
export const STALE_MS = 24 * 60 * 60 * 1000;

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
  // Stamp the last-successful-fetch time (reached only when fetch + parse succeed).
  useStore.getState().markFetched(feedId, Date.now());
  return added;
}

export interface SubscribeInput {
  url: string;
  name: string;
  parent: string | null;
}

type ParsedItems = ReturnType<typeof parseFeed>['items'];

/**
 * Create the feed node and, when items were fetched, import them. Shared by the
 * plain subscribe path and the discovery/batch paths. Creating the node even on
 * a failed fetch lets the user retry via refresh without discarding data.
 */
function commitSubscription(
  title: string,
  url: string,
  parent: string | null,
  items: ParsedItems | null,
  fetchFailed: boolean,
): string {
  const s = useStore.getState();
  const feedId = s.addFeedNode(title, url, parent);
  if (items) {
    const { entries, added } = mergeFeedEntries(useStore.getState().entries, items, feedId);
    useStore.getState().setEntries(entries);
    useStore.getState().markFetched(feedId, Date.now());
    s.say(`Added ${title} — ${added} ${added === 1 ? 'entry' : 'entries'}`);
  } else if (fetchFailed) {
    s.say(`Added ${title}, but couldn't fetch it yet — try Refresh`);
  } else {
    s.say(`Added ${title}`);
  }
  return feedId;
}

/**
 * Subscribe to a feed. Creates the feed node even when the first fetch fails,
 * so the user can retry via refresh; a failed fetch never discards data.
 */
export async function subscribeFeed(input: SubscribeInput): Promise<string | null> {
  const url = input.url.trim();
  const providedName = input.name.trim();
  if (!url && !providedName) return null;

  let title = providedName;
  let items: ParsedItems | null = null;
  let fetchFailed = false;

  if (url) {
    try {
      const parsed = parseFeed(await fetchFeedText(url));
      items = parsed.items;
      if (!title) title = parsed.title ?? '';
    } catch {
      fetchFailed = true;
    }
  }
  if (!title) title = url ? hostFrom(url) : 'Untitled feed';

  return commitSubscription(title, url, input.parent, items, fetchFailed);
}

/** Outcome of the smart add flow: subscribed directly, discovered feeds to choose from, or nothing. */
export type AddResult =
  | { kind: 'empty' }
  | { kind: 'subscribed'; feedId: string }
  | { kind: 'discovered'; candidates: DiscoveredFeed[] }
  | { kind: 'none-found' }
  | { kind: 'error' };

/**
 * Smart add. If the entered URL is itself a feed, subscribe directly. Otherwise
 * ask the relay to discover feeds published by that page and return them for the
 * user to choose from. Creates nothing in the discovery/none-found/error cases.
 */
export async function addFromInput(input: SubscribeInput): Promise<AddResult> {
  const url = input.url.trim();
  const name = input.name.trim();
  if (!url && !name) return { kind: 'empty' };

  // No URL: a manual title-only feed, as before.
  if (!url) {
    return { kind: 'subscribed', feedId: commitSubscription(name, '', input.parent, null, false) };
  }

  // Try the URL as a feed first — a successful parse means subscribe directly.
  try {
    const parsed = parseFeed(await fetchFeedText(url));
    const title = name || parsed.title || hostFrom(url);
    return {
      kind: 'subscribed',
      feedId: commitSubscription(title, url, input.parent, parsed.items, false),
    };
  } catch {
    // Not a feed (or the relay refused the page). Fall through to discovery.
  }

  try {
    const candidates = await discoverFeeds(url);
    return candidates.length > 0 ? { kind: 'discovered', candidates } : { kind: 'none-found' };
  } catch {
    // The site itself was unreachable (offline or genuinely broken).
    return { kind: 'error' };
  }
}

/**
 * Subscribe to one discovered feed. The feed document's own title wins; the
 * discovered title is the fallback used when the feed provides none or the
 * fetch fails, before finally falling back to the host.
 */
async function subscribeDiscovered(cand: DiscoveredFeed, parent: string | null): Promise<void> {
  try {
    const parsed = parseFeed(await fetchFeedText(cand.url));
    const title = parsed.title || cand.title || hostFrom(cand.url);
    commitSubscription(title, cand.url, parent, parsed.items, false);
  } catch {
    commitSubscription(cand.title || hostFrom(cand.url), cand.url, parent, null, true);
  }
}

/**
 * Add a batch of discovered feeds into one target folder. Each is fetched
 * through the ordinary subscribe path; per-feed failures don't block the rest.
 */
export async function addSelectedFeeds(
  candidates: DiscoveredFeed[],
  parent: string | null,
): Promise<void> {
  if (candidates.length === 0) return;
  await Promise.allSettled(candidates.map((c) => subscribeDiscovered(c, parent)));
  const s = useStore.getState();
  s.say(`Added ${candidates.length} ${candidates.length === 1 ? 'feed' : 'feeds'}`);
}

export interface RefreshOptions {
  /** Manual refresh: fetch every feed regardless of age. Default false (auto). */
  force?: boolean;
}

/**
 * Refresh feeds, isolating per-feed failures so one never blocks others.
 * Automatic refresh (force:false) only fetches feeds never fetched or stale
 * beyond STALE_MS; manual refresh (force:true) fetches all.
 */
export async function refreshAll({ force = false }: RefreshOptions = {}): Promise<void> {
  const s = useStore.getState();
  const feeds = s.nodes.filter((n) => n.type === 'feed');
  if (feeds.length === 0) return;

  const now = Date.now();
  const due = force
    ? feeds
    : feeds.filter((f) => f.fetchedAt == null || now - f.fetchedAt > STALE_MS);
  if (due.length === 0) {
    s.say('Up to date');
    return;
  }

  s.setRefreshing(true);
  const results = await Promise.allSettled(due.map((f) => refreshFeed(f.id)));
  s.setRefreshing(false);

  const added = results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value : 0), 0);
  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) {
    s.say(`Refreshed with ${failed} feed${failed === 1 ? '' : 's'} failing · ${added} new`);
  } else {
    s.say(added > 0 ? `${added} new ${added === 1 ? 'entry' : 'entries'}` : 'Up to date');
  }
}
