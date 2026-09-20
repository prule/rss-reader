# Patterns

[← index](../README.md)

Patterns are **conditional**. The files in the parent directory are principles — they apply to every decision. These apply only when the problem has the shape they solve.

Adopting a pattern the problem does not call for is itself a violation of `../principles/kiss.md` and `../principles/yagni.md`. Each file below has a "when not to use this" section. Read it before reaching for the pattern.

## Core architecture
| Pattern | Use it when |
|---|---|
| [Domain-Driven Design](domain-driven-design.md) | Business rules are complex and contested. Not for CRUD. |
| [Hexagonal Architecture](hexagonal-architecture.md) | There is real logic and more than one external dependency. |
| [Repository](repository.md) | There is a domain model to keep free of persistence. |

## Code-level
| Pattern | Use it when |
|---|---|
| [Functional Core, Imperative Shell](functional-core-imperative-shell.md) | Almost always. Decisions pure, effects at the edges. |
| [Explicit Errors](explicit-errors.md) | Almost always. Expected failures in the type signature. |
| [Illegal States Unrepresentable](illegal-states-unrepresentable.md) | Almost always. Let the type system carry the invariant. |

## Testing
| Pattern | Use it when |
|---|---|
| [Testing Strategy](testing-strategy.md) | Always. Many fast logic tests, few slow wiring tests. |
| [Test Doubles](test-doubles.md) | Choosing a stand-in. Prefer fakes; mock only interactions. |
| [Contract Tests](contract-tests.md) | Any fake exists, or services depend on each other. |
| [Screenplay](screenplay.md) | Writing end-to-end tests. Default over Page Objects. |

## Distributed / async
| Pattern | Use it when |
|---|---|
| [Domain Events](domain-events.md) | Side effects should attach without touching the use case. |
| [CQRS](cqrs.md) | Read and write needs genuinely diverge. Take the lowest level that works. |
| [Outbox & Idempotency](outbox-and-idempotency.md) | A state change must reliably reach another system. |
| [Anti-Corruption Layer](anti-corruption-layer.md) | Integrating anything you do not control. |

## How these fit together

The core architecture patterns reinforce each other: hexagonal defines the ports, repository is the most common driven port, DDD supplies the model inside. Contract tests are what make the fakes at those ports trustworthy, and the functional core is what makes the inside of the hexagon fast to test.

The distributed group is the expensive one. Every pattern in it trades traceability and consistency for decoupling and resilience. Take them when a real requirement demands it, one level at a time — not because the architecture looks more serious with them.
