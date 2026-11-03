# Code Formatting

Formatting is automated and never discussed. One formatter per language, applied on commit, verified in CI. There is no house style to learn and no formatting comment in code review.

## The formatters
| Language | Formatter | Command |
|---|---|---|
| TypeScript, JS, JSON, CSS, Markdown | **Prettier** | `pnpm format` |
| Kotlin | **ktfmt** (kotlinlang style) | `./gradlew spotlessApply` |
| Java | **google-java-format** | `./gradlew spotlessApply` |

Spotless drives both JVM formatters from one plugin, so `spotlessApply` and `spotlessCheck` cover mixed-language projects:

```kotlin
spotless {
  kotlin { ktfmt(libs.versions.ktfmt.get()).kotlinlangStyle() }
  kotlinGradle { ktfmt(libs.versions.ktfmt.get()).kotlinlangStyle() }
  java { googleJavaFormat(libs.versions.googleJavaFormat.get()) }
}
```

Pin both versions in the version catalog — an unpinned formatter reformats the world when it upgrades. For a Kotlin-only project, `ktfmt-gradle` is lighter and gives you `ktfmtFormat` directly.

## The pre-commit hook
Pick the runner by what the repo already has:

- **It has a `package.json`** (Node, TypeScript, or a monorepo with a frontend): **Husky + lint-staged**. `pnpm install` installs the hook through the `prepare` script, so no clone misses it, and lint-staged formats only the staged files and restores anything left unstaged. In a monorepo, use a `lint-staged.config.mjs` and add `'*.{kt,kts,java}': () => './gradlew spotlessApply'` — a function, because lint-staged otherwise appends the file names and Gradle reads them as task names.
- **It has no Node** (a JVM-only repo): Git's native `core.hooksPath`, below. Never add a `package.json` only to run a hook.

```json
"scripts": { "prepare": "husky" },
"lint-staged": { "*": "prettier --write --ignore-unknown" }
```

The native hook, committed to the repo:

```sh
#!/bin/sh
# .githooks/pre-commit
set -e
staged=$(git diff --cached --name-only --diff-filter=ACMR)
[ -z "$staged" ] && exit 0
echo "$staged" | xargs pnpm exec prettier --write --ignore-unknown --log-level warn --
echo "$staged" | xargs git add --
```

Format **only the staged files** — it is fast, quiet, and `.prettierignore` still applies. For a JVM project, call `./gradlew spotlessApply` instead (Spotless has no cheap per-file mode).

Register it in `./run setup`, or in a Gradle `installGitHooks` task that `build` depends on, so every clone gets it: `git config core.hooksPath .githooks`. `core.hooksPath` is local git config and is **not** carried by a clone, so a project without a setup script must document this as a once-per-clone step.

## Rules for agents
- **Never hand-format, and never argue about style.** Run the formatter and move on. Do not leave formatting comments in review.
- **The hook is convenience; CI is enforcement.** `--no-verify` exists, so CI must run `spotlessCheck` and `prettier --check` and fail on a diff. Formatting policed only by a hook is not policed.
- **Never `git add .` in a hook.** It sweeps unrelated working-tree changes into the commit. Re-stage only what was already staged, as above.
- Keep formatting out of feature commits. Do the initial mass reformat as one commit, and add its SHA to `.git-blame-ignore-revs` so blame stays useful.
- Lint is for correctness; formatting is for the formatter. oxlint's `correctness` rules never touch layout (`quality-gates.md`); an ESLint setup needs `eslint-config-prettier`.
- Commit an `.editorconfig` so editors agree before a formatter runs.
- Exclude generated code and vendored files — never reformat a generated client.
- Do not use `// @formatter:off` or `// prettier-ignore` except for data tables and ASCII art where alignment carries meaning.

## Smells
A pull request diff full of whitespace, a formatting debate in review, a `package.json` added only to run Husky, an unpinned formatter version, CI that never checks formatting, `git add .` in a pre-commit hook, per-developer IDE settings as the style source.
