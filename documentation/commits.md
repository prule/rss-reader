# Commits & Changelog

**Conventional Commits**, with the changelog and version generated from history. A machine-readable log is worth far more than a prettily written one.

## Format
```
<type>(<scope>): <subject>

<body — why, not what>

BREAKING CHANGE: <what breaks and what to do>
```
Types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `chore`.

## Rules for agents
- Subject in the imperative, lower case, no trailing full stop, under ~72 characters: "add retry to payment client".
- **The body explains why.** The diff already shows what changed; it cannot show what you were thinking.
- `feat` and `fix` are user-visible. Internal restructuring is `refactor`, not `feat` — the changelog is read by users.
- A breaking change needs the `BREAKING CHANGE:` footer, which drives the major version bump. Never quietly break an interface.
- One logical change per commit. Do not mix a refactor with a behaviour change — it makes review and bisection much harder.
- Reference the issue or ADR in the footer where one exists.
- Enforce the format with commitlint in CI. A convention nobody checks stops being a convention.
- Never commit secrets, generated build output, or `.env` files.

## Changelog & versioning
Generated from commit history in CI — release-please by default; Changesets when publishing versioned packages from the monorepo. `CHANGELOG.md` is a generated artefact: **never hand-edit it**. Semantic version follows from the types since the last release.

## Smells
"fix stuff", "wip", a hand-edited changelog, `feat:` on an internal refactor, one commit touching four unrelated concerns, a breaking change with no footer, a body that restates the diff.
