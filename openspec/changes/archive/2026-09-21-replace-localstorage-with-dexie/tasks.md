## 1. Dependencies and test harness

- [x] 1.1 Add `dexie`, `dexie-react-hooks` (dependencies) and `fake-indexeddb` (dev) with exact pinned versions via `pnpm add -E` / `pnpm add -DE`; verify `pnpm install --frozen-lockfile` succeeds and no `^`/`~` ranges were introduced for these three
- [x] 1.2 Register `fake-indexeddb/auto` in the Vitest setup file; verify with a throwaway test that `indexedDB.open('probe')` resolves under `pnpm test`
- [x] 1.3 Add an ESLint rule banning `localStorage` / `window.localStorage` outside the single rescue module (`no-restricted-properties` or equivalent); verify `pnpm lint` fails on a deliberately added `localStorage.setItem` and passes once removed

## 2. Database and row mapping

- [x] 2.1 Create `src/lib/db/db.ts` with the Dexie subclass, `nodes` and `entries` tables at schema version 1, and the indexes listed in design.md (`entries`: `feedId`, `publishedAt`, `[feedId+publishedAt]`, `[read+publishedAt]`, `[marked+publishedAt]`, `read`, `marked`, `guid`; `nodes`: `parentId`); verify a unit test opens the database and asserts each expected index is present on the table schema
- [x] 2.2 Create `src/lib/db/rows.ts` with `toRow` / `fromRow` mapping `read` and `marked` between `boolean` and `0 | 1`; verify unit tests round-trip an `Entry` and assert the stored row holds numbers while the returned domain object holds booleans
- [x] 2.3 Verify by unit test that a `read`/`marked` query is index-driven — filtering on the stored `0`/`1` value returns the right entries and is issued through `where(...)`, not a JS `filter`

## 3. Repository: queries

- [x] 3.1 Implement `nodesAll()` and the node write operations (add, rename, move/reparent, toggle collapsed, delete-with-reparent) in `src/lib/db/repository.ts`; verify unit tests cover reparenting a folder's children and that deleting a feed removes its entries in the same transaction
- [x] 3.2 Implement `countFor(selection)` for All / Unread / Bookmarks and for a node selection using indexed `count()`; verify a unit test over a fixture larger than one page asserts counts are the full match total, not the loaded total (spec: _Count exceeds what is rendered_)
- [x] 3.3 Implement `entriesFor(selection, limit, cursor)` with `(publishedAt, id)` cursor pagination over the per-view compound index, walking the index with `.limit()` rather than materialising the selection, newest-first, with undated entries as a second phase paged by `id`; verify unit tests assert page boundaries, no duplicates and no skips across pages, correct ordering when several entries share a `publishedAt`, and that `publishedAt: null` entries come last (spec: _Order is stable while loading more_)
- [x] 3.4 Verify by unit test that inserting new entries between two page loads does not duplicate or skip an already-listed entry (the concurrent-refresh case)
- [x] 3.5 Implement folder selections as a k-way merge of per-feed `[feedId+publishedAt]` walks over the descendant feed ids from the existing pure tree walk in `src/store/selectors.ts`; verify a unit test asserts a folder selection returns entries from every nested feed recursively in the right order, that one page reads at most `feeds x (limit+1)` rows, and that `selectors.ts` still has no database import

## 4. Repository: mutations

- [x] 4.1 Implement per-record `setRead`, `toggleRead`, `toggleMarked`; verify a unit test asserts only the target entry's row is written (spy on `table.update`/`put`, or compare untouched rows by reference to a snapshot) — spec: _Toggling one entry does not rewrite the library_
- [x] 4.2 Implement `markAllRead(selection)` as an indexed bulk `modify` inside a `rw` transaction; verify a unit test marks read entries that were never loaded into a page and asserts the unread count falls to zero (spec: _Mark all read covers unloaded entries_)
- [x] 4.3 Implement `addEntries` with `guid` dedup reusing `src/lib/dedupe.ts` against the `guid` index; verify a unit test re-adds an overlapping batch and asserts no duplicate entries and that existing read/marked state is preserved
- [x] 4.4 Implement `replaceLibrary(data)` as a single `rw` transaction that clears and repopulates both tables; verify a unit test that forces a mid-transaction failure leaves the prior library byte-identical (spec: _Interrupted import leaves the library intact_)
- [x] 4.5 Verify by unit test that a multi-record delete (feed plus its entries) is atomic — a forced failure leaves neither partially applied (spec: _A multi-record change is all-or-nothing_)

## 5. Store and shell rewiring

- [x] 5.1 Remove `nodes` and `entries` from `AppState` in `src/store/store.ts`, keeping selection, dialog, search, tag-filter and status state, and delete the data actions that moved to the repository; verify `pnpm typecheck` enumerates every remaining reader (expected to fail at this point — that list is the work of tasks 5.3–5.5)
- [x] 5.2 Delete `src/store/persist.ts` and its call in `src/App.tsx`, replacing hydration with `useLiveQuery`-backed reads; verify no import of `persist` remains (`grep`) and `pnpm typecheck` no longer references it
- [x] 5.3 Add the loading / unavailable shell states: indicate loading until the first `nodes` query resolves, report an unopenable database with a suggestion to import a backup, and never render an empty state for an unread library; verify component tests for all three (spec: _Asynchronous startup_)
- [x] 5.4 Convert `Sidebar`, `ArticlePane` and `Bookmarks` to repository-backed live queries; verify their existing component tests pass unchanged in behaviour under `fake-indexeddb`
- [x] 5.5 Convert `src/hooks/useRefresh.ts` to write through the repository; verify a unit test asserts a refresh persists new entries and updates the feed's `fetchedAt` without rewriting unrelated feeds' entries
- [x] 5.6 Report a failed write as a status message and keep the app running on what is already loaded; verify a component test forcing a Dexie write rejection asserts the warning appears and the action is not shown as having succeeded (spec: _Storage is unavailable or full_)

## 6. Incremental entry list

- [x] 6.1 Convert `src/components/EntryList.tsx` to page through `entriesFor` with a page size of 50, loading more on scroll to the end; verify a component test asserts the first page renders and a second page appends on scroll
- [x] 6.2 Show a loading-more indicator and an explicit end-of-list state; verify component tests for both (spec: _End of list is reported_)
- [x] 6.3 Extend `src/hooks/useKeyboard.ts` so J past the last loaded entry loads and opens the next matching entry; verify a component test asserts J at the loaded boundary advances rather than stopping (spec: _J/K continues past the loaded boundary_)
- [x] 6.4 Wire the mark-all-read action to `markAllRead(selection)`; verify a component test asserts the view count drops to zero for a selection larger than one page

## 7. Legacy payload rescue

- [x] 7.1 Create the single rescue module that reads `rss-reader-pwa.library.v1` once on startup, offers it as a JSON download through the same helper `buildJSON` export uses, then removes the key; verify unit tests assert the key is removed after both accepting and declining, and that no second offer occurs on reload (spec: _Offer is not repeated_)
- [x] 7.2 Verify by unit test that a rescued payload is accepted by `fromJSON` unmodified — the rescued file and a `buildJSON` export are interchangeable to the importer (spec: _Rescued file round-trips through import_)
- [x] 7.3 Verify by unit test that a legacy payload is never loaded into the library: after startup with the key present, the library is empty (spec: _A pre-database payload is not loaded_)

## 8. Migration code removal and schema guards

- [x] 8.1 Delete `migrate()`, `parseRelativeAge()`, `migrateEntryFromV0()` and `bodyToHtml()` from `src/lib/migrate.ts`, moving the `LibraryPayloadV1` validator to `src/lib/importers.ts`; verify `pnpm typecheck` passes and `src/lib/migrate.test.ts` is removed or reduced to the surviving validator
- [x] 8.2 Delete `src/lib/storage.ts` and rewrite `src/lib/storage.test.ts` against the repository; verify `grep -r localStorage src/` matches only the rescue module
- [x] 8.3 Handle a database written by a newer app version without destroying it, reporting the condition instead; verify a unit test opens a database stamped at a higher version and asserts no data loss and that the condition is reported (spec: _A newer database is not silently downgraded_)
- [x] 8.4 Handle an evicted or missing database as a normal, silent empty start (no error, no unavailable state); verify a unit test deletes the database between opens and asserts a clean empty start. Eviction cannot be detected — the origin's stores go together, so no marker survives — and the spec records that instead of requiring a report (spec: _Store was evicted between sessions_)

## 9. Export / import round-trip

- [x] 9.1 Point `src/lib/exporters.ts` at repository reads while keeping the JSON and CSV output byte-identical; verify the existing `src/lib/io.test.ts` assertions pass unchanged
- [x] 9.2 Verify by unit test that a JSON export produced _before_ this change (a checked-in fixture of the old format) still imports correctly into Dexie
- [x] 9.3 Verify the full round-trip after the data-model change: export JSON and CSV from a populated Dexie library, re-import each into an empty one, and assert nodes, entries, read/bookmark state and the rebuilt CSV folder hierarchy all match

## 10. Acceptance tests

- [x] 10.1 Update the Playwright seeding to populate IndexedDB via an init script instead of `localStorage`; verify `pnpm test:e2e` passes for `smoke.spec.ts` and `navigation.spec.ts`
- [x] 10.2 Update `e2e/offline.spec.ts` for async hydration; verify the app still loads offline, shows the stored library, and persists read/bookmark changes across a reload with no network
- [x] 10.3 Add a Screenplay acceptance test (Serenity/JS, per `docs/constitution/patterns/screenplay.md`) for the incremental list: with a library larger than one page, verify scrolling loads more and mark-all-read clears the unread count
- [x] 10.4 Add a Screenplay acceptance test for the rescue flow: with a legacy `localStorage` payload seeded, verify the download is offered, the key is gone afterwards, and importing the downloaded file restores the library
- [x] 10.5 Verify `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format:check` and `pnpm test:e2e` all pass

## 11. Documentation

- [x] 11.1 Write `docs/adr/` entry recording the reversal — the ~5MB and whole-payload-write measurements that triggered it, the choice of per-record tables with a Dexie-queried UI, and the accepted no-migration data loss; verify it follows `docs/constitution/documentation/adr.md`
- [x] 11.2 Remove the localStorage deviation from the _Deviations from the constitution_ section of `CLAUDE.md` and from the `context` block in `openspec/config.yaml`, updating the stated data model to the Dexie tables; verify neither file still describes localStorage as the store
- [x] 11.3 Update the `openspec/config.yaml` proposal rule that says to state what a change persists to localStorage so it refers to the local database; verify a subsequent `openspec instructions proposal` reflects the new wording
