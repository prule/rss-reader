# SRP — Single Responsibility Principle

A module, class, or function should have one reason to change — one stakeholder or concern it answers to.

## Rules for agents
- Describe the unit in one sentence without "and". If you need "and", split it.
- Separate the concerns that change on different schedules: business rules, persistence, transport, formatting, logging.
- A function should either decide something or do something, not both. Keep decision logic pure and push side effects to the edges.
- When adding to an existing file, ask whether the new code shares the file's single reason to change.

## Granularity
SRP is about reasons to change, not line counts. A 200-line parser with one job is fine. A 20-line class doing validation *and* HTTP is not.

## Smells
"Manager"/"Util"/"Helper" classes, functions that fetch + transform + render, files that appear in every unrelated PR.
