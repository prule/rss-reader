# Outbox & Idempotency

Two patterns for the same reality: networks fail mid-operation, and messages arrive twice or not at all.

## The dual-write problem
Writing to the database and publishing to a broker are two operations. Crash between them and the system is inconsistent — the order exists but nothing downstream knows, or the message fires for a transaction that rolled back.

**Transactional outbox**: write the message to an `outbox` table *in the same transaction* as the state change. A separate relay polls the table and publishes. Atomicity restored, with no distributed transaction.

## Rules for agents
- Never publish inside a transaction that might still roll back, and never publish before the commit.
- The relay guarantees *at-least-once* delivery. Every consumer must therefore be idempotent — this is not optional.
- Make handlers idempotent by recording processed message IDs, by natural upsert keys, or by making the operation naturally repeatable.
- Give every command that crosses a boundary an idempotency key supplied by the caller, and return the original result on a repeat.
- Design retries with exponential backoff and jitter, a bounded attempt count, and a dead-letter queue for what never succeeds.
- Assume out-of-order delivery. Use version numbers or timestamps; do not rely on arrival order.

## Saga (distributed transactions)
Across services there is no rollback. Model a multi-step operation as a sequence of local transactions, each with a compensating action (refund, release, cancel). Compensations must themselves be idempotent.

## Smells
`db.commit(); broker.publish()`, a retry that double-charges a card, consumers assuming exactly-once, a dead-letter queue nobody reads, "it only happens under load" bugs.
