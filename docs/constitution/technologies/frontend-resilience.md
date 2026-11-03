# Frontend Resilience

The network fails, the backend returns 500, the user goes through a tunnel. Degrade locally and visibly; never crash the page.

## Rules for agents
- **Wrap major regions in error boundaries** — sidebar, main content, each significant widget. One component throwing must not blank the whole application. A boundary around the entire app is a white screen with extra steps.
- Never show a raw error, status code or stack trace. Say what happened and what the user can do, and log the detail.
- **Retry `GET` only** — three attempts, exponential backoff, via TanStack Query. Never auto-retry a mutation unless it carries an idempotency key, or a flaky connection charges the card twice (`../patterns/outbox-and-idempotency.md`).
- Every fetch gets a timeout. A request that hangs forever is a spinner that never stops.
- Design all four states for anything asynchronous: loading, empty, error, success. "Empty" and "error" are the ones that get skipped and the ones users hit.
- Optimistic updates must roll back visibly on failure. A silent revert reads as data loss.
- The service worker caches the shell so the app boots offline; local data lives in IndexedDB (`local-first.md`). Never cache authenticated API responses.
- Tell the user when they are offline and when work is queued. Hidden failure destroys trust faster than visible failure.

## Deviate when
A page whose entire purpose is one live query has nothing to degrade *to*. Show a clear failed state rather than a fake one.

## Smells
A blank white page from one bad render, `Error: Request failed with status code 500` shown to a user, an auto-retried POST, a spinner with no timeout, an empty list indistinguishable from a failed load, an optimistic update that silently reverts.
