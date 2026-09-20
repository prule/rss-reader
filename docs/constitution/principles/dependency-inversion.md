# Dependency Inversion — Loose Coupling

High-level policy must not depend on low-level detail. Both depend on abstractions, and the abstraction is owned by the high-level side.

## Rules for agents
- Domain/business logic must not import database drivers, HTTP clients, SDKs, or file APIs directly.
- Pass dependencies in (constructor or function argument). Do not construct them inside, and do not reach for globals or singletons.
- Define the interface in terms of what the caller needs (`UserStore.find(id)`), not what the vendor offers.
- Keep concrete wiring in one composition root — `main`, a factory, or a DI container — at the edge of the app.
- No clock, randomness, network, or filesystem access hidden inside pure logic; inject them so tests can control them.

## Payoff
Swappable infrastructure, fast tests without mocks-of-mocks, vendor changes confined to one adapter.

## Smells
`import boto3` inside a domain module, `new Database()` in a constructor, tests that need a live service, a rename in one library rippling through business code.
