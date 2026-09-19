## 1. Restrict to https and lower the size cap

- [x] 1.1 In `relay/worker.ts` `validateTarget`, accept only `https:` (reject `http:` and all other schemes). This automatically covers redirect hops, which are re-validated.
- [x] 1.2 Lower the default `MAX_BYTES` in `relay/worker.ts` from 5 MB to 1 MB (1_000_000), and update `relay/wrangler.toml` `MAX_BYTES = "1000000"`.
- [x] 1.3 Update the relay's header comment / docs to say https-only.

## 2. Tests

- [x] 2.1 In `relay/worker.test.ts`: assert `http://…` targets are rejected and `https://…` accepted; assert an `http` redirect location is not followed; adjust size-cap tests to the 1 MB default (or keep using an explicit small `MAX_BYTES`).
- [x] 2.2 `pnpm test` — full suite green.

## 3. Deploy and verify

- [x] 3.1 `cd relay && pnpm exec wrangler deploy`.
- [x] 3.2 Production smoke test: an `https` feed still loads via the deployed app; an `http` target is refused (400); a response over 1 MB is refused (413).
