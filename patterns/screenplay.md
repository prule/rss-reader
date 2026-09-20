# Screenplay

The default design for end-to-end tests. Tests read as an actor pursuing goals in business language, composed from small reusable parts — not as a script driving a page.

## The pieces
- **Actor** — who is doing this. Holds abilities and carries state (credentials, session).
- **Ability** — what the actor can use to interact. `BrowseTheWeb(page)` wraps the Playwright `Page`; only abilities touch the driver.
- **Task** — a business-level goal, composed of other tasks and interactions. `PlaceAnOrder(items)`.
- **Interaction** — a single low-level act. `Click.on(...)`, `Enter.text(...)`.
- **Question** — reads state for an assertion. `TheCart.itemCount()`.

```ts
await actor.attemptsTo(
  LogIn.withValidCredentials(),
  AddToCart.theItem('Flat white'),
  Checkout.payingBy(Card.test()),
)
expect(await actor.asks(TheOrder.confirmationNumber())).toBeDefined()
```

## Why not Page Objects
Page objects grow into hundreds-of-line classes that mix locators, navigation and business logic — a direct violation of `../principles/srp.md`. They are organised around *pages*, so a journey crossing five pages is stitched together by the test, and reuse means inheritance.

Screenplay separates the concerns: locators in interactions, meaning in tasks, intent in the test. Tasks compose into bigger tasks (`../principles/composition.md`), and a UI change touches one interaction rather than every test that walked through it.

## Rules for agents
- The test body contains tasks and questions only. No locators, no `page.` calls, no waits.
- Name tasks for the user's goal in the ubiquitous language (`../patterns/domain-driven-design.md`), never for the mechanics: `PlaceAnOrder`, not `ClickCheckoutButton`.
- Only abilities and interactions touch Playwright. Nothing else imports `Page`.
- Tasks return no values. Reading state is a Question's job.
- Give each actor its own data and session so tests stay independent and parallel-safe.
- Use Playwright's role- and label-based locators inside interactions — accessible selectors, not CSS paths or test IDs bolted on to brittle markup.
- Rely on Playwright's auto-waiting and web-first assertions. Never `waitForTimeout`.
- Keep e2e coverage to a few critical journeys (`testing-strategy.md`). Screenplay makes tests cheap to write — that is not a licence to push logic coverage up the pyramid.

## Implementation
**Serenity/JS** provides Screenplay for Playwright with reporting built in. A hand-rolled version is also viable — two interfaces and an `Actor` class is roughly fifty lines, with no dependency and no framework to learn:

```ts
interface Task { performAs(actor: Actor): Promise<void> }
interface Question<T> { answeredBy(actor: Actor): Promise<T> }
```

Start hand-rolled; adopt Serenity/JS when its reporting earns its cost.

## When not to use this
A single throwaway smoke test does not need the ceremony. Below roughly a dozen e2e tests, plain Playwright with good helpers is honest. Adopt Screenplay once journeys start repeating across tests — the same trigger as `../principles/dry.md`.

## Smells
`page.click('#submit')` in a test, a `LoginPage` class with twenty methods, tasks named after buttons, `waitForTimeout`, tests that must run in order, a selector change breaking thirty tests.
