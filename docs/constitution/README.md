# Engineering Constitution

Design rules for agents building software. Three tiers, in descending order of authority.

| Tier | Authority | Read |
|---|---|---|
| **[Principles](principles/README.md)** | Universal — apply to every decision | 12 files |
| **[Patterns](patterns/README.md)** | Conditional — apply when the problem has that shape | 14 files |
| **[Technologies](technologies/README.md)** | Chosen defaults — deviate only for a stated reason | 10 files |
| **[Documentation](documentation/README.md)** | Standards — how to document what you build | 7 files |

The tiers differ in how binding they are. A principle is never wrong to apply. A pattern applied to the wrong problem is itself a mistake — reaching for DDD on a CRUD app violates KISS and YAGNI, so every pattern file says when *not* to use it. A technology choice is a preference: follow it unless the project records a reason not to. Documentation standards apply to whatever you build, whichever stack it uses.

## Using this in a project

Vendor it with **git subtree**. The files land in the repo, so they are always present — a clone needs no extra flags, CI needs no extra configuration, and an agent cannot silently proceed without them.

```bash
git remote add constitution git@github.com:prule/principles.git
git subtree add --prefix docs/constitution constitution main --squash
```

Pull updates later:

```bash
git subtree pull --prefix docs/constitution constitution main --squash
```

Then add to the project's `CLAUDE.md`:

```markdown
Follow the engineering constitution in `docs/constitution/`:
- `principles/README.md` — universal, apply always
- `patterns/README.md` — conditional, check "when not to use this"
- `technologies/README.md` — the default stack
- `documentation/README.md` — what to document, and where

Read the four index files at the start of a task. Open individual
files when a decision turns on them. Say so before deviating.

`docs/constitution/` is vendored — never edit it here. Change it
upstream and pull.
```

**Never edit the vendored copy.** A local edit drifts from upstream and, worse, lets an inconvenient rule be quietly softened in the one place nobody reviews. Change it upstream, then pull. Add a CODEOWNERS entry on the path if the project enforces review.

Other installation options, with trade-offs, are in [INSTALL.md](INSTALL.md).

## For agents

1. **Read the four index files first** — the tables below and in each folder are the working summary. They are short by design.
2. **Open an individual file only when a decision turns on it.** Each is 15–25 lines.
3. **Follow every tier by default.** If a task conflicts with something here, say so before proceeding rather than silently deviating.
4. **Cite the rule when you apply it.** "Keeping the domain free of the ORM, per hexagonal-architecture.md" tells the reader which rule is in play and lets them overrule it.

## Principles — always

| Principle | Rule |
|---|---|
| [SOLID](principles/solid.md) | Five OO design rules; umbrella for SRP, Open/Closed, Dependency Inversion. |
| [DRY](principles/dry.md) | One authoritative home per piece of knowledge — but duplication beats a wrong abstraction. |
| [KISS](principles/kiss.md) | The simplest thing that fully solves the stated problem. |
| [YAGNI](principles/yagni.md) | Build what is asked for now; no speculative features. |
| [SRP](principles/srp.md) | One reason to change per unit. |
| [Open/Closed](principles/open-closed.md) | Add behaviour by adding code, not editing working code. |
| [Dependency Inversion](principles/dependency-inversion.md) | Depend on abstractions; inject; wire at the edge. |
| [Composition](principles/composition.md) | Assemble small parts; inheritance only for true "is-a". |
| [Separation of Concerns](principles/separation-of-concerns.md) | Layer the system; dependencies point inward. |
| [Fail Fast](principles/fail-fast.md) | Surface problems early and loudly; never swallow errors. |
| [Measure First](principles/measure-first.md) | No optimisation without a number, before and after. |
| [Least Privilege](principles/least-privilege.md) | Minimum access, minimum scope, minimum lifetime. Default deny. |

**When they conflict:** safety and correctness first (Least Privilege, Fail Fast), then restraint (YAGNI, KISS), then the generalising principles (DRY, Open/Closed) once a pattern is proven. Details in [principles/README.md](principles/README.md).

## Patterns — when the problem fits

**Core architecture** · [DDD](patterns/domain-driven-design.md) · [Hexagonal](patterns/hexagonal-architecture.md) · [Repository](patterns/repository.md)

**Code-level** (almost always) · [Functional Core, Imperative Shell](patterns/functional-core-imperative-shell.md) · [Explicit Errors](patterns/explicit-errors.md) · [Illegal States Unrepresentable](patterns/illegal-states-unrepresentable.md)

**Testing** · [Strategy](patterns/testing-strategy.md) · [Test Doubles](patterns/test-doubles.md) · [Contract Tests](patterns/contract-tests.md) · [Screenplay](patterns/screenplay.md)

**Distributed / async** · [Domain Events](patterns/domain-events.md) · [CQRS](patterns/cqrs.md) · [Outbox & Idempotency](patterns/outbox-and-idempotency.md) · [Anti-Corruption Layer](patterns/anti-corruption-layer.md)

## Technologies — the default stack

| Layer | Choice |
|---|---|
| Language (Node/browser) | TypeScript, strict. Never JavaScript |
| Runtime & packages | fnm + pnpm, both version-pinned |
| Frontend | Vite + React + React Router, Tailwind + shadcn/ui |
| Offline | Dexie + Workbox, hand-rolled sync |
| Backend (default) | Supabase, RLS on every table |
| Backend (complex domain) | Kotlin + Spring Boot + Spring Data JDBC |
| Hosting | Cloudflare Pages + Workers (JVM needs a container host) |
| API contracts | Contract first — OpenAPI written before code |
| Formatting | Prettier · ktfmt · google-java-format, via pre-commit hook |
| Repo layout | pnpm workspace monorepo |
| Native shells | PWA first; Capacitor or Tauri only on demand |
| Testing | Vitest · Playwright + Screenplay · JUnit 5 + MockK · Testcontainers |

Decision tree and the full rules in [technologies/README.md](technologies/README.md).

## Documentation — one question, one home

| Question | Artefact |
|---|---|
| What should it do? | [OpenSpec spec](documentation/specs.md) — written before the implementation |
| Why is it built this way? | [ADR](documentation/adr.md) — Nygard format, immutable once accepted |
| How do I run it? | [Project README](documentation/project-readme.md) |
| What changed? | [Generated changelog](documentation/commits.md) — Conventional Commits |
| Why is this line like this? | [A comment](documentation/code-comments.md) — why, never what |
| How do the parts fit? | [Mermaid](documentation/diagrams.md) — diagrams as code |
| How should an agent work here? | [Project CLAUDE.md](documentation/agent-context.md) |

Full rules in [documentation/README.md](documentation/README.md).

## Repository layout

```
principles/    12 files — universal rules
patterns/      14 files — conditional designs, each with "when not to use this"
technologies/  10 files — the chosen stack, with a decision tree
documentation/ 7 files — what to document and where it lives
```

Every file follows the same shape: a one-line definition, imperative **Rules for agents**, a **counterweight** section naming the rule's own failure mode, and **Smells** for recognising violations in existing code.
