## 1. Relay discovery mode

- [x] 1.1 Add a discovery mode to `relay/worker.ts` that accepts a page URL, runs it through the existing `validateTarget` / redirect re-validation / size cap / rate limit, and fetches the page once; verify a Vitest case shows a discovery request performs exactly one upstream fetch.
- [x] 1.2 Parse the fetched page with a pure string scanner (exported for tests), extracting `<link rel="alternate">` `href`/`type`/`title`, resolving each `href` against the effective page URL; verify unit tests over sample HTML return the expected `{ url, type, title }` entries including relative-href resolution.
- [x] 1.3 Filter discovered candidates so only effective `https` targets passing `validateTarget` are returned, map types to the `rss|atom|json` enum, truncate titles, and cap the candidate count; verify tests that private/`http`/malformed candidates are dropped and titles/count are bounded.
- [x] 1.4 Return the constrained list as JSON with CORS, never the page body; verify a test asserts the discovery response contains no page HTML and an empty-list case returns `[]` (not an error).
- [x] 1.5 Confirm the ordinary feed-fetch path still rejects non-feed content (feed-content gate unchanged); verify the existing not-a-feed test still passes and a new test shows only discovery mode accepts an HTML page.

## 2. Discovery client + smart submit

- [x] 2.1 Add a discovery client function to `src/lib/relay.ts` that calls the relay discovery mode and returns the typed candidate list, throwing a distinguishable error on failure; verify a Vitest case with a mocked relay parses the list and surfaces errors.
- [x] 2.2 Add a discovery/decision helper (in `src/lib/`) and branch `subscribeFeed`/submit in `src/lib/feeds.ts`: if the entered URL parses as a feed, subscribe directly; otherwise discover and return candidates; verify unit tests cover the feed-URL branch, the site-URL branch, and the no-feeds-found branch.
- [x] 2.3 Add a batch add that subscribes each selected candidate through the existing subscribe path into one target folder, seeding the node name with the discovered title; verify a test that only selected candidates become feed nodes under the chosen folder and titles reconcile from the fetched feed.

## 3. Smart add-feed dialog

- [x] 3.1 Add transient discovery state (candidate list, selection, phase) to `src/store/store.ts`, persisting nothing; verify a store test that discovery state resets on dialog close and is absent from the persisted `rss-reader-pwa.library.v1` payload.
- [x] 3.2 Extend the add-feed dialog to a two-phase flow — single URL field, then a selection step (checkbox list of `title` + type, shared folder selector, "Add selected") with a "none found → add as-is" fallback — using Industry design tokens; verify the rendered dialog uses only tokens (no hard-coded hex/px/fonts) and matches the reference aesthetic.
- [x] 3.3 Wire dialog submit/offline/failure to the status/toast area so discovery errors surface without creating nodes; verify a component test that a failed discovery shows a toast and adds nothing.

## 4. Acceptance & regression

- [x] 4.1 Add a Playwright acceptance test (Screenplay/Serenity-JS) for: enter a site URL → see discovered feeds → select a subset → add to a folder → the feeds appear in the tree; verify the test passes via `pnpm run test:e2e`.
- [x] 4.2 Add acceptance coverage for the direct-feed-URL path (subscribes without a selection step) and the no-feeds-found "add as-is" path; verify both pass.
- [x] 4.3 Verify JSON/CSV export and import still round-trip after adding discovered feeds (data shape unchanged); verify the existing export/import tests pass with feeds added via discovery.
- [x] 4.4 Run `pnpm test` and `pnpm run test:e2e` green and confirm the app still loads and refreshes feeds offline after first load.
