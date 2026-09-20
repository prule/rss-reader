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
Git's native `core.hooksPath`, committed to the repo. Not Husky — that is a Node dependency for a problem Git already solves.

```sh
#!/bin/sh
# .githooks/pre-commit
set -e
staged=$(git diff --cached --name-only --diff-filter=ACMR)
[ -z "$staged" ] && exit 0
./run format
echo "$staged" | xargs git add --
```

Register it in `./run setup` so every clone gets it: `git config core.hooksPath .githooks`

## Rules for agents
- **Never hand-format, and never argue about style.** Run the formatter and move on. Do not leave formatting comments in review.
- **The hook is convenience; CI is enforcement.** `--no-verify` exists, so CI must run `spotlessCheck` and `prettier --check` and fail on a diff. Formatting policed only by a hook is not policed.
- **Never `git add .` in a hook.** It sweeps unrelated working-tree changes into the commit. Re-stage only what was already staged, as above.
- Keep formatting out of feature commits. Do the initial mass reformat as one commit, and add its SHA to `.git-blame-ignore-revs` so blame stays useful.
- Use `eslint-config-prettier` so lint rules never fight the formatter. Lint is for correctness; formatting is for the formatter.
- Commit an `.editorconfig` so editors agree before a formatter runs.
- Exclude generated code and vendored files — never reformat a generated client.
- Do not use `// @formatter:off` or `// prettier-ignore` except for data tables and ASCII art where alignment carries meaning.

## Smells
A pull request diff full of whitespace, a formatting debate in review, Husky installed for a hook Git can run, an unpinned formatter version, CI that never checks formatting, `git add .` in a pre-commit hook, per-developer IDE settings as the style source.
