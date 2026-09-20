# SOLID

Five design rules for object-oriented code. Apply to classes, modules, and services alike.

- **S — Single Responsibility**: one reason to change per unit. See `srp.md`.
- **O — Open/Closed**: extend behaviour without editing existing code. See `open-closed.md`.
- **L — Liskov Substitution**: any subtype must work wherever its base type is expected. No strengthened preconditions, weakened postconditions, or `NotImplementedError` overrides.
- **I — Interface Segregation**: many small, client-specific interfaces beat one fat one. Callers should not depend on methods they never call.
- **D — Dependency Inversion**: depend on abstractions, not concretions. See `dependency-inversion.md`.

## Rules for agents
- Before adding a method to an existing class, check whether it belongs to a different responsibility.
- Never make a subclass that throws on an inherited method — use composition or a narrower interface instead.
- Split an interface as soon as one implementer has to stub out members.

## Smells
`if isinstance(x, ...)` chains, subclasses that override everything, interfaces with 10+ members, modules imported by everything.
