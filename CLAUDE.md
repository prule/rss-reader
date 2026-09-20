# RSS Reader

A local-first RSS reader delivered as an installable PWA. Feeds, folders, entries
and bookmarks live on the device — no account, no user data on a server.

## Commands

```bash
pnpm dev          # Vite dev server
pnpm build        # tsc -b && vite build
pnpm typecheck    # tsc -b --noEmit
pnpm test         # Vitest, single run
pnpm test:watch   # Vitest, watch mode
pnpm test:e2e     # Playwright
pnpm relay:dev    # wrangler dev relay/worker.ts
pnpm format       # Prettier, write
pnpm format:check # Prettier, check only (what CI runs)
pnpm lint         # ESLint
pnpm lint:fix     # ESLint, autofix
```

pnpm is pinned in `package.json` (`packageManager`), Node in `.node-version`.
Always pnpm — never npm or yarn.

Formatting is automatic: a pre-commit hook formats staged files, and CI runs
`format:check`. Never hand-format. `core.hooksPath` is local git config and is
**not** carried by a clone — run this once per clone:

```bash
git config core.hooksPath .githooks
```

## Conventions

Follow the engineering constitution in `docs/constitution/`:

- `principles/README.md` — universal, apply always
- `patterns/README.md` — conditional, check "when not to use this"
- `technologies/README.md` — the default stack
- `documentation/README.md` — what to document, and where

Read the four index files at the start of a task. Open individual files when a
decision turns on them. Say so before deviating.

`docs/constitution/` is vendored from github.com/prule/principles — **never edit
it here.** Change it upstream and pull.

## Specs

`openspec/` holds the specs and change proposals. Behaviour is specified before
it is implemented — see `docs/constitution/documentation/specs.md`.

## Deviations from the constitution

Deliberate, and recorded in `openspec/config.yaml`:

- Storage is `localStorage`, not Dexie/IndexedDB (`technologies/local-first.md`).
  No user data on a server, by design. No ADR yet — write one if the ~5MB
  synchronous, string-only ceiling becomes a real constraint.
- The `relay/` Worker is a scoped exception to "no backend": stateless, fetches
  feed XML around CORS, stores nothing.
- E2E uses Serenity/JS rather than a hand-rolled Screenplay implementation
  (`patterns/screenplay.md`).

None outstanding. CI enforces formatting, lint, types and unit tests.
