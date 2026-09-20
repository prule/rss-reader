# YAGNI — You Aren't Gonna Need It

Build what is asked for now. Speculative features cost twice: once to write, again to maintain or remove.

## Rules for agents
- Implement the requested scope — no extra endpoints, options, hooks, or "future-proof" parameters.
- No abstraction for a second implementation that does not exist yet.
- Do not add caching, batching, pooling, or retries until a real need is shown. See `measure-first.md`.
- Do not leave commented-out or dead code "for later". Delete it; version control remembers.
- If you think something will be needed soon, say so in the response rather than building it.

## Exception
Things that are expensive to retrofit and cheap now: data migrations paths, auth boundaries, audit logging, error handling. Build these correctly the first time.

## Smells
Unused parameters, interfaces with one implementer, feature flags for features nobody requested, `TODO: support X` scaffolding.
