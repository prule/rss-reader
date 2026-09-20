# Supabase

The default backend. Reach for it first: Postgres, auth, realtime, storage and generated types with no service to operate.

## Use it when
The app is genuinely CRUD plus auth, realtime and file storage — the logic lives in the client and the database, not in a service layer.

## Escalate to Spring Boot when
Real business invariants must be enforced server-side; there is batch or scheduled work; heavy third-party integration; complex multi-step transactions; or the domain model needs somewhere to live. See `spring-boot-kotlin.md`.

## Rules for agents
- **Row Level Security on every table, from the first migration.** No exceptions, no "add it later". This is `../principles/least-privilege.md` and it is the entire security model.
- Write a test per policy that proves another user *cannot* read or write the row. Untested RLS is assumed broken.
- The `anon` key is public and belongs in client code. The `service_role` key bypasses RLS entirely — it must never reach the browser, a client bundle, or version control.
- Generate types: `supabase gen types typescript` in CI, committed. Never hand-write table types.
- Schema changes are migration files in the repo, applied through CI. Never edit schema in the dashboard.
- Keep business rules out of the client where they matter. Constraints, triggers and RLS enforce; the client is convenience.
- Use Edge Functions for what must not run client-side — webhooks, third-party secrets, privileged operations.
- Put real constraints on the tables: `not null`, foreign keys, `check`, unique. The database is the last line of defence.

## Deviate when
You need the database to do something Supabase's hosted Postgres cannot, or the logic has outgrown RLS as an authorisation model. That is the signal to move to a service.

## Smells
A table with RLS disabled, `service_role` in a `.env` the client reads, hand-written row types, schema drift between dashboard and repo, authorisation enforced only by hiding UI, policies nobody has tested.
