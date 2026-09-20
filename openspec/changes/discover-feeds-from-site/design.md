## Context

See proposal.md — Why. The app's only server-side piece is the stateless feed relay (`relay/worker.ts`), deliberately hardened against being an open proxy: it fetches only `https`, rejects private/encoded addresses, re-validates every redirect hop, caps response size, rate-limits per client, and relays only feed-like content. Feed subscription today runs entirely client-side through `subscribeFeed` (`src/lib/feeds.ts`), which fetches via the relay (`src/lib/relay.ts`) and parses with `parseFeed`. This change adds feed discovery from an arbitrary page while preserving those relay guarantees.

## Goals / Non-Goals

**Goals:**

- Discover feeds from a page URL and let the user pick which to add.
- Keep every relay protection that matters (SSRF guard, size cap, rate limit, statelessness) intact; relax only the feed-content gate, and only inside a discovery mode whose output is a tightly constrained list.
- Reuse the existing subscribe/parse/dedupe path unchanged for the actual adds.

**Non-Goals:**

- Server-side path-guessing or fetching candidate feeds to enrich titles (would break the one-fetch-per-request rule). Any path-guessing fallback runs on the client through the normal relay so the rate limiter counts each probe.
- Per-feed folder targeting for a batch — one target folder per add action.
- Any change to the `nodes`/`entries` data shape or a migration.

## Decisions

### Discovery runs in the relay, returning a constrained list (not the page)

The relay gains a discovery mode (e.g. `?discover=<page-url>` or a `/discover` path) that fetches the page and returns `[{ url, type: 'rss'|'atom'|'json', title }]`. Rationale: the raw HTML never reaches the browser, so the relay stays "not an open proxy" in spirit — the output channel is a short list of https feed URLs + an enum + a truncated title, which cannot launder arbitrary page bytes. All existing guards run on the page fetch via the same `validateTarget`.

_Alternative — client-side discovery:_ relay passes raw HTML through, client parses `<link>` tags with `DOMParser`. Rejected: it turns the relay into a general HTML proxy (much wider "open proxy" surface) for no real gain, since discovery logic is small.

### Parse `<link rel="alternate">` from the capped body with a pure string scanner

Extract `<link>` tags, read `rel`/`type`/`href`/`title`, keep those whose `rel` includes `alternate` and whose `type` is a feed type (`rss`/`atom`/`json`). Rationale: the relay already buffers the upstream body up to the existing byte cap (`readCapped`), so a string/regex scan over those capped bytes is equally memory-bounded and needs no streaming parser. A pure function is also testable under the project's existing jsdom Vitest pool — the relay tests do **not** run in a Workers runtime, so Cloudflare's `HTMLRewriter` global is unavailable there; choosing it would force a separate Workers test setup for no behavioral gain. (Behavior is identical to the streaming approach; only the mechanism differs.) Resolve each `href` against the effective page URL (post-redirect) and keep only candidates whose resolved URL passes `validateTarget` (https + allowed address); drop the rest. Decode common HTML entities in titles, truncate them (≤200 chars), dedupe by URL, and cap the number of returned candidates.

### One upstream fetch per discovery request

The relay parses only the page it was given and never fetches the discovered candidates. Rationale: prevents a single discovery call amplifying into N upstream fetches. Titles shown are the page's advertised `<link title>`; the feed's real title is filled in when the user actually subscribes and the feed document is fetched (existing behavior).

### Smart dialog, one entry point

The add-feed dialog keeps a single URL field. On submit, `feeds.ts` decides: if the URL fetches+parses as a feed, subscribe directly (today's path); otherwise call discovery and switch the dialog to a selection step (checkbox list + shared folder selector + "Add selected"). "None found" offers "add as-is". Rationale: one mental model, never worse than today. Selection state and the discovered list live in transient store state (`src/store/store.ts`), not persisted.

## Risks / Trade-offs

- **Relaxing the feed-content gate widens what the relay will fetch** → Confine the relaxation to the discovery mode only; the ordinary feed-fetch path keeps its strict gate. Keep `validateTarget`, size cap, and rate limit on the discovery fetch. Constrain the response schema (https-only URLs, enum type, truncated title, capped count) so it can't proxy arbitrary content.
- **Discovery-as-oracle / SSRF probing** → No new capability beyond the existing feed fetch: discovery re-uses `validateTarget` on the page and filters discovered URLs the same way, and it returns no page content, so it reveals nothing a direct feed fetch wouldn't.
- **Large or hostile HTML pages** → Streaming `HTMLRewriter` under the existing byte cap bounds cost; cap the number of returned candidates.
- **Ambiguous "is it a feed?" detection** → Reuse the existing parse: a successful `parseFeed` means subscribe-direct; failure routes to discovery. Feeds served as `text/html` still parse via the existing content sniff.

## Migration Plan

- Deploy is additive: ship the relay discovery mode (backward-compatible — existing `?url=` fetch unchanged), then the client. Rollback is reverting the client; the new relay mode is inert if unused. No data migration.
