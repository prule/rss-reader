# Technologies

[← index](../README.md)

The preferred stack. Principles are universal and patterns are conditional — **these are chosen defaults**. Follow them unless the project states a reason not to, and when you do deviate, record why.

## Choosing a stack

```
Does a user interact with it?
├─ Yes → React PWA        (react-pwa.md)
│         Should it work offline?
│         └─ Yes → local-first.md
└─ No  → a service or job (spring-boot-kotlin.md)

Does it need a backend?
├─ CRUD + auth + realtime + storage → Supabase        (supabase.md)
└─ Real business rules, batch work,
   heavy integration, a domain model → Spring Boot    (spring-boot-kotlin.md)

Where does it run?
├─ Static frontend, edge logic → Cloudflare Pages / Workers  (cloudflare.md)
└─ JVM service → a container host, Cloudflare at the edge only
```

## The defaults

| Layer | Choice | File |
|---|---|---|
| Language (Node/browser) | TypeScript, strict. Never JavaScript | [typescript.md](typescript.md) |
| Runtime & packages | fnm + pnpm, both version-pinned | [typescript.md](typescript.md) |
| Frontend | Vite + React + React Router, Tailwind + shadcn/ui | [react-pwa.md](react-pwa.md) |
| Offline | Dexie + Workbox, hand-rolled sync | [local-first.md](local-first.md) |
| Backend (default) | Supabase, RLS on every table | [supabase.md](supabase.md) |
| Backend (complex domain) | Kotlin + Spring Boot + Spring Data JDBC | [spring-boot-kotlin.md](spring-boot-kotlin.md) |
| Hosting | Cloudflare Pages + Workers | [cloudflare.md](cloudflare.md) |
| API contracts | **Contract first** — OpenAPI written before code, types generated | [type-contracts.md](type-contracts.md) |
| Formatting | Prettier · ktfmt · google-java-format, on commit | [formatting.md](formatting.md) |
| Repo layout | pnpm workspace monorepo | [repo-structure.md](repo-structure.md) |
| Native shells | PWA first; Capacitor or Tauri only on demand | [packaging.md](packaging.md) |

## Testing

| Layer | Tools |
|---|---|
| TypeScript unit | Vitest |
| Browser e2e | Playwright, **Screenplay pattern** ([../patterns/screenplay.md](../patterns/screenplay.md)) |
| Kotlin unit | JUnit 5 + MockK |
| Kotlin integration | Testcontainers (real Postgres, never H2) |

## Standing rules

- **TypeScript, not JavaScript.** Everywhere, no exceptions in source.
- **Formatting is automated**, applied by a pre-commit hook and enforced in CI. Never hand-format, never debate style.
- **Pin every version.** Node in `.node-version`, pnpm in `packageManager`, dependencies exact. Reproducible builds are not optional.
- **Contract first for REST.** The OpenAPI spec is written and reviewed before the implementation; server interfaces and clients are generated from it, never the other way round.
- **Generate types, never hand-write them** across a boundary that owns a schema. Validate at runtime with Zod anyway.
- **Cross-platform means PWA first.** A native shell is a cost, taken deliberately.
- **Prefer the lower rung.** Supabase before Spring Boot, PWA before Capacitor, plain pnpm before Turborepo. Escalate on evidence, not anticipation — `../principles/kiss.md`, `../principles/yagni.md`, `../principles/measure-first.md`.

## Deviating

These are defaults, not laws. A project may have a real reason to choose differently — an existing codebase, a client mandate, a genuine technical constraint. Record the decision and its reason in the project, then follow it consistently. What is not acceptable is drifting off the default silently.
