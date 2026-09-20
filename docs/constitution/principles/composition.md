# Composition Over Inheritance

Build behaviour by assembling small independent parts, not by extending a base class.

## Rules for agents
- Default to composition. Use inheritance only for genuine "is-a" with no behaviour override surprises.
- Never inherit to reuse code — extract a collaborator and hold it as a field.
- Keep components small, single-purpose, and independently testable.
- Prefer passing behaviour (functions, strategies, middleware) over subclass hooks.
- Depth limit: if you are writing a third inheritance level, restructure.

## Applies broadly
Functions composed into pipelines, middleware chains, React components, small services. Same principle at every scale.

## Smells
Base classes with protected hook methods, `super()` calls that must occur in a specific order, "framework" base classes every class must extend, fragile changes to a base that break distant subclasses.
