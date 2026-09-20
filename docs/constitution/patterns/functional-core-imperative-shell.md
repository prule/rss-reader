# Functional Core, Imperative Shell

Push decisions into pure functions. Push effects to a thin outer layer. The core computes *what should happen*; the shell makes it happen.

## Rules for agents
- A pure function: same input, same output, no I/O, no clock, no randomness, no mutation of its arguments, no hidden state.
- Fetch first, decide in the middle, write at the end. Do not interleave I/O with logic.
- Return a description of the intended effects (commands, events, a new state) and let the shell execute them.
- Never call `now()`, `random()`, or `uuid()` inside core logic — pass the value in.
- Keep the shell dumb: no branching on business rules, no calculation.

## Why
Pure logic is trivially testable — no mocks, no fixtures, no containers. Branch coverage lives in fast unit tests; the thin shell needs only a few integration tests.

## Shape
```
load()  ->  decide(state, input) -> effects  ->  apply(effects)
[shell]     [pure core]                          [shell]
```

## When not to use this
Streaming, or work whose dataset does not fit in memory, may need I/O interleaved with processing. Keep the decision functions pure anyway, even when the loop around them is not.

## Smells
A database call in the middle of a calculation, tests that mock five collaborators to check one rule, logic that behaves differently depending on the time of day, functions that both compute and log.
