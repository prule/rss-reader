# Diagrams

**Mermaid, inside the markdown that uses it.** Diagrams as code: diffable in review, rendered by GitHub, no binary files, no external editor.

## Rules for agents
- A diagram must show something prose genuinely cannot — a topology, a state machine, a sequence across services, a dependency direction. Do not draw a picture of a list.
- Keep it to one idea. Above roughly a dozen nodes a diagram stops explaining and starts intimidating; split it by level of detail instead.
- **Label the edges.** An unlabelled arrow between two boxes carries almost no information — say what flows, and which way.
- Choose the type deliberately: `flowchart` for structure and dependencies, `sequenceDiagram` for interactions over time, `stateDiagram-v2` for lifecycles, `erDiagram` for data models.
- Layer system diagrams by zoom level — context, then containers, then components — rather than one diagram holding everything.
- Put the diagram next to the prose that explains it. A diagram alone is not documentation.
- Update the diagram in the same commit as the change it describes, or delete it. A confidently wrong diagram is worse than none.
- No colour-only meaning, and keep labels readable — diagrams are read in both light and dark themes.

## Deviate when
Something genuinely needs a rich visual (a UI wireframe, a complex network topology). Use an image, commit the source file alongside it, and accept that it will drift.

## Smells
A diagram of the folder structure, forty boxes in one graph, unlabelled arrows, an architecture diagram still showing a service that was removed, a screenshot of a whiteboard, a PNG with no source.
