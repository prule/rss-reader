## 1. Deploy scripts

- [ ] 1.1 Add `deploy:app` to `package.json`: build then `wrangler pages deploy dist --project-name rss-reader-pwa --branch main --commit-dirty=true` (build picks up `VITE_RELAY_URL` from `.env.production`).
- [ ] 1.2 Add `deploy:relay` to `package.json`: `wrangler deploy` run in `relay/` (e.g. `wrangler deploy --config relay/wrangler.toml`, or a `cd relay && wrangler deploy`).
- [ ] 1.3 Add `deploy` to `package.json` that runs `deploy:relay` then `deploy:app`.

## 2. Document

- [ ] 2.1 Update `README.md` "Build & deploy" to use the scripts (`pnpm deploy`, `pnpm deploy:app`, `pnpm deploy:relay`) and list prerequisites: a logged-in `wrangler` and `VITE_RELAY_URL` in `.env.production`.

## 3. Verify

- [ ] 3.1 Confirm the scripts parse/resolve without deploying — e.g. `pnpm deploy:app` with a dry run or by running only the build step, and check `wrangler` is found. (Do not perform a real production deploy as part of this task unless the user asks.)
