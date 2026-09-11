## 1. Pin pnpm

- [x] 1.1 Add `"packageManager": "pnpm@<version>"` to `package.json` (Corepack-compatible), pinning the pnpm version contributors should use.
- [x] 1.2 Remove the npm-specific `allowScripts` block from `package.json` (superseded by pnpm's build-script approval).

## 2. Migrate the lockfile and install

- [x] 2.1 Delete `package-lock.json`.
- [x] 2.2 Run `pnpm install` to generate `pnpm-lock.yaml`.
- [x] 2.3 Approve required build scripts under pnpm (esbuild, workerd, sharp) via `pnpm approve-builds` or `pnpm.onlyBuiltDependencies` in `package.json`, so postinstalls that fetch platform binaries still run.

## 3. Update scripts and configs

- [x] 3.1 Update any `package.json` script that invokes the package manager by name to use `pnpm` (e.g. keep script bodies working when called via pnpm).
- [x] 3.2 Update `playwright.config.ts` `webServer.command` from `npm run build && npm run preview ...` to the pnpm equivalent.
- [x] 3.3 Update `openspec/config.yaml` Tech/stack context to state pnpm is the package manager (replacing npm references).

## 4. Update documentation

- [x] 4.1 Update `README.md` commands (`pnpm install`, `pnpm dev`, `pnpm test`, `pnpm run test:e2e`, `pnpm run relay:dev`, `pnpm build`, `pnpm preview`).
- [x] 4.2 Grep the repo for remaining `npm ` / `npx ` / `package-lock.json` references and update or remove them.

## 5. Verify the toolchain under pnpm

- [x] 5.1 `pnpm test` — Vitest unit/component suite passes.
- [x] 5.2 `pnpm build` — type-check + Vite build + PWA service worker generate cleanly.
- [x] 5.3 `pnpm run test:e2e` — Playwright + Serenity e2e suite passes (uses the updated webServer command).
- [x] 5.4 `pnpm run relay:dev` starts the Wrangler relay (smoke check it boots).
- [x] 5.5 Confirm `pnpm-lock.yaml` is committed and `package-lock.json` is gone.
