# Spring Boot — API Layer

REST conventions for Spring Boot services. The contract comes first: write `openapi.yaml`, generate the interfaces, implement them — `type-contracts.md`.

## Resources and methods
Nouns, never verbs: `GET /users`, not `GET /getAllUsers`.

| Method | Semantics |
|---|---|
| `GET` | Safe and idempotent. No side effects, ever. |
| `POST` | Creates under a collection. **Not** idempotent — see below. |
| `PUT` | Full replacement. Omitted fields are cleared. |
| `PATCH` | Partial update. Only the supplied fields change. |
| `DELETE` | Idempotent. Repeat calls end in the same state. |

## HATEOAS
Responses carry `_links` telling the client what it may do next, given **the resource's state and the caller's permissions**. If the user may not cancel, there is no `cancel` link — absence is the authorisation signal.

```json
{ "id": "123", "status": "PENDING",
  "_links": { "self": { "href": "/orders/123" },
              "cancel": { "href": "/orders/123/cancel" } } }
```

- **Feature flags are links.** The backend evaluates the flag and injects the link; the client renders on link presence and never evaluates a flag itself. One source of truth, and no flag logic shipped to the browser.
- Build links with Spring HATEOAS (`EntityModel`, `linkTo`), never by string-concatenating URLs.

## Errors
**RFC 9457 Problem Details** (which obsoletes RFC 7807), media type `application/problem+json`, for every error response:

```json
{ "type": "https://api.example.com/errors/out-of-stock", "title": "Out of Stock",
  "status": 409, "detail": "Item 456 is no longer available." }
```

- Map domain errors to problem types in a `@RestControllerAdvice` at the adapter — never let a persistence or framework exception reach the client.
- Never expose stack traces, SQL, or internal identifiers in `detail`.
- `type` is a stable URI. Clients branch on it, so treat it as part of the contract.

## Rules for agents
- Validate request DTOs at the boundary with `jakarta.validation`. Domain types validate in their own constructors — never annotate domain classes with transport concerns.
- **Never return an unbounded collection.** Paginate with `?page=&size=&sort=-createdAt`, cap `size`, and return total items and pages in the payload.
- URI-version breaking changes (`/api/v1/...`). Adding a field or endpoint is not breaking and needs no bump.
- **Idempotency keys on unsafe POSTs** (payments, orders): client sends `Idempotency-Key: <uuid>`; the server stores key → response, replays the stored response on repeat, and returns `409` while the first is still in flight. The key belongs to the user's *intent*, so it is generated once and reused across retries — `../patterns/outbox-and-idempotency.md`.
- Expose the deployed version at `/actuator/info`.

## Smells
`GET /getOrders`, a `cancel` link the caller is not allowed to use, feature-flag evaluation in the frontend, a bespoke `{"error": "..."}` shape, a stack trace in a response, an unpaginated list endpoint, a retried payment charging twice.
