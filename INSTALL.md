# Installation Options

[← index](README.md)

How to get this constitution into a project. **git subtree is the default** — see [README.md](README.md#using-this-in-a-project). The alternatives are recorded here for future consideration.

## The deciding factor

These files exist to be *read*, by agents, on every task. So the question that matters is not how cleanly the dependency is expressed — it is **how reliably the files are on disk when an agent goes looking**. An absent constitution fails silently: `CLAUDE.md` points at paths that do not exist, the agent finds nothing, and the work proceeds ungoverned while appearing governed.

## 1. git subtree — recommended

```bash
git remote add constitution git@github.com:prule/principles.git
git subtree add  --prefix docs/constitution constitution main --squash
git subtree pull --prefix docs/constitution constitution main --squash
```

**For** — files always present; normal `git clone`; no CI configuration; grep and file tools traverse them; changes visible in the pull request that pulls them; works identically for JVM-only repos.

**Against** — content lives in the repo (trivial at this size); updating needs a remembered command; nothing structurally prevents a local edit.

**Mitigation** — the never-edit rule in `CLAUDE.md`, plus CODEOWNERS on `docs/constitution/`.

## 2. git submodule

```bash
git submodule add git@github.com:prule/principles.git docs/constitution
```

**For** — pinned to an exact commit; obviously external, so local edits are unnatural; repo stays small; updates are explicit and reviewable as a SHA bump.

**Against** — **the files are silently absent after a clone without `--recursive`.** CI must set `submodules: true` on checkout. Cloud, worktree and fresh agent environments that clone on their own get an empty directory. Detached-HEAD state confuses both people and agents.

**If you choose it** — add `git submodule update --init` to `./run setup`, and set `submodules: true` in every checkout action. That covers most of the gap, but not an agent that clones and reads without running setup.

## 3. Claude Code plugin

Package the repo as a plugin and install it once per machine, so every project has it with nothing vendored.

**For** — zero per-project setup; one update updates everywhere; no vendored copy to drift or be edited.

**Against** — Claude-specific: human reviewers, other agents and other tooling never see it. No per-project version pin, so a change to the constitution changes every project at once. Requires plugin manifest files in this repo.

**Best used as a supplement** to an in-repo copy, not a replacement for one.

## 4. Copy with an update script

Copy the files in and add `./run update-constitution` to refresh them from a pinned tag.

**For** — simplest possible mental model; no git subcommand to remember; fits the existing `./run` convention.

**Against** — a hand-rolled subtree with no merge semantics; a local edit is silently overwritten on update rather than conflicting.

## 5. npm package

Publish and install with pnpm, copying into place with a postinstall step.

**For** — versioned and pinned in the lockfile like any other dependency.

**Against** — useless for Kotlin-only repos; `node_modules` is a poor home for documentation agents must read; a postinstall copy step reinvents subtree with more moving parts. **Not recommended.**

## Summary

| Method | Files always present | Pinned | Works for JVM-only | Setup cost |
|---|---|---|---|---|
| **Subtree** | Yes | By commit | Yes | One command |
| Submodule | **No** | By commit | Yes | Clone flags, CI config, `./run setup` |
| Plugin | N/A — not in repo | No | Yes | Manifest files, per machine |
| Copy + script | Yes | By tag | Yes | Write the script |
| npm package | Via postinstall | By version | **No** | Publish, postinstall |
