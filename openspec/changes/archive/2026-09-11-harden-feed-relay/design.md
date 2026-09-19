## Context

See proposal.md — Why. The relay is a single stateless Cloudflare Worker (`relay/worker.ts`) with `handleRequest(request)` + `validateTarget(url)`. Today it validates the initial target, then `fetch(target, { redirect: 'follow' })` and returns the body with `Access-Control-Allow-Origin: *`. There is no size cap, no rate limit, no origin check, and no content-type gating. All five hardening measures live in this one Worker plus its `wrangler.toml` config; the client contract for a valid feed request is unchanged.

## Goals / Non-Goals

**Goals:**
- Close the redirect SSRF gap and the encoded-address gap in target validation.
- Bound resource use (response size, request rate) so abuse can't run up cost.
- Reduce the relay's usefulness as a general/anonymizing proxy (content-type gate + origin allowlist).
- Keep all limits as `wrangler.toml` configuration, and keep the Worker stateless.

**Non-Goals:**
- Authenticating users or making the relay private (a token shipped in the client bundle isn't a real secret; out of scope).
- Per-user quotas or usage accounting (would require state; the relay stays stateless).
- Guaranteeing non-browser clients (curl) can't call it — the measures limit *damage*, not identity.

## Decisions

### D1: Follow redirects manually, re-validating each hop

Switch to `fetch(url, { redirect: 'manual' })` and implement a bounded redirect loop (max 3 hops). On each `3xx`, read `Location`, resolve it against the current URL, run `validateTarget` on it, and only then continue. Any hop that fails validation → error, no fetch.

- **Why:** the current `redirect: 'follow'` lets a public URL bounce to `127.0.0.1`/metadata, defeating the private-range guard. Re-validating each hop is the minimal correct fix.
- **Alternatives:** refuse all redirects (simpler, but breaks common feed URLs that 301 to canonical hosts); allow same-host redirects only (still misses cross-host canonicalization). Rejected in favor of validate-each-hop.

### D2: Enforce a hard byte ceiling by streaming

Read the upstream body via its stream reader and accumulate into a capped buffer; abort and return `413` once bytes exceed `MAX_BYTES` (default ~5 MB). Also short-circuit when a trustworthy `Content-Length` already exceeds the cap.

- **Why:** `Content-Length` alone is unreliable (absent or spoofed), so the stream ceiling is the real control; the header check is a cheap early-out.
- **Alternatives:** header-only check (bypassable); no cap (the abuse we're fixing).

### D3: Rate limit per client IP via the Workers rate-limiting binding

Add a Cloudflare Workers rate-limiting binding in `wrangler.toml`, keyed by `CF-Connecting-IP`, with a configured limit (e.g. 60 requests/min). Over the limit → `429`.

- **Why:** native, stateless from our code's perspective, no extra infra, and visible in config. 
- **Alternatives:** a WAF rate rule (no code, but less portable/visible), or a Durable Object counter (adds state and cost). Rejected for this scope. Trade-off: IP keying can group users behind shared NAT — acceptable at a per-minute budget sized for a feed reader.

### D4: Origin allowlist with echoed CORS origin

Read allowed origins from a `wrangler.toml` var (`ALLOWED_ORIGINS`, comma-separated: the Pages domain(s) + `http://localhost:5173`). If a request carries an `Origin`: serve only if allowlisted, and echo that exact origin in `Access-Control-Allow-Origin` (stop using `*`). Requests with no `Origin` (non-browser) are still subject to D1–D3 and D5.

- **Why:** blocks other websites from using the relay from a browser; echoing the specific origin is required once we stop using `*`.
- **Trade-off:** `Origin` is absent/forgeable outside browsers, so this is defense-in-depth, not a gate — documented as such. The app must send requests such that the browser attaches an allowlisted `Origin` (it does, being cross-origin to the Worker).

### D5: Content-type gate with a lightweight sniff fallback

Only return responses whose `Content-Type` is feed-like (`xml`, `rss`, `atom`, `text/*`, `application/json`). If the type is missing or generic (`application/octet-stream`), sniff the first bytes for `<?xml`, `<rss`, or `<feed`/`<feed ` and allow when it looks like a feed; otherwise reject with `415`.

- **Why:** stops the relay returning images/binaries/arbitrary HTML, while the sniff avoids rejecting correctly-shaped feeds served with a sloppy content type.
- **Alternatives:** strict content-type only (rejects real-world mislabeled feeds); no gate (general proxy). Rejected.

## Risks / Trade-offs

- **Legit feed with an odd content type** → could be rejected. Mitigation: the sniff fallback (D5) accepts anything that parses as XML at the byte level.
- **Shared-NAT users share a rate bucket** (D3) → set the per-minute limit generously for a reader's polling cadence; revisit if false positives appear.
- **Origin check is bypassable by non-browser clients** (D4) → intentional; D1–D3/D5 are the controls that bound damage regardless of caller.
- **Redirect loop cost** (D1) → bounded to 3 hops; each hop still counts toward the size/rate budget.
- **Config drift** → limits live in `wrangler.toml`; document defaults so a redeploy doesn't silently loosen them.

## Migration Plan

1. Implement D1–D5 in `relay/worker.ts`; add config vars + rate-limit binding to `relay/wrangler.toml`.
2. Extend `relay/worker.test.ts` with cases for each (redirect-to-private rejected, encoded-address rejected, oversized rejected, disallowed origin rejected, non-feed content-type rejected, happy paths still pass).
3. `pnpm test` green, then `cd relay && pnpm exec wrangler deploy`.
4. Smoke-test in production: a normal feed still loads via the deployed app; a disallowed origin/scheme/oversized/non-feed request is refused.
5. **Rollback:** redeploy the previous Worker version (`wrangler rollback`) — the relay is stateless and the app contract is unchanged, so rollback is safe and independent of the Pages app.

## Open Questions

- Exact numeric limits (MAX_BYTES, redirects, requests/min) — start with 5 MB / 3 / 60-per-min and tune from real traffic; deferrable, does not change the approach or task breakdown.
