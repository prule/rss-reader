## 1. Relay configuration

- [x] 1.1 Add config to `relay/wrangler.toml`: `ALLOWED_ORIGINS` (Pages domain(s) + `http://localhost:5173`), `MAX_BYTES` (default 5_000_000), `MAX_REDIRECTS` (default 3), and a Workers rate-limiting binding (e.g. 60 requests/min keyed by IP).
- [x] 1.2 Type the worker's `Env` (bindings + vars) so the config is read in a typed way.

## 2. Target validation hardening

- [x] 2.1 Extend `validateTarget` to reject encoded forms of private/internal addresses (decimal, hexadecimal, and IPv6 loopback/private/ULA forms), not just dotted-decimal.
- [x] 2.2 Implement manual redirect handling: `fetch(..., { redirect: 'manual' })` with a bounded loop (≤ `MAX_REDIRECTS`), resolving and re-validating each `Location` before following; reject on any invalid hop.

## 3. Resource limits

- [x] 3.1 Enforce the response-size cap by streaming the body and aborting with a "too large" error once `MAX_BYTES` is exceeded; short-circuit on an over-limit `Content-Length` when present.
- [x] 3.2 Apply the rate-limit binding per `CF-Connecting-IP`; return a rate-limit status when exceeded.

## 4. Access and content restrictions

- [x] 4.1 Enforce the origin allowlist: reject browser requests whose `Origin` is not allowlisted; echo the specific allowed origin in CORS headers (stop returning `*`). Keep the preflight (OPTIONS) handler consistent.
- [x] 4.2 Enforce the content-type gate: only relay feed-like types (xml/rss/atom/text/json), with a first-bytes sniff (`<?xml`, `<rss`, `<feed`) fallback for missing/generic types; reject others.

## 5. Tests

- [x] 5.1 Update/extend `relay/worker.test.ts`: redirect-to-private rejected; encoded private address rejected; oversized response rejected; disallowed origin rejected + allowed origin echoed; non-feed content-type rejected + feed/sniffed content allowed; rate-limit path; existing happy-path and 400/502 cases still pass.
- [x] 5.2 `pnpm test` — full suite green.

## 6. Deploy and verify

- [x] 6.1 `cd relay && pnpm exec wrangler deploy`.
- [x] 6.2 Production smoke test: a normal feed still loads via the deployed app; a disallowed scheme, a redirect-to-private, an oversized response, a non-feed content type, and a disallowed browser origin are each refused.
