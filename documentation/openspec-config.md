# OpenSpec Project Context

`openspec/config.yaml` configures the spec workflow. Its `context` block is injected into every artefact the agent creates — expensive, always-present context.

The `context` block is injected into every artefact the agent creates. It is expensive, always-present context — so it holds **only what is true of this product**.

| Belongs | Does not belong |
|---|---|
| What the product is, and its capabilities | The stack and tooling |
| The domain model and vocabulary | Testing approach |
| The design system | Coding conventions |
| Deliberate exceptions to the defaults, with the reason | Deployment mechanics |

Everything in the right column is owned by the constitution. Restating it here creates a second home that will disagree with the first — `../principles/dry.md`. Point at it instead:

## Starter template

`openspec init` writes a `config.yaml` that is **entirely commented out** — there is no `context:` key to edit, so write it. Fill every `<placeholder>`; an unfilled one is injected into every artefact from then on.

```yaml
schema: spec-driven

context: |
  Conventions: follow `docs/constitution/` — principles, patterns, technologies,
  documentation. Read its four index READMEs before creating artifacts. This
  block adds only what is specific to this product.
  (Restated because it is critical and easily got wrong: pnpm for everything —
  never npm or yarn.)

  Product: <one paragraph — what it is, who it is for, what problem it solves>

  Core capabilities:
  - <capability>

  Domain model:
  - <entity: { field, field }>

  Deliberate exceptions to the constitution defaults:
  - <none yet — record each departure, why, and the file it departs from>

rules:
  proposal:
    - <what every proposal for this product must state>
  tasks:
    - <what every task list for this product must cover>
```

Delete `rules:` entirely rather than shipping placeholder rules. To bootstrap a whole project this way — git, OpenSpec, the vendored constitution, `config.yaml` and `CLAUDE.md` — use the **vssw-bootstrap-project** skill.

- **One exception to that rule**: duplicate a constitution rule into `context` when it is both critical and frequently got wrong — "pnpm, never npm" earns its place, because a pointer is only followed if the agent reads it, while `context` is always in front of the model. Keep such restatements to a handful, and word them as restatements.
- Use `rules:` for per-artefact requirements specific to this product ("state how the change behaves offline"), not for general engineering standards.
- Update `config.yaml` in the same commit as the change that makes it wrong.
- Keep implementation detail out of `context` — that belongs in the specs it generates.

## Smells
A `context` block restating the tech stack, testing conventions in two places, `context` describing implementation the specs already own, a config still naming a library the project dropped, general engineering standards under `rules:`.
