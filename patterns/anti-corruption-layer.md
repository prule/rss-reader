# Anti-Corruption Layer

A translation layer between your model and an external one — a third-party API, a legacy system, another team's service. It stops their model leaking into yours.

## Rules for agents
- Never let an external type cross into the domain. Translate at the boundary, every time, in both directions.
- Own the translation in your codebase, next to the adapter, expressed in *your* ubiquitous language.
- Map their vocabulary to yours explicitly: their `CustomerRecord.type_cd == 'B'` becomes your `Customer.isBusiness`.
- Absorb their weirdness here: nulls that mean something, dates as strings, status codes, pagination quirks, their errors mapped to yours (see `explicit-errors.md`).
- Keep the layer thin and dumb — translation only, no business rules.
- When the external system changes, exactly one directory should need editing.

## Where it applies
Vendor SDKs, partner APIs, legacy databases you cannot change, and the seams between bounded contexts — including two contexts inside your own system that use the same word differently.

## Cost
It is genuine duplication: two models and a mapping. That is the price of not being coupled to a system you do not control, and it is almost always worth paying at a boundary that is likely to change.

## Smells
A vendor SDK type as a field on a domain entity, `stripe_customer_id` in the core model, a third-party breaking change rippling through business logic, their naming conventions spreading through your code.
