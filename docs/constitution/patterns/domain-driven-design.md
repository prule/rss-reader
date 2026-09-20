# Domain-Driven Design

Model the business domain explicitly in code, using the language the domain experts use.

## Building blocks
- **Ubiquitous language** — the same terms in conversation, code, and tests. If the business says "policy lapsed", the method is `lapse()`, not `setStatus(3)`.
- **Value object** — defined by its values, immutable, no identity. `Money`, `EmailAddress`, `DateRange`. Validate on construction.
- **Entity** — has identity and a lifecycle; equality is by ID, not by fields.
- **Aggregate** — a cluster of entities with one root that guards the invariants. Outside code touches only the root.
- **Bounded context** — an explicit boundary within which the model and language are consistent. The same word means different things in different contexts; do not force one shared model.
- **Domain service** — logic that belongs to no single entity.

## Rules for agents
- Put business rules inside the domain objects that own them, not in services that manipulate anemic data bags.
- One transaction, one aggregate. Reference other aggregates by ID, never by object pointer.
- Keep aggregates small — as small as the invariant they must enforce.
- Wrap primitives that carry meaning: `UserId`, not `string`.
- Domain code stays free of framework, ORM, and transport types (see `hexagonal-architecture.md`).

## When not to use this
Skip DDD for CRUD, reporting, glue scripts, and thin data pipelines — it is overhead with no invariants to protect. DDD earns its cost where business rules are genuinely complex and contested.

## Smells
Entities with only getters and setters, service classes holding all the logic, one shared model spanning the whole company, `status: int` with rules scattered across callers.
