# Deployment — Cloudflare

Static frontends on Pages, edge logic on Workers.

## Defaults
| Workload | Target |
|---|---|
| React PWA (static build) | **Cloudflare Pages** |
| Edge functions, webhooks, light APIs | **Cloudflare Workers** |
| Edge key/value, blobs, edge SQL | KV, R2, D1 |
| CI/CD | **GitHub Actions** → Wrangler |

## Important: Spring Boot does not run on Workers
Workers is a V8 isolate runtime — no JVM, no threads, no long-lived processes. A Spring Boot service needs a container host: your own VM, a managed PaaS (Fly.io, Railway), or Cloudflare Containers. Put Cloudflare in front of it for DNS, TLS, caching and WAF, but do not plan to deploy the JVM to Workers.

## Rules for agents
- Configuration lives in `wrangler.jsonc`, committed. Secrets go in via `wrangler secret` or CI — never in the config file, never in the repo.
- Separate Workers, bindings and credentials per environment. No shared production credentials — `../principles/least-privilege.md`.
- Bindings, not SDK clients with keys: bind the resource and let the platform authorise.
- Mind the Workers execution model: no filesystem, no Node built-ins unless `nodejs_compat` is on, CPU-time limits, and no state between requests. Use Durable Objects when coordination is genuinely needed.
- Never leave a floating promise — use `waitUntil` for work that must outlive the response.
- Set cache headers deliberately on Pages. Hashed assets immutable, `index.html` never cached — a cached shell breaks PWA updates.
- Deploy from CI on a green build, not from a developer machine.

## Deviate when
The workload needs a JVM, a long-running process, or heavy CPU. Then it is a container on a host, with Cloudflare only at the edge.

## Smells
Secrets in `wrangler.jsonc`, one API token used everywhere, `index.html` served with a long max-age, a Worker holding state in a module-level variable, manual `wrangler deploy` from a laptop.
