# Repository

A collection-like interface for aggregates, defined by the domain and implemented by infrastructure. It hides persistence so the core can stay pure.

## Rules for agents
- Define the interface in the domain layer in domain terms: `findById`, `save`, `findActiveSubscribers`. Not `executeQuery`.
- One repository per aggregate root. Not one per table.
- Return fully-formed domain objects, never ORM rows, DTOs, or raw records.
- Keep query logic inside the implementation. Callers must not build SQL, filters, or ORM criteria.
- Use an in-memory implementation for tests and a contract test to prove the real one matches it.
- Transaction control belongs to the use case (a unit of work), not to individual repository calls.

## Reads vs writes
Repositories serve the write side, where invariants live. Complex read models, reports, and list screens are better served by a dedicated query that returns a purpose-built view — do not distort the aggregate to satisfy a screen. See `cqrs.md`.

## When not to use this
If there is no domain model to protect — a thin CRUD app or a reporting tool — a repository over an ORM is a pointless extra layer. Use the ORM directly and be honest about it.

## Smells
`findByIdAndStatusAndDateBetweenOrderBy...`, repositories returning ORM entities, a `save()` that quietly commits, generic `Repository<T>` used everywhere with no domain meaning.
