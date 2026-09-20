## Context

See proposal.md — Why. Today `refreshAll()` in `src/lib/feeds.ts` fetches every feed unconditionally; it's called by `useRefresh` (on-load + 15-min interval) and by the Header Refresh button. Feed state lives as `LibraryNode` records (`{ id, type, name, parentId, collapsed, url? }`) persisted in localStorage and migrated on load. There is no record of when a feed was last fetched.

## Goals / Non-Goals

**Goals:**

- Skip fetching feeds fetched within the last 24h on automatic refresh; keep manual refresh forcing all.
- Persist last-successful-fetch time per feed; never advance it on failure.
- Migrate existing feeds without data loss (treated as never-fetched → stale).

**Non-Goals:**

- Configurable threshold or per-feed schedules (fixed 24h for now).
- Background/Service-Worker refresh when the app is closed (out of scope; unchanged).
- Changing the 15-minute poll cadence or the relay.

## Decisions

### D1: Store `fetchedAt` (epoch ms) on the feed node

Add optional `fetchedAt?: number` to `LibraryNode`. It's set to `Date.now()` when a fetch of that feed **succeeds** (in `refreshFeed` and on subscribe), and left untouched on failure. Persisted with the rest of the library.

- **Why:** the feed node is already the per-feed record and is persisted/migrated; co-locating the timestamp needs no new store shape. Entries can't answer "when did we last poll" (a feed with no new items still gets polled).
- **Alternative:** a separate `fetchedAt` map keyed by feed id — rejected as a parallel structure to keep in sync.

### D2: `refreshAll(options)` gains an explicit mode; staleness checked per feed

`refreshAll({ force })`: when `force` is false (automatic), each feed is included only if `fetchedAt` is absent or `Date.now() - fetchedAt > 24h`; when `force` is true (manual), all feeds are included. Per-feed failure isolation (`Promise.allSettled`) is unchanged. `refreshFeed(feedId)` stamps `fetchedAt` on success via a store action.

- **Why:** a single gate at the point of iteration keeps the staleness rule in one place; the mode flag maps directly to the two callers.
- **Callers:** `useRefresh` (on-load + interval) → `refreshAll({ force: false })`; Header Refresh button → `refreshAll({ force: true })`.
- **Threshold:** `STALE_MS = 24 * 60 * 60 * 1000`.

### D3: Store action to stamp the timestamp

Add a store action (e.g. `markFetched(feedId, when)`) that sets `fetchedAt` on the node, so persistence (the existing subscribe-to-changes) writes it. Subscribe path sets it after the initial successful fetch.

- **Why:** keeps all node mutation in the store; the persistence layer already saves on node changes.

### D4: Migration is a no-op field addition

`fetchedAt` is optional; older payloads simply lack it. `migrate` needs no transform — absent means never-fetched, which the staleness check treats as stale. Existing feeds thus refresh once on the next automatic cycle, then settle into the 24h rhythm.

- **Why:** minimal, lossless, and self-correcting on first fetch.

## Risks / Trade-offs

- **Clock skew / device time changes** could make a feed look fresh or stale incorrectly. Mitigation: manual Refresh always forces; worst case is a delayed or one extra fetch — acceptable.
- **"Nothing updates for a day" surprise** → mitigated by the immediate fetch on subscribe and the always-available manual force; the status line already reports refresh outcomes.
- **Empty automatic refresh** (all feeds fresh) should read as success, not "up to date but did work". Mitigation: when auto refresh fetches zero stale feeds, report a quiet "Up to date" and skip the relay entirely.

## Migration Plan

1. Add `fetchedAt` to the `LibraryNode` type and the store action; set it on successful fetch/subscribe.
2. Add the `force` option + staleness gate to `refreshAll`; wire callers.
3. No data migration needed (optional field); confirm `migrate` passes existing feeds through untouched.
4. Tests, then `pnpm build`. **Rollback:** revert the change; the extra `fetchedAt` field is ignored by the prior code and harmless in storage.

## Open Questions

- None blocking. (A configurable threshold or focus/visibility-triggered refresh could be a later change; deferrable without affecting this design.)
