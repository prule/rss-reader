# RSS Reader

A local-first RSS reader delivered as an installable PWA. Feeds, folders, entries,
and bookmarks all live on the device in `localStorage` — there is no account and
no user data on any server. The interface follows the **Industry** design system
(steel-blue on a light technical ground, Barlow Condensed over Barlow).

## Features

- **Add feeds** by URL, with an optional title and target folder.
- **Navigation tree** of folders and feeds in an arbitrary hierarchy, reorganized
  by drag and drop (into folders, beside feeds, or to the top level). Folders
  collapse, rename inline, and delete (folder delete reparents children; feed
  delete removes its entries).
- **Reading**: select any node to see every entry beneath it (recursive), plus
  All / Unread / Bookmarks views, read/unread state, and a reading pane with a
  sanitized article body. Keyboard: `J`/`K` move, `B` bookmark, `U` unread,
  `N` add feed, `/` search bookmarks.
- **Bookmarks** are tagged with their feed's full hierarchy path; the Bookmarks
  view searches by keyword and filters by tag chips (AND).
- **Backup**: JSON and CSV export, and JSON/CSV import.
- **Offline**: the app shell is precached; the stored library is fully usable
  offline. Only fetching new feed content needs connectivity.

## Architecture

- **State** lives in one typed store (`src/store/`); derivations (aggregation,
  tags, search) are pure selectors, never stored.
- **Persistence** (`src/lib/storage.ts`) is the sole owner of `localStorage`,
  with a versioned payload and a load-time migration (`src/lib/migrate.ts`).
- **Fetching pipeline**: relay client → RSS/Atom parser/normalizer → dedup/merge
  (`src/lib/relay.ts`, `parseFeed.ts`, `dedupe.ts`, `feeds.ts`). Bodies are
  sanitized with DOMPurify.
- **Feed relay** (`relay/worker.ts`): a stateless Cloudflare Worker that relays
  feed XML to get around browser CORS. It stores nothing and only fetches
  http(s) feed URLs.

## Develop

This project uses **pnpm** (pinned via `packageManager`; run `corepack enable` if
you don't have it). Use pnpm for everything — not npm.

```bash
pnpm install
pnpm dev               # app on http://localhost:5173
pnpm run relay:dev     # feed relay on http://localhost:8787 (proxied at /relay)
```

Run the relay alongside the app in dev so adding/refreshing feeds works. Without
it, feeds can still be added but the first fetch will fail (retry via Refresh).

## Test

```bash
pnpm test              # Vitest — unit and component tests
pnpm run test:e2e      # Playwright + Serenity/JS (Screenplay) acceptance tests
```

E2E tests build the app and run it under `vite preview`; feed fetching is stubbed
so the suite is deterministic and offline. First run needs `pnpm exec playwright install`.

## Build & deploy

```bash
pnpm build             # type-checks, builds to dist/, generates the PWA service worker
pnpm preview           # serve the production build locally
```

- **App**: deployed to **Cloudflare Pages** (serve the built `dist/`). Set
  `VITE_RELAY_URL` to the deployed relay origin at build time (defaults to
  `/relay`).
- **Relay**: `cd relay && wrangler deploy` — a standalone Cloudflare Worker,
  deployed separately from Pages (not a Pages Function).

## Data

Stored under the `localStorage` key `rss-reader-pwa.library.v1` as
`{ version, nodes, entries }`. Older payloads (including the design mock's
versionless shape) are migrated forward on load without data loss.
