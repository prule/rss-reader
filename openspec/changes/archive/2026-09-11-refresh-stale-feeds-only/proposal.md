## Why

The app currently re-fetches every feed on load and every 15 minutes while open, which is wasteful: it hits the relay (and third-party feeds) far more often than feed content changes, burning the relay's rate/quota budget for no new entries. Feeds rarely update more than once a day, so automatic refresh should only fetch a feed when its content is actually stale — older than 24 hours since its last successful fetch.

## What Changes

- Track, per feed, the time of its **last successful fetch**.
- **Automatic refresh** (the on-load refresh and the recurring poll) SHALL only fetch a feed whose last successful fetch was **more than 24 hours ago** (or which has never been fetched). Fresh feeds are skipped.
- **Manual refresh** (the toolbar Refresh button) forces **all** feeds to fetch now, regardless of age — an explicit user action overrides the staleness gate.
- A **failed** fetch does not update the last-fetched time, so a feed that failed stays eligible for the next automatic cycle rather than being treated as fresh.
- Newly subscribed feeds are fetched immediately (unchanged) and their last-fetched time is set then.

**Offline / behavior**: no change to offline reading; this only reduces how often live fetches happen. Per-feed failure isolation is preserved.

**Data & migration**: feed nodes gain a `fetchedAt` timestamp (epoch ms, optional). Existing stored feeds have no `fetchedAt` and are therefore treated as never-fetched → stale → refreshed on the next automatic cycle. The load-time migration leaves the field absent (no data loss); it is populated on the next successful fetch.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `feed-subscription`: Change the "Refresh feeds" requirement so automatic refresh only fetches feeds stale beyond 24 hours, while manual refresh forces all; record last-successful-fetch time per feed and do not advance it on failure.

## Impact

- **Code**: `src/lib/feeds.ts` (`refreshAll` gains a "force" vs "auto" mode and a staleness check; `refreshFeed` / subscribe set `fetchedAt` on success), `src/store/store.ts` (persist `fetchedAt` on feed nodes; a setter to stamp it), `src/hooks/useRefresh.ts` (on-load + interval call the auto mode), `src/components/Header.tsx` (Refresh button calls the force mode).
- **Types**: `LibraryNode` gains optional `fetchedAt`.
- **Migration**: handled in `src/lib/migrate.ts` — absent `fetchedAt` means "never fetched".
- **Tests**: `src/lib/feeds.test.ts` (auto skips fresh, fetches stale, manual forces, failure leaves stale), migration test for the new field.
- **No relay change and no app-contract change.** The 15-minute poll cadence stays; it just becomes a staleness check that fetches only stale feeds.
- **Assumptions**: staleness threshold is exactly 24h (86,400,000 ms) since last _successful_ fetch; the poll interval remains 15 minutes (each tick re-evaluates staleness).
