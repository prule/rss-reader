# Open/Closed Principle

Software should be open for extension, closed for modification. Add behaviour by adding code, not by editing working code.

## Rules for agents
- When a new case arrives, prefer registering a new implementation over editing a switch statement.
- Use polymorphism, strategy objects, or a registry/plugin table for variation points that genuinely vary.
- Keep the extension point narrow: one interface, clearly documented.
- Existing tested code should stay untouched when a variant is added.

## Counterweight (important)
Do not build extension points speculatively — that violates `yagni.md`. Apply Open/Closed at the *second or third* variation, once the axis of change is proven. Until then, edit directly.

## Smells
Long `if type ==` / `switch` chains that grow with every feature, needing to edit five files to add one case, core files with heavy churn.
