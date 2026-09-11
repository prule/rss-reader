## Why

We have a complete, high-fidelity design for **Ferrite** (`RSS reader design/RSS Reader.dc.html`) but no running application — the design is a UI mock backed entirely by hand-written seed data and never touches the network. This change converts that design into a working, installable PWA that subscribes to real RSS/Atom feeds, organizes them in a drag-and-drop tree, and keeps everything on the device. It establishes the initial codebase (TypeScript + React + Vite) that all later work builds on.

## What Changes

- Stand up a new TS/React/Vite project and port the mock's UI to idiomatic function components + hooks (replacing the DCLogic class), preserving the three-pane layout, Industry design-system styling, and keyboard shortcuts (J/K, B, U, N, `/`).
- Replace the mock's seed entries with **real feed fetching**: add a feed by URL, fetch and parse RSS/Atom, normalize items into entries, dedup on refresh, and derive real timestamps from `pubDate`/`updated`.
- Introduce a **minimal fetch relay** (a Cloudflare Worker) that relays feed XML to work around browser CORS. It stores nothing and holds no user data — it is a stateless passthrough. This is a deliberate, minimal bend of the "no backend" rule, scoped strictly to fetching; all persistence remains local.
- Keep the navigation tree: folders/feeds in an arbitrary hierarchy, drag-and-drop reparent/reorder (including to top level), collapse, rename, and delete (folder delete reparents children; feed delete removes its entries).
- Keep entry reading: select any node to see all entries beneath it (recursive aggregation), All Entries / Unread / Bookmarks library views, per-entry read/unread, and the article reading pane.
- Keep bookmarking with implicit hierarchy-path tagging, and the bookmarks search (keyword over title/snippet/tags + tag-chip AND filtering).
- Keep JSON and CSV export, and JSON/CSV import for backup/restore.
- Add the **PWA shell**: reuse the existing `manifest.json`, add a service worker for offline app-shell caching and installability, and cache the last-fetched entries so the reader works offline.

**Offline behavior**: Once loaded, the app shell and all stored data (feeds, folders, entries, read/bookmark state) are available offline from localStorage; only fetching *new* feed content requires connectivity (and reaches the relay). Failed fetches degrade gracefully and surface via the existing toast/status line.

**Data & migration**: Persistence stays in localStorage under `ferrite.library.v1` with the existing `nodes` / `entries` shape. Real fetching extends entries with fields the mock faked (e.g. `link`, absolute `publishedAt`, `guid` for dedup); a versioned payload and a load-time migration will upgrade any pre-existing mock data rather than discard it.

## Capabilities

### New Capabilities
- `feed-subscription`: Adding feeds; fetching and parsing RSS/Atom through the relay; normalizing, deduplicating, and refreshing entries; scheduled polling.
- `feed-relay`: The stateless CORS-relay worker contract — request shape, allowed responses, and error semantics.
- `navigation-tree`: The folder/feed hierarchy — drag-and-drop reparent/reorder, collapse, rename, and delete semantics.
- `entry-reading`: Node selection and recursive entry aggregation; All/Unread/Bookmarks views; read/unread state; the article reading pane; keyboard navigation.
- `bookmarks`: Bookmarking entries, implicit hierarchy-path tagging, and combined keyword + tag-chip search.
- `library-persistence`: The localStorage data model and migration, plus JSON/CSV export and import.
- `pwa-shell`: Manifest, service worker, installability, and offline behavior.

### Modified Capabilities
<!-- None — this is a greenfield build; there are no existing specs. -->

## Impact

- **New codebase**: Vite + TypeScript + React app scaffolded at the repo root (the current root holds only `openspec/` and the `RSS reader design/` reference).
- **New deployable**: a Cloudflare Worker for the feed relay (separate, minimal, stateless).
- **Dependencies**: React, Vite, an RSS/Atom XML parser, HTML sanitization for article bodies, a PWA/service-worker toolchain; Vitest and Playwright + Serenity/JS (Screenplay) for tests.
- **Reused assets**: `manifest.json` and the Industry design system (`_ds/.../styles.css`) from `RSS reader design/`.
- **Constraint reconciliation**: `openspec/config.yaml` currently says "no backend." The relay is a minimal exception (fetch-only, no storage); the config context should be reconciled to note it.
