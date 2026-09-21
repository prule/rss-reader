## Why

The library lives in one `localStorage` string (`rss-reader-pwa.library.v1`) that is re-serialised in full on every change — a read toggle rewrites every entry. That caps the library at the ~5MB synchronous, string-only ceiling `openspec/config.yaml` flagged as the trigger for revisiting this, and makes write cost grow with the whole library rather than with what changed. A user who subscribes to a few dozen active feeds hits both walls: writes fail with a quota error, and the UI stalls holding every entry body in memory.

This change moves persistence to Dexie/IndexedDB with the UI querying it directly, which is also what `docs/constitution/technologies/local-first.md` specifies as the default — so it retires a recorded deviation rather than deepening it.

## What Changes

- **BREAKING** `localStorage` is no longer the store. Persistence moves to a Dexie (IndexedDB) database with `nodes` and `entries` tables, indexed for the queries the UI actually makes — including a compound `[flag+publishedAt]` index per view, which is what lets an ordered page be walked incrementally (see `design.md`).
- **BREAKING** **No migration of existing libraries.** A library saved by the current version is _not_ carried into Dexie. The app starts empty on Dexie and the user restores from a JSON export. To keep "restore from export" achievable at all, a legacy payload found in `localStorage` on first launch is offered as a one-time JSON download and then discarded — a rescue hatch, not a migration. See _Accepted cost_ below.
- The Zustand store stops holding the full library. It keeps UI state (selection, dialogs, search, status message) only; entries and nodes are read from Dexie via `useLiveQuery` and written per record.
- The entry list loads incrementally (a windowed/paginated query) instead of materialising every entry. Counts come from indexed `count()` queries, not array length.
- Mutations (read, unread, bookmark, rename, move, delete, refresh) become per-record Dexie writes inside transactions, so their cost is proportional to what changed.
- Startup becomes asynchronous: the app shows a loading state while the database opens, and recovers to an empty library if IndexedDB is evicted or unavailable.
- Export and import keep their current file formats byte-for-byte; import writes into Dexie in a transaction and replaces the library atomically.
- Dexie schema versioning replaces the `migrate.ts` payload chain as the forward-only upgrade mechanism. The v0→v1 entry migration is dropped along with the localStorage payload it existed to upgrade.

The `LibraryNode` and `Entry` field shapes are unchanged — the same records, stored as objects in tables rather than inside one JSON string. The `LibraryPayloadV1` wrapper survives only as the JSON export format.

Offline behaviour is unchanged in intent and better in practice: IndexedDB is local, so browsing the tree, reading, and toggling read/bookmark state all keep working with no network and persist across reloads. Nothing is written to a server; the `relay/` Worker still stores nothing. Nothing is persisted to `localStorage` after this change — the key is read once, at most, to offer the rescue download, then removed.

### Accepted cost

Choosing no migration means anyone who has not exported loses their library on upgrade. This was decided deliberately in favour of not carrying migration code for a pre-1.0 app. The rescue download is the mitigation and is severable: drop it and the change still stands, at the cost of the data being unreachable.

## Capabilities

### New Capabilities

None. This changes how an existing capability is satisfied and what it guarantees; it introduces no new user-facing capability.

### Modified Capabilities

- `library-persistence`: the store is IndexedDB rather than `localStorage`; the payload-migration requirement is replaced by forward-only database schema versioning plus an explicit no-legacy-migration rule; storage-failure and eviction behaviour is restated for an async, database-backed store; startup becomes asynchronous.
- `entry-reading`: entry lists and their counts are served by indexed queries and load incrementally rather than from a fully in-memory array, which changes what "the current list" means for the mark-all-read action.

`bookmarks`, `navigation-tree`, `feed-subscription`, `feed-relay`, and `pwa-shell` keep their requirements as written — their observable behaviour is unchanged and only their data source moves.

## Impact

- **Dependencies**: adds `dexie` and `dexie-react-hooks` (exact-pinned, per `technologies/typescript.md`); `fake-indexeddb` as a dev dependency for Vitest.
- **Code**: `src/lib/storage.ts` is replaced by a Dexie database module and a repository layer. `src/store/persist.ts` goes away — hydration and write-through are no longer a subscription over the whole store. `src/store/store.ts` and `src/store/selectors.ts` shrink to UI state and pure derivations over query results. `src/lib/migrate.ts` loses its v0→v1 chain. `src/components/EntryList.tsx`, `Bookmarks`, `Sidebar`, `ArticlePane`, `src/hooks/useRefresh.ts`, and `src/lib/importers.ts`/`exporters.ts` all move to the repository layer.
- **Tests**: `src/lib/storage.test.ts` and the migration tests are rewritten against Dexie; component tests need an IndexedDB fake; Playwright specs that seed or assert `localStorage` must seed IndexedDB instead.
- **Docs**: an ADR in `docs/adr/` recording the reversal (this is the decision `openspec/config.yaml` deferred), and the deviation list in both `CLAUDE.md` and `openspec/config.yaml` updated to drop the localStorage exception.
- **Risk**: the entry list, mark-all-read, and bookmark search are the three places where "everything is in memory" was an unstated assumption; each needs its query written deliberately.
