## 1. Project scaffold

- [x] 1.1 Scaffold a Vite + TypeScript + React app at the repo root (alongside `openspec/` and `RSS reader design/`); add `.gitignore`, `tsconfig`, and npm scripts (`dev`, `build`, `preview`, `test`, `test:e2e`).
- [x] 1.2 Vendor the Industry design system into the app (`_ds/.../styles.css`) and load it globally; add Barlow / Barlow Condensed fonts.
- [x] 1.3 Add the base three-pane app layout shell (header, sidebar, entry list, article pane, status bar) using design tokens only (no hard-coded hex/px/font names).
- [x] 1.4 Configure Vitest (jsdom + React Testing Library) and Playwright + Serenity/JS (Screenplay) with a smoke test that the app renders.

## 2. Domain model, store, and selectors

- [x] 2.1 Define TypeScript types for `Node` (folder/feed) and `Entry` (incl. `link`, `guid`, `publishedAt`), plus UI state and the versioned storage payload.
- [x] 2.2 Implement the app store (`{ nodes, entries, ui }`) with actions for every mutation the mock performs.
- [x] 2.3 Implement pure selectors: `node`, `childrenOf`, `ancestors`, `feedsUnder`, `isDescendant`, `tagsFor`, `flatten`, `unreadFor`, `visibleEntries`, and All/Unread/Bookmark counts.
- [x] 2.4 Unit-test selectors and store actions (Vitest), including recursive aggregation and tag derivation.

## 3. Local persistence and migration

- [x] 3.1 Implement the `storage` module as the sole owner of `ferrite.library.v1`, wrapping data as `{ version, nodes, entries }`.
- [x] 3.2 Implement the migration chain: treat versionless payloads as v0 and upgrade (add `link`/`guid`/`publishedAt`, drop stored `ago`), preserving read/bookmark state.
- [x] 3.3 Persist on every mutation; handle storage-full/blocked by keeping in-memory state and surfacing a backup-export warning.
- [x] 3.4 Unit-test round-trip persistence, v0→v1 migration (no data loss), and the storage-failure path.

## 4. Navigation tree

- [x] 4.1 Build the Sidebar tree (Library shortcuts + flattened folder/feed rows with indentation, chevrons, unread badges).
- [x] 4.2 Implement create folder, inline rename (empty-rename keeps old name), collapse/expand (persisted), and delete with cascade (folder reparents children; feed removes entries; selection falls back to All).
- [x] 4.3 Implement drag-and-drop: drop into folder / sibling under feed / top-level drop area, with cycle prevention (no drop into self or descendant).
- [x] 4.4 Unit-test move rules and cycle prevention; add a Screenplay e2e for moving a feed between folders.

## 5. Entry list and article pane

- [x] 5.1 Build the entry list driven by `visibleEntries` (title/meta/snippet, read dot, bookmark toggle) with All/Unread/Bookmarks and per-node selection; wire list title/subtitle/crumb.
- [x] 5.2 Implement read/unread: mark-read-on-open, toggle, and "mark all read" over the current list.
- [x] 5.3 Build the article pane (title, feed, byline, hierarchy tags, sanitized body) with the empty state; add bookmark and read/unread toggles.
- [x] 5.4 Implement keyboard shortcuts (J/K, B, U, N, `/`, Escape), inert while a text field is focused.
- [x] 5.5 Unit-test read-state transitions and keyboard handling; e2e for opening an entry and mark-all-read.

## 6. Bookmarks and search

- [x] 6.1 Implement bookmark toggle everywhere (list + article) with consistent state.
- [x] 6.2 Implement the Bookmarks view: keyword search over title/snippet/tags, tag chips restricted to tags present on current bookmarks, multi-tag AND, keyword+tag combined, and the no-match empty state.
- [x] 6.3 Verify hierarchy-path tags re-derive when a feed moves.
- [x] 6.4 Unit-test the search/filter logic; Screenplay e2e: bookmark an entry, then find it by tag + keyword.

## 7. Feed relay

- [x] 7.1 Implement the stateless relay worker: accept a target feed URL, validate http(s)-only and reject missing/disallowed targets, fetch server-side, return the body with permissive CORS and preserved content type; store nothing.
- [x] 7.2 Distinguish upstream/unreachable errors from success in the response so the client can tell a fetch error from a parse error.
- [x] 7.3 Wire local dev: Vite proxy to `wrangler dev` (or direct) so fetching works without a deployed worker; make the client relay base URL configurable via env.
- [x] 7.4 Test the relay's validation and error behavior.

## 8. Feed fetching pipeline

- [x] 8.1 Implement the client fetch abstraction that calls the relay for a feed URL.
- [x] 8.2 Implement the RSS/Atom parser + normalizer to a common `Entry` shape (title, author, link, absolute `publishedAt`, snippet, sanitized body); malformed documents fail without altering stored entries.
- [x] 8.3 Implement dedup identity (guid/id → link → hash) and merge that appends new entries while preserving read/marked on existing ones.
- [x] 8.4 Wire Add Feed (URL + optional title/folder; derive title from feed or host) to fetch on subscribe; compute relative "ago" from `publishedAt` at display time.
- [x] 8.5 Implement refresh: manual trigger + recurring auto-poll, isolating per-feed failures so one failure never blocks others.
- [x] 8.6 Unit-test parser (RSS + Atom fixtures), dedup, merge-preserves-state, and per-feed failure isolation.

## 9. Export / import

- [x] 9.1 Implement JSON export (full library) and CSV export (entry rows with feed, folder path, tags, read, bookmarked).
- [x] 9.2 Implement JSON import (replace library, reset selection) and CSV import (rebuild folder hierarchy from folder-path column, attach entries); an unreadable file leaves the library intact and reports failure.
- [x] 9.3 Unit-test export→import round-trip and the unreadable-file safety path.

## 10. PWA shell and offline

- [x] 10.1 Add the Vite PWA plugin (Workbox); adapt the existing `manifest.json` (start_url, icons) and precache the app shell.
- [x] 10.2 Verify installability and that the shell + stored library load offline.
- [x] 10.3 Verify offline read/bookmark persist and that an offline refresh degrades gracefully (keeps entries, reports it couldn't fetch).
- [x] 10.4 E2e/manual check of the offline flows.

## 11. Finalize

- [x] 11.1 Reconcile `openspec/config.yaml` context to note the stateless fetch relay exception to "no backend."
- [x] 11.2 Full parity pass against the mock; run the whole Vitest + Playwright/Serenity suite; document run/build/deploy (app + relay) in a README.
