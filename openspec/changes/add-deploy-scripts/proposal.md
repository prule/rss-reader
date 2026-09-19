## Why

Deploying the app currently means remembering a sequence of ad-hoc commands (build with the right `VITE_RELAY_URL`, `wrangler pages deploy dist …` with the exact project/branch flags, and a separate `wrangler deploy` in `relay/`). That's easy to get wrong — e.g. forgetting the relay URL or the `--project-name`. We want the deploy steps captured as named scripts that both **document** the process and **execute** it consistently, so any contributor (or a future session) can deploy without reconstructing the incantation.

## What Changes

- Add npm scripts to `package.json` as the canonical deploy entry points:
  - `deploy:app` — build the app (picks up `VITE_RELAY_URL` from `.env.production`) and deploy `dist/` to Cloudflare Pages (`wrangler pages deploy dist --project-name rss-reader-pwa --branch main --commit-dirty=true`).
  - `deploy:relay` — deploy the relay Worker (`wrangler deploy` from `relay/`).
  - `deploy` — run both (relay first, then app), for a full deploy.
- Update `README.md` "Build & deploy" so the documented steps are just these scripts, with prerequisites called out (a logged-in `wrangler`, and `VITE_RELAY_URL` set in `.env.production`).

**No app, relay, or runtime behavior change** — this only packages the existing manual deploy steps as scripts and documentation. Nothing is deployed by this change itself (running the scripts stays a deliberate, separate action).

## Capabilities

### New Capabilities
<!-- None. Tooling/DX change with no spec-level behavior change; `.openspec.yaml` sets skip_specs: true. -->

### Modified Capabilities
<!-- None. -->

## Impact

- **Files**: `package.json` (new `deploy`, `deploy:app`, `deploy:relay` scripts), `README.md` (deploy section).
- **No new dependencies** — uses the already-installed `wrangler` and existing build.
- **Assumptions** (recorded, adjustable at apply time):
  - Scripts live in `package.json` (matching the repo's existing pnpm-script convention) rather than standalone shell files in a `scripts/` dir.
  - Production target only (project `rss-reader-pwa`, branch `main`); no separate staging/preview script.
  - `deploy` runs the relay before the app; the app's relay URL comes from `.env.production` (already committed), so it does not depend on capturing the relay URL from the deploy output.
  - Scripts assume the operator has already run `wrangler login` (auth is not automated).
