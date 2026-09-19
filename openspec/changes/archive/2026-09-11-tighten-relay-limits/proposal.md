## Why

The hardened relay currently accepts both `http` and `https` targets and caps responses at 5 MB. We want to tighten it further: only fetch `https` feeds (drop plaintext `http`), and lower the response-size cap to 1 MB. Plaintext `http` fetches are interceptable and rarely needed for real feeds, and 5 MB is far larger than any legitimate feed document — a 1 MB ceiling cuts abuse and cost exposure with no practical downside for RSS/Atom.

## What Changes

- **HTTPS-only**: the relay SHALL reject `http` targets (and `http` redirect hops), accepting only `https`. **BREAKING** for any feed that is only reachable over `http`.
- **1 MB size cap**: lower the maximum response size from 5 MB to 1 MB (`MAX_BYTES` `5000000` → `1000000`). This is a configuration value; the spec already requires "a configured size limit", so the cap change is config-only, not a new spec requirement.
- Update the relay's own comments/docs to reflect https-only.

**Impact on the deployed app**: the current feeds (Hacker News, Thoughtworks Engineering) are already https, so this does not break them. Any future `http`-only feed would be refused with a clear error.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `feed-relay`: Narrow the "Relay restricts what it will fetch" requirement from `http`/`https` to `https` only, including redirect hops. (The size cap is a configuration change within the existing "Relay caps response size" requirement and needs no spec text change.)

## Impact

- **Code**: `relay/worker.ts` — `validateTarget` rejects `http` (allow only `https`); this automatically applies to redirect hops since they are re-validated. Default `MAX_BYTES` lowered to 1 MB.
- **Config**: `relay/wrangler.toml` — `MAX_BYTES = "1000000"`.
- **Tests**: `relay/worker.test.ts` — assert `http` is rejected and `https` accepted; adjust size-cap expectations for the new default.
- **Deployment**: redeploy the relay Worker after the change; no app rebuild needed (client contract for valid https feed requests is unchanged).
- **Compatibility**: http-only feeds become unsupported (deliberate); assumed "1 MB" = 1,000,000 bytes to match the existing decimal convention.
