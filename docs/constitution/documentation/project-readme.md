# Project README

The entry point. A new developer or agent should get the project running from it alone, without asking anyone.

## Required sections
1. **What it is** — one paragraph. What problem it solves, who uses it.
2. **Quickstart** — prerequisites, install, run. Exact commands, copy-pasteable.
3. **Testing** — how to run unit, integration and e2e suites.
4. **Architecture** — a short paragraph and a link to the docs, not the full design.
5. **Deployment** — how it ships and where it runs.
6. **Conventions** — a link to the constitution and to `CLAUDE.md`.

## Rules for agents
- Every command must actually work as written, from a clean clone, on the stated Node/JDK version. Untested commands are the most common README defect.
- State versions explicitly, and reference the pinned source (`.node-version`, `packageManager`) rather than repeating a number that will drift.
- Link, do not duplicate. The README points at ADRs, specs and API docs — it does not restate them. See `../principles/dry.md`.
- Keep it to roughly one screen. Depth belongs in `docs/`.
- Update the README in the same commit as any change that breaks it — a new env var, a new build step, a moved command.
- Document the environment variables that are required to start, and what each one is for. Never include real values.

## Deviate when
A library README also needs installation, usage examples and an API summary — its readers are integrators, not contributors.

## Smells
A quickstart that fails on a clean clone, "see the wiki", a README describing a structure that was refactored months ago, setup steps passed around in chat instead, secrets or tokens in an example block.
