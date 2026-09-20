# DRY — Don't Repeat Yourself

Every piece of *knowledge* has one authoritative representation. Business rules, validation logic, constants, schemas, config.

## Rules for agents
- Before writing a helper, search the codebase for an existing one.
- Extract on the third occurrence, not the second. Two similar blocks may be coincidence.
- Duplicated *shape* is not duplicated *knowledge*. Two functions that look alike but change for different reasons must stay separate.
- Prefer deriving over restating: generate types from schemas, constants from one source, docs from code.

## Counterweight
Wrong abstraction costs more than duplication. If unifying two callers needs a boolean flag parameter to switch behaviour, do not unify. Inline the duplicate back and move on.

## Smells
Copy-pasted blocks, the same magic number in several files, parallel lists that must be updated together, logic mirrored in frontend and backend.
