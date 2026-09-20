# Testing Strategy

Many fast tests on logic, few slow tests on wiring. Optimise for confidence per second of runtime.

## The shape
- **Unit** (most) — pure logic, no I/O, milliseconds. Target the functional core.
- **Integration** (some) — one adapter against real infrastructure: repository against a real database, client against a stubbed HTTP server.
- **End-to-end** (few) — a handful of critical user journeys through the whole stack. Structure these with `screenplay.md`.

If the pyramid is inverted, the architecture is usually the problem, not the tests: logic entangled with I/O cannot be tested any other way. Fix the seam (see `hexagonal-architecture.md`).

## Rules for agents
- Test behaviour through the public interface. Do not assert on private methods or internal call sequences.
- One reason to fail per test. Arrange, act, assert — with the assert visible, not buried in a helper.
- Name the test for the rule it protects: `rejects_transfer_when_balance_insufficient`.
- Cover the boundaries and the error paths, not just the happy path.
- Tests must be deterministic and order-independent: no shared mutable state, no real clock, no network, no sleeps.
- When fixing a bug, write the failing test first.
- Do not chase a coverage number. Cover the rules that matter and the code that is easy to get wrong.

## When to skip a test
Generated code, trivial delegation, and throwaway scripts. Be explicit about the decision rather than silently omitting.

## Smells
Tests that break on every refactor, `sleep(2)`, a suite that must run in one order, mocking the thing under test, hundreds of tests that all pass when the feature is broken.
