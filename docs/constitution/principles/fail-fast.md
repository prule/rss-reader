# Fail Fast

Surface problems at the earliest, cheapest, most informative moment: compile > startup > request boundary > deep in runtime.

## Rules for agents
- Validate inputs at the system boundary; trust them inside.
- Validate configuration and required secrets at startup, not on first use.
- Crash on programmer errors (broken invariants, impossible states). Handle expected operational errors (network, bad user input) explicitly.
- Never swallow exceptions. No empty `catch`, no bare `except: pass`, no defaulting away a failure.
- Prefer types and non-nullable fields that make invalid states unrepresentable.
- Error messages must name what failed, the value seen, and what was expected.
- Assert invariants where they are established, not where they are read.

## Anti-pattern
Defensive fallbacks that hide bugs — returning empty lists, null-coalescing to zero, `try/except` around the whole function. These turn a loud failure into silent corruption.

## Smells
`except Exception: pass`, `?? 0` on a required value, errors logged and ignored, a bug found three layers away from its cause.
