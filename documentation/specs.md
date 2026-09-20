# Specifications — Spec-Driven

**OpenSpec owns intended behaviour.** The spec says what the system should do and is written before the implementation. ADRs cover *how* and *why*; specs cover *what*.

## The split
| Question | Artefact |
|---|---|
| What should it do? | OpenSpec spec |
| Why is it built this way? | `adr.md` |
| How do I run it? | `project-readme.md` |
| What does the API look like? | `openapi.yaml` (`../technologies/type-contracts.md`) |

## Rules for agents
- **Write or update the spec first.** A change proposal describes the intended behaviour, is reviewed, and only then implemented. Do not implement and backfill the spec.
- Specs describe observable behaviour — inputs, outputs, rules, edge cases, error conditions. Not implementation, not class names.
- Write requirements so they can be tested. If nobody can write an assertion from it, it is too vague to build from.
- Cover the unhappy paths explicitly. Missing error behaviour is where specs most often fail an implementer.
- Validate specs in CI so malformed ones fail the build, not the reviewer.
- Archive a completed change so the current specs stay the single description of today's behaviour. Stale proposals lying around are worse than none.
- Ask about ambiguity in the spec before coding it. A guess encoded in an implementation is very hard to find later.

## Why this ordering
Behaviour agreed in reviewable prose costs minutes to change. The same disagreement found after implementation costs a rewrite. This is `../principles/fail-fast.md` applied to requirements, and it is the same argument as contract-first APIs.

## Smells
A spec written after the feature shipped, requirements no test could check, specs describing classes and tables, a `changes/` directory full of things already released, behaviour that only exists in the implementation.
