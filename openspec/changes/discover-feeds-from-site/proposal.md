## Why

Today a user must paste an exact feed URL. Pasting a site's home page (e.g. `techcrunch.com`) fetches HTML, fails the relay's feed-content gate, and leaves a broken, empty feed node with a "couldn't fetch it yet" toast. Most people know the site, not its feed URL — and popular sites publish several feeds (a main feed plus per-category feeds) that are invisible without discovery. This change lets a user enter a site URL, see the feeds published there, and pick which to add.

## What Changes

- **Smart add-feed dialog**: the single URL field becomes smart. On submit, if the entered URL is itself a feed, it subscribes directly (today's behavior). If it is a site page, the dialog fetches its discovered feeds and switches to a selection step listing each found feed (title + type) with checkboxes, a shared target-folder selector, and an "Add selected" action. When no feeds are found, the user can still add the URL as-is, so the flow is never worse than today.
- **Relay discovery mode**: the feed relay gains a discovery request that, given a page URL, fetches the page server-side and returns **only** the feeds it finds in it — a constrained list of `{ url, type, title }`. The raw page never leaves the worker. This is a scoped exception to the relay's "only relay feed-like content" rule; every other protection (https-only + private/encoded-address rejection, redirect re-validation, size cap, rate limit, statelessness) applies unchanged, and the existing feed-fetch path is untouched.
- Discovery is **1 upstream fetch per request**: the relay parses only the page it was given (via streaming `HTMLRewriter`) and does not fan out to probe or fetch candidate feeds, so it cannot become a request amplifier.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `feed-subscription`: adds a requirement for discovering feeds from a site URL and a smart add-feed flow that lets the user select which discovered feeds to subscribe to (batched to one target folder).
- `feed-relay`: adds a requirement for a discovery mode that fetches a page and returns only discovered feed URLs (never the page body), and refines "Relay restricts what it will fetch" so the feed-content gate is relaxed solely for the discovery mode's own upstream fetch, under a constrained output contract and a strict one-fetch-per-request rule.

## Impact

- **Offline**: discovery is a network act; with no connectivity it fails gracefully with a toast, exactly as a failed fetch does now. Nothing is persisted until the user actually adds a feed, so the offline library is unaffected.
- **localStorage / data model**: no change to the `nodes`/`entries` shape. Discovered feeds become ordinary `feed` nodes through the existing subscribe path; no migration needed.
- **Code**: `relay/worker.ts` (new discovery mode + `HTMLRewriter` parsing, response contract), `relay/worker.test.ts`; `src/lib/relay.ts` (client for discovery), a discovery/parse helper in `src/lib/`, `src/lib/feeds.ts` (smart submit branching), the add-feed dialog component and store state in `src/store/store.ts`. Relay spec/config docs updated to describe the discovery mode.
