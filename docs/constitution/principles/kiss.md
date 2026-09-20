# KISS — Keep It Simple

The simplest thing that fully solves the stated problem. Simple means easy to read and change, not clever or short.

## Rules for agents
- Prefer a plain function to a class, a class to a framework, standard library to a dependency.
- No config option, plugin point, or abstraction layer without a current concrete caller.
- Keep functions short enough to hold in your head; flatten nesting with early returns.
- Name things literally. `retryCount` beats `n`.
- If explaining the design takes more than a few sentences, simplify it.

## Trade-off
Simple is not naive. Do not skip error handling, validation, or concurrency safety in the name of simplicity — those are part of the problem.

## Smells
Metaprogramming for one case, deep inheritance, indirection with a single implementation, a dependency used for one function.
