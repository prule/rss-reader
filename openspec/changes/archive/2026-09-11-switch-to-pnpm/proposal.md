## Why

The project was scaffolded with npm (npm scripts, `package-lock.json`, npm's `allowScripts` gate, and npm-based docs/config). We want pnpm as the single package manager for everything — installing, running scripts, and managing the relay worker — for faster, disk-efficient installs and a stricter, non-flat `node_modules`. Standardizing on one tool avoids mixed lockfiles and "works on npm but not pnpm" drift.

## What Changes

- Adopt **pnpm** as the only package manager. Pin it via `packageManager` in `package.json` (Corepack-compatible) so contributors use a consistent version.
- Replace `package-lock.json` with `pnpm-lock.yaml` (regenerate the lockfile with pnpm).
- Update `package.json` scripts that shell out to `npm` (e.g. the Playwright `webServer` build/preview commands are invoked by the test runner) to use `pnpm` where a script calls the package manager by name.
- Update `playwright.config.ts` `webServer.command` (`npm run build && npm run preview ...`) to use `pnpm`.
- Update `openspec/config.yaml` context so the recorded tooling says pnpm, not npm.
- Update `README.md` and any other docs to use `pnpm install` / `pnpm dev` / `pnpm test` / `pnpm run relay:dev` etc.
- Add pnpm-appropriate ignores (`.gitignore` already ignores `node_modules`; ensure no npm-lockfile references remain) and, if needed, an `.npmrc`/`pnpm` setting to approve build scripts (esbuild, workerd, sharp) equivalent to the npm `allowScripts` entries so installs don't silently skip required postinstalls.
- Verify the full toolchain works under pnpm: Vite dev/build, Vitest, Playwright + Serenity e2e, and Wrangler (relay).

**No user-facing or runtime behavior changes** — this is a build/tooling migration only. The app, its features, and its localStorage data are unaffected.

## Capabilities

### New Capabilities
<!-- None. This is a tooling/infrastructure change with no spec-level behavior change; `.openspec.yaml` sets skip_specs: true. -->

### Modified Capabilities
<!-- None. -->

## Impact

- **Files**: `package.json` (scripts + `packageManager`), `playwright.config.ts`, `openspec/config.yaml`, `README.md`, lockfile swap (`package-lock.json` → `pnpm-lock.yaml`), possibly `.npmrc`/`pnpm.onlyBuiltDependencies`.
- **Dependencies**: unchanged set of packages; only the installer/lockfile change. Build-script approval must be re-established for pnpm (esbuild, workerd, sharp) so postinstalls that fetch platform binaries still run.
- **Developer workflow**: contributors must use pnpm; commands in docs change accordingly.
- **CI**: no CI is configured in this repo today; if added later it should use pnpm.
