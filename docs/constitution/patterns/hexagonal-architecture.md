# Hexagonal Architecture (Ports & Adapters)

The application core sits in the middle, knowing nothing about the outside world. Everything external plugs in through interfaces the core owns. Clean Architecture and Onion Architecture are the same idea with different diagrams.

## Structure
- **Core** — domain model and use cases. Pure logic. No I/O, no framework, no SDK types.
- **Ports** — interfaces *defined by the core*, in the core's language. `PaymentGateway.charge(Money)`, not `StripeClient`.
  - *Driving* (inbound): what the app can do. Called by adapters.
  - *Driven* (outbound): what the app needs. Implemented by adapters.
- **Adapters** — the concrete edges. HTTP handlers, CLI, message consumers on one side; database, queue, third-party SDK implementations on the other.
- **Composition root** — a single place at startup that constructs adapters and injects them into the core.

## The rule that matters
Dependencies point inward, always. The core never imports an adapter. If you need the arrow to point outward, you need a port.

## Rules for agents
- Name ports for what the core needs, not for the technology behind them.
- One adapter per external system; a vendor change touches one file.
- Handlers parse, delegate to a use case, and render. No business rules.
- Test the core with in-memory adapters and no infrastructure (see `contract-tests.md` for verifying the real ones).

## When not to use this
A small script, a single-purpose Lambda, or a prototype does not need the ceremony. Adopt it when the app has real business logic and more than one external dependency.

## Smells
`import` of a database driver inside a use case, framework request objects reaching the domain, tests that need Docker to run, a port named `MongoRepository`.
