## Why

The feed relay is deployed publicly (`https://ferrite-relay.paulrule1.workers.dev`) and, as written, is effectively an open CORS proxy: anyone who finds the URL can make it fetch any public http(s) page and read the response cross-origin, billed to our Cloudflare account. It also has a concrete SSRF gap — it validates the initial URL but follows redirects, so a public URL that redirects to `127.0.0.1`/`169.254.169.254` bypasses the private-range block. This change hardens the relay so abuse and cost exposure are limited regardless of who calls it.

## What Changes

- **Re-validate redirects (SSRF fix)**: stop following redirects blindly. Handle redirects manually and re-apply target validation to each `Location`, or refuse cross-target redirects, so a redirect can't reach a disallowed/private address. **BREAKING** relative to current behavior only in that some feeds relying on redirects to other hosts may need the redirect target to also pass validation.
- **Response size cap**: stop reading and return an error once an upstream response exceeds a configured byte limit, so the relay can't be used to pull huge files repeatedly.
- **Rate limiting**: cap request volume per client so a single caller can't exhaust our Workers quota or run sustained scraping.
- **Origin restriction**: for browser requests, only serve those whose `Origin` matches an allowlist (the Pages domain(s) + localhost dev). Treated as a speed bump, not a hard control (non-browser clients can omit/spoof Origin).
- **Content-type filter**: only relay feed-like responses (RSS/Atom/XML/text), rejecting arbitrary content so the relay is far less useful as a general proxy.
- Harden target validation against encoding tricks (decimal/hex/IPv6 forms of private addresses) as part of the redirect/target checks.

**No app-facing behavior change for legitimate use**: subscribing to and refreshing normal RSS/Atom feeds from the deployed app continues to work; the app already calls the relay only for feed URLs.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `feed-relay`: Add security requirements (response-size cap, rate limiting, origin restriction, content-type filtering) and strengthen the existing "restricts what it will fetch" requirement to cover redirect targets and encoded/private addresses.

## Impact

- **Code**: `relay/worker.ts` (validation, redirect handling, size cap, origin check, content-type filter), `relay/wrangler.toml` (rate-limit binding and/or config for allowed origins and limits), `relay/worker.test.ts` (new cases).
- **Config**: allowed origins, size limit, and rate-limit thresholds become relay configuration (env/vars in `wrangler.toml`).
- **Deployment**: redeploy the relay Worker after the change; no app rebuild required (the client contract is unchanged for valid feed requests).
- **Compatibility**: feeds that redirect to a *different* host now require that host to also be a valid http(s) public target; feeds served with a non-feed content type may be rejected — acceptable trade-off for the security gain, and surfaced to the user as a fetch error.
