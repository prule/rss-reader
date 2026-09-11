// Client-side access to the feed relay. In dev the Vite server proxies
// `/relay` to a locally-run worker; in production VITE_RELAY_URL points at the
// deployed Worker origin. Everything else in the app talks to feeds only
// through here.

const RELAY_BASE: string = import.meta.env.VITE_RELAY_URL || '/relay';

export class FeedFetchError extends Error {
  constructor(
    message: string,
    readonly kind: 'unreachable' | 'upstream-error' | 'relay-error',
  ) {
    super(message);
    this.name = 'FeedFetchError';
  }
}

/** Fetch a feed document's raw text via the relay. Throws FeedFetchError. */
export async function fetchFeedText(feedUrl: string): Promise<string> {
  const endpoint = `${RELAY_BASE}?url=${encodeURIComponent(feedUrl)}`;
  let res: Response;
  try {
    res = await fetch(endpoint);
  } catch {
    throw new FeedFetchError('Could not reach the relay', 'relay-error');
  }
  if (!res.ok) {
    let kind: FeedFetchError['kind'] = 'relay-error';
    try {
      const body = (await res.json()) as { kind?: string; error?: string };
      if (body.kind === 'unreachable' || body.kind === 'upstream-error') kind = body.kind;
      throw new FeedFetchError(body.error ?? `Relay responded ${res.status}`, kind);
    } catch (err) {
      if (err instanceof FeedFetchError) throw err;
      throw new FeedFetchError(`Relay responded ${res.status}`, kind);
    }
  }
  return res.text();
}
