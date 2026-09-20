# Comments & Docstrings

Code says *what*. Comments say *why*. Anything a reader can get from the code itself should not be repeated in prose that will rot.

## Rules for agents
- Comment the **non-obvious**: why this approach over the obvious one, a constraint from outside the code, a workaround for a known bug, a deliberate trade-off.
- Never narrate the code. `// increment the counter` above `counter++` is pure cost.
- Before writing a comment to explain confusing code, try renaming and extracting first. A good name beats an explanation.
- **Docstrings on the public surface only** — exported functions, classes and modules. TSDoc for TypeScript, KDoc for Kotlin. Document the contract: parameters, return, what it throws, and anything surprising.
- Do not docstring private helpers or self-evident accessors.
- **Delete commented-out code.** Version control remembers it; a reader cannot tell whether it matters.
- A `TODO` carries an owner and an issue reference, or it is not written. Unattributed TODOs are never done.
- A comment changed by an edit must be updated in the same edit. A stale comment is worse than no comment — it is actively misleading.
- Link to an ADR by number when the reasoning is a recorded decision rather than local context.
- Never put secrets, personal data or internal URLs in comments.

## Good
```ts
// Stripe webhooks can arrive out of order, so we ignore any event
// older than the one already applied. See ADR 0014.
```

## Smells
`// constructor`, a comment describing behaviour the function no longer has, commented-out blocks "kept just in case", `TODO: fix this` with no name, a docstring on every private method, a paragraph explaining a badly named variable.
