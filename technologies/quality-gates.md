# Quality Gates

The checks every change passes before review, by stack. A check nothing runs is not a check — `../principles/fail-fast.md`.

| Gate | TypeScript | Kotlin / JVM |
|---|---|---|
| Format | Prettier — `formatting.md` | ktfmt via Spotless |
| Lint | **oxlint**: `correctness` + React hooks rules as errors | **detekt** |
| Types | `tsc --noEmit` | the compiler |
| Tests + coverage | Vitest `--coverage`, lcov report | JUnit 5, JaCoCo XML report |
| Static analysis | **SonarQube** via `sonar-check` | the same |
| Dependencies | **Renovate** | the same |

## Rules for agents
- CI runs format, lint, typecheck and tests on every pull request. The project's `CLAUDE.md` lists the same commands as its done-check.
- Run `sonar-check` last, after the coverage run, so it reads fresh coverage. It talks to the dev VM's server, so it runs locally, not in CI.
- Give each repo a root `sonar-project.properties` naming sources, tests and the coverage report. Run the first scan on the base branch: it sets the baseline the gate judges new code against.
- Lint TypeScript with oxlint, not ESLint: `typescript-eslint` cannot parse TypeScript 7. Keep lint to correctness (layout is the formatter's), and make each rule an error or turn it off. A warning stays only while its fix is a planned change.
- Never silence a finding (`// NOSONAR`, `oxlint-disable`, `@Suppress`) without a reason on the same line. Fix it instead.
- Keep every pin exact and let Renovate move it: `config:recommended`, Action digests pinned, a short `minimumReleaseAge`.

## Deviate when
A repo has no application code (a blog, a docs site): skip coverage and SonarQube, and record it. Do not chase a coverage number either — the gate's 80% applies to new code only (`../patterns/testing-strategy.md`).

## Smells
A lint step only on a developer's machine, warnings that never shrink, `NOSONAR` with no reason, coverage at 0% because no report is written, a dependency years behind its pin, a gate that passes because it never ran.
