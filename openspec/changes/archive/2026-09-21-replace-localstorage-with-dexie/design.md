## Context

See `proposal.md` — _Why_. The constraints that shape the approach:

- Today `src/lib/storage.ts` is the sole owner of persistence and `src/store/persist.ts` write-throughs the entire `{nodes, entries}` payload on any store change. `src/store/store.ts` holds both arrays; `src/store/selectors.ts` derives everything (descendant feeds, visible entries, counts, tags) as pure functions over those arrays.
- That "everything is in memory, synchronously" assumption is load-bearing in `EntryList`, `Bookmarks`, `Sidebar`, `ArticlePane`, `useKeyboard`, `useRefresh`, and both importers and exporters.
- The app must keep working fully offline and must not put user data on a server (`CLAUDE.md`). IndexedDB satisfies this as well as `localStorage` did.
- `docs/constitution/technologies/local-first.md` already names Dexie + `useLiveQuery` as the default, and `patterns/repository.md` applies: there is a domain model worth keeping free of persistence.
- `principles/measure-first.md` cuts against speculative optimisation. The number here is concrete and already known: a single serialised string caps the library at roughly 5MB, and every state toggle rewrites all of it. That is the measurement justifying the change; it is not a reason to add caching or indexes beyond the queries the UI actually issues.

## Goals / Non-Goals

**Goals:**

- One repository seam between the UI and Dexie, so no component touches the database directly and the query set is visible in one place.
- Keep `selectors.ts`'s tree logic pure. Only the entry/count queries move into the database.
- Keep the JSON and CSV export formats byte-identical, so a file exported before this change still imports after it.
- Tests that run without a real browser: Dexie under `fake-indexeddb` in Vitest.

**Non-Goals:**

- Virtualised rendering. The list loads incrementally; it still renders what it has loaded as ordinary DOM. Windowed rendering is a separate change, taken on evidence.
- Full-text search indexing. Bookmark keyword search stays a scan over bookmarked entries (a small subset), not an inverted index.
- Any sync, outbox, or conflict resolution. `local-first.md` describes those for a backend; there is no backend for user data and there will not be one.
- Entry retention / pruning policy. Worth having once the ceiling is gone, but out of scope here.

## Decisions

### Two tables, not one blob

`nodes` and `entries` as separate Dexie tables, primary key `id` on both.

Indexes, each justified by a query the UI makes:

| Index                          | Serves                                                          |
| ------------------------------ | --------------------------------------------------------------- |
| `entries.feedId`               | count of entries in a feed; dedup scope                         |
| `entries.publishedAt`          | All Entries, newest-first, walked incrementally                 |
| `entries.[feedId+publishedAt]` | one feed's entries in order; the per-feed leg of a folder merge |
| `entries.[read+publishedAt]`   | Unread view in order, walked incrementally                      |
| `entries.[marked+publishedAt]` | Bookmarks in order                                              |
| `entries.read`                 | unread counts                                                   |
| `entries.marked`               | bookmark counts                                                 |
| `entries.guid`                 | dedup on refresh (`src/lib/dedupe.ts`)                          |
| `nodes.parentId`               | children of a folder, for tree walks                            |

_Alternative considered_: keep the single payload, stored as one Dexie record. Rejected — it lifts the quota but leaves write cost proportional to the whole library, which is half the problem.

### Every ordered view needs its own compound index

An earlier draft of this design rejected `[read+publishedAt]` as YAGNI and had folder selections issue a plain `where('feedId').anyOf(ids)`. Both were wrong, and the correction is recorded here because the reasoning matters more than the conclusion.

Probing Dexie 4.4.6 directly established three facts:

1. **A collection from `anyOf(...)` has no `orderBy`** — the method is `undefined`, not merely unhelpful. An `anyOf` selection cannot be walked in `publishedAt` order at all.
2. **`orderBy('publishedAt')` silently omits rows whose `publishedAt` is `null`.** Four entries in, three out. IndexedDB will not index a null key, so undated entries are _invisible_ to that index rather than merely sorted oddly.
3. A compound range walk (`where('[feedId+publishedAt]').between(...).reverse().limit(n)`) does stop early, so it is genuinely incremental.

`Collection.sortBy()` is the only other ordering route and it loads every matching row into memory first. So without a compound index per view, an ordered page for Unread, Bookmarks, or a folder can only be produced by materialising the whole selection — exactly what the _Incremental entry list_ requirement forbids. The index is therefore not speculative: it is the only way to express the query. That is the measurement `principles/measure-first.md` asks for, arrived at by probing rather than by anticipation.

`read` and `marked` keep their single-field indexes too, because a `count()` does not want the compound.

### A folder selection is a k-way merge, not one query

Because `anyOf` cannot be ordered, a folder selection pages by walking `[feedId+publishedAt]` descending once per descendant feed, taking `limit + 1` from each, merging those streams and keeping the first `limit`. Work is bounded by `descendantFeeds × pageSize` rows per page, not by the library.

_Alternative considered_: one `anyOf` query with an in-memory sort. Rejected — that is the materialise-everything path the spec forbids.

_Alternative considered_: a derived `sortAt = publishedAt ?? 0` column, indexed so one phase covers dated and undated entries together. Rejected — it adds a stored derived field to keep in sync on every write, and a genuine 1970-epoch timestamp would tie with undated entries. The two-phase walk keeps the stored shape honest.

### Undated entries are a second phase, paged by `id`

Since no `publishedAt` index can reach a row whose `publishedAt` is `null`, undated entries are paged in a second phase that walks the selection's own index (`feedId`, `read`, `marked`) filtered to `publishedAt == null`, ordered by primary key `id`. The cursor carries which phase it is in, and the phases concatenate: every dated entry, then every undated one. This satisfies "entries lacking a publish time ordered last" without a derived column.

### Booleans are stored as 0/1

IndexedDB cannot index a JavaScript boolean. `read` and `marked` are persisted as `0 | 1` and mapped to `boolean` at the repository boundary, so the `Entry` type the app works with is unchanged. This mapping is the one place where the stored row shape differs from the domain type, which is why a single `toRow`/`fromRow` pair owns it rather than each call site.

_Alternative considered_: store booleans and filter in JS. Rejected — that means loading every entry to count unread, which is the thing being fixed.

### A repository module, not Dexie calls in components

`src/lib/db/` holds the Dexie schema and the repository:

- `db.ts` — the `Dexie` subclass, table declarations, version/upgrade blocks. Nothing else.
- `rows.ts` — `toRow` / `fromRow`, the only place 0/1 mapping lives.
- `repository.ts` — the query and mutation surface the app uses: `nodesAll()`, `entriesFor(selection, limit, cursor)`, `countFor(selection)`, `setRead(id, v)`, `toggleMarked(id)`, `addEntries(...)`, `deleteFeed(id)`, `replaceLibrary(data)`, and so on.

Components and hooks depend on `repository.ts` only. This is `patterns/repository.md` and `principles/dependency-inversion.md`; it is also what makes the tests able to exercise every query in one file.

_Alternative considered_: `useLiveQuery` calling Dexie inline in each component. Rejected — it scatters the query set, and `local-first.md` lists "sync logic inside components" as a smell for the same reason.

### Folder selections resolve to a feed-id set in pure code

`selectors.ts` already computes a node's descendant feed ids from the in-memory tree. The tree is small and stays fully in memory, so that stays pure and unchanged. The repository takes the resulting id array and merges a per-feed walk over each, as described above. The tree is the cheap half; only entries move into the database.

### Cursor pagination on `publishedAt`, not `offset`

The incremental list pages by a `(publishedAt, id)` cursor rather than `.offset(n)`. `offset` rescans from the start on every page and, worse, shifts when an entry is inserted by a concurrent refresh — which would duplicate or skip entries, exactly what the spec's "order is stable while loading more" scenario forbids. `id` is the tiebreaker so the order is total even when several entries share a timestamp.

The tiebreaker runs **descending**, because that is the direction a reversed index walk already yields among equal keys. An ascending tiebreaker looks tidier and is wrong: `limit(n)` would keep the lowest ids in a tie group rather than the ones just past the cursor, silently skipping rows. Matching the index's own direction is what makes the page boundary exact. The spec asks for a stable total order, not a particular tie direction.

Because an index range cannot start "just after" a `(publishedAt, id)` pair, a page is walked in two parts: the remainder of the tie group at the cursor's own timestamp (`equals(ts).reverse()`, filtered to ids below the cursor), then everything strictly older. Splitting it keeps the resume exact — no overshoot constant, and no row read twice.

`publishedAt` is nullable, and undated rows are absent from the index entirely — see _Undated entries are a second phase_ for how the cursor covers them.

### `useLiveQuery` for reactivity; Zustand keeps only UI state

`AppState` loses `nodes` and `entries` and keeps selection, dialog state, search query, tag filters, and the status message. Components read data through `useLiveQuery(() => repo.…)`. Dexie's own change tracking then drives re-render, so the write-through subscription in `persist.ts` has nothing left to do and the file is deleted.

`nodes` is read once into a live query at the shell level and passed down, so tree logic keeps operating on a plain array.

### Mark-all-read and delete-feed are Dexie transactions

Both are bulk `modify` calls inside `db.transaction('rw', …)`. `modify` on an indexed query is what makes "mark all read" cover entries the list never loaded without pulling them into memory, and the transaction is what satisfies the atomicity requirement.

### Schema version 1; the v0→v1 payload chain is deleted

The Dexie database starts at version 1. `src/lib/migrate.ts` loses `migrate()`, `parseRelativeAge()`, `migrateEntryFromV0()`, and `bodyToHtml()` — they existed to upgrade the design mock's shape inside the localStorage payload, and no such payload is loaded any more. What survives is the `LibraryPayloadV1` wrapper and a validator for it, because the JSON _export_ format still carries `version: 1`; that moves to `src/lib/importers.ts` where the import path already validates. Future schema changes are forward-only Dexie `version(n).upgrade()` blocks.

### The legacy payload is rescued, not migrated

On first launch the app reads `rss-reader-pwa.library.v1` once. If present, it offers the raw string as a download (it is already valid JSON-export content — `buildJSON` produces the same shape) and then `removeItem`s the key. A marker in `localStorage` is _not_ needed: removing the key is itself the "already offered" record.

The download is served through the same blob-download helper the JSON export uses, so a rescued file and an exported file are indistinguishable to the importer.

### Test doubles: `fake-indexeddb`, not a hand-written fake repository

Vitest gets `fake-indexeddb/auto` in the setup file, so unit and component tests run the real Dexie code against an in-memory IndexedDB. `patterns/test-doubles.md` prefers fakes over mocks, and a fake IndexedDB is a truer fake than a hand-written repository stub — it makes the index behaviour (the 0/1 mapping, `anyOf`, cursor ordering) part of what is tested, so no contract test between a stub and Dexie is needed.

Playwright specs that seed state must seed IndexedDB via an init script instead of `localStorage`. `e2e/offline.spec.ts` is the one most likely to need real work.

## Risks / Trade-offs

- **A partly-converted store leaves two sources of truth for entries** → Convert in one change, not incrementally: remove `nodes`/`entries` from `AppState` in the same commit that introduces the repository, so the type checker finds every reader rather than letting a stale copy linger.
- **`useLiveQuery` re-runs a query on any write to a table it touched, not just to matching rows** → A read-toggle invalidates the entry list query. Acceptable at this scale, and the query is indexed and windowed. If it shows up as jank, narrow the subscriptions — after measuring, per `measure-first.md`.
- **Eviction is indistinguishable from a first run** → Browsers evict a whole origin, so no marker survives to tell the two apart. The spec was amended to require a silent, clean empty start rather than a report that could never fire. Requesting persistent storage via `navigator.storage.persist()` would reduce the likelihood of eviction and is a reasonable follow-up, but it detects nothing and is out of scope here.
- **Dexie does not refuse a database written by a newer build** → Verified by probe: asked to open a version-40 database as version 1, it opens it, bumps the IndexedDB version to 41 and hides the stores it does not declare. `openLibrary` therefore compares the raw IndexedDB version _before_ Dexie opens anything, and refuses ahead of time.
- **Async startup can flash an empty library** → The spec forbids it; the shell holds a distinct "loading" state until the first `nodes` query resolves, and empty states render only after that.
- **Cursor pagination is easy to get subtly wrong** at ties, at the dated/undated boundary, and when a refresh inserts entries mid-scroll → These are the three cases the pagination unit tests must cover explicitly, with fixtures containing duplicate timestamps and null `publishedAt`.
- **No migration means real data loss** for anyone who has not exported → The rescue download is the mitigation, and the accepted cost is recorded in `proposal.md` and the ADR. It is a deliberate decision, not an oversight.
- **A `localStorage` write left anywhere silently resurrects the old ceiling** → An ESLint `no-restricted-globals`/`no-restricted-properties` rule banning `localStorage` outside the one rescue module makes the regression impossible to commit.
- **Reversing a recorded deviation without recording why** would leave `openspec/config.yaml` and `CLAUDE.md` contradicting the code → The ADR and both doc updates are tasks in this change, not follow-ups.

## Migration Plan

There is no data migration by decision. The deploy sequence:

1. Ship the Dexie version. On first launch each client opens a fresh database at schema version 1 and starts empty.
2. Any client with a `localStorage` library is offered the rescue download on that first launch; the key is then removed.
3. The user restores via the existing JSON import.

**Rollback**: reverting the release restores the localStorage build, but it will find no `localStorage` key on a client that has already launched the Dexie version — that client rolls back to an empty library, and its Dexie database is simply ignored (not deleted). Rollback therefore does not recover data; it only recovers the code. Worth knowing before deploying, and a reason to keep the release small and the rescue download prominent.

## Open Questions

- How many entries per page for the incremental list? Start at 50 and adjust on feel. It is one constant and changes neither the specs nor the task breakdown.
- Whether `Bookmarks` keyword search should debounce once it runs against Dexie. Decide when it is wired up and can be felt.
