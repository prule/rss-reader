# Working in this repository

This repo *is* the engineering constitution — documentation only, no code to build or test.

## Before editing

Read [README.md](README.md) for the three tiers and how they differ in authority.

## House style for these files

Every file keeps the same shape, in this order:

1. **Title and a one-line definition.** What the rule is, in a sentence.
2. **Rules for agents.** Imperative and checkable. "Never inherit to reuse code", not "inheritance can be overused".
3. **A counterweight section** — `When not to use this`, `Deviate when`, `Counterweight`, or `Cost`. Every rule has a failure mode; name it. Patterns must state when the pattern is the wrong choice.
4. **Smells.** Concrete things to recognise in existing code.

## Constraints

- **Keep files short — 15–25 lines.** These are loaded into agent context; length is a direct cost. If a file grows, split it or cut it.
- **Write for an agent, not an essay reader.** No history, no attribution, no motivational framing.
- **Cross-reference rather than repeat.** A pattern file links to the principle it rests on (a relative path into `principles/`) instead of restating it.
- **Update the folder README and the root README** when adding or removing a file. Both carry file counts and tables.
- Use relative links throughout so the repo works when vendored into another project at any path.
- British spelling, consistent with the existing files.
