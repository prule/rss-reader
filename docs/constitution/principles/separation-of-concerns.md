# Separation of Concerns

Each part of the system handles one aspect of the problem, with clear boundaries between them.

## Standard layers
- **Domain** — rules and invariants. Pure, no I/O, no framework types.
- **Application** — use cases, orchestration, transactions.
- **Infrastructure** — database, network, filesystem, third-party SDKs.
- **Interface** — HTTP handlers, CLI, UI. Parsing and rendering only.

Dependencies point inward: interface → application → domain. Infrastructure plugs in via interfaces owned by the inner layers (see `dependency-inversion.md`).

## Rules for agents
- Never let a framework/ORM/request object leak into domain code.
- Handlers translate and delegate; they do not contain business rules.
- Keep cross-cutting concerns (logging, auth, retries, metrics) in middleware or decorators, not scattered through logic.
- Put new code in the layer that owns its concern, even if another file is closer at hand.

## Smells
SQL in a controller, HTML strings in a model, business rules in a template, a "core" module importing a web framework.
