# Accessibility

Target **WCAG 2.1 AA**. Accessibility is a requirement of the work, not a later pass — retrofitting it means rebuilding components that were built on the wrong element.

## Rules for agents
- **Use the native element.** `<button>`, `<a>`, `<input>`, `<dialog>` bring focus handling, keyboard behaviour and screen-reader semantics for free. A `<div onClick>` has none of it and must reimplement all three, badly.
- Every interactive element must be reachable and operable by keyboard alone. Tab order follows visual order.
- **Never remove `outline` without replacing it.** A visible focus indicator is how keyboard users know where they are. Use `:focus-visible`.
- Reach for ARIA only where native HTML genuinely falls short — a custom combobox, a modal. Correct native markup beats ARIA; wrong ARIA is worse than none.
- Modals trap focus, close on `Escape`, and return focus to what opened them.
- Label every input with a real `<label>`, not a placeholder. Placeholders vanish on typing and are not labels.
- Text contrast at least **4.5:1** (3:1 for large text and UI boundaries).
- **Never let colour be the only signal.** An error needs an icon or text as well as a red border — this covers colour blindness *and* greyscale printing.
- Meaningful images need `alt`; decorative ones need `alt=""`. Never omit the attribute.
- Headings descend in order. Do not pick a level for its font size.
- Provide a skip link to main content, and honour `prefers-reduced-motion`.

## Testing
Automated checks catch perhaps a third of issues. Run `axe` in CI (`@axe-core/playwright`), then **tab through the feature yourself** — the keyboard path is where real failures live.

## Smells
`<div>` with a click handler, `outline: none`, `aria-label` on a native button that already has text, a placeholder used as a label, an icon-only button with no accessible name, a modal you cannot escape, `tabindex="5"`.
