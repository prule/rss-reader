# Test Doubles

Stand-ins for real dependencies. Choosing the wrong kind is what makes test suites brittle.

## The kinds
- **Fake** — a working lightweight implementation (in-memory repository). *Default choice.*
- **Stub** — returns canned answers, no assertions.
- **Mock** — asserts that specific calls happened. Use sparingly.
- **Spy** — records calls for later inspection.
- **Dummy** — filler passed to satisfy a signature, never used.

## Rules for agents
- Prefer fakes. They test behaviour and survive refactoring; mocks test call sequences and break on every restructure.
- Only double what you do not own or what is slow: the database, the network, the clock, third-party SDKs. Never double your own domain objects — use the real ones.
- Mock only when the *interaction itself* is the requirement: "an email must be sent", "the payment must be charged exactly once".
- Every fake needs a contract test proving the real implementation behaves the same way. An unverified fake is a lie that passes. See `contract-tests.md`.
- Inject the double through the constructor or argument — not by monkey-patching, not by reaching into module internals.

## The core problem with mocks
A mock encodes *how* the code works. Refactor the how, and green tests turn red for no reason. Worse, mocks can drift from reality: the suite passes while production fails.

## Smells
`when(...).thenReturn(...)` stacked five deep, asserting on the order of internal calls, mocking a value object, patching a private function, tests that pass against a fake nobody has verified.
