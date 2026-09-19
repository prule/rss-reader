## 1. Data model

- [x] 1.1 Add optional `fetchedAt?: number` (epoch ms) to `LibraryNode` in `src/types.ts`.
- [x] 1.2 Add a store action in `src/store/store.ts` (e.g. `markFetched(feedId, when)`) that sets `fetchedAt` on the feed node (persisted via the existing change subscription).
- [x] 1.3 Confirm `src/lib/migrate.ts` passes existing feed nodes through unchanged (absent `fetchedAt` = never fetched); add a migration test asserting no data loss.

## 2. Staleness-gated refresh

- [x] 2.1 In `src/lib/feeds.ts`, define `STALE_MS = 24 * 60 * 60 * 1000` and change `refreshAll` to accept `{ force }`: automatic (`force:false`) fetches only feeds with absent or >24h-old `fetchedAt`; manual (`force:true`) fetches all.
- [x] 2.2 Stamp `fetchedAt = Date.now()` via `markFetched` only on a **successful** fetch (in `refreshFeed` and on subscribe); never on failure.
- [x] 2.3 When an automatic refresh finds no stale feeds, do no relay calls and report a quiet "Up to date".

## 3. Wire callers

- [x] 3.1 `src/hooks/useRefresh.ts`: on-load and interval call `refreshAll({ force: false })`.
- [x] 3.2 `src/components/Header.tsx`: the Refresh button calls `refreshAll({ force: true })`.

## 4. Tests

- [x] 4.1 `src/lib/feeds.test.ts`: automatic refresh skips a feed fetched < 24h ago; fetches a feed with no `fetchedAt` or > 24h; manual (`force`) fetches a fresh feed; a failed fetch leaves `fetchedAt` unchanged (stays eligible); per-feed failure isolation still holds.
- [x] 4.2 `pnpm test` — full suite green; `pnpm build` clean.

## 5. Verify in the app

- [x] 5.1 Manually verify: after a refresh, an immediate automatic refresh fetches nothing ("Up to date"); the manual Refresh button still forces a fetch.
