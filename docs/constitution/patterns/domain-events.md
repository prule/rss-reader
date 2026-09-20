# Domain Events

A record of something meaningful that has happened in the domain. Named in the past tense: `OrderPlaced`, `PaymentFailed`, `SubscriptionLapsed`.

## Rules for agents
- Events are immutable facts about the past. They are never commands, never requests, never rejected.
- Name them in the ubiquitous language, past tense, from the domain's point of view — not `UserTableRowUpdated`.
- Include what a consumer needs: the aggregate ID, a timestamp, the changed values. Avoid dumping whole entities; that couples consumers to your internals.
- Raise the event inside the aggregate that owns the change; publish it after the transaction commits (see `outbox-and-idempotency.md`).
- Version events from the start and add fields additively. Consumers must tolerate unknown fields.
- Keep handlers independent and idempotent. A handler failing must not roll back the originating action.

## Why
Side effects (email, analytics, search indexing, downstream services) attach without touching the core use case — this is `../principles/open-closed.md` at the architecture level.

## When not to use this
Do not fire an event for something that must happen synchronously and atomically with the action. If the caller needs the result, call the code directly. Events buy decoupling at the cost of traceability — inside a single module, that trade is usually bad.

## Smells
`SendEmailEvent` (a command wearing a costume), handlers that must run in a set order, an event consumed by exactly one handler that could have been a function call, debugging a flow by grepping for subscribers.
