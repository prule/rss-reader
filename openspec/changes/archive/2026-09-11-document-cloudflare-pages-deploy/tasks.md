## 1. Record the deployment target in config

- [x] 1.1 In `openspec/config.yaml`, add to the Tech/stack context that the app is deployed to **Cloudflare Pages** (Vite `dist/` served as static assets).
- [x] 1.2 In the same note, state the split hosting model: Cloudflare Pages hosts the static PWA; the feed relay stays a standalone Cloudflare Worker (`relay/`, `wrangler deploy`), reached via `VITE_RELAY_URL` set at build time.

## 2. Align docs (optional consistency)

- [x] 2.1 Update the `README.md` "Build & deploy" section so the app step names Cloudflare Pages (keep the relay step as `wrangler deploy`).

## 3. Verify

- [x] 3.1 Confirm `openspec/config.yaml` still parses (e.g. `openspec status --json` succeeds) after the edit.
