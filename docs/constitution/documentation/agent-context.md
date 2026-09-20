# CLAUDE.md — Agent Context

Every project carries a `CLAUDE.md` at its root: the operating instructions an agent needs that it cannot infer from the code.

## What belongs in it
- **How to run things** — the exact build, test, lint and dev commands for *this* repo.
- **A pointer to the constitution** — principles, patterns, technologies, documentation.
- **Project-specific conventions** that differ from the defaults, with the reason or an ADR link.
- **Gotchas** — the slow test suite, the service that must be running, the generated files not to edit by hand.
- **Boundaries** — what must never be touched: migrations, generated clients, production config.

## What does not belong
- Restating the constitution. Link to it. Duplication here rots first — `../principles/dry.md`.
- General programming advice the model already has.
- Architecture description that belongs in ADRs or specs.
- Anything secret. It is a committed file.

## Rules for agents
- Keep it **under roughly 50 lines**. It loads into context on every single task; length is a direct and recurring cost.
- Write imperatively and specifically: "run `pnpm test:unit` before committing", not "testing is important".
- Every command in it must work. Verify before adding.
- Update it when the thing it describes changes — a stale instruction sends every future agent down a wrong path.
- Prefer a deterministic hook or CI check over an instruction where one exists. A checked rule beats a remembered one.

## Smells
A `CLAUDE.md` restating SOLID, three hundred lines of prose, commands that no longer exist, instructions contradicting the constitution with no stated reason, secrets, a file nobody has touched since the project was scaffolded.
