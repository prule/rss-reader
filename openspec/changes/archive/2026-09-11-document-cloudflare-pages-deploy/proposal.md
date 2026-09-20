## Why

The project records its tech/stack and constraints in `openspec/config.yaml` (deployment target is currently unstated). We've decided the app will be deployed to **Cloudflare Pages**. Capturing this in the config keeps the recorded context accurate so future changes and AI-assisted work assume the right hosting model (static asset host + a separate Worker for the relay), rather than a generic "any static host".

## What Changes

- Add to `openspec/config.yaml` context that the app (the built `dist/` from Vite) is deployed to **Cloudflare Pages**.
- Note the split hosting model: Cloudflare Pages serves the static PWA; the feed relay remains a standalone Cloudflare Worker deployed separately (`relay/`, via `wrangler deploy`). Record the assumption that the relay is _not_ folded into Pages Functions for now.
- Note that `VITE_RELAY_URL` is set at build time to the deployed relay Worker's origin so the Pages-hosted app reaches it.

**No code, build output, or runtime behavior changes** — this change only records the deployment target in the OpenSpec project context. (Optionally, the README's deploy section may be aligned to name Cloudflare Pages; the config update is the required part.)

## Capabilities

### New Capabilities

<!-- None. Documentation/config-only change with no spec-level behavior change; `.openspec.yaml` sets skip_specs: true. -->

### Modified Capabilities

<!-- None. -->

## Impact

- **Files**: `openspec/config.yaml` (context text); optionally `README.md` deploy section for consistency.
- **No dependency, build, or runtime impact.** Nothing about the app, relay, or data changes.
- **Assumption to confirm at apply time**: static app → Cloudflare Pages, relay → standalone Worker (not Pages Functions). If the intent is to host the relay via Pages Functions instead, that's a larger change and out of scope here.
