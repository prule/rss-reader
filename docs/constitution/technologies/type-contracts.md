# Type Contracts — Contract First

**The OpenAPI specification is the source of truth, written before the implementation.** Server interfaces and client code are generated from it. Nobody hand-writes a type that crosses a service boundary.

## The flow
```
openapi.yaml  (hand-written, reviewed, versioned in the repo)
      │
      ├─→ openapi-generator (kotlin-spring, interfaceOnly)  →  server interfaces to implement
      ├─→ openapi-typescript                                →  TS client types
      └─→ Prism                                             →  mock server, available before the API exists
```

## Why contract first
The contract is agreed and reviewable before either side is built. Frontend and backend proceed in parallel against a mock. The spec is a design artefact discussed in a pull request, not an accident of whatever the controller happened to return.

Code-first (annotating Kotlin and letting springdoc emit a spec) inverts this: the API becomes a side effect of the implementation, breaking changes ship unnoticed, and the client waits for the server.

## Rules for agents
- Write or change `openapi.yaml` **first**. Implementation follows the contract; the contract never documents the implementation after the fact.
- Generate the Kotlin server interfaces (`interfaceOnly: true`) and implement them. If the controller stops matching the spec, it stops compiling.
- Generated code is committed and regenerated in CI. A non-empty diff after regeneration fails the build — that is the drift alarm.
- Never hand-edit a generated file. Never hand-write a type that could be generated.
- Lint the spec (**Spectral**) and check every change for breaking changes (**oasdiff**) in CI. A breaking change must be a new version, not a merge.
- Keep the generated client in an adapter, never in components or domain code — `../patterns/anti-corruption-layer.md`.
- Add fields additively. Do not break a client to tidy a name.

## Other boundaries
| Boundary | Source of truth | Generated |
|---|---|---|
| REST API (Spring Boot ↔ TS) | **`openapi.yaml`** | Kotlin interfaces, TS client, mock server |
| Supabase → TS | Database schema | `supabase gen types typescript` |
| Database → Kotlin | Flyway migrations | Aggregate mappings, verified by Testcontainers tests |

Supabase is the exception: PostgREST derives the API from the schema, so the schema *is* the contract. Migrations are then the artefact to review.

## Generation is not validation
Generated types give compile-time safety only. Runtime data still needs parsing: validate every API response, env var, stored blob and message payload with **Zod** at the boundary, then pass the parsed type inward. Validate once, at the edge — see `../patterns/illegal-states-unrepresentable.md`.

## Deviate when
A one-off script or a spike. Say that it is a spike.

## Smells
A spec generated from annotations after the code was written, a hand-written interface mirroring an API response, a generated file with manual edits, a breaking change merged without a version bump, `as ApiResponse` on a `fetch` result, drift discovered by a user.
