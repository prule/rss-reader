# 0001. Store the library in IndexedDB via Dexie

Date: 2026-09-20
Status: Accepted

## Context

The library was held in a single `localStorage` string under `rss-reader-pwa.library.v1`, and `src/store/persist.ts` re-serialised the whole payload on every change to the store. Two limits followed from that, and both were reached rather than anticipated:

- **A ceiling of roughly 5MB**, synchronous and string-only. `openspec/config.yaml` recorded this deviation from `docs/constitution/technologies/local-first.md` and named the ceiling as the trigger for revisiting it.
- **Write cost proportional to the whole library.** Marking one entry read rewrote every entry. A user with a few dozen active feeds hit a quota error on write and held every entry body in memory to render a list.

Options rejected:

- **Keep `localStorage`, prune old entries to stay under the ceiling.** Lowers the data to fit the store rather than fixing the store, and silently discards the user's content — for a local-first app with no server copy, that is data loss by design.
- **Dexie as a single blob record.** Lifts the quota but leaves every change rewriting the entire library, which is half the problem.
- **Dexie tables with the full library still held in the Zustand store.** Fixes write cost but keeps every entry body in memory, so the list still cannot grow past what one render can hold.
- **A derived `sortAt` column** so one index covers dated and undated entries. Rejected in favour of a two-phase walk: a stored derived field must be kept in sync on every write, and a genuine 1970-epoch timestamp would tie with undated entries.

Two facts about Dexie 4.4.6, established by probing rather than from documentation, shaped the design:

- A collection from `anyOf(...)` has no `orderBy`, and `orderBy('publishedAt')` silently omits rows whose `publishedAt` is `null` — IndexedDB will not index a null key. So an ordered, incrementally-loaded page needs a compound index per view, plus a second phase for undated entries.
- Dexie does not refuse a database written by a newer build. Asked to open a version-40 database as version 1, it opens it, bumps the IndexedDB version to 41 and hides the stores it does not declare.

## Decision

We will store the library in IndexedDB through Dexie, as `nodes` and `entries` tables, and query it from the UI rather than holding it in memory.

- The Zustand store keeps UI state only. `src/lib/db/repository.ts` is the single seam the app reads and writes through; no component imports Dexie.
- Entry lists page incrementally over a per-view compound index (`[read+publishedAt]`, `[marked+publishedAt]`, `[feedId+publishedAt]`), by a `(publishedAt, id)` cursor rather than `offset`. A folder selection merges one walk per descendant feed, because `anyOf` cannot be ordered.
- `read` and `marked` persist as `0 | 1`, mapped to `boolean` at the repository boundary, so they can carry an index.
- Counts come from indexed `count()` queries, so a view's total is the stored total rather than the number rendered.
- Startup is asynchronous: the shell shows a loading state until the first query resolves, and reports an unopenable database instead of presenting an empty one.
- `openLibrary` compares the raw IndexedDB version before Dexie opens anything, so a database written by a newer build is refused rather than silently taken over.
- **We will not migrate libraries saved by the `localStorage` build.** On first launch such a payload is offered once as a JSON download — the same shape a normal export produces — and then removed. It is never loaded.

## Consequences

Easier:

- The library is bounded by the origin's storage quota instead of a 5MB string. A read toggle writes one row; mark-all-read is one indexed bulk `modify` that covers entries the list never loaded.
- Multi-record changes (deleting a feed and its entries, an import) are transactional, so they cannot land half-applied.
- Dexie schema versions replace the hand-rolled payload migration chain, and `src/lib/migrate.ts` is gone.
- The test suite exercises real Dexie behaviour under `fake-indexeddb`, so index semantics and cursor ordering are covered rather than mocked.

Harder, and accepted:

- **Anyone who has not exported loses their library on upgrade.** This is the cost of no migration, taken deliberately for a pre-1.0 app rather than carrying migration code for a format being retired. The one-time rescue download is the mitigation; it is not a migration, and a user who dismisses it has lost the data.
- **Rollback does not recover data.** Reverting to the `localStorage` build leaves a client that has already launched this version with no `localStorage` key, so it rolls back to an empty library. Its IndexedDB database is ignored, not deleted.
- Every read is asynchronous. The store no longer answers "what are the entries?" synchronously, so components depend on `useLiveQuery` and tests must let queries settle.
- Paging is the most intricate code in the change: ties at equal timestamps, the dated/undated boundary, and entries inserted by a refresh mid-scroll each need care. The tiebreaker runs on **descending** `id` to match the direction a reversed index walk yields — an ascending one silently skips rows, which is how the first implementation was wrong.
- Sibling order within a folder is no longer preserved. It was an artefact of splicing an in-memory array and was never specified behaviour; drag and drop re-parents only.
- **Eviction cannot be reported.** Browsers evict a whole origin, so nothing survives to distinguish an evicted library from a first run. Recovery is a silent, clean empty start.
- One more runtime dependency (`dexie`, `dexie-react-hooks`) and a stored shape that differs from the domain type in one respect (the 0/1 flags).
