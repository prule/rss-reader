# TypeScript, Node & Tooling

Anything that runs in Node or a browser is TypeScript. No plain JavaScript, no `.js` source files, no `// @ts-nocheck`.

## Defaults
| Concern | Choice |
|---|---|
| Language | TypeScript, `strict: true` |
| Node version | Managed by **fnm**, pinned in `.node-version` |
| Package manager | **pnpm** (standalone install), pinned via `packageManager` in `package.json` |
| Unit tests | **Vitest** |
| E2E tests | **Playwright**, Screenplay pattern |
| Lint | **ESLint** (flat config) |
| Format | **Prettier**, on commit — see `formatting.md` |
| Build | **Vite** |

## Rules for agents
- `strict: true` plus `noUncheckedIndexedAccess`. Never widen a type to make an error go away.
- No `any`. Use `unknown` and narrow. If a cast is unavoidable, comment why on the line.
- Always `pnpm`, never `npm` or `yarn` — no mixed lockfiles. `pnpm install --frozen-lockfile` in CI.
- Pin versions: Node in `.node-version`, pnpm in `packageManager`. Both must be exact.
- Use `import type` for type-only imports; keep runtime imports honest.
- Prefer `satisfies` over type annotations when you want inference and checking.
- Validate external data at the boundary with Zod — API responses, env vars, `localStorage`, message payloads. See `type-contracts.md` and `../patterns/illegal-states-unrepresentable.md`.
- No default exports except where a framework demands it.
- Never hand-format. The pre-commit hook and CI handle it — `formatting.md`.

## Deviate when
Never, for source. Config files that tooling requires in `.js`/`.mjs` are the only exception.

## Smells
`any` in a signature, `as unknown as T`, a `package-lock.json` in the repo, `@ts-ignore`, untyped `process.env` access, a dependency added without pinning.
