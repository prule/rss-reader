# Repository Structure

One **pnpm workspace monorepo** per product. Shared code is a workspace package, not a copy and not a published artifact.

## Layout
```
repo/
  package.json          # workspace root, pinned packageManager
  pnpm-workspace.yaml
  .node-version         # fnm
  apps/
    web/                # React PWA
    worker/             # Cloudflare Worker
  packages/
    shared/             # domain types, Zod schemas, pure utilities
    api-client/         # generated client + adapter
  backend/              # Spring Boot (Gradle) — see note
  openspec/
```

## Rules for agents
- Shared code goes in `packages/*` and is imported by workspace name. Never reach across app directories with relative paths.
- `packages/shared` stays pure: types, schemas, pure functions. No React, no Node APIs, no I/O.
- Dependencies are declared by the package that uses them. Do not rely on hoisting — pnpm's strictness here is a feature.
- One lockfile, at the root. Always `--frozen-lockfile` in CI.
- CI runs affected packages: typecheck, lint, unit tests, then e2e. Add Turborepo only when build times actually justify caching — `../principles/measure-first.md`.
- Keep the Gradle build self-contained: it must not depend on Node tooling to compile or test.

## The JVM wrinkle
Gradle and pnpm are separate build systems and should not be wired together. Keeping `backend/` in the same repo is fine and keeps changes atomic across the API boundary — but if the two build systems start fighting in CI, split the backend into its own repository. That split is cheap; a tangled build is not.

## Smells
`import '../../../other-app/src/thing'`, two lockfiles, a shared package importing React, a root `package.json` holding every dependency, Gradle invoked from an npm script.
