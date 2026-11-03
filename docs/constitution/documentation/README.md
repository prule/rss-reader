# Documentation

[← index](../README.md)

**Standards for documenting the software you build.** Every artefact answers exactly one question — that is `../principles/dry.md` applied to documentation, and it is the rule the rest follow from.

## The routing table

| Question | Artefact | File |
|---|---|---|
| What should it do? | OpenSpec spec | [specs.md](specs.md) |
| What is true of *this* product? | `openspec/config.yaml` | [openspec-config.md](openspec-config.md) |
| Why is it built this way? | ADR in `docs/adr/` | [adr.md](adr.md) |
| How do I run it? | Project `README.md` | [project-readme.md](project-readme.md) |
| What does the API look like? | `openapi.yaml` | [../technologies/type-contracts.md](../technologies/type-contracts.md) |
| What changed? | Generated `CHANGELOG.md` | [commits.md](commits.md) |
| Why is *this line* like this? | A comment, in the code | [code-comments.md](code-comments.md) |
| How do the parts fit together? | Mermaid, beside the prose | [diagrams.md](diagrams.md) |
| How should an agent work here? | Project `CLAUDE.md` | [agent-context.md](agent-context.md) |

**Before writing documentation, find its question in this table and write it there.** The same fact in two places will disagree within a month, and nobody will know which copy is true.

## Standing rules

- **Docs live with the code**, in the repo, reviewed in the same pull request. No wiki, no shared drive, no pinned chat message — anything outside the repo drifts unobserved.
- **Update docs in the commit that makes them wrong.** Not later, not in a cleanup ticket.
- **Generate what can be generated** — API docs from the OpenAPI spec, changelog from commit history, types from schemas. A generated artefact cannot drift. Never hand-edit one.
- **Write for someone who was not there.** No "as discussed", no unexplained internal names.
- **Stale is worse than absent.** Missing documentation makes a reader ask; wrong documentation makes them act. Delete rather than let it rot.
- **Length is a cost**, especially for anything an agent loads every task. Say it once, link the rest.
- **Never commit secrets** — not in a README example, not in a comment, not in a spec.

## Ordering

Specs before implementation, contracts before code, ADRs at the moment of deciding. Documentation written after the fact records what was built; documentation written before it shapes what gets built — and catches the disagreement while it is still cheap. See `../principles/fail-fast.md`.
