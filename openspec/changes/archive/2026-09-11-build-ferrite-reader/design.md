## Context

See proposal.md — Why. The starting point is a single-file mock (`RSS reader design/RSS Reader.dc.html`): one `DCLogic` React class holding all state in `this.state`, a `renderVals()` method that computes every prop, and hand-written seed entries. It already implements — correctly — the tree model, drag/drop with cycle prevention, recursive aggregation, hierarchy tagging, bookmark search, export/import, keyboard handling, and localStorage persistence under `ferrite.library.v1`. The behavior is proven; what is missing is real feed I/O, a real build/runtime, offline packaging, and the CORS workaround.

Constraints that shape the approach: browser-only persistence (localStorage), no user data on any server, TypeScript + React + Vite, the Industry design system consumed via tokens, and testing with Vitest + Playwright/Serenity (Screenplay).

## Goals / Non-Goals

**Goals:**

- Port the mock to idiomatic TS/React (function components + hooks) without regressing any proven behavior, keeping the same localStorage key and a compatible payload.
- Introduce a clean seam between UI and data so feed I/O, persistence, and parsing are testable in isolation.
- Make live fetching work through the smallest possible relay, with a local-dev path that needs no deployed worker.
- Ship an installable, offline-capable PWA.

**Non-Goals:**

- Feed discovery/autodiscovery from a site URL (user pastes the feed URL).
- Full-text article extraction beyond what the feed provides.
- Sync across devices, auth, or any multi-user concern.
- Read-state sync back to feeds; entry editing.
- User-authored (free-form) tags — tags remain derived from the hierarchy (see bookmarks spec).

## Decisions

### D1: State lives in one typed store; components are presentational

Replace the `DCLogic` class + `renderVals()` with a single app store (a `useReducer`/context or a tiny store lib such as Zustand) holding `{ nodes, entries, ui }`, plus selector functions for the derived values the mock computes inline (`feedsUnder`, `ancestors`, `tagsFor`, `flatten`, `visibleEntries`, counts). Components (Sidebar, EntryList, ArticlePane, AddFeedDialog, StatusBar) read state and dispatch actions.

- **Why:** the mock's logic is already organized as pure tree/derivation helpers over flat `nodes`/`entries` arrays — that maps directly onto reducer + selectors and makes each helper unit-testable without a DOM. Keeping derivations as pure selectors (not stored fields) preserves the mock's invariant that tags/aggregation are always computed from current structure.
- **Alternatives:** keep a class component (rejected — not idiomatic, hard to test); Redux Toolkit (rejected — heavier than this needs). Zustand vs `useReducer` is left as a low-stakes implementation choice in tasks.

### D2: Persistence and migration behind a repository module

A `storage` module owns reading/writing `ferrite.library.v1` and is the only code that touches localStorage. It wraps the payload as `{ version, nodes, entries }` and runs an ordered migration chain on load.

- **Migration:** the mock persists `{ nodes, entries }` with no version. The loader treats a versionless payload as v0 and migrates: entries gain `link`, `guid`, and `publishedAt` (derived from the legacy `ago` where possible, else `null`); the legacy `ago` string is dropped from storage and recomputed at display time. Unknown/newer versions load read-only-safe (keep data, warn) rather than corrupt.
- **Why:** satisfies the library-persistence spec's "migrate, don't discard," and keeps the storage-full/blocked degradation in one place.

### D3: Feed fetching pipeline — relay → parse → normalize → dedupe → merge

```
addFeed / refresh
      │
      ▼
 fetch via relay ──► raw XML ──► parse (RSS|Atom) ──► normalize to Entry[]
                                                            │
                                                            ▼
                                        dedupe vs stored (identity key)
                                                            │
                                                            ▼
                                   merge: append new, keep read/marked on existing
```

- **Identity key** for dedup, in priority order: item `guid`/Atom `id` → `link` → hash(title + published). Stored on each entry as `guid`. Merge never overwrites `read`/`marked` on an entry whose identity already exists.
- **Parsing:** use the browser `DOMParser` (`application/xml`) and read both RSS (`item`/`pubDate`/`description`) and Atom (`entry`/`updated`/`content`) shapes into one normalizer. A dedicated dependency is acceptable if it reduces edge-case risk; the normalizer output is what the rest of the app sees, so the parser is swappable.
- **Snippet:** derived by stripping tags from the body and truncating; `body` is the sanitized HTML.
- **Why:** isolating normalize/dedupe as pure functions over strings makes the trickiest logic (feed-format variance, dedup) directly unit-testable, per the feed-subscription spec.

### D4: The relay is a stateless Cloudflare Worker; dev uses a Vite proxy

The relay accepts the target feed URL as a query parameter, validates scheme/target, fetches server-side, and streams the body back with permissive CORS headers and the upstream content type. It persists nothing.

- **Local dev:** the Vite dev server proxies the same relay path to either a locally-run worker (`wrangler dev`) or directly, so day-to-day development needs no deployed worker and no public proxy. Production points the same client path at the deployed Worker origin via an env var.
- **Why:** smallest possible backend, satisfies feed-relay spec (stateless, http(s)-only, closed to non-feed targets), and keeps a single client-side fetch abstraction whose base URL is configuration.
- **Alternatives:** public CORS proxy (rejected — unreliable, privacy-leaking, per exploration); no fetch/import-only (rejected — not a live reader).

### D5: HTML sanitization before render

Entry bodies are sanitized (e.g. DOMPurify) at normalize time and again defensively at render. React escapes text, but article bodies are HTML from untrusted feeds and must be set as markup — so sanitization is mandatory, not optional.

- **Why:** entry-reading spec requires untrusted markup be neutralized; feeds are an XSS vector.

### D6: PWA via a Vite PWA plugin (Workbox)

Use a Vite PWA plugin to generate the service worker and precache the app shell; reuse the existing `manifest.json` (adjusting `start_url`/icons for the built app). Runtime caching applies to the app shell only — feed content is _not_ cached by the service worker because the library (including fetched entries) already persists in localStorage and is the source of truth offline.

- **Why:** meets pwa-shell spec with minimal hand-written SW code; avoids a second, divergent copy of feed data in the Cache API.

### D7: Testing architecture

- **Vitest** covers pure logic (tree helpers, normalize, dedupe, migration, tagging, search filtering) and component behavior with the store.
- **Playwright + Serenity/JS (Screenplay)**: actors with a Browse ability, tasks (AddFeed, MoveNode, BookmarkEntry, SearchBookmarks), and questions over visible state. E2E runs against the built app with the relay stubbed/mocked so tests are deterministic and offline.
- **Why:** the specs are written as WHEN/THEN scenarios that map onto Screenplay tasks/questions; deterministic feed fixtures avoid depending on live feeds.

## Risks / Trade-offs

- **Relay availability / rate limits** → the relay is on the critical path for fetching. Mitigate: per-feed failures are isolated (spec), stored entries stay readable offline, and errors surface via the status line rather than breaking the app.
- **Feed-format variance** (odd RSS/Atom, encodings, relative links) → normalizer edge cases. Mitigate: fixture-driven unit tests; unknown fields degrade to null rather than throwing; a parse failure leaves existing entries intact (spec).
- **Derived tags can't be hand-edited** → moving a feed silently retags its bookmarks. Accepted trade-off (matches the mock and bookmarks spec); revisit only if users need free-form tags (a Non-Goal here).
- **localStorage size limits** (~5 MB) with large/among many feeds → could hit quota. Mitigate: storage-full degradation + backup prompt (spec); consider capping stored entries per feed or moving to IndexedDB in a later change (Open Question).
- **Relay as open proxy** → abuse risk. Mitigate: http(s)-only, target validation, and it only returns bodies to the app; hardening (allowlist/limits) is deploy-time config.
- **Time drift in migrated "ago"** → legacy entries have no absolute date. Mitigate: migrate to `null` publishedAt and show the source feed only, rather than fabricate a time.

## Migration Plan

1. Scaffold the Vite/TS/React app at the repo root alongside `openspec/` and the reference folder; wire the Industry stylesheet and manifest.
2. Port state (store + selectors) and components; verify parity against the mock using the seed data as an initial fixture.
3. Add the storage module with the v0→v1 migration so any existing `ferrite.library.v1` upgrades on first load.
4. Add the fetch pipeline + relay; enable the Vite dev proxy for local fetching.
5. Add the PWA plugin and service worker; verify offline shell + offline read/bookmark.
6. **Rollback:** it's greenfield — reverting the change removes the app; user data in localStorage is untouched by uninstall, and the versioned payload means re-loading an old build reads the same data. The relay deploy is independent and can be rolled back on its own.

## Open Questions

- Storage backend: stay on localStorage for v1, or move to IndexedDB if entry volume proves too large? Deferrable — the storage module isolates this and the spec's behavior is unchanged either way.
- Relay hosting specifics (custom domain, rate-limit thresholds) — deploy-time config, does not affect specs, approach, or tasks.
