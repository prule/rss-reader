# Local-First

The local store is the source of truth for the UI. The app works fully offline; the network is an enhancement, not a dependency.

## Defaults
| Concern | Choice |
|---|---|
| Local store | **Dexie** (IndexedDB) |
| Reactivity | `useLiveQuery` from `dexie-react-hooks` |
| Asset caching | **Workbox** via vite-plugin-pwa |
| Sync | **Hand-rolled** against the backend |

## Rules for agents
- Read and write locally, always. Never block the UI on a network call.
- Queue mutations in an outbox table and drain it when online, with retry and backoff. This is `../patterns/outbox-and-idempotency.md` on the client.
- Every queued mutation carries a client-generated ID so replays are idempotent. Generate IDs locally (UUIDv7 or ULID) — never wait for a server ID.
- Decide the conflict rule per table *before* writing sync code, and write it down: last-write-wins, server-wins, field-level merge, or surface to the user. Silent data loss is the failure mode here.
- Store a schema version and write forward-only Dexie migrations. Users will open an old tab with old data.
- Surface sync state in the UI — pending, syncing, failed, offline. Hidden sync failures destroy trust.
- Treat local data as untrusted on arrival at the server: re-validate and re-authorise everything.
- Assume the store can be evicted. The app must recover from an empty database.

## Deviate when
Multiple users edit the same record concurrently — hand-rolled merge gets painful fast. Consider a CRDT (Yjs, Automerge) for that specific data, or a Postgres sync engine. Do not hand-roll collaborative editing.

## Smells
A spinner blocking the UI on load, sync logic inside components, mutations that need a server ID before being usable, no version on the local schema, conflicts resolved by whichever request finished last, "it worked until I went through a tunnel".
