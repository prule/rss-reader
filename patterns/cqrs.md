# CQRS — Command Query Responsibility Segregation

Separate the model that changes state from the model that answers questions. Writes go through the domain; reads take the shortest path to the data a screen needs.

## Rules for agents
- **Commands** change state, enforce invariants, and return little or nothing. They run through aggregates and repositories.
- **Queries** return data and change nothing. They may bypass the domain entirely — a hand-written SQL projection straight into a view DTO is correct here, not a shortcut.
- Never mix: no command returning a read model, no query with a side effect.
- Shape read models for the consumer (one per screen or endpoint). Duplication between read models is fine — they are projections, not a shared model.
- Do not distort an aggregate to make a list screen convenient.

## Levels — pick the lowest that solves the problem
1. **Separate methods/services** for reads and writes over the same database. *Usually enough.*
2. **Separate models** — domain objects for writes, direct queries for reads.
3. **Separate stores** — a denormalised read store updated by events. Only under real read-scale pressure.

## When not to use this
Level 3 brings eventual consistency, and the UI must then handle stale reads. Do not take it on without a measured need (see `../principles/measure-first.md`). For most applications, level 1 or 2 is the destination — not a stepping stone.

## Smells
A read model rebuilt through aggregates one at a time, `getOrderAndMarkAsViewed()`, event sourcing adopted for a CRUD app, users confused by data that has not appeared yet.
