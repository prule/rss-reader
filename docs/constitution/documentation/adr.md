# Architecture Decision Records

One numbered markdown file per significant decision, in `docs/adr/`. Lightweight Nygard format. This is where **"why is it like this?"** is answered — and where every deviation from the default stack is recorded.

## Format
```markdown
# 0007. Use Spring Data JDBC instead of JPA

Date: 2026-09-20
Status: Accepted

## Context
What forces are at play? Constraints, requirements, what we tried.

## Decision
What we will do, in active voice: "We will ..."

## Consequences
What becomes easier, what becomes harder, what we accept.
```

## Rules for agents
- Write an ADR when a decision is **costly to reverse**: a datastore, a framework, an auth model, a boundary between services, a deviation from `../technologies/README.md`.
- Do not write one for a reversible choice. A naming convention or a library swap is not an ADR — that is noise the next reader has to wade through.
- **Never edit an accepted ADR.** Write a new one and set the old one to `Superseded by 0012`. The record of what we believed, and when, is the point.
- Status is one of `Proposed`, `Accepted`, `Superseded by NNNN`, `Deprecated`.
- Record the **consequences honestly, including the bad ones**. An ADR with no downsides listed was not a real decision.
- Name the options rejected and why, in one line each, inside Context.
- Number sequentially, never reuse a number, and keep the title a short noun phrase.
- Link the ADR from the code it explains when the reasoning is not local — a one-line comment with the ADR number.

## Smells
An ADR for a decision nobody would question, ADRs edited to match what was eventually built, "Consequences: none", a deviation from the default stack with no record, thirty ADRs written at once to document the past.
