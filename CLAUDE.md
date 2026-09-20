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
```

pnpm is pinned in `package.json` (`packageManager`). Always pnpm — never npm or yarn.

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

Unrecorded — resolve or write an ADR:

- No ESLint or Prettier config, and no pre-commit formatting hook
  (`technologies/formatting.md`).
- No `.node-version`, so the Node version is unpinned (`technologies/typescript.md`).
