# Explicit Errors

Expected failures belong in the type signature. Unexpected failures should crash. Do not blur the two.

## The distinction
- **Expected** — the user typed a bad email, the card was declined, the record is gone. Part of the domain. Model it in the return type: `Result<Order, PaymentDeclined>`, a tagged union, an `Either`.
- **Unexpected** — a broken invariant, a null that cannot be null, a bug. Throw or panic. Let it reach the top and be logged loudly. See `../principles/fail-fast.md`.

## Rules for agents
- Enumerate the failure cases a caller must handle; do not hide them behind a generic `Error` or a `null` return.
- Name errors for the domain condition, not the mechanism: `InsufficientFunds`, not `SqlError`.
- Never use exceptions for control flow in normal operation.
- Handle an error where you can actually do something about it. Otherwise let it propagate — do not catch, log, and rethrow at every level.
- Preserve the cause when wrapping, and add the context the caller lacks (which record, which request).
- Never let a low-level error type leak across an architectural boundary; translate it at the adapter.

## Language fit
Use the idiom of the language: `Result` in Rust, `error` returns in Go, tagged unions or a `Result` type in TypeScript, typed exceptions where that is the norm. Consistency inside the codebase matters more than the mechanism.

## Smells
`catch (e) { return null }`, a function that returns `T | null` for four different reasons, stack traces used as user-facing messages, the same error logged five times.
