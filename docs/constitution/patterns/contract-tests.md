# Contract Tests

One shared test suite run against *every* implementation of a port — the real adapter and the in-memory fake alike. It proves the substitute tells the truth.

## Rules for agents
- Write the suite against the port interface, never against a concrete class.
- Run it against the fake (fast, in CI on every commit) and the real adapter (slower, against real infrastructure).
- Cover the behaviour callers rely on: not-found handling, uniqueness violations, ordering, transaction semantics, concurrent update behaviour.
- When a difference in behaviour is found, fix the fake to match reality — not the test to accept both.
- Add a case to the contract whenever a bug is traced to a fake diverging from the real thing.

## Consumer-driven contracts (across services)
The same idea between services: the consumer records what it expects from the provider's API, and the provider runs those expectations in its own build. The provider then cannot break a consumer without a red test — no full end-to-end environment required.

## Why this matters
It is what makes `test-doubles.md` and `hexagonal-architecture.md` safe. Without it, fast tests against fakes give false confidence: green suite, broken production.

## Smells
An in-memory repository that quietly ignores uniqueness constraints, a fake with no test of its own, integration failures that only appear in staging, "works locally" bugs.
